import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../api/api'
import { formatDateTime, statusLabel, tripBadgeClass } from '../../utils'

export default function SuperAdminOverview() {
  const [operations, setOperations] = useState(null)
  const [refreshedAt, setRefreshedAt] = useState(null)

  const refresh = useCallback(() => {
    api.superadminGetOperations().then(data => {
      setOperations(data)
      setRefreshedAt(new Date())
    })
  }, [])

  useEffect(() => { refresh() }, [refresh])

  if (!operations) return <div className="superadmin-loading">Loading platform overview...</div>

  const { stats, queues, recent } = operations
  const attentionCount = queues.pending_users + queues.inactive_vehicles + queues.payment_pending

  return (
    <div className="superadmin-page">
      <div className="superadmin-heading">
        <div><p className="eyebrow">Platform operations</p><h2>Overview</h2><p className="muted">A live operational view of the Ascend network.</p></div>
        <div className="superadmin-heading-actions"><span className="badge badge-green"><span className="material-symbols-rounded">check_circle</span> System online</span><button className="btn btn-outline btn-sm" onClick={refresh}><span className="material-symbols-rounded">refresh</span> Refresh</button></div>
      </div>
      <div className="superadmin-stats">
        <div className="card stat"><span className="material-symbols-rounded superadmin-stat-icon">business</span><div className="stat-label">Organizations</div><div className="stat-value">{stats.total_organizations}</div></div>
        <div className="card stat"><span className="material-symbols-rounded superadmin-stat-icon">group</span><div className="stat-label">Active users</div><div className="stat-value">{stats.active_users}</div></div>
        <div className="card stat"><span className="material-symbols-rounded superadmin-stat-icon">directions_car</span><div className="stat-label">Registered vehicles</div><div className="stat-value">{stats.total_vehicles}</div></div>
        <div className="card stat"><span className="material-symbols-rounded superadmin-stat-icon">route</span><div className="stat-label">Published rides</div><div className="stat-value">{stats.total_rides}</div></div>
        <div className="card stat"><span className="material-symbols-rounded superadmin-stat-icon">event_seat</span><div className="stat-label">Bookings</div><div className="stat-value">{stats.total_bookings}</div></div>
        <div className="card stat"><span className="material-symbols-rounded superadmin-stat-icon">task_alt</span><div className="stat-label">Completed rides</div><div className="stat-value">{stats.completed_rides}</div></div>
      </div>

      <div className="superadmin-operation-grid">
        <section className="card superadmin-health-card">
          <div className="superadmin-section-heading"><div><h3>Network health</h3><p className="muted">Current platform activity and operational queues.</p></div><span className="badge badge-blue">Live snapshot</span></div>
          <div className="superadmin-health-list">
            <div><span><span className="material-symbols-rounded">directions_car</span> Active rides</span><strong>{queues.active_rides}</strong><span className="badge badge-green">Healthy</span></div>
            <div><span><span className="material-symbols-rounded">person_search</span> Pending approvals</span><strong>{queues.pending_users}</strong><span className={`badge ${queues.pending_users ? 'badge-amber' : 'badge-green'}`}>{queues.pending_users ? 'Review' : 'Clear'}</span></div>
            <div><span><span className="material-symbols-rounded">payments</span> Payment follow-up</span><strong>{queues.payment_pending}</strong><span className={`badge ${queues.payment_pending ? 'badge-amber' : 'badge-green'}`}>{queues.payment_pending ? 'Review' : 'Clear'}</span></div>
            <div><span><span className="material-symbols-rounded">build</span> Inactive vehicles</span><strong>{queues.inactive_vehicles}</strong><span className={`badge ${queues.inactive_vehicles ? 'badge-amber' : 'badge-green'}`}>{queues.inactive_vehicles ? 'Review' : 'Clear'}</span></div>
          </div>
          <div className="superadmin-card-actions"><Link className="btn btn-outline btn-sm" to="/superadmin/organizations">Review organizations</Link>{attentionCount > 0 && <span className="muted">{attentionCount} item{attentionCount === 1 ? '' : 's'} need attention</span>}</div>
        </section>

        <section className="card superadmin-health-card">
          <div className="superadmin-section-heading"><div><h3>Platform configuration</h3><p className="muted">Controls applied consistently across tenants.</p></div><span className="material-symbols-rounded superadmin-section-icon">tune</span></div>
          <div className="superadmin-control-list">
            <div><span>Organization isolation</span><strong>Enabled</strong></div>
            <div><span>Ride chat retention</span><strong>Booking lifecycle</strong></div>
            <div><span>Payment environment</span><strong>Razorpay test</strong></div>
            <div><span>Route preview</span><strong>Leaflet + OSRM</strong></div>
          </div>
          <div className="superadmin-card-actions"><span className="muted">Last refreshed {refreshedAt ? refreshedAt.toLocaleTimeString() : '—'}</span></div>
        </section>
      </div>

      <section className="card superadmin-activity-card">
        <div className="superadmin-section-heading"><div><h3>Recent platform activity</h3><p className="muted">The latest ride and booking events across organizations.</p></div><Link className="btn btn-outline btn-sm" to="/superadmin/organizations">View organizations</Link></div>
        <div className="superadmin-activity-list">
          {recent.map(item => <div className="superadmin-activity-row" key={item.id}><span className="superadmin-activity-icon"><span className="material-symbols-rounded">{item.icon}</span></span><div><strong>{item.label}</strong><p className="muted">{item.detail} · {formatDateTime(item.created_at)}</p></div><span className={`badge ${tripBadgeClass(item.status)}`}>{statusLabel(item.status)}</span></div>)}
          {recent.length === 0 && <p className="muted center">No platform activity yet.</p>}
        </div>
      </section>
    </div>
  )
}
