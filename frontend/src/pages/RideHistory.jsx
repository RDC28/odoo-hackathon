import { useEffect, useState } from 'react'
import * as api from '../api/api'
import { useAuth } from '../context/AuthContext'

export default function RideHistory() {
  const { user } = useAuth()
  const [h, setH] = useState({ asRider: [], asDriver: [] })

  useEffect(() => { api.historyFor(user._id).then(setH) }, [user._id])

  return (
    <div className="page">
      <h1>Ride History</h1>

      <h2>Trips taken</h2>
      {h.asRider.length === 0 && <div className="card"><p className="muted">No completed trips yet.</p></div>}
      {h.asRider.map(b => (
        <div key={b._id} className="card ride-card">
          <div>
            <strong>{b.pickup_point.address.split(',')[0]} → {b.drop_point.address.split(',')[0]}</strong>
            <div className="muted">
               {b.ride ? new Date(b.ride.departure_at).toLocaleString() : ''} · driver {b.driver ? b.driver.name : '—'}
              {b.vehicle && <> · {b.vehicle.model} ({b.vehicle.registration_number})</>}
            </div>
          </div>
          <div className="ride-card-right"><div className="fare">₹ {b.fare}</div><span className="badge badge-green">paid</span></div>
        </div>
      ))}

      <h2>Rides driven</h2>
      {h.asDriver.length === 0 && <div className="card"><p className="muted">No completed rides as driver yet.</p></div>}
      {h.asDriver.map(r => (
        <div key={r._id} className="card ride-card">
          <div>
            <strong>{r.start_location.address.split(',')[0]} → {r.destination_location.address.split(',')[0]}</strong>
            <div className="muted">
               {new Date(r.departure_at).toLocaleString()} · {r.vehicle ? `${r.vehicle.model} (${r.vehicle.registration_number})` : ''} · {r.passengers} passenger{r.passengers !== 1 ? 's' : ''} · {r.distance_km || '—'} km
            </div>
          </div>
          <div className="ride-card-right"><div className="fare">+ ₹ {r.earned}</div><span className="badge badge-green">completed</span></div>
        </div>
      ))}
    </div>
  )
}

