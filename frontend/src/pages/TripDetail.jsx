import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as api from '../api/api'
import MapView from '../components/MapView'
import { formatDateTime, shortAddress, statusLabel, tripBadgeClass } from '../utils'

export default function TripDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [b, setB] = useState(null)

  const load = () => api.getBooking(id).then(setB)
  useEffect(() => { load() }, [id])

  if (!b) return <div className="page"><p className="muted">Loading…</p></div>

  const canTrack = b.ride && ['started', 'in_progress'].includes(b.ride.status)
  const needsPayment = ['payment_pending'].includes(b.status)
  const chatAvailable = b.ride && ['active', 'started', 'in_progress'].includes(b.ride.status)

  return (
    <div className="page reference-page">
      <a className="back-link" href="/app/trips">← My Trips</a>
      <div className="btn-row space-between">
        <h1>Trip Detail</h1>
        <span className={'badge ' + tripBadgeClass(b.status)}>{statusLabel(b.status)}</span>
      </div>

      <div className="card">
        <MapView
          polyline={b.ride && b.ride.route_coords}
          markers={[
            { id: 'pickup', lat: b.pickup_point.lat, lng: b.pickup_point.lng, kind: 'pickup', label: 'Pickup: ' + shortAddress(b.pickup_point.address) },
            { id: 'drop', lat: b.drop_point.lat, lng: b.drop_point.lng, kind: 'drop', label: 'Drop: ' + shortAddress(b.drop_point.address) },
          ]}
          height={260}
        />
        <div className="detail-grid">
          <div><span className="muted">Pickup point</span><br /><strong>{b.pickup_point.address.split(',').slice(0, 2).join(',')}</strong></div>
          <div><span className="muted">Drop point</span><br /><strong>{b.drop_point.address.split(',').slice(0, 2).join(',')}</strong></div>
          <div><span className="muted">Departure</span><br /><strong>{formatDateTime(b.ride?.departure_at) || '—'}</strong></div>
          <div><span className="muted">Fare</span><br /><strong>₹ {b.fare} ({b.seats_booked} seat{b.seats_booked > 1 ? 's' : ''})</strong></div>
        </div>
      </div>

      <div className="card">
        <h3>Driver & Vehicle</h3>
        <div className="detail-grid">
          <div><span className="muted">Driver</span><br /><strong>{b.driver ? b.driver.name : '—'}</strong></div>
          <div><span className="muted">Phone</span><br /><strong>{b.driver ? b.driver.phone : '—'}</strong></div>
          <div><span className="muted">Vehicle</span><br /><strong>{b.vehicle ? b.vehicle.model : '—'}</strong></div>
          <div><span className="muted">Registration</span><br /><strong>{b.vehicle ? b.vehicle.registration_number : '—'}</strong></div>
        </div>
        {b.status === 'booked' && b.driver_approval === 'pending' && (
          <div className="approval-banner"><span className="material-symbols-rounded">hourglass_top</span><div><strong>Waiting for driver approval</strong><p className="muted">The driver must approve your seat before the ride can start.</p></div></div>
        )}
        <div className="btn-row">
          {chatAvailable && <Link className="btn btn-outline" to={`/app/chat?c=${b.conversation_id}`}>Chat with Driver</Link>}
          {b.driver && <a className="btn btn-outline" href={`tel:${b.driver.phone}`}> Call Driver</a>}
        </div>
      </div>

      <div className="btn-row">
        {canTrack && <button className="btn btn-primary" onClick={() => navigate(`/app/trips/${b._id}/track`)}> Track Ride</button>}
        {needsPayment && <button className="btn btn-primary" onClick={() => navigate(`/app/trips/${b._id}/pay`)}> Pay Now (₹ {b.fare})</button>}
        {b.status === 'booked' && (
          <button
            className="btn btn-danger"
            onClick={async () => { if (confirm(b.driver_approval === 'pending' ? 'Reject this ride request?' : 'Cancel this booking?')) { await api.rejectBooking(b._id); navigate('/app/trips') } }}
          >
            {b.driver_approval === 'pending' ? 'Reject Ride' : 'Cancel Booking'}
          </button>
        )}
      </div>
    </div>
  )
}

