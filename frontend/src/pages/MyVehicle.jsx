import { useEffect, useState } from 'react'
import * as api from '../api/api'
import { useAuth } from '../context/AuthContext'

export default function MyVehicle() {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState([])
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [f, setF] = useState({ type: 'car', model: '', registration_number: '', seating_capacity: 4, mileage_kmpl: 15, photo: '' })
  const [error, setError] = useState('')

  const load = () => api.myVehicles(user._id).then(setVehicles)
  useEffect(() => { load() }, [user._id])

  const set = k => e => setF({ ...f, [k]: e.target.value })

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setF({ ...f, photo: ev.target.result })
      setError('')
    }
    reader.readAsDataURL(file)
  }

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
      if (editingId) {
        await api.updateVehicle(editingId, user.company_id, f)
      } else {
        await api.addVehicle(user._id, user.company_id, f)
      }
      setF({ type: 'car', model: '', registration_number: '', seating_capacity: 4, mileage_kmpl: 15, photo: '' })
      setAdding(false)
      setEditingId(null)
      load()
    } catch (err) { setError(err.message) }
  }

  return (
    <div className="page">
      <div className="btn-row space-between">
        <h1>My Vehicle</h1>
        <button className="btn btn-primary" onClick={() => {
          if (adding) {
            setAdding(false)
            setEditingId(null)
          } else {
            setAdding(true)
            setEditingId(null)
            setF({ type: 'car', model: '', registration_number: '', seating_capacity: 4, mileage_kmpl: 15, photo: '' })
          }
        }}>{adding ? 'Close' : '+ Add Vehicle'}</button>
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
          <div className="field"><label>Fuel efficiency (km/l)</label><input required type="number" min={1} max={100} step="0.1" value={f.mileage_kmpl} onChange={set('mileage_kmpl')} /><div className="loc-hint">Use the vehicle’s usual real-world mileage.</div></div>
          <div className="field">
            <label>Vehicle Image (Optional)</label>
            <input type="file" accept="image/*" onChange={handlePhotoUpload} />
            {f.photo && <img src={f.photo} alt="Preview" style={{ marginTop: '0.5rem', maxHeight: '120px', borderRadius: '8px', objectFit: 'cover' }} />}
          </div>
          {error && <div className="error">{error}</div>}
          <button className="btn btn-primary" type="submit">{editingId ? 'Update Vehicle' : 'Save Vehicle'}</button>
        </form>
      )}

      {error && !adding && <div className="error">{error}</div>}
      {vehicles.length === 0 && !adding && (
        <div className="card"><p className="muted">No vehicles registered. Add one to start offering rides.</p></div>
      )}
      {vehicles.map(v => (
        <div key={v._id} className="card ride-card" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {v.photo ? (
            <img src={v.photo} alt={v.model} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
          ) : (
            <div style={{ width: '80px', height: '80px', backgroundColor: 'var(--border-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '2rem', color: 'var(--muted-color)' }}>
                {v.type === 'bike' ? 'two_wheeler' : 'directions_car'}
              </span>
            </div>
          )}
          <div style={{ flex: 1 }}>
            <strong>{v.model}</strong>
            <div className="muted">{v.registration_number} · {v.seating_capacity} seats · {v.mileage_kmpl || 15} km/l · {v.status}</div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => {
            setF(v)
            setEditingId(v._id)
            setAdding(true)
            window.scrollTo(0, 0)
          }}>Edit</button>
          <button className="btn btn-danger btn-sm" onClick={() => remove(v)}>Remove</button>
        </div>
      ))}
    </div>
  )
}

