import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api/api'
import { useAuth } from '../context/AuthContext'
import { formatDateTime, shortAddress, statusLabel, tripBadgeClass } from '../utils'

export default function MyTrips() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [offered, setOffered] = useState([])
  const [error, setError] = useState('')

  const load = () => {
    api.myBookings(user._id).then(setBookings)
    api.myOfferedRides(user._id).then(rs => setOffered(rs.filter(r => r.status !== 'completed' && r.status !== 'cancelled')))
  }
  useEffect(load, [user._id])

  async function start(r) { setError(''); try { await api.startRide(r._id); load() } catch (err) { setError(err.message) } }
  async function complete(r) { await api.completeRide(r._id); load() }
  async function approve(b) { setError(''); try { await api.approveBooking(b._id); load() } catch (err) { setError(err.message) } }
  async function cancel(r) {
    if (confirm('Cancel this ride? All passenger bookings will be cancelled.')) { await api.cancelRide(r._id); load() }
  }

  return (
    <div className="page">
      <h1>My Trips</h1>
      {error && <div className="error">{error}</div>}

      <h2>As passenger</h2>
      {bookings.length === 0 && <div className="card"><p className="muted">No active trips. <Link to="/app/find">Find a ride →</Link></p></div>}
      {bookings.map(b => (
        <Link key={b._id} to={`/app/trips/${b._id}`} className="card ride-card">
          <div>
          <strong>{shortAddress(b.pickup_point.address)} → {shortAddress(b.drop_point.address)}</strong>
            <div className="muted">
               {formatDateTime(b.ride?.departure_at)} · driver {b.driver ? b.driver.name : '—'} · ₹ {b.fare}
            </div>
          </div>
          <span className={'badge ' + tripBadgeClass(b.status)}>{statusLabel(b.status)}</span>
        </Link>
      ))}

      <h2>As driver</h2>
      {offered.length === 0 && <div className="card"><p className="muted">You're not offering any rides. <Link to="/app/offer">Offer a ride →</Link></p></div>}
      {offered.map(r => (
        <div key={r._id} className="card">
          <div className="ride-card" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {r.vehicle?.photo ? (
              <img src={r.vehicle.photo} alt={r.vehicle.model} style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px' }} />
            ) : (
              <div style={{ width: '64px', height: '64px', backgroundColor: 'var(--border-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '2rem', color: 'var(--muted-color)' }}>directions_car</span>
              </div>
            )}
            <div style={{ flex: 1 }}>
             <strong>{shortAddress(r.start_location.address)} → {shortAddress(r.destination_location.address)}</strong>
              <div className="muted">
                 {formatDateTime(r.departure_at)} · {r.vehicle ? r.vehicle.model : ''} · ₹ {r.price_per_seat}/seat ·
                {' '}{r.seats_total - r.seats_available}/{r.seats_total} seats booked
              </div>
            </div>
            <span className={'badge ' + tripBadgeClass(r.status)}>{statusLabel(r.status)}</span>
          </div>
          {r.bookings.length > 0 && (
            <div className="passenger-list">
              {r.bookings.map(b => (
                <span key={b._id} className="passenger-approval-row">
                  <span className="chip">{b.rider ? b.rider.name : '—'} · {b.seats_booked} seat{b.seats_booked > 1 ? 's' : ''}</span>
                  {(b.driver_approval || 'approved') === 'pending' ? <button className="btn btn-primary btn-xs" onClick={() => approve(b)}><span className="material-symbols-rounded">check</span> Approve</button> : <span className="badge badge-green">Approved</span>}
                </span>
              ))}
            </div>
          )}
          <div className="btn-row">
            {r.status === 'active' && <button className="btn btn-primary btn-sm" disabled={r.bookings.some(b => (b.driver_approval || 'approved') === 'pending')} onClick={() => start(r)}><span className="material-symbols-rounded">play_arrow</span> Start Trip</button>}
            {r.status === 'active' && r.bookings.some(b => (b.driver_approval || 'approved') === 'pending') && <span className="muted approval-hint">Approve each passenger before starting.</span>}
            {['started', 'in_progress'].includes(r.status) && (
              <>
                {r.bookings.length > 0 && <Link className="btn btn-primary btn-sm" to={`/app/trips/${r.bookings[0]._id}/track`}>Open Live Map</Link>}
                <button className="btn btn-outline btn-sm" onClick={() => complete(r)}>Complete Trip</button>
              </>
            )}
            {r.status === 'active' && <button className="btn btn-danger btn-sm" onClick={() => cancel(r)}>Cancel Ride</button>}
          </div>
        </div>
      ))}
    </div>
  )
}

