import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../api/api'
import { fetchRoute } from '../api/geo'
import { useAuth } from '../context/AuthContext'
import LocationInput from '../components/LocationInput'
import MapView from '../components/MapView'
import RoutePicker from '../components/RoutePicker'

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

export default function OfferRide() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState([])
  const [places, setPlaces] = useState([])
  const [company, setCompany] = useState(null)

  const [from, setFrom] = useState(null)
  const [to, setTo] = useState(null)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState('18:00')
  const [seats, setSeats] = useState(2)
  const [fare, setFare] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [recurring, setRecurring] = useState([])

  const [route, setRoute] = useState(null)
  const [step, setStep] = useState('form') // form | confirm
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedVehicle = vehicles.find(v => v._id === vehicleId)
  const seatLimit = selectedVehicle ? selectedVehicle.seating_capacity : 1

  useEffect(() => {
    api.myVehicles(user._id).then(vs => {
      setVehicles(vs)
      if (vs[0]) {
        setVehicleId(vs[0]._id)
        setSeats(current => Math.min(Math.max(1, current), vs[0].seating_capacity))
      }
    })
    api.myPlaces(user._id).then(setPlaces)
    api.getCompany(user.company_id).then(setCompany)
  }, [user._id, user.company_id])

  function toggleDay(d) {
    setRecurring(r => (r.includes(d) ? r.filter(x => x !== d) : [...r, d]))
  }

  function swap() {
    const a = from; setFrom(to); setTo(a)
  }

  function changeVehicle(id) {
    setVehicleId(id)
    const vehicle = vehicles.find(v => v._id === id)
    if (vehicle) setSeats(current => Math.min(Math.max(1, current), vehicle.seating_capacity))
  }

  async function preview(e) {
    e.preventDefault()
    setError('')
    if (!from || !to) { setError('Select both locations from the suggestions'); return }
    setLoading(true)
    try {
      const r = await fetchRoute(from, to)
      setRoute(r)
      if (!fare && company) setFare(String(Math.round((r.distance_km * company.carpool_config.cost_per_km) / Math.max(1, seats))))
      setStep('confirm')
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  async function publish() {
    setError('')
    try {
      await api.publishRide(user, {
        vehicle_id: vehicleId,
        start_location: from,
        destination_location: to,
        departure_at: new Date(`${date}T${time}`).toISOString(),
        seats, price_per_seat: fare || 0,
        recurring_days: recurring,
        route_coords: route.coords, distance_km: route.distance_km, duration_min: route.duration_min,
      })
      navigate('/app/trips')
    } catch (err) { setError(err.message) }
  }

  if (vehicles.length === 0) {
    return (
      <div className="page reference-page">
        <a className="back-link" href="/app">← Dashboard</a>
        <h1>Offer Ride</h1>
        <div className="card">
          <p>You need at least one registered vehicle before publishing a ride.</p>
          <button className="btn btn-primary" onClick={() => navigate('/app/vehicles')}>Register a vehicle</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page reference-page">
      <a className="back-link" href="/app">← Dashboard</a>
      <h1>Offer Ride</h1>

      {step === 'form' && (
        <form className="card form" onSubmit={preview}>
          <div className="field">
            <label>Vehicle</label>
            <select value={vehicleId} onChange={e => changeVehicle(e.target.value)}>
              {vehicles.map(v => <option key={v._id} value={v._id}>{v.model} · {v.registration_number} · {v.mileage_kmpl || 15} km/l · {v.seating_capacity} seats</option>)}
            </select>
          </div>
          <LocationInput label="Start location" value={from} onChange={setFrom} savedPlaces={places} placeholder="Enter your location" />
          <button type="button" className="btn btn-outline btn-sm swap-btn" onClick={swap}>⇅ Swap</button>
          <LocationInput label="Destination location" value={to} onChange={setTo} savedPlaces={places} placeholder="Enter drop location" />
          <RoutePicker from={from} to={to} setFrom={setFrom} setTo={setTo} />
          <div className="form-row">
            <div className="field"><label>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
            <div className="field"><label>Time</label><input type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Available seats <span className="field-note">(excluding driver)</span></label>
              <input type="number" min={1} max={seatLimit} value={Math.min(seats, seatLimit)} onChange={e => setSeats(Math.min(+e.target.value, seatLimit))} />
              <div className="loc-hint">Up to {seatLimit} passenger seat{seatLimit === 1 ? '' : 's'} for this vehicle.</div>
            </div>
            <div className="field"><label>Fare per seat (₹)</label><input type="number" min={0} value={fare} onChange={e => setFare(e.target.value)} placeholder="auto-suggested after route" /></div>
          </div>
          <div className="field">
            <label>Recurring ride (optional)</label>
            <div className="chips">
              {DAYS.map(d => (
                <button type="button" key={d} className={'chip' + (recurring.includes(d) ? ' chip-on' : '')} onClick={() => toggleDay(d)}>{d}</button>
              ))}
            </div>
          </div>
          {error && <div className="error">{error}</div>}
          <button className="btn btn-primary btn-block" disabled={loading} type="submit">
            {loading ? 'Calculating route…' : 'Preview Ride'}
          </button>
        </form>
      )}

      {step === 'confirm' && route && (
        <div className="card">
          <h3>Preview Ride</h3>
          <MapView
            polyline={route.coords}
            markers={[
              { lat: from.lat, lng: from.lng, label: 'Start' },
              { lat: to.lat, lng: to.lng, label: 'Destination' },
            ]}
            height={340}
          />
          <div className="route-stats">
            <span> {route.distance_km} km</span>
            <span>⏱ ~{route.duration_min} min</span>
            <span> {seats} seats</span>
            <span>₹ {fare || 0} / seat</span>
          </div>
          {error && <div className="error">{error}</div>}
          <div className="btn-row">
            <button className="btn btn-outline" onClick={() => setStep('form')}>← Edit</button>
            <button className="btn btn-primary" onClick={publish}>Publish Ride</button>
          </div>
        </div>
      )}
    </div>
  )
}

