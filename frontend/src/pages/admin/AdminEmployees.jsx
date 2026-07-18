import { useEffect, useState } from 'react'
import * as api from '../../api/api'
import { useAuth } from '../../context/AuthContext'

export default function AdminEmployees() {
  const { user } = useAuth()
  const companyId = user.company_id
  const [rows, setRows] = useState([])
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState('all')
  const [f, setF] = useState({ name: '', email: '', phone: '', department: '', password: '' })
  const [error, setError] = useState('')

  const load = () => api.adminListEmployees(companyId).then(list => setRows(list.filter(u => u.role !== 'admin')))
  useEffect(() => { load() }, [companyId])
  const set = k => e => setF({ ...f, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setError('')
    try {
      await api.adminAddEmployee(companyId, f)
      setF({ name: '', email: '', phone: '', department: '', password: '' })
      setAdding(false)
      load()
    } catch (err) { setError(err.message) }
  }

  async function updateStatus(u, newStatus) {
    await api.adminSetStatus(u._id, newStatus)
    load()
  }

  const filteredRows = rows.filter(u => filter === 'all' || u.status === filter)

  return (
    <div>
      <div className="btn-row space-between">
        <h2>Employees</h2>
        <button className="btn btn-primary" onClick={() => setAdding(a => !a)}>
          {adding ? 'Close' : '+ Add Employee'}
        </button>
      </div>

      {adding && (
        <form className="card form" onSubmit={submit}>
          <div className="form-row">
            <div className="field"><label>Name</label><input required value={f.name} onChange={set('name')} /></div>
            <div className="field"><label>Email</label><input required type="email" value={f.email} onChange={set('email')} /></div>
          </div>
          <div className="form-row">
            <div className="field"><label>Phone</label><input value={f.phone} onChange={set('phone')} /></div>
            <div className="field"><label>Department</label><input value={f.department} onChange={set('department')} /></div>
          </div>
          <div className="field"><label>Initial Password</label><input required type="text" value={f.password} onChange={set('password')} /></div>
          {error && <div className="error">{error}</div>}
          <button className="btn btn-primary" type="submit">Create Employee</button>
          <p className="muted" style={{ marginTop: 10 }}>Note: Employees added by admins are immediately set to Active and use the initial password provided above.</p>
        </form>
      )}

      <div className="role-tabs" style={{ marginBottom: 20 }}>
        {['all', 'pending_approval', 'active', 'suspended', 'rejected', 'deactivated'].map(tab => (
          <button
            key={tab}
            className={'role-tab' + (filter === tab ? ' active' : '')}
            onClick={() => setFilter(tab)}
          >
            {tab.replace('_', ' ')} ({rows.filter(u => tab === 'all' || u.status === tab).length})
          </button>
        ))}
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map(u => (
              <tr key={u._id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.department || '—'}</td>
                <td>{u.role}</td>
                <td><span className={'badge ' + badgeClass(u.status)}>{u.status.replace('_', ' ')}</span></td>
                <td>
                  {u.role !== 'admin' && (
                    <div className="btn-row" style={{ gap: '0.5rem' }}>
                      {u.status === 'pending_approval' && (
                        <>
                          <button className="btn btn-primary btn-sm" onClick={() => updateStatus(u, 'active')}>Approve</button>
                          <button className="btn btn-outline btn-sm" onClick={() => updateStatus(u, 'rejected')}>Reject</button>
                        </>
                      )}
                      {u.status === 'active' && (
                        <>
                          <button className="btn btn-outline btn-sm" onClick={() => updateStatus(u, 'suspended')}>Suspend</button>
                          <button className="btn btn-outline btn-sm" onClick={() => updateStatus(u, 'deactivated')}>Deactivate</button>
                        </>
                      )}
                      {['suspended', 'rejected', 'deactivated'].includes(u.status) && (
                        <button className="btn btn-outline btn-sm" onClick={() => updateStatus(u, 'active')}>Activate</button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr><td colSpan="6" className="muted center">No employees found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function badgeClass(status) {
  switch (status) {
    case 'active': return 'badge-green'
    case 'pending_approval': return 'badge-amber'
    case 'suspended': return 'badge-red'
    case 'rejected': return 'badge-red'
    case 'deactivated': return 'badge-red'
    default: return ''
  }
}
