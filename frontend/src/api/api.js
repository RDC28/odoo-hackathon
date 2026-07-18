// Mock API layer. Every function here maps 1:1 to a future Flask endpoint
// (see docs/api-reference.md) — swap the body for a fetch() call when the
// backend exists. All functions are async for that reason.
// NOTE (prototype only): passwords are stored in plain text in localStorage.

import { col, resetDb } from './db'
import { haversineKm } from './geo'
import { seedDemo } from './seed'

const SESSION_KEY = 'carpool_session'
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const BACKEND_API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Re-validates against the DB record (not a caller-supplied object) so a
// revoked employee's already-open session can't keep booking/publishing/chatting —
// mirrors a real backend re-checking auth on every request.
function requireActive(uid) {
  const u = col('users').get(uid)
  if (!u || u.status !== 'active') throw new Error('Your account is not active. Please contact your administrator.')
  return u
}

// ---------- session / auth ----------

export function currentUser() {
  const uid = localStorage.getItem(SESSION_KEY)
  return uid ? col('users').get(uid) : null
}

export async function login(email, password) {
  // Keep the local prototype usable after browser storage is cleared. The
  // backend has its own seed script, but this frontend currently authenticates
  // against localStorage until the API swap is enabled.
  if (col('users').all().length === 0) seedDemo()
  const u = col('users').findOne(
    x => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password
  )
  if (!u) throw new Error('Invalid email or password')
  if (u.status === 'pending_approval') throw new Error('Your registration is pending admin approval.')
  if (u.status !== 'active') throw new Error('Your account is ' + u.status + '. Please contact your administrator.')
  localStorage.setItem(SESSION_KEY, u._id)
  return u
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
}

export async function registerOrganization({ companyName, industry, address, adminName, email, phone, password }) {
  if (col('users').findOne(x => x.email.toLowerCase() === email.trim().toLowerCase()))
    throw new Error('An account with this email already exists')
  const joinCode = Math.random().toString(36).slice(2, 8).toUpperCase()
  const company = col('companies').insert({
    name: companyName,
    industry,
    registered_address: address,
    admin_contact: email,
    join_code: joinCode,
    carpool_config: { fuel_cost_per_liter: 96.5, cost_per_km: 8, travel_cost_operational_per_km: 2.5 },
  })
  const admin = col('users').insert({
    company_id: company._id,
    name: adminName, email: email.trim(), phone, password,
    role: 'admin', status: 'active', has_onboarded: true,
    department: 'Administration', wallet_balance: 0,
    rating_avg: 0, rating_count: 0,
  })
  localStorage.setItem(SESSION_KEY, admin._id)
  return { company, admin }
}

export async function signupEmployee({ joinCode, name, email, phone, password, department }) {
  const company = col('companies').findOne(c => c.join_code === joinCode.trim().toUpperCase())
  if (!company) throw new Error('Invalid organization join code')
  if (col('users').findOne(x => x.email.toLowerCase() === email.trim().toLowerCase()))
    throw new Error('An account with this email already exists')
  const user = col('users').insert({
    company_id: company._id,
    name, email: email.trim(), phone, password, department,
    role: 'employee', status: 'pending_approval', has_onboarded: false,
    wallet_balance: 0, rating_avg: 0, rating_count: 0,
  })
  return user
}

export async function updateProfile(uid, patch) {
  return col('users').update(uid, patch)
}

export async function getCompany(companyId) {
  return col('companies').get(companyId)
}

// ---------- vehicles ----------

export async function myVehicles(uid) {
  return col('vehicles').find(v => v.owner_id === uid)
}

export async function addVehicle(uid, companyId, { type, model, registration_number, seating_capacity, mileage_kmpl }) {
  const reg = registration_number.trim().toUpperCase()
  if (col('vehicles').findOne(v => v.company_id === companyId && v.registration_number === reg))
    throw new Error('A vehicle with this registration number is already registered')
  return col('vehicles').insert({
    company_id: companyId, owner_id: uid,
    type, model, registration_number: reg, seating_capacity: +seating_capacity,
    mileage_kmpl: +(mileage_kmpl || 15),
    status: 'active',
  })
}

