import { useEffect, useState } from 'react'
import * as api from '../../api/api'

export default function SuperAdminOrganizations() {
  const [orgs, setOrgs] = useState([])

  useEffect(() => {
    api.superadminListOrganizations().then(setOrgs)
  }, [])

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Registered Organizations</h2>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Organization Name</th>
              <th>Join Code</th>
              <th>Industry</th>
              <th>Admin Contact</th>
              <th>Total Employees</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map(org => (
              <tr key={org._id}>
                <td><strong>{org.name}</strong><br/><span className="muted" style={{ fontSize: '0.8rem' }}>{org.registered_address}</span></td>
                <td><span className="badge badge-green" style={{ fontFamily: 'monospace' }}>{org.join_code}</span></td>
                <td>{org.industry}</td>
                <td>{org.admin_name}<br/><span className="muted" style={{ fontSize: '0.8rem' }}>{org.admin_email}</span></td>
                <td>{org.employee_count}</td>
              </tr>
            ))}
            {orgs.length === 0 && (
              <tr><td colSpan="5" className="muted center">No organizations found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
