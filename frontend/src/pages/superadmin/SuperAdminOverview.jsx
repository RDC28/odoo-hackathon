import { useEffect, useState } from 'react'
import * as api from '../../api/api'

export default function SuperAdminOverview() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.superadminGetStats().then(setStats)
  }, [])

  if (!stats) return <div className="superadmin-loading">Loading platform overview...</div>

  return (
    <div className="superadmin-page">
      <div className="superadmin-heading">
        <div><p className="eyebrow">Platform operations</p><h2>Overview</h2><p className="muted">Monitor the Ascend network across every organization.</p></div>
        <span className="badge badge-green">System online</span>
      </div>
      <div className="superadmin-stats">
        <div className="card stat"><div className="stat-label">Organizations</div><div className="stat-value">{stats.total_organizations}</div></div>
        <div className="card stat"><div className="stat-label">Active users</div><div className="stat-value">{stats.active_users}</div></div>
        <div className="card stat"><div className="stat-label">Registered vehicles</div><div className="stat-value">{stats.total_vehicles}</div></div>
        <div className="card stat"><div className="stat-label">Published rides</div><div className="stat-value">{stats.total_rides}</div></div>
        <div className="card stat"><div className="stat-label">Bookings</div><div className="stat-value">{stats.total_bookings}</div></div>
        <div className="card stat"><div className="stat-label">Completed rides</div><div className="stat-value">{stats.completed_rides}</div></div>
      </div>
      <div className="superadmin-panels">
        <section className="card">
          <h3>Platform controls</h3>
          <p className="muted">Central controls for the platform are scoped here so organization admins only manage their own workspace.</p>
          <div className="superadmin-control-list">
            <div><span>Organization isolation</span><strong>Enabled</strong></div>
            <div><span>Ride chat retention</span><strong>Booking lifecycle</strong></div>
            <div><span>Payment environment</span><strong>Razorpay test</strong></div>
          </div>
        </section>
        <section className="card">
          <h3>Recommended powers</h3>
          <p className="muted">Next platform tools can be added without exposing operational controls to company admins.</p>
          <div className="superadmin-tags"><span>Review organizations</span><span>Manage platform access</span><span>Audit payments</span><span>Monitor service health</span></div>
        </section>
      </div>
    </div>
  )
}
