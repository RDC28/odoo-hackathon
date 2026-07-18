import { useEffect, useState } from 'react'
import * as api from '../../api/api'
import { useAuth } from '../../context/AuthContext'

export default function AdminVehicles() {
  const { user } = useAuth()
  const companyId = user.company_id
  const [rows, setRows] = useState([])
  const [employees, setEmployees] = useState([])
  const [adding, setAdding] = useState(false)
  const [f, setF] = useState({ owner_id: '', type: 'car', model: '', registration_number: '', seating_capacity: 4 })
  const [error, setError] = useState('')

  const load = () => api.adminListVehicles(companyId).then(setRows)
  useEffect(() => {
    load()
    api.adminListEmployees(companyId).then(all => {
      const active = all.filter(u => u.platform_access === 'granted')
      setEmployees(active)
      setF(prev => ({ ...prev, owner_id: prev.owner_id || (active[0] ? active[0]._id : '') }))
    })
  }, [companyId])

  const set = k => e => setF({ ...f, [k]: e.target.value })

  async function toggle(v) {
    await api.adminSetVehicleStatus(v._id, v.status === 'active' ? 'inactive' : 'active')
    load()
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!f.owner_id) { setError('Select the employee this vehicle belongs to'); return }
    try {
      await api.adminAddVehicle(companyId, f)
      setF({ owner_id: employees[0] ? employees[0]._id : '', type: 'car', model: '', registration_number: '', seating_capacity: 4 })
      setAdding(false)
      load()
    } catch (err) { setError(err.message) }
  }

  return (
    <div>
      <div className="btn-row space-between">
        <h2>Vehicles</h2>
        <button className="btn btn-primary" onClick={() => setAdding(a => !a)} disabled={employees.length === 0}>
          {adding ? 'Close' : '+ Add Vehicle'}
        </button>
      </div>
      {employees.length === 0 && !adding && (
        <p className="muted">Add an employee first — every vehicle must be registered to one.</p>
      )}

      {adding && (
        <form className="card form" onSubmit={submit}>
          <div className="form-row">
            <div className="field">
              <label>Owner (employee)</label>
              <select value={f.owner_id} onChange={set('owner_id')}>
                {employees.map(u => <option key={u._id} value={u._id}>{u.name} · {u.department || '—'}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Type</label>
              <select value={f.type} onChange={set('type')}>
                <option value="car">Car</option>
                <option value="bike">Bike</option>
                <option value="van">Van / other</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="field"><label>Model</label><input required value={f.model} onChange={set('model')} placeholder="Swift Dzire" /></div>
            <div className="field"><label>Registration number</label><input required value={f.registration_number} onChange={set('registration_number')} placeholder="GJ01AB1234" /></div>
          </div>
          <div className="field"><label>Seating capacity (excluding driver)</label><input required type="number" min={1} max={10} value={f.seating_capacity} onChange={set('seating_capacity')} /></div>
          {error && <div className="error">{error}</div>}
          <button className="btn btn-primary" type="submit">Save Vehicle</button>
        </form>
      )}

      <div className="card">
        <table className="table">
          <thead><tr><th>Registration</th><th>Model</th><th>Seats</th><th>Owner</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="muted">No vehicles registered yet.</td></tr>}
            {rows.map(v => (
              <tr key={v._id}>
                <td>{v.registration_number}</td>
                <td>{v.model}</td>
                <td>{v.seating_capacity}</td>
                <td>{v.owner ? v.owner.name : '—'}</td>
                <td><span className={'badge ' + (v.status === 'active' ? 'badge-green' : 'badge-red')}>{v.status}</span></td>
                <td><button className="btn btn-outline btn-sm" onClick={() => toggle(v)}>{v.status === 'active' ? 'Deactivate' : 'Activate'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
