// One-click demo data so judges/testers can explore without setup.
import { col, resetDb } from './db'

const ISKCON = { address: 'ISKCON Cross Road, Ahmedabad', lat: 23.0295, lng: 72.5062 }
const INFOCITY = { address: 'Infocity, Gandhinagar', lat: 23.1893, lng: 72.6367 }

function todayAt(h, m = 0, addDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + addDays)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export function seedDemo() {
  resetDb()
  const company = col('companies').insert({
    name: 'Odoo Pvt. Ltd.', industry: 'Software',
    registered_address: 'Gandhinagar', admin_contact: 'admin@demo.com',
    join_code: 'DEMO01',
    carpool_config: { fuel_cost_per_liter: 96.5, cost_per_km: 8, travel_cost_operational_per_km: 2.5 },
  })
  const b1 = col('company_branches').insert({ company_id: company._id, name: 'Odoo Gandhinagar HQ', address: 'Gandhinagar, Gujarat', lat: 23.1893, lng: 72.6367 })
  const b2 = col('company_branches').insert({ company_id: company._id, name: 'Odoo Ahmedabad Office', address: 'Satellite, Ahmedabad', lat: 23.0295, lng: 72.5062 })

  const mkUser = (name, email, department, role = 'employee') =>
    col('users').insert({
      company_id: company._id, name, email, phone: '+91 9800000000',
      password: 'demo123', role, status: 'active', has_onboarded: true,
      department, wallet_balance: 500, rating_avg: 4.8, rating_count: 6,
    })
  const admin = mkUser('Amit Shah', 'admin@demo.com', 'Administration', 'admin')
  const raj = mkUser('Raj Patel', 'raj@demo.com', 'Engineering')
  const krishna = mkUser('Krishna Singh', 'krishna@demo.com', 'Sales')
  const priya = mkUser('Priya Nair', 'priya@demo.com', 'HR')

  // Super Admin
  col('users').insert({
    company_id: null, name: 'Super Admin', email: 'superadmin@platform.com', phone: '',
    password: 'superadmin123', role: 'superadmin', status: 'active',
    department: 'Platform Operations', wallet_balance: 0, rating_avg: 0, rating_count: 0,
  })

  const dzire = col('vehicles').insert({
    company_id: company._id, owner_id: raj._id, type: 'car',
    model: 'Swift Dzire', registration_number: 'GJ01AB1234', seating_capacity: 4, status: 'active',
  })
  const alto = col('vehicles').insert({
    company_id: company._id, owner_id: krishna._id, type: 'car',
    model: 'Alto 800', registration_number: 'GJ01AB5034', seating_capacity: 3, status: 'active',
  })

  col('rides').insert({
    company_id: company._id, driver_id: raj._id, vehicle_id: dzire._id,
    start_location: ISKCON, destination_location: INFOCITY,
    departure_at: todayAt(19), recurring_days: ['Mo', 'Tu', 'We', 'Th', 'Fr'],
    seats_total: 3, seats_available: 3, price_per_seat: 120,
    route_coords: null, distance_km: 26.4, duration_min: 45, status: 'active',
  })
  col('rides').insert({
    company_id: company._id, driver_id: krishna._id, vehicle_id: alto._id,
    start_location: ISKCON, destination_location: INFOCITY,
    departure_at: todayAt(20), recurring_days: [],
    seats_total: 2, seats_available: 2, price_per_seat: 100,
    route_coords: null, distance_km: 26.4, duration_min: 45, status: 'active',
  })

  // Assign Home & Office (Branch) to employees
  col('saved_places').insert({ user_id: admin._id, label: b1.name, address: b1.address, lat: b1.lat, lng: b1.lng })
  col('saved_places').insert({ user_id: raj._id, label: 'Home', ...ISKCON })
  col('saved_places').insert({ user_id: raj._id, label: b1.name, address: b1.address, lat: b1.lat, lng: b1.lng })
  col('saved_places').insert({ user_id: krishna._id, label: 'Home', ...INFOCITY })
  col('saved_places').insert({ user_id: krishna._id, label: b2.name, address: b2.address, lat: b2.lat, lng: b2.lng })
  col('saved_places').insert({ user_id: priya._id, label: 'Home', ...ISKCON })
  col('saved_places').insert({ user_id: priya._id, label: b1.name, address: b1.address, lat: b1.lat, lng: b1.lng })

  const global = col('conversations').insert({
    company_id: company._id, type: 'global', participant_ids: [],
    last_message_at: new Date().toISOString(),
  })
  col('messages').insert({ conversation_id: global._id, sender_id: raj._id, content: 'Leaving ISKCON at 7 PM today, 3 seats free — ride is published ' })
  col('messages').insert({ conversation_id: global._id, sender_id: krishna._id, content: 'I have a 8 PM one too if anyone works late!' })

  return {
    joinCode: 'DEMO01',
    accounts: [
      { label: 'Admin', email: 'admin@demo.com', password: 'demo123' },
      { label: 'Driver (Raj)', email: 'raj@demo.com', password: 'demo123' },
      { label: 'Driver (Krishna)', email: 'krishna@demo.com', password: 'demo123' },
      { label: 'Passenger (Priya)', email: 'priya@demo.com', password: 'demo123' },
    ],
  }
}

