// Reproducible demo dataset for company isolation, vehicles, capacity,
// bookings, ride chat, history, and admin screens.
import { col, resetDb } from './db'

const ISKCON = { address: 'ISKCON Cross Road, Ahmedabad', lat: 23.0295, lng: 72.5062 }
const INFOCITY = { address: 'Infocity, Gandhinagar', lat: 23.1893, lng: 72.6367 }
const BOPAL = { address: 'Bopal, Ahmedabad', lat: 23.0202, lng: 72.4627 }
const SATELLITE = { address: 'Satellite, Ahmedabad', lat: 23.0301, lng: 72.5067 }
const SG_HIGHWAY = { address: 'SG Highway, Ahmedabad', lat: 23.0734, lng: 72.5258 }
const GIFT = { address: 'GIFT City, Gandhinagar', lat: 23.1631, lng: 72.6369 }

function todayAt(hour, minute = 0, addDays = 0) {
  const date = new Date()
  date.setDate(date.getDate() + addDays)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

export function seedDemo() {
  resetDb()
  const accounts = []
  const companies = [
    { name: 'Odoo Pvt. Ltd.', industry: 'Software', address: 'Gandhinagar, Gujarat', code: 'DEMO01' },
    { name: 'Acme Technologies', industry: 'Technology', address: 'Ahmedabad, Gujarat', code: 'ACME01' },
  ]

  const makeCompany = config => col('companies').insert({
    name: config.name,
    industry: config.industry,
    registered_address: config.address,
    admin_contact: 'admin@' + config.code.toLowerCase() + '.com',
    join_code: config.code,
    carpool_config: { fuel_cost_per_liter: 96.5, cost_per_km: 8, travel_cost_operational_per_km: 2.5 },
  })

  const makeUser = (company, name, email, department, role = 'employee') => {
    const user = col('users').insert({
      company_id: company._id, name, email, phone: '+91 9800000000',
      password: 'demo123', role, status: 'active', has_onboarded: true,
      department, wallet_balance: role === 'admin' ? 0 : 800,
      rating_avg: role === 'admin' ? 0 : 4.7, rating_count: role === 'admin' ? 0 : 8,
    })
    accounts.push({
      label: company.name + ' · ' + (role === 'admin' ? 'Admin' : name),
      email, password: 'demo123', organization: company.join_code,
    })
    return user
  }

  const makeVehicle = (company, owner, type, model, registration_number, seating_capacity, mileage_kmpl) =>
    col('vehicles').insert({
      company_id: company._id, owner_id: owner._id, type, model,
      registration_number, seating_capacity, mileage_kmpl, status: 'active',
    })

  const makeRide = (company, driver, vehicle, start, destination, hour, seats, price, addDays = 0, recurring_days = []) =>
    col('rides').insert({
      company_id: company._id, driver_id: driver._id, vehicle_id: vehicle._id,
      start_location: start, destination_location: destination,
      departure_at: todayAt(hour, 0, addDays), recurring_days,
      seats_total: seats, seats_available: seats, price_per_seat: price,
      route_coords: null, distance_km: 26.4, duration_min: 45, status: 'active',
    })

  const makeBooking = (ride, rider, seats = 1, status = 'booked') => {
    const conversation = col('conversations').insert({
      company_id: ride.company_id, type: 'ride',
      participant_ids: [rider._id, ride.driver_id], ride_id: ride._id,
      last_message_at: new Date().toISOString(),
    })
    const booking = col('bookings').insert({
      ride_id: ride._id, rider_id: rider._id, seats_booked: seats,
      pickup_point: ride.start_location, drop_point: ride.destination_location,
      fare: ride.price_per_seat * seats, status, conversation_id: conversation._id,
    })
    const currentRide = col('rides').get(ride._id)
    col('rides').update(ride._id, { seats_available: currentRide.seats_available - seats })
    return { booking, conversation }
  }

  const company = makeCompany(companies[0])
  const admin = makeUser(company, 'Amit Shah', 'admin@demo.com', 'Administration', 'admin')
  const raj = makeUser(company, 'Raj Patel', 'raj@demo.com', 'Engineering')
  const krishna = makeUser(company, 'Krishna Singh', 'krishna@demo.com', 'Sales')
  const neha = makeUser(company, 'Neha Joshi', 'neha@demo.com', 'Design')
  const priya = makeUser(company, 'Priya Nair', 'priya@demo.com', 'HR')
  const arjun = makeUser(company, 'Arjun Mehta', 'arjun@demo.com', 'Finance')

  const dzire = makeVehicle(company, raj, 'car', 'Swift Dzire', 'GJ01AB1234', 4, 16.5)
  const alto = makeVehicle(company, krishna, 'car', 'Alto 800', 'GJ01AB5034', 3, 19)
  const scooter = makeVehicle(company, neha, 'bike', 'Ather 450X', 'GJ01CD7799', 1, 40)

  const rajRide = makeRide(company, raj, dzire, ISKCON, INFOCITY, 19, 4, 120, 0, ['Mo', 'Tu', 'We', 'Th', 'Fr'])
  makeRide(company, krishna, alto, BOPAL, INFOCITY, 20, 3, 100)
  makeRide(company, neha, scooter, SATELLITE, GIFT, 18, 1, 80, 1)
  const completedRide = makeRide(company, raj, dzire, INFOCITY, ISKCON, 8, 4, 110, -1)
  col('rides').update(completedRide._id, { status: 'completed', seats_available: 3 })

  makeBooking(rajRide, priya, 1)
  makeBooking(rajRide, arjun, 1)
  const history = makeBooking(completedRide, priya, 1, 'payment_completed')
  col('messages').insert({ conversation_id: history.conversation._id, sender_id: priya._id, content: 'Thanks for the ride!' })

  ;[
    [admin, 'Office', INFOCITY], [raj, 'Home', ISKCON], [raj, 'Office', INFOCITY],
    [krishna, 'Home', BOPAL], [krishna, 'Office', INFOCITY],
    [neha, 'Home', SATELLITE], [neha, 'Office', GIFT],
    [priya, 'Home', ISKCON], [priya, 'Office', INFOCITY],
    [arjun, 'Home', BOPAL], [arjun, 'Office', INFOCITY],
  ].forEach(([user, label, place]) => col('saved_places').insert({ user_id: user._id, label, ...place }))

  const secondCompany = makeCompany(companies[1])
  const acmeAdmin = makeUser(secondCompany, 'Maya Rao', 'admin@acme01.com', 'Administration', 'admin')
  const maya = makeUser(secondCompany, 'Maya Driver', 'maya@acme01.com', 'Operations')
  const rohan = makeUser(secondCompany, 'Rohan Das', 'rohan@acme01.com', 'Product')
  const sara = makeUser(secondCompany, 'Sara Khan', 'sara@acme01.com', 'Marketing')
  const dev = makeUser(secondCompany, 'Dev Patel', 'dev@acme01.com', 'Support')

  const creta = makeVehicle(secondCompany, maya, 'car', 'Hyundai Creta', 'GJ05EF4421', 5, 14.5)
  const nexon = makeVehicle(secondCompany, sara, 'car', 'Tata Nexon', 'GJ05GH8810', 4, 17)
  makeVehicle(secondCompany, dev, 'bike', 'Honda Activa', 'GJ06JK1188', 1, 45)
  const mayaRide = makeRide(secondCompany, maya, creta, SG_HIGHWAY, GIFT, 18, 5, 140, 0, ['Mo', 'Tu', 'We', 'Th', 'Fr'])
  makeRide(secondCompany, sara, nexon, BOPAL, SG_HIGHWAY, 8, 4, 90, 1)
  makeBooking(mayaRide, rohan, 2)
  makeBooking(mayaRide, dev, 1)
  col('saved_places').insert({ user_id: acmeAdmin._id, label: 'Office', ...GIFT })
  col('saved_places').insert({ user_id: maya._id, label: 'Home', ...SG_HIGHWAY })
  col('saved_places').insert({ user_id: rohan._id, label: 'Home', ...BOPAL })
  col('saved_places').insert({ user_id: sara._id, label: 'Office', ...GIFT })
  col('saved_places').insert({ user_id: dev._id, label: 'Home', ...SATELLITE })

  col('users').insert({
    company_id: null, name: 'Super Admin', email: 'superadmin@platform.com',
    phone: '', password: 'superadmin123', role: 'superadmin', status: 'active',
    department: 'Platform Operations', wallet_balance: 0, rating_avg: 0, rating_count: 0,
  })

  return { joinCode: company.join_code, joinCodes: companies.map(c => c.code), accounts, organizations: companies.map(c => c.name) }
}