export async function removeVehicle(id) {
  const inUse = col('rides').findOne(r => r.vehicle_id === id && ['active', 'started', 'in_progress'].includes(r.status))
  if (inUse) throw new Error('This vehicle is used by an active ride — cancel or complete it first')
  col('vehicles').remove(id)
}

// ---------- saved places ----------

export async function myPlaces(uid) {
  return col('saved_places').find(p => p.user_id === uid)
}

export async function addPlace(uid, { label, address, lat, lng }) {
  return col('saved_places').insert({ user_id: uid, label, address, lat, lng })
}

export async function removePlace(id) {
  col('saved_places').remove(id)
}

// ---------- rides ----------

export async function publishRide(user, data) {
  const freshUser = requireActive(user._id)
  const vehicles = await myVehicles(freshUser._id)
  if (!vehicles.length) throw new Error('Register a vehicle before publishing a ride')
  const vehicle = vehicles.find(v => v._id === data.vehicle_id)
  if (!vehicle) throw new Error('Select one of your registered vehicles')
  const seats = +data.seats
  if (!seats || seats < 1) throw new Error('Available seats must be at least 1')
  if (seats > vehicle.seating_capacity) throw new Error(`${vehicle.model} only seats ${vehicle.seating_capacity}`)
  const price = +data.price_per_seat
  if (!(price >= 0)) throw new Error('Enter a valid fare per seat')
  return col('rides').insert({
    company_id: freshUser.company_id,
    driver_id: freshUser._id,
    vehicle_id: vehicle._id,
    start_location: data.start_location,
    destination_location: data.destination_location,
    departure_at: data.departure_at,
    recurring_days: data.recurring_days || [],
    seats_total: seats,
    seats_available: seats,
    price_per_seat: price,
    route_coords: data.route_coords || null,
    distance_km: data.distance_km || null,
    duration_min: data.duration_min || null,
    status: 'active',
  })
}

export async function updateRideRoute(rideId, { route_coords, distance_km, duration_min }) {
  return col('rides').update(rideId, { route_coords, distance_km, duration_min })
}

function sameDay(iso, dateStr) {
  return iso.slice(0, 10) === dateStr
}

// Company-scoped ride search: same org only (company A never sees company B),
// matched by pickup/destination proximity (haversine) + date or recurring weekday.
export async function searchRides(user, { from, to, date, seats }) {
  const weekday = WEEKDAYS[new Date(date + 'T00:00').getDay()]
  const MAX_KM = 8
  return col('rides')
    .find(r =>
      r.company_id === user.company_id &&
      r.status === 'active' &&
      r.driver_id !== user._id &&
      r.seats_available >= +seats &&
      (sameDay(r.departure_at, date) || (r.recurring_days || []).includes(weekday)) &&
      haversineKm(r.start_location, from) <= MAX_KM &&
      haversineKm(r.destination_location, to) <= MAX_KM
    )
    .map(r => {
      const driver = col('users').get(r.driver_id)
      const vehicle = col('vehicles').get(r.vehicle_id)
      return { ...r, driver, vehicle }
    })
    .sort((a, b) => a.departure_at.localeCompare(b.departure_at))
}

// Planned ride origins near the requested pickup. These are not live GPS
// positions; live tracking remains available only after booking a ride.
export async function nearbyRides(user, { from, date, seats = 1 }) {
  const weekday = WEEKDAYS[new Date(date + 'T00:00').getDay()]
  return col('rides').find(r =>
    r.company_id === user.company_id &&
    r.status === 'active' &&
    r.driver_id !== user._id &&
    r.seats_available >= +seats &&
    (sameDay(r.departure_at, date) || (r.recurring_days || []).includes(weekday)) &&
    haversineKm(r.start_location, from) <= 8
  ).map(r => ({ ...r, driver: col('users').get(r.driver_id), vehicle: col('vehicles').get(r.vehicle_id) }))
}

export async function getRide(id) {
  return col('rides').get(id)
}

