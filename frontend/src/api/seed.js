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
      rating_avg: 0, rating_count: 0,
    })
    accounts.push({
      label: company.name + ' · ' + (role === 'admin' ? 'Admin' : name),
      email, password: 'demo123', organization: company.join_code,
    })
    return user
  }

  const vehicleImage = (type, model) => {
    const image = type === 'bike'
      ? 'photo-1558981806-ec527fa84c39'
      : model.includes('Nexon') ? 'photo-1492144534655-ae79c964c9d7'
        : model.includes('City') ? 'photo-1553440569-bcc63803a83d'
          : model.includes('Ertiga') || model.includes('Creta') ? 'photo-1544829099-b9a0c07fad1a'
            : model.includes('i10') || model.includes('Alto') ? 'photo-1502877338535-766e1452684a'
              : 'photo-1549317661-bd32c8ce0db2'
    return `https://images.unsplash.com/${image}?auto=format&fit=crop&w=640&q=80`
  }

  const makeVehicle = (company, owner, type, model, registration_number, seating_capacity, mileage_kmpl) =>
    (() => {
      const vehicle = col('vehicles').insert({
      company_id: company._id, owner_id: owner._id, type, model,
      registration_number, seating_capacity, mileage_kmpl, photo: vehicleImage(type, model), status: 'active',
      })
      const rating = +(4.4 + (owner.name.length % 6) * 0.1).toFixed(1)
      col('users').update(owner._id, { rating_avg: rating, rating_count: 6 + (owner.name.length % 15) })
      return vehicle
    })()

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

  const demoLocations = [
    ISKCON, INFOCITY, BOPAL, SATELLITE, SG_HIGHWAY, GIFT,
    { address: 'Prahlad Nagar, Ahmedabad', lat: 23.0124, lng: 72.5101 },
    { address: 'Vastrapur, Ahmedabad', lat: 23.0395, lng: 72.5293 },
    { address: 'Thaltej, Ahmedabad', lat: 23.0505, lng: 72.5070 },
    { address: 'Navrangpura, Ahmedabad', lat: 23.0350, lng: 72.5600 },
    { address: 'Paldi, Ahmedabad', lat: 23.0120, lng: 72.5620 },
    { address: 'Motera, Ahmedabad', lat: 23.0932, lng: 72.5970 },
    { address: 'Chandkheda, Ahmedabad', lat: 23.1090, lng: 72.5850 },
    { address: 'Raysan, Gandhinagar', lat: 23.1830, lng: 72.6380 },
  ]
  const vehicleSpecs = [
    ['car', 'Maruti Suzuki Swift', 4, 18.2],
    ['car', 'Hyundai Grand i10', 4, 17.5],
    ['car', 'Tata Nexon', 4, 16.8],
    ['car', 'Honda City', 4, 15.2],
    ['van', 'Maruti Ertiga', 6, 14.1],
  ]

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
  col('ratings').insert({ booking_id: history.booking._id, rater_id: priya._id, ratee_id: raj._id, stars: 5, comment: 'Smooth ride and a very helpful driver.' })

  ;[
    [admin, 'Office', INFOCITY], [raj, 'Home', ISKCON], [raj, 'Office', INFOCITY],
    [krishna, 'Home', BOPAL], [krishna, 'Office', INFOCITY],
    [neha, 'Home', SATELLITE], [neha, 'Office', GIFT],
    [priya, 'Home', ISKCON], [priya, 'Office', INFOCITY],
    [arjun, 'Home', BOPAL], [arjun, 'Office', INFOCITY],
  ].forEach(([user, label, place]) => col('saved_places').insert({ user_id: user._id, label, ...place }))

  // A dense local network keeps the canonical demo rider's map populated.
  ;[[raj, dzire], [krishna, alto], [neha, scooter]].forEach(([driver, vehicle], driverIndex) => {
    for (let rideIndex = 0; rideIndex < 7; rideIndex += 1) {
      const ride = makeRide(
        company, driver, vehicle,
        demoLocations[(driverIndex + rideIndex + 1) % demoLocations.length],
        demoLocations[(driverIndex + rideIndex + 4) % demoLocations.length],
        7 + ((driverIndex + rideIndex) % 4), vehicle.seating_capacity,
        85 + (rideIndex % 4) * 15, rideIndex % 2,
        ['Mo', 'Tu', 'We', 'Th', 'Fr'],
      )
      if (rideIndex % 4 === 0) makeBooking(ride, [priya, arjun][(driverIndex + rideIndex) % 2])
    }
  })

  // Golden-path showcase data: Priya can search ISKCON Cross Road ->
  // Infocity today and see a dense, varied set of nearby driver pins.
  const showcaseStarts = [ISKCON, SATELLITE, demoLocations[7], demoLocations[9], BOPAL, SG_HIGHWAY]
  const showcaseDestinations = [INFOCITY, GIFT, demoLocations[13], INFOCITY, GIFT, demoLocations[13]]
  ;[[raj, dzire], [krishna, alto], [neha, scooter]].forEach(([driver, vehicle], driverIndex) => {
    for (let showcaseIndex = driverIndex; showcaseIndex < 12; showcaseIndex += 3) {
      makeRide(
        company, driver, vehicle,
        showcaseStarts[showcaseIndex % showcaseStarts.length],
        showcaseDestinations[showcaseIndex % showcaseDestinations.length],
        8 + (showcaseIndex % 8), vehicle.seating_capacity,
        90 + (showcaseIndex % 5) * 10, 0,
        ['Mo', 'Tu', 'We', 'Th', 'Fr'],
      )
    }
  })

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

  const generatedCompanies = [
    { name: 'Vertex Mobility', industry: 'Mobility', address: 'Prahlad Nagar, Ahmedabad', code: 'VERTEX26' },
    { name: 'Nimbus Analytics', industry: 'Analytics', address: 'Vastrapur, Ahmedabad', code: 'NIMBUS26' },
    { name: 'Greenfield Foods', industry: 'Food Services', address: 'Thaltej, Ahmedabad', code: 'GREEN26' },
  ]
  const generatedNames = [
    'Aarav Mehta', 'Ishita Shah', 'Kabir Joshi', 'Meera Patel',
    'Vihaan Desai', 'Anaya Rao', 'Aditya Trivedi', 'Kiara Mehta',
    'Yash Kapoor', 'Riya Soni', 'Dhruv Parmar', 'Tara Shah',
  ]
  const generatedDepartments = ['Engineering', 'Operations', 'Sales', 'Design', 'Finance', 'Human Resources']

  generatedCompanies.forEach((config, companyIndex) => {
    const generatedCompany = makeCompany(config)
    const employees = []
    makeUser(generatedCompany, `${config.name} Admin`, `admin@${config.code.toLowerCase()}.com`, 'Administration', 'admin')
    generatedNames.forEach((name, personIndex) => {
      const email = `${name.toLowerCase().replaceAll(' ', '.')}.${companyIndex + 3}@demo.ascend.local`
      const employee = makeUser(generatedCompany, name, email, generatedDepartments[personIndex % generatedDepartments.length])
      employees.push(employee)
      col('saved_places').insert({ user_id: employee._id, label: 'Home', ...demoLocations[(personIndex + companyIndex) % demoLocations.length] })
      col('saved_places').insert({ user_id: employee._id, label: 'Office', ...demoLocations[(personIndex + companyIndex + 1) % demoLocations.length] })
    })

    const drivers = employees.slice(0, 6)
    const riders = employees.slice(6)
    const vehicles = drivers.map((driver, vehicleIndex) => {
      const spec = vehicleSpecs[vehicleIndex % vehicleSpecs.length]
      return makeVehicle(
        generatedCompany, driver, spec[0], spec[1],
        `GJ${String(companyIndex + 7).padStart(2, '0')}${String(vehicleIndex + 1).padStart(2, '0')}D${companyIndex}${vehicleIndex}`,
        spec[2], spec[3],
      )
    })

    drivers.forEach((driver, driverIndex) => {
      const vehicle = vehicles[driverIndex]
      for (let rideIndex = 0; rideIndex < 8; rideIndex += 1) {
        const ride = makeRide(
          generatedCompany, driver, vehicle,
          demoLocations[(driverIndex + rideIndex + companyIndex) % demoLocations.length],
          demoLocations[(driverIndex + rideIndex + 3 + companyIndex) % demoLocations.length],
          7 + ((driverIndex + rideIndex) % 4), vehicle.seating_capacity,
          75 + (rideIndex % 5) * 15, rideIndex % 3,
          ['Mo', 'Tu', 'We', 'Th', 'Fr'],
        )
        if (rideIndex % 3 === 0) makeBooking(ride, riders[(driverIndex + rideIndex) % riders.length])
        if (rideIndex === 1) makeBooking(ride, riders[(driverIndex + rideIndex + 1) % riders.length])
      }
      for (let historyIndex = 0; historyIndex < 3; historyIndex += 1) {
        const history = makeRide(
          generatedCompany, driver, vehicle,
          demoLocations[(driverIndex + historyIndex + 2) % demoLocations.length],
          demoLocations[(driverIndex + historyIndex + 5) % demoLocations.length],
          8 + historyIndex, vehicle.seating_capacity,
          80 + historyIndex * 10, -(historyIndex + 1), [],
        )
        const historyBooking = makeBooking(history, riders[(driverIndex + historyIndex) % riders.length], 1, 'payment_completed')
        col('rides').update(history._id, { status: 'completed' })
        col('messages').insert({ conversation_id: historyBooking.conversation._id, sender_id: historyBooking.booking.rider_id, content: 'Thanks for the smooth ride!' })
      }
    })
  })

  const suspended = makeUser(company, 'Demo Suspended User', 'suspended@demo.com', 'Operations')
  col('users').update(suspended._id, { status: 'suspended' })
  const inactiveVehicle = makeVehicle(company, suspended, 'car', 'Demo Inactive Car', 'GJ99ZZ0001', 4, 14)
  col('vehicles').update(inactiveVehicle._id, { status: 'inactive' })
  col('users').update(suspended._id, { rating_avg: 0, rating_count: 0 })

  const superAdmin = col('users').insert({
    company_id: null, name: 'Super Admin', email: 'superadmin@platform.com',
    phone: '', password: 'superadmin123', role: 'superadmin', status: 'active',
    department: 'Platform Operations', wallet_balance: 0, rating_avg: 0, rating_count: 0,
  })

  const addNotice = (user, type, title, body, link, icon = 'notifications') => col('notifications').insert({
    user_id: user._id, type, title, body, link, icon, read: false,
  })
  addNotice(priya, 'booking', 'Booking request sent', 'Your seat request to Infocity is waiting for driver approval.', '/app/trips', 'event_seat')
  addNotice(priya, 'payment', 'Payment available', 'Your completed Infocity trip is ready for payment.', '/app/trips', 'payments')
  addNotice(raj, 'approval', 'Passenger approval needed', 'A passenger is waiting for your approval before the ride can start.', '/app/trips', 'person_check')
  addNotice(admin, 'admin', 'Review employee access', 'Pending and suspended employee accounts are ready for review.', '/admin/employees', 'manage_accounts')
  addNotice(admin, 'admin', 'Fleet snapshot ready', 'Review registered vehicles and their operating details.', '/admin/vehicles', 'directions_car')
  addNotice(superAdmin, 'platform', 'Platform operations ready', 'Review organization health and recent activity.', '/superadmin/overview', 'monitoring')
  addNotice(superAdmin, 'platform', 'Organization directory updated', 'The seeded platform now includes multiple tenant workspaces.', '/superadmin/organizations', 'business')

  return { joinCode: company.join_code, joinCodes: companies.map(c => c.code), accounts, organizations: companies.map(c => c.name) }
}
