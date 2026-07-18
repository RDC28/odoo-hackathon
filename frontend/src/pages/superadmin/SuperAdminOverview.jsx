import { useEffect, useState } from 'react'
import * as api from '../../api/api'

export default function SuperAdminOverview() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.superadminGetStats().then(setStats)
  }, [])

  if (!stats) return <div className="p-4">Loading stats...</div>

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Platform Overview</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Organizations</div>
          <div className="stat-value">{stats.total_organizations}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{stats.total_users}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Rides</div>
          <div className="stat-value">{stats.total_rides}</div>
        </div>
      </div>
    </div>
  )
}