export async function myOfferedRides(uid) {
  return col('rides')
    .find(r => r.driver_id === uid)
    .map(r => ({
      ...r,
      vehicle: col('vehicles').get(r.vehicle_id),
      bookings: col('bookings')
        .find(b => b.ride_id === r._id && b.status !== 'cancelled')
        .map(b => ({ ...b, rider: col('users').get(b.rider_id) })),
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

function setRideAndBookings(rideId, rideStatus, bookingStatus) {
  col('rides').update(rideId, { status: rideStatus })
  col('bookings')
    .find(b => b.ride_id === rideId && b.status !== 'cancelled')
    .forEach(b => col('bookings').update(b._id, { status: bookingStatus }))
}

export async function startRide(rideId) {
  setRideAndBookings(rideId, 'started', 'started')
}

export async function markInProgress(rideId) {
  setRideAndBookings(rideId, 'in_progress', 'in_progress')
}

export async function completeRide(rideId) {
  col('rides').update(rideId, { status: 'completed' })
  // Idempotent: only advance bookings still mid-trip — never touch one that's
  // already been paid, so re-entering Track Ride after payment can't undo it.
  col('bookings')
    .find(b => b.ride_id === rideId && !['cancelled', 'payment_completed'].includes(b.status))
    .forEach(b => col('bookings').update(b._id, { status: 'payment_pending' }))
}

export async function cancelRide(rideId) {
  col('rides').update(rideId, { status: 'cancelled' })
  col('bookings')
    .find(b => b.ride_id === rideId)
    .forEach(b => col('bookings').update(b._id, { status: 'cancelled' }))
}

// ---------- bookings ----------

// Note (prototype only): the seat decrement + inserts below are not atomic —
// a real backend must do this as one DB transaction (or an atomic $inc with a
// floor check) to stay race-free under concurrent bookings.
export async function bookRide(user, ride, seats) {
  const freshUser = requireActive(user._id)
  seats = +seats
  if (!seats || seats < 1) throw new Error('Select at least 1 seat')
  // Re-read the ride fresh instead of trusting the caller's (possibly stale,
  // e.g. from an earlier search-results list) object.
  const current = col('rides').get(ride._id)
  if (!current) throw new Error('This ride no longer exists')
  if (current.status !== 'active') throw new Error('This ride is no longer available')
  if (current.seats_available < seats) throw new Error('Not enough seats available')
  col('rides').update(current._id, { seats_available: current.seats_available - seats })
  const conv = col('conversations').insert({
    company_id: freshUser.company_id,
    type: 'ride',
    participant_ids: [freshUser._id, current.driver_id],
    ride_id: current._id,
    last_message_at: new Date().toISOString(),
  })
  return col('bookings').insert({
    ride_id: current._id,
    rider_id: freshUser._id,
    seats_booked: seats,
    pickup_point: current.start_location,
    drop_point: current.destination_location,
    fare: current.price_per_seat * seats,
    status: 'booked',
    conversation_id: conv._id,
  })
}

function enrichBooking(b) {
  const ride = col('rides').get(b.ride_id)
  const driver = ride ? col('users').get(ride.driver_id) : null
  const vehicle = ride ? col('vehicles').get(ride.vehicle_id) : null
  return { ...b, ride, driver, vehicle }
}

export async function myBookings(uid) {
  return col('bookings')
    .find(b => b.rider_id === uid && !['payment_completed', 'cancelled'].includes(b.status))
    .map(enrichBooking)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function getBooking(id) {
  const b = col('bookings').get(id)
  return b ? enrichBooking(b) : null
}

export async function cancelBooking(id) {
  const b = col('bookings').get(id)
  if (!b || b.status === 'cancelled') return
  const ride = col('rides').get(b.ride_id)
  if (ride) col('rides').update(ride._id, { seats_available: ride.seats_available + b.seats_booked })
  col('bookings').update(id, { status: 'cancelled' })
}

export async function historyFor(uid) {
  const asRider = col('bookings')
    .find(b => b.rider_id === uid && b.status === 'payment_completed')
    .map(enrichBooking)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  const asDriver = col('rides')
    .find(r => r.driver_id === uid && r.status === 'completed')
    .map(r => {
      const rideBookings = col('bookings').find(b => b.ride_id === r._id)
      const active = rideBookings.filter(b => b.status !== 'cancelled')
      return {
        ...r,
        vehicle: col('vehicles').get(r.vehicle_id),
        passengers: active.length,
        earned: active.filter(b => b.status === 'payment_completed').reduce((s, b) => s + b.fare, 0),
      }
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  return { asRider, asDriver }
}

// ---------- payments & wallet ----------

// Note (prototype only): the writes below (debit/credit wallets, insert
// transactions, insert payment, update booking) are not one atomic operation —
// a real backend must wrap this in a DB transaction so a crash mid-way can't
// leave a rider debited without the booking marked paid.
export async function createRazorpayOrder({ booking_id, amount }) {
  const response = await fetch(`${BACKEND_API}/payments/razorpay/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ booking_id, amount }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Unable to start Razorpay checkout')
  return data
}

export async function verifyRazorpayPayment(payload) {
  const response = await fetch(`${BACKEND_API}/payments/razorpay/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data.verified) throw new Error(data.error || 'Payment verification failed')
  return data
}

export async function payBooking(bookingId, method) {
  const b = col('bookings').get(bookingId)
  if (!b) throw new Error('Booking not found')
  if (b.status === 'payment_completed') return // already paid — idempotent no-op
  const ride = col('rides').get(b.ride_id)
  const rider = col('users').get(b.rider_id)

  if (method === 'wallet') {
    if (rider.wallet_balance < b.fare) throw new Error('Insufficient wallet balance — recharge first')
    col('users').update(rider._id, { wallet_balance: rider.wallet_balance - b.fare })
    col('wallet_transactions').insert({
      user_id: rider._id, type: 'debit', amount: b.fare,
      balance_after: rider.wallet_balance - b.fare, reference: 'ride payment',
    })
  }
  // Driver receives the fare into their wallet for cashless methods.
  if (method !== 'cash' && ride) {
    const driver = col('users').get(ride.driver_id)
    col('users').update(driver._id, { wallet_balance: driver.wallet_balance + b.fare })
    col('wallet_transactions').insert({
      user_id: driver._id, type: 'credit', amount: b.fare,
      balance_after: driver.wallet_balance + b.fare, reference: 'ride earnings',
    })
  }
  col('payments').insert({ booking_id: bookingId, user_id: b.rider_id, amount: b.fare, method, status: 'success' })
  col('bookings').update(bookingId, { status: 'payment_completed' })
}

export async function walletFor(uid) {
  const u = col('users').get(uid)
  return {
    balance: u ? u.wallet_balance : 0,
    transactions: col('wallet_transactions')
      .find(t => t.user_id === uid)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
  }
}

export async function rechargeWallet(uid, amount, method) {
  const u = col('users').get(uid)
  col('users').update(uid, { wallet_balance: u.wallet_balance + +amount })
  col('wallet_transactions').insert({
    user_id: uid, type: 'credit', amount: +amount,
    balance_after: u.wallet_balance + +amount, reference: `wallet recharge (${method})`,
  })
}

// ---------- ratings ----------

export async function rateBooking(bookingId, stars) {
  const b = col('bookings').get(bookingId)
  if (!b) return
  const ride = col('rides').get(b.ride_id)
  if (!ride) return
  col('ratings').insert({ booking_id: bookingId, rater_id: b.rider_id, ratee_id: ride.driver_id, stars })
  const d = col('users').get(ride.driver_id)
  const count = d.rating_count + 1
  const avg = +(((d.rating_avg * d.rating_count) + stars) / count).toFixed(1)
  col('users').update(d._id, { rating_avg: avg, rating_count: count })
}

// ---------- chat ----------

export async function getConversations(user) {
  const mine = col('conversations').find(c =>
    c.company_id === user.company_id &&
    c.type === 'ride' &&
    c.participant_ids.includes(user._id) &&
    (() => {
      const ride = col('rides').get(c.ride_id)
      return ride && ['active', 'started', 'in_progress'].includes(ride.status)
    })()
  )
  const enrich = c => {
    const ride = col('rides').get(c.ride_id)
    const driver = ride ? col('users').get(ride.driver_id) : null
    return {
      ...c,
      title: ride ? `${ride.start_location.address.split(',')[0]} → ${ride.destination_location.address.split(',')[0]}` : 'Ride chat',
      subtitle: driver ? `Ride chat · driver ${driver.name}` : 'Ride chat',
      closed: false,
    }
  }
  const sorted = mine.map(enrich).sort((a, b) => (b.last_message_at || '').localeCompare(a.last_message_at || ''))
  return sorted
}

// Ride conversations are visible only to the booked rider and driver, and only
// while the ride is active. There are no organization-wide or standalone DMs.
function assertConversationAccess(convId, uid) {
  const conv = col('conversations').get(convId)
  if (!conv) throw new Error('Conversation not found')
  const u = col('users').get(uid)
  if (!u || u.company_id !== conv.company_id) throw new Error('Not authorized for this conversation')
  const ride = conv.type === 'ride' ? col('rides').get(conv.ride_id) : null
  const booking = ride && col('bookings').findOne(b =>
    b.ride_id === ride._id &&
    b.status !== 'cancelled' &&
    (b.rider_id === uid || ride.driver_id === uid)
  )
  if (!ride || !booking || !['active', 'started', 'in_progress'].includes(ride.status))
    throw new Error('This ride chat is only available during an active booking')
  if (!conv.participant_ids.includes(uid)) throw new Error('Not authorized for this conversation')
  return conv
}

export async function getMessages(convId, uid) {
  assertConversationAccess(convId, uid)
  return col('messages')
    .find(m => m.conversation_id === convId)
    .map(m => ({ ...m, sender: col('users').get(m.sender_id) }))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
}

export async function sendMessage(convId, uid, content) {
  requireActive(uid)
  const conv = assertConversationAccess(convId, uid)
  const msg = col('messages').insert({ conversation_id: convId, sender_id: uid, content })
  col('conversations').update(convId, { last_message_at: msg.created_at })
  return msg
}

// ---------- admin ----------

export async function adminListEmployees(companyId) {
  return col('users').find(u => u.company_id === companyId)
}

export async function adminAddEmployee(companyId, { name, email, phone, department, password }) {
  if (col('users').findOne(x => x.email.toLowerCase() === email.trim().toLowerCase()))
    throw new Error('An account with this email already exists')
  return col('users').insert({
    company_id: companyId, name, email: email.trim(), phone, department,
    password: password || 'welcome123', role: 'employee', status: 'active', has_onboarded: false,
    wallet_balance: 0, rating_avg: 0, rating_count: 0,
  })
}

export async function adminSetStatus(uid, status) {
  return col('users').update(uid, { status })
}

export async function adminListVehicles(companyId) {
  return col('vehicles')
    .find(v => v.company_id === companyId)
    .map(v => ({ ...v, owner: col('users').get(v.owner_id) }))
}

export async function adminAddVehicle(companyId, { owner_id, type, model, registration_number, seating_capacity, mileage_kmpl }) {
  if (col('vehicles').findOne(v => v.company_id === companyId && v.registration_number.toUpperCase() === registration_number.trim().toUpperCase()))
    throw new Error('A vehicle with this registration number is already registered')
  return col('vehicles').insert({
    company_id: companyId, owner_id, type, model,
    registration_number: registration_number.trim().toUpperCase(),
    seating_capacity: +seating_capacity, mileage_kmpl: +(mileage_kmpl || 15), status: 'active',
  })
}

export async function adminSetVehicleStatus(id, status) {
  return col('vehicles').update(id, { status })
}

// ADMIN SETTINGS
export async function adminUpdateCompany(companyId, updates) {
  return col('companies').update(companyId, updates)
}

export async function adminReports(companyId) {
  const company = col('companies').get(companyId)
  const cfg = company.carpool_config
  const employees = col('users').find(u => u.company_id === companyId)
  const vehicles = col('vehicles').find(v => v.company_id === companyId)
  const rides = col('rides').find(r => r.company_id === companyId)
  const bookings = col('bookings').find(b => {
    const ride = col('rides').get(b.ride_id)
    return ride && ride.company_id === companyId
  })
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const ridesThisMonth = rides.filter(r => new Date(r.created_at) >= monthStart).length
  const completed = rides.filter(r => r.status === 'completed')
  const totalDistance = completed.reduce((s, r) => s + (r.distance_km || 0), 0)
  const AVG_MILEAGE_KMPL = 15
  const fuelCost = Math.round(completed.reduce((sum, ride) => {
    const vehicle = col('vehicles').get(ride.vehicle_id)
    return sum + ((ride.distance_km || 0) / (vehicle?.mileage_kmpl || AVG_MILEAGE_KMPL)) * cfg.fuel_cost_per_liter
  }, 0))
  const vehicleWise = vehicles.map(v => {
    const vr = completed.filter(r => r.vehicle_id === v._id)
    const km = vr.reduce((s, r) => s + (r.distance_km || 0), 0)
    return {
      ...v, owner: col('users').get(v.owner_id),
      trips: vr.length, km: +km.toFixed(1),
      cost: Math.round((km / (v.mileage_kmpl || AVG_MILEAGE_KMPL)) * cfg.fuel_cost_per_liter),
    }
  })
  const activeRides = rides.filter(r => ['active', 'started', 'in_progress'].includes(r.status))
  const activeSeats = activeRides.reduce((sum, r) => sum + r.seats_available, 0)
  const sharedSeats = rides.reduce((sum, r) => sum + (r.seats_total - r.seats_available), 0)
  const paidBookings = bookings.filter(b => b.status === 'payment_completed')
  const drivers = new Set(rides.map(r => r.driver_id)).size
  const riders = new Set(bookings.map(b => b.rider_id)).size
  return {
    totalEmployees: employees.length,
    totalVehicles: vehicles.length,
    ridesThisMonth,
    totalTrips: completed.length,
    totalDistance: +totalDistance.toFixed(1),
    fuelCost,
    costPerKm: cfg.cost_per_km,
    utilization: rides.length ? Math.round((completed.length / rides.length) * 100) : 0,
    vehicleWise,
    totalBookings: bookings.filter(b => b.status !== 'cancelled').length,
    activeRides: activeRides.length,
    activeSeats,
    sharedSeats,
    drivers,
    riders,
    revenue: +paidBookings.reduce((sum, b) => sum + b.fare, 0).toFixed(2),
    averageFare: paidBookings.length ? +(paidBookings.reduce((sum, b) => sum + b.fare, 0) / paidBookings.length).toFixed(2) : 0,
  }
}

export { resetDb }

// --- Super Admin Mock API ---
export async function superadminListOrganizations() {
  const companies = col('companies').all()
  return companies.map(c => {
    const admin = col('users').findOne(u => u.company_id === c._id && u.role === 'admin')
    const empCount = col('users').find(u => u.company_id === c._id).length
    return {
      ...c,
      admin_name: admin ? admin.name : 'No Admin',
    admin_email: admin ? admin.email : 'N/A',
      employee_count: empCount,
      vehicle_count: col('vehicles').find(v => v.company_id === c._id).length,
      ride_count: col('rides').find(r => r.company_id === c._id).length,
      status: 'active'
    }
  })
}

export async function superadminGetStats() {
  const users = col('users').all()
  const rides = col('rides').all()
  return {
    total_organizations: col('companies').all().length,
    total_users: users.length,
    total_rides: rides.length,
    total_vehicles: col('vehicles').all().length,
    total_bookings: col('bookings').all().length,
    active_users: users.filter(u => u.status === 'active').length,
    completed_rides: rides.filter(r => r.status === 'completed').length,
  }
}

export async function completeOnboarding(data = {}) {
  const uid = localStorage.getItem(SESSION_KEY)
  if (!uid) throw new Error('Not authenticated')
  
  if (data.home) {
    col('saved_places').insert({ user_id: uid, label: 'Home', address: data.home.address, lat: data.home.lat || 23.0, lng: data.home.lng || 72.0 })
  }
  if (data.office) {
    col('saved_places').insert({ user_id: uid, label: 'Office', address: data.office.address, lat: data.office.lat || 23.0, lng: data.office.lng || 72.0 })
  }

  return col('users').update(uid, { has_onboarded: true })
}
