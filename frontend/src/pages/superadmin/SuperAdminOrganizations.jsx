import { useEffect, useState } from 'react'
import * as api from '../../api/api'

export default function SuperAdminOrganizations() {
  const [orgs, setOrgs] = useState([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    const data = await api.superadminListOrganizations()
    setOrgs(data)
    if (selected) setSelected(data.find(org => org._id === selected._id) || null)
  }

  useEffect(() => { load() }, [])

  const value = query.trim().toLowerCase()
  const filtered = !value ? orgs : orgs.filter(org =>
    [org.name, org.industry, org.join_code, org.admin_email].some(x => String(x || '').toLowerCase().includes(value)))

  async function changeStatus() {
    if (!selected) return
    const next = selected.status === 'suspended' ? 'active' : 'suspended'
    const message = next === 'suspended'
      ? `Suspend ${selected.name}? Members will not be able to access the organization.`
      : `Restore access for ${selected.name}?`
    if (!confirm(message)) return
    setSaving(true); setError(''); setNotice('')
    try {
      await api.superadminSetOrganizationStatus(selected._id, next)
      await load()
      setNotice(next === 'suspended' ? 'Organization access suspended.' : 'Organization access restored.')
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function rotateCode() {
    if (!selected || !confirm(`Rotate the join code for ${selected.name}? Existing unused codes will stop working.`)) return
    setSaving(true); setError(''); setNotice('')
    try {
      await api.superadminRotateJoinCode(selected._id)
      await load()
      setNotice('Join code rotated successfully.')
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="superadmin-page">
      <div className="superadmin-heading"><div><p className="eyebrow">Tenant administration</p><h2>Organizations</h2><p className="muted">Manage tenant access, join codes, and organization ownership.</p></div></div>
      {error && <div className="error">{error}</div>}
      {notice && <div className="superadmin-notice"><span className="material-symbols-rounded">check_circle</span>{notice}</div>}

      {selected && (
        <section className="card superadmin-org-manager">
          <div className="superadmin-section-heading"><div><p className="eyebrow">Organization controls</p><h3>{selected.name}</h3><p className="muted">Changes here apply to this organization only.</p></div><button className="icon-btn" aria-label="Close organization manager" onClick={() => setSelected(null)}><span className="material-symbols-rounded">close</span></button></div>
          <div className="superadmin-org-manager-grid">
            <div><span className="muted">Status</span><strong><span className={`badge ${selected.status === 'suspended' ? 'badge-red' : 'badge-green'}`}>{selected.status}</span></strong></div>
            <div><span className="muted">Join code</span><strong className="superadmin-join-code">{selected.join_code}</strong></div>
            <div><span className="muted">Organization admin</span><strong>{selected.admin_name}<small>{selected.admin_email}</small></strong></div>
            <div><span className="muted">Workspace footprint</span><strong>{selected.employee_count} people · {selected.vehicle_count} vehicles · {selected.ride_count} rides</strong></div>
          </div>
          <div className="superadmin-card-actions">
            <button className={`btn ${selected.status === 'suspended' ? 'btn-primary' : 'btn-danger'}`} disabled={saving} onClick={changeStatus}><span className="material-symbols-rounded">{selected.status === 'suspended' ? 'play_circle' : 'pause_circle'}</span>{selected.status === 'suspended' ? 'Restore access' : 'Suspend access'}</button>
            <button className="btn btn-outline" disabled={saving || selected.status === 'suspended'} onClick={rotateCode}><span className="material-symbols-rounded">key</span> Rotate join code</button>
          </div>
        </section>
      )}

      <div className="card">
        <div className="superadmin-toolbar"><div><h3>Organization directory</h3><p className="muted">{filtered.length} of {orgs.length} organizations</p></div><input aria-label="Search organizations" placeholder="Search organizations" value={query} onChange={e => setQuery(e.target.value)} /></div>
        <div className="superadmin-table-wrap"><table className="table">
          <thead><tr><th>Organization</th><th>Join code</th><th>Industry</th><th>Admin contact</th><th>People</th><th>Vehicles</th><th>Rides</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {filtered.map(org => <tr key={org._id}>
              <td><strong>{org.name}</strong><br/><span className="muted" style={{ fontSize: '0.8rem' }}>{org.registered_address}</span></td>
              <td><span className="badge badge-blue" style={{ fontFamily: 'monospace' }}>{org.join_code}</span></td>
              <td>{org.industry}</td>
              <td>{org.admin_name}<br/><span className="muted" style={{ fontSize: '0.8rem' }}>{org.admin_email}</span></td>
              <td>{org.employee_count}</td><td>{org.vehicle_count}</td><td>{org.ride_count}</td>
              <td><span className={`badge ${org.status === 'suspended' ? 'badge-red' : 'badge-green'}`}>{org.status}</span></td>
              <td><button className="btn btn-outline btn-sm" onClick={() => { setSelected(org); setError(''); setNotice('') }}><span className="material-symbols-rounded">manage_accounts</span> Manage</button></td>
            </tr>)}
            {filtered.length === 0 && <tr><td colSpan="9" className="muted center">No organizations found.</td></tr>}
          </tbody>
        </table></div>
      </div>
    </div>
  )
}
