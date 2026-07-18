import { useEffect, useState } from 'react'
import * as api from '../../api/api'
import { useAuth } from '../../context/AuthContext'

export default function AdminOverview() {
  const { user } = useAuth()
  const [r, setR] = useState(null)

  useEffect(() => { api.adminReports(user.company_id).then(setR) }, [user.company_id])

  if (!r) return null

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
        <p className="muted">Fuel figures assume ~15 km/l average mileage × the configured fuel price. Reports are generated from trip and vehicle data collected by the app.</p>
      </div>
    </div>
  )
}
