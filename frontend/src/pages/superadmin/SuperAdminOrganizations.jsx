import { useEffect, useMemo, useState } from 'react'
import * as api from '../../api/api'

export default function SuperAdminOrganizations() {
  const [orgs, setOrgs] = useState([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    api.superadminListOrganizations().then(setOrgs)
  }, [])

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return orgs
    return orgs.filter(org => [org.name, org.industry, org.join_code, org.admin_email].some(x => String(x || '').toLowerCase().includes(value)))
  }, [orgs, query])

  return (
    <div className="superadmin-page">
      <div className="superadmin-heading"><div><p className="eyebrow">Tenant administration</p><h2>Organizations</h2><p className="muted">Review organization ownership, usage, and platform footprint.</p></div></div>
      <div className="card">
        <div className="superadmin-toolbar"><h3>Organization directory</h3><input aria-label="Search organizations" placeholder="Search organizations" value={query} onChange={e => setQuery(e.target.value)} /></div>
        <table className="table">
          <thead>
            <tr>
              <th>Organization Name</th>
              <th>Join Code</th>
              <th>Industry</th>
              <th>Admin Contact</th>
              <th>People</th>
              <th>Vehicles</th>
              <th>Rides</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(org => (
              <tr key={org._id}>
                <td><strong>{org.name}</strong><br/><span className="muted" style={{ fontSize: '0.8rem' }}>{org.registered_address}</span></td>
                <td><span className="badge badge-green" style={{ fontFamily: 'monospace' }}>{org.join_code}</span></td>
                <td>{org.industry}</td>
                <td>{org.admin_name}<br/><span className="muted" style={{ fontSize: '0.8rem' }}>{org.admin_email}</span></td>
                <td>{org.employee_count}</td>
                <td>{org.vehicle_count}</td>
                <td>{org.ride_count}</td>
                <td><span className="badge badge-green">{org.status}</span></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="8" className="muted center">No organizations found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
