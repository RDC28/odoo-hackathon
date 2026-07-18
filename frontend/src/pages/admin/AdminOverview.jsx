import { useEffect, useState } from 'react'
import * as api from '../../api/api'
import { useAuth } from '../../context/AuthContext'

export default function AdminOverview() {
  const { user } = useAuth()
  const [r, setR] = useState(null)

  useEffect(() => { api.adminReports(user.company_id).then(setR) }, [user.company_id])

  if (!r) return <div className="admin-loading">Loading analytics…</div>

  return (
    <div>
      <div className="stat-grid">
        <div className="card stat"><div className="stat-label">Total Employees</div><div className="stat-value">{r.totalEmployees}</div></div>
        <div className="card stat"><div className="stat-label">Registered Vehicles</div><div className="stat-value">{r.totalVehicles}</div></div>
        <div className="card stat"><div className="stat-label">Rides This Month</div><div className="stat-value">{r.ridesThisMonth}</div></div>
        <div className="card stat"><div className="stat-label">Completed Trips</div><div className="stat-value">{r.totalTrips}</div></div>
        <div className="card stat"><div className="stat-label">Distance Travelled</div><div className="stat-value">{r.totalDistance} km</div></div>
        <div className="card stat"><div className="stat-label">Est. Fuel Cost</div><div className="stat-value">₹ {r.fuelCost}</div></div>
        <div className="card stat"><div className="stat-label">Ride Utilization</div><div className="stat-value">{r.utilization}%</div></div>
        <div className="card stat"><div className="stat-label">Cost / km (config)</div><div className="stat-value">₹ {r.costPerKm}</div></div>
        <div className="card stat"><div className="stat-label">Active Rides</div><div className="stat-value">{r.activeRides}</div></div>
        <div className="card stat"><div className="stat-label">Bookings</div><div className="stat-value">{r.totalBookings}</div></div>
        <div className="card stat"><div className="stat-label">Passenger Seats Shared</div><div className="stat-value">{r.sharedSeats}</div></div>
        <div className="card stat"><div className="stat-label">Paid Revenue</div><div className="stat-value">₹ {r.revenue}</div></div>
      </div>
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
          <p className="muted">Completed rides divided by all published rides.</p>
        </div>
      </div>
      <div className="card">
        <h3>Vehicle-wise cost analysis</h3>
        <table className="table">
          <thead><tr><th>Vehicle</th><th>Owner</th><th>Trips</th><th>Distance</th><th>Est. fuel cost</th></tr></thead>
          <tbody>
            {r.vehicleWise.map(v => (
              <tr key={v._id}>
                <td>{v.model} ({v.registration_number})</td>
                <td>{v.owner ? v.owner.name : '—'}</td>
                <td>{v.trips}</td>
                <td>{v.km} km</td>
                <td>₹ {v.cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">Fuel figures use each vehicle’s configured mileage and the organisation’s fuel price. Reports are generated from trip and vehicle data collected by the app.</p>
      </div>
    </div>
  )
}
