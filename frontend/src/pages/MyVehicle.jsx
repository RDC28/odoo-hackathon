import { useEffect, useState } from 'react'
import * as api from '../api/api'
import { useAuth } from '../context/AuthContext'

export default function MyVehicle() {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState([])
  const [adding, setAdding] = useState(false)
  const [f, setF] = useState({ type: 'car', model: '', registration_number: '', seating_capacity: 4 })
  const [error, setError] = useState('')

  const load = () => api.myVehicles(user._id).then(setVehicles)
  useEffect(() => { load() }, [user._id])

  const set = k => e => setF({ ...f, [k]: e.target.value })

  async function remove(v) {
    if (!confirm('Remove this vehicle?')) return
    setError('')
    try {
      await api.removeVehicle(v._id)
      load()
    } catch (err) { setError(err.message) }
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    try {
      await api.addVehicle(user._id, user.company_id, f)
      setF({ type: 'car', model: '', registration_number: '', seating_capacity: 4 })
      setAdding(false)
      load()
    } catch (err) { setError(err.message) }
  }

  return (
    <div className="page">
      <div className="btn-row space-between">
        <h1>My Vehicle</h1>
        <button className="btn btn-primary" onClick={() => setAdding(a => !a)}>{adding ? 'Close' : '+ Add Vehicle'}</button>
      </div>

      {adding && (
        <form className="card form" onSubmit={submit}>
          <div className="form-row">
            <div className="field">
              <label>Type</label>
              <select value={f.type} onChange={set('type')}>
                <option value="car">Car</option>
                <option value="bike">Bike</option>
                <option value="van">Van / other</option>
              </select>
            </div>
            <div className="field"><label>Model</label><input required value={f.model} onChange={set('model')} placeholder="Swift Dzire" /></div>
          </div>
          <div className="form-row">
            <div className="field"><label>Registration number</label><input required value={f.registration_number} onChange={set('registration_number')} placeholder="GJ01AB1234" /></div>
            <div className="field"><label>Seating capacity (excluding you)</label><input required type="number" min={1} max={10} value={f.seating_capacity} onChange={set('seating_capacity')} /></div>
          </div>
          {error && <div className="error">{error}</div>}
          <button className="btn btn-primary" type="submit">Save Vehicle</button>
        </form>
      )}

      {error && !adding && <div className="error">{error}</div>}
      {vehicles.length === 0 && !adding && (
        <div className="card"><p className="muted">No vehicles registered. Add one to start offering rides.</p></div>
      )}
      {vehicles.map(v => (
        <div key={v._id} className="card ride-card">
          <div>
            <strong>{v.type === 'bike' ? '' : ''} {v.model}</strong>
            <div className="muted">{v.registration_number} · {v.seating_capacity} seats · {v.status}</div>
          </div>
          <button className="btn btn-danger btn-sm" onClick={() => remove(v)}>Remove</button>
        </div>
      ))}
    </div>
  )
}

