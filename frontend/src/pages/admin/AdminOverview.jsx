import { useEffect, useState } from 'react'
import * as api from '../../api/api'
import { useAuth } from '../../context/AuthContext'

export default function AdminOverview() {
  const { user } = useAuth()
  const [r, setR] = useState(null)

  useEffect(() => { api.adminReports(user.company_id).then(setR) }, [user.company_id])

  if (!r) return <div className="admin-loading">Loading analytics…</div>

  return (
    <div className="admin-overview">
      <div className="admin-overview-heading">
        <div><p className="eyebrow">Organization overview</p><h1>Operations dashboard</h1><p className="muted">A clear view of your team's shared mobility activity.</p></div>
        <span className="admin-live-status"><span className="material-symbols-rounded">check_circle</span> Live data</span>
      </div>

      <section>
        <div className="admin-section-label"><h2>At a glance</h2><span className="muted">Current organization totals</span></div>
        <div className="stat-grid admin-primary-stats">
          <div className="card stat"><div className="stat-label">Total Employees</div><div className="stat-value">{r.totalEmployees}</div></div>
          <div className="card stat"><div className="stat-label">Registered Vehicles</div><div className="stat-value">{r.totalVehicles}</div></div>
          <div className="card stat"><div className="stat-label">Rides This Month</div><div className="stat-value">{r.ridesThisMonth}</div></div>
          <div className="card stat"><div className="stat-label">Completed Trips</div><div className="stat-value">{r.totalTrips}</div></div>
          <div className="card stat"><div className="stat-label">Distance Travelled</div><div className="stat-value">{r.totalDistance} km</div></div>
          <div className="card stat"><div className="stat-label">Est. Fuel Cost</div><div className="stat-value">₹ {r.fuelCost}</div></div>
        </div>
      </section>

      <section>
        <div className="admin-section-label"><h2>Ride performance</h2><span className="muted">Utilization and revenue signals</span></div>
        <div className="stat-grid admin-secondary-stats">
          <div className="card stat"><div className="stat-label">Ride Utilization</div><div className="stat-value">{r.utilization}%</div></div>
          <div className="card stat"><div className="stat-label">Cost / km (config)</div><div className="stat-value">₹ {r.costPerKm}</div></div>
          <div className="card stat"><div className="stat-label">Active Rides</div><div className="stat-value">{r.activeRides}</div></div>
          <div className="card stat"><div className="stat-label">Bookings</div><div className="stat-value">{r.totalBookings}</div></div>
          <div className="card stat"><div className="stat-label">Passenger Seats Shared</div><div className="stat-value">{r.sharedSeats}</div></div>
          <div className="card stat"><div className="stat-label">Paid Revenue</div><div className="stat-value">₹ {r.revenue}</div></div>
        </div>
      </section>

      <div className="analytics-split">
        <div className="card analytics-summary">
          <h3>Network activity</h3>
          <div className="metric-line"><span>Active drivers</span><strong>{r.drivers}</strong></div>
          <div className="metric-line"><span>Active riders</span><strong>{r.riders}</strong></div>
          <div className="metric-line"><span>Seats still available</span><strong>{r.activeSeats}</strong></div>
          <div className="metric-line"><span>Average paid fare</span><strong>₹ {r.averageFare}</strong></div>
        </div>
        <div className="card analytics-summary">
          <h3>Capacity utilization</h3>
          <div className="capacity-track"><span style={{ width: (Math.min(100, r.utilization) + '%') }} /></div>
          <strong className="capacity-value">{r.utilization}%</strong>
          <p className="muted">Passenger seats booked divided by seats published.</p>
        </div>
      </div>

      <section className="card location-insights">
        <div className="admin-analysis-heading"><div><h3>Commute location insights</h3><p className="muted">Booked passenger seats by pickup and destination area.</p></div><span className="material-symbols-rounded">location_on</span></div>
        <div className="insight-chart-grid">
          {[['origins', 'Common pickup areas', 'where people start'], ['destinations', 'Common destination areas', 'where people travel']].map(([key, title, note]) => {
            const values = r.locationInsights?.[key] || []
            const max = values[0]?.seats || 1
            return <div className="insight-chart" key={key}><div className="insight-chart-title"><strong>{title}</strong><span>{note}</span></div>{values.length === 0 && <p className="muted">Not enough trip data yet.</p>}{values.map(value => <div className="insight-bar-row" key={value.name}><div className="insight-bar-label"><span>{value.name}</span><strong>{value.seats} seat{value.seats === 1 ? '' : 's'}</strong></div><div className="insight-bar-track"><span style={{ width: `${Math.max(8, (value.seats / max) * 100)}%` }} /></div></div>)}</div>
          })}
        </div>
        <div className="insight-decision"><span className="material-symbols-rounded">lightbulb</span><div><strong>Planning signal</strong><p className="muted">Repeated destination clusters can guide workplace pickup points or future branch planning. Treat this as a decision aid, not an automatic branch recommendation.</p></div></div>
      </section>

      <div className="card admin-vehicle-analysis">
        <div className="admin-analysis-heading"><div><h3>Vehicle-wise cost analysis</h3><p className="muted">Estimated operating cost by registered vehicle.</p></div><span className="material-symbols-rounded">directions_car</span></div>
        <table className="table">
          <thead><tr><th>Vehicle</th><th>Owner</th><th>Trips</th><th>Distance</th><th>Est. fuel cost</th></tr></thead>
          <tbody>
            {r.vehicleWise.map(v => <tr key={v._id}><td>{v.model} ({v.registration_number})</td><td>{v.owner ? v.owner.name : '—'}</td><td>{v.trips}</td><td>{v.km} km</td><td>₹ {v.cost}</td></tr>)}
          </tbody>
        </table>
        <p className="muted">Fuel figures use each vehicle's configured mileage and the organisation's fuel price.</p>
      </div>
    </div>
  )
}
