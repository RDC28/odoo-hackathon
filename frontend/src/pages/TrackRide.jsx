import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as api from '../api/api'
import { fetchRoute } from '../api/geo'
import MapView from '../components/MapView'

// Live Trip Tracking. In the real system the driver's phone streams GPS over a
// socket; here the movement is simulated along the actual OSRM route polyline.
export default function TrackRide() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [b, setB] = useState(null)
  const [coords, setCoords] = useState(null)
  const [progress, setProgress] = useState(0)
  const [running, setRunning] = useState(false)
  const doneRef = useRef(false)

  useEffect(() => {
    (async () => {
      const booking = await api.getBooking(id)
      setB(booking)
      if (!booking || !booking.ride) return
      let rc = booking.ride.route_coords
      if (!rc) {
        const r = await fetchRoute(booking.ride.start_location, booking.ride.destination_location)
        rc = r.coords
        await api.updateRideRoute(booking.ride._id, { route_coords: r.coords, distance_km: r.distance_km, duration_min: r.duration_min })
      }
      setCoords(rc)
    })()
  }, [id])

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setProgress(p => Math.min(1, p + 0.012)), 250)
    return () => clearInterval(t)
  }, [running])

  useEffect(() => {
    if (progress >= 1 && running && b && !doneRef.current) {
      doneRef.current = true
      setRunning(false)
      api.completeRide(b.ride._id).then(() => api.getBooking(id).then(setB))
    }
  }, [progress, running, b, id])

  if (!b || !b.ride) return <div className="page"><p className="muted">Loading…</p></div>

  const duration = b.ride.duration_min || 45
  const etaMin = Math.max(0, Math.ceil((1 - progress) * duration))
  const driverPos = coords && coords.length > 1 ? coords[Math.floor(progress * (coords.length - 1))] : null
  // Also treat the ride's real status as "arrived" so revisiting this page after
  // the trip already ended (e.g. after paying) shows the end state immediately,
  // instead of resetting to 0% and letting the driver re-run the simulation
  // (which would call completeRide again).
  const rideDone = b.ride.status === 'completed'
  const arrived = progress >= 1 || rideDone
  const alreadyPaid = b.status === 'payment_completed'

  async function startSim() {
    if (b.ride.status === 'started') await api.markInProgress(b.ride._id)
    setRunning(true)
  }

  return (
    <div className="page reference-page">
      <a className="back-link" href={`/app/trips/${id}`}>← Trip Detail</a>
      <h1>Track Ride</h1>
      <div className="card track-banner">
        {arrived
          ? <strong> Trip completed{alreadyPaid ? ' and paid' : ' — proceed to payment'}</strong>
          : running
            ? <strong> Coming in {etaMin} minutes</strong>
            : <strong>Trip {b.ride.status.replace(/_/g, ' ')} — waiting for driver movement</strong>}
      </div>
      <div className="card">
        <MapView
          polyline={coords}
          markers={[
            { lat: b.pickup_point.lat, lng: b.pickup_point.lng, label: 'Pickup' },
            { lat: b.drop_point.lat, lng: b.drop_point.lng, label: 'Destination' },
            ...(driverPos && running || (driverPos && progress > 0)
              ? [{ lat: driverPos[0], lng: driverPos[1], label: 'Driver', car: true }]
              : []),
          ]}
          height={380}
        />
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress * 100}%` }} /></div>
      </div>
      <div className="btn-row">
        {!running && !arrived && (
          <button className="btn btn-primary" onClick={startSim}>▶ Simulate live trip (prototype)</button>
        )}
        {arrived && !alreadyPaid && (
          <button className="btn btn-primary" onClick={() => navigate(`/app/trips/${id}/pay`)}> Pay Now (₹ {b.fare})</button>
        )}
        {arrived && alreadyPaid && <p className="muted"> This trip is completed and paid.</p>}
        <button className="btn btn-outline" onClick={() => navigate(`/app/trips/${id}`)}>← Trip Detail</button>
      </div>
      <p className="muted">
        Prototype note: driver GPS is simulated along the real road route. With the Flask backend,
        this screen subscribes to the <code>/tracking</code> socket instead.
      </p>
    </div>
  )
}

