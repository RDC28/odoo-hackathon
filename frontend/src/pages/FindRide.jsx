import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../api/api'
import { fetchRoute } from '../api/geo'
import { useAuth } from '../context/AuthContext'
import LocationInput from '../components/LocationInput'
import MapView from '../components/MapView'
import RoutePicker from '../components/RoutePicker'

function Stars({ avg, count }) {
  if (!count) return <span className="muted">no ratings yet</span>
  return <span className="stars"> {avg} <span className="muted">({count})</span></span>
}

export default function FindRide() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [places, setPlaces] = useState([])

  const [from, setFrom] = useState(null)
  const [to, setTo] = useState(null)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [seats, setSeats] = useState(1)

  const [route, setRoute] = useState(null)
  const [nearby, setNearby] = useState([])
  const [results, setResults] = useState(null)
  const [step, setStep] = useState('form') // form | confirm | results
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { api.myPlaces(user._id).then(setPlaces) }, [user._id])

  async function preview(e) {
    e.preventDefault()
    setError('')
    if (!from || !to) { setError('Select both locations from the suggestions'); return }
    setLoading(true)
    try {
      const [routeData, nearbyRides] = await Promise.all([
        fetchRoute(from, to),
        api.nearbyRides(user, { from, date, seats }),
      ])
      setRoute(routeData)
      setNearby(nearbyRides)
      setStep('confirm')
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  async function search() {
    setError('')
    const rides = await api.searchRides(user, { from, to, date, seats })
    setResults(rides)
    setNearby(rides)
    setStep('results')
  }

  async function book(ride) {
    try {
      const booking = await api.bookRide(user, ride, seats)
      navigate(`/app/trips/${booking._id}`)
    } catch (err) { setError(err.message) }
  }

  return (
    <div className="page reference-page">
      <a className="back-link" href="/app">← Dashboard</a>
      <h1>Find Ride</h1>

      {step === 'form' && (
        <form className="card form" onSubmit={preview}>
          <LocationInput label="Start location" value={from} onChange={setFrom} savedPlaces={places} placeholder="Enter your location" />
          <LocationInput label="Destination location" value={to} onChange={setTo} savedPlaces={places} placeholder="Enter drop location" />
          <RoutePicker from={from} to={to} setFrom={setFrom} setTo={setTo} />
          <div className="form-row">
            <div className="field"><label>Travel date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
            <div className="field"><label>Seats needed</label><input type="number" min={1} max={6} value={seats} onChange={e => setSeats(+e.target.value)} /></div>
          </div>
          {error && <div className="error">{error}</div>}
          <button className="btn btn-primary btn-block" disabled={loading} type="submit">
            {loading ? 'Calculating route…' : 'Find Ride'}
          </button>
        </form>
      )}

      {step === 'confirm' && route && (
        <div className="card">
          <h3>Preview Ride</h3>
          <MapView
            polyline={route.coords}
            markers={[
              { lat: from.lat, lng: from.lng, label: 'Pickup' },
              { lat: to.lat, lng: to.lng, label: 'Destination' },
              ...nearby.map(r => ({
                id: `nearby-${r._id}`,
                lat: r.start_location.lat,
                lng: r.start_location.lng,
                label: `Available driver · ${r.driver?.name || 'Driver'} · ${r.vehicle?.model || 'Vehicle'}`,
                car: true,
              })),
            ]}
            height={340}
          />
          {nearby.length > 0 && <p className="muted nearby-note"><span className="material-symbols-rounded">directions_car</span> {nearby.length} available driver{nearby.length === 1 ? '' : 's'} near your pickup point</p>}
          <div className="route-stats">
            <span> {route.distance_km} km</span>
            <span>⏱ ~{route.duration_min} min</span>
          </div>
          <div className="btn-row">
            <button className="btn btn-outline" onClick={() => setStep('form')}>← Edit</button>
            <button className="btn btn-primary" onClick={search}>Confirm & Find Rides</button>
          </div>
        </div>
      )}

      {step === 'results' && (
        <>
          <div className="results-toolbar">
            <button className="btn btn-outline btn-sm" onClick={() => setStep('form')}>← New search</button>
            <button className="btn btn-outline btn-sm" onClick={search}>⟳ Refresh</button>
          </div>
          <div className="results-toolbar"><h2>Available Ride</h2><span className="muted">{results?.length || 0} matches</span></div>
          {error && <div className="error">{error}</div>}
          {results && results.length === 0 && (
            <div className="card"><p className="muted">No matching rides from your colleagues yet. Try another date, or ask in the company chat!</p></div>
          )}
          {results && results.map(r => (
            <div key={r._id} className="card ride-card">
              <div>
                <strong>{r.driver.name}</strong> <Stars avg={r.driver.rating_avg} count={r.driver.rating_count} />
                <div className="muted">
                  {r.start_location.address.split(',')[0]} → {r.destination_location.address.split(',')[0]}
                </div>
                <div className="muted">
                   {new Date(r.departure_at).toLocaleString()} · {r.vehicle ? `${r.vehicle.model} · ${r.vehicle.registration_number}` : ''}
                  {r.recurring_days && r.recurring_days.length > 0 && ` ·  ${r.recurring_days.join(', ')}`}
                </div>
              </div>
              <div className="ride-card-right">
                <div className="fare">₹ {r.price_per_seat}<span className="muted">/seat</span></div>
                <div className="muted">{r.seats_available} seats left</div>
                <button className="btn btn-primary btn-sm" onClick={() => book(r)}>Book Now</button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

