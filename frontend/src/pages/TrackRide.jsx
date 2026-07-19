import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as api from '../api/api'
import { fetchRoute } from '../api/geo'
import MapView from '../components/MapView'
import { useAuth } from '../context/AuthContext'
import { statusLabel } from '../utils'

// Live Trip Tracking. In the real system the driver's phone streams GPS over a
// socket; here the movement is simulated along the actual OSRM route polyline.
export default function TrackRide() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [b, setB] = useState(null)
  const [coords, setCoords] = useState(null)
  const [progress, setProgress] = useState(0)
  const [running, setRunning] = useState(false)
  const [simulationDone, setSimulationDone] = useState(false)

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
    // Simulated playback: the whole trip replays in 90 seconds, with the
    // marker following the real OSRM route geometry below.
    const timer = setInterval(() => setProgress(p => Math.min(1, p + 0.25 / 90)), 250)
    return () => clearInterval(timer)
  }, [running])

  useEffect(() => {
    if (progress >= 1 && running) {
      setRunning(false)
      setProgress(0)
      setSimulationDone(true)
    }
  }, [progress, running])

  if (!b || !b.ride) return <div className="page"><p className="muted">Loading…</p></div>

  const duration = b.ride.duration_min || 45
  const simulatedPos = coords && coords.length > 1 ? pointAlongRoute(coords, progress) : null
  const driverPos = simulatedPos
  const effectiveProgress = progress
  const etaMin = Math.max(0, Math.ceil((1 - effectiveProgress) * duration))
  // A completed ride remains complete when revisiting this preview.
  const rideDone = b.ride.status === 'completed'
  const arrived = effectiveProgress >= 0.98 || rideDone
  const alreadyPaid = b.status === 'payment_completed'

  async function startSim() {
    setSimulationDone(false)
    setProgress(0)
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
            ? <strong>Coming in {etaMin} minutes</strong>
            : <strong>Trip {statusLabel(b.ride.status)} — waiting for driver movement</strong>}
      </div>
      <div className="card">
        <MapView
          polyline={coords}
          autoFit={false}
          markers={[
            { id: 'pickup', lat: b.pickup_point.lat, lng: b.pickup_point.lng, kind: 'pickup', label: 'Pickup' },
            { id: 'drop', lat: b.drop_point.lat, lng: b.drop_point.lng, kind: 'drop', label: 'Destination' },
            ...(driverPos && (running || progress > 0)
              ? [{ id: 'driver', lat: driverPos[0], lng: driverPos[1], label: 'Driver', car: true }]
              : []),
          ]}
          height={380}
        />
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${effectiveProgress * 100}%` }} /></div>
      </div>
      <div className="btn-row">
        {!running && !arrived && (
          <button className="btn btn-primary" onClick={startSim}><span className="material-symbols-rounded">play_arrow</span> {simulationDone ? 'Replay simulation' : 'Simulate live trip (preview)'}</button>
        )}
        {arrived && !alreadyPaid && (
          <button className="btn btn-primary" onClick={() => navigate(`/app/trips/${id}/pay`)}> Pay Now (₹ {b.fare})</button>
        )}
        {arrived && alreadyPaid && <p className="muted"> This trip is completed and paid.</p>}
        <button className="btn btn-outline" onClick={() => navigate(`/app/trips/${id}`)}>← Trip Detail</button>
      </div>
      <p className="muted">
        {simulationDone ? 'Simulation reset. Use Complete Trip in My Trips when the ride is actually finished.' : 'The route preview is visual only. Drivers and passengers see the same moving vehicle marker.'}
      </p>
    </div>
  )
}

function pointAlongRoute(points, progress) {
  if (!points?.length) return null
  if (points.length === 1) return points[0]
  const lengths = []
  let total = 0
  for (let i = 1; i < points.length; i += 1) {
    const length = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
    lengths.push(length)
    total += length
  }
  let target = total * Math.max(0, Math.min(1, progress))
  for (let i = 0; i < lengths.length; i += 1) {
    if (target <= lengths[i]) {
      const ratio = lengths[i] ? target / lengths[i] : 0
      return [
        points[i][0] + (points[i + 1][0] - points[i][0]) * ratio,
        points[i][1] + (points[i + 1][1] - points[i][1]) * ratio,
      ]
    }
    target -= lengths[i]
  }
  return points[points.length - 1]
}


