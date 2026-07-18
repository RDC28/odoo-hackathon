import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api/api'
import { useAuth } from '../context/AuthContext'
import { badgeClass } from './Dashboard'

export default function MyTrips() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [offered, setOffered] = useState([])

  const load = () => {
    api.myBookings(user._id).then(setBookings)
    api.myOfferedRides(user._id).then(rs => setOffered(rs.filter(r => r.status !== 'completed' && r.status !== 'cancelled')))
  }
  useEffect(load, [user._id])

  async function start(r) { await api.startRide(r._id); load() }
  async function complete(r) { await api.completeRide(r._id); load() }
  async function cancel(r) {
    if (confirm('Cancel this ride? All passenger bookings will be cancelled.')) { await api.cancelRide(r._id); load() }
  }

  return (
    <div className="page">
      <h1>My Trips</h1>

      <h2>As passenger</h2>
      {bookings.length === 0 && <div className="card"><p className="muted">No active trips. <Link to="/app/find">Find a ride →</Link></p></div>}
      {bookings.map(b => (
        <Link key={b._id} to={`/app/trips/${b._id}`} className="card ride-card">
          <div>
            <strong>{b.pickup_point.address.split(',')[0]} → {b.drop_point.address.split(',')[0]}</strong>
            <div className="muted">
               {b.ride ? new Date(b.ride.departure_at).toLocaleString() : ''} · driver {b.driver ? b.driver.name : '—'} · ₹ {b.fare}
            </div>
          </div>
          <span className={'badge ' + badgeClass(b.status)}>{b.status.replace(/_/g, ' ')}</span>
        </Link>
      ))}

      <h2>As driver</h2>
      {offered.length === 0 && <div className="card"><p className="muted">You're not offering any rides. <Link to="/app/offer">Offer a ride →</Link></p></div>}
      {offered.map(r => (
        <div key={r._id} className="card">
          <div className="ride-card">
            <div>
              <strong>{r.start_location.address.split(',')[0]} → {r.destination_location.address.split(',')[0]}</strong>
              <div className="muted">
                 {new Date(r.departure_at).toLocaleString()} · {r.vehicle ? r.vehicle.model : ''} · ₹ {r.price_per_seat}/seat ·
                {' '}{r.seats_total - r.seats_available}/{r.seats_total} seats booked
              </div>
            </div>
            <span className={'badge ' + badgeClass(r.status)}>{r.status.replace(/_/g, ' ')}</span>
          </div>
          {r.bookings.length > 0 && (
            <div className="passenger-list">
              {r.bookings.map(b => (
                <span key={b._id} className="chip"> {b.rider ? b.rider.name : '—'} · {b.seats_booked} seat{b.seats_booked > 1 ? 's' : ''}</span>
              ))}
            </div>
          )}
          <div className="btn-row">
            {r.status === 'active' && <button className="btn btn-primary btn-sm" onClick={() => start(r)}>Start Trip</button>}
            {['started', 'in_progress'].includes(r.status) && (
              <button className="btn btn-primary btn-sm" onClick={() => complete(r)}>Complete Trip</button>
            )}
            {r.status === 'active' && <button className="btn btn-danger btn-sm" onClick={() => cancel(r)}>Cancel Ride</button>}
          </div>
        </div>
      ))}
    </div>
  )
}

