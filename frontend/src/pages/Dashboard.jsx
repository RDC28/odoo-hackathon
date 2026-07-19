import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api/api'
import { useAuth } from '../context/AuthContext'
import Welcome from './Welcome'
import { formatDateTime, statusLabel, tripBadgeClass } from '../utils'

export default function Dashboard() {
  const { user } = useAuth()
  const [trips, setTrips] = useState([])
  const [wallet, setWallet] = useState({ balance: 0 })
  const [offered, setOffered] = useState([])

  useEffect(() => {
    if (!user.has_onboarded) return
    api.myBookings(user._id).then(setTrips)
    api.walletFor(user._id).then(setWallet)
    api.myOfferedRides(user._id).then(rs => setOffered(rs.filter(r => ['active', 'started', 'in_progress'].includes(r.status))))
  }, [user._id, user.has_onboarded])

  if (!user.has_onboarded) {
    return <Welcome />
  }

  return (
    <div className="page dashboard-page">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Your commute workspace</p>
          <h1>Hello, {user.name.split(' ')[0]}</h1>
          <p className="muted">Where are you headed today?</p>
        </div>
      </div>

      <div className="action-grid">
        <Link to="/app/find" className="action-card big">
          <span className="dashboard-action-icon material-symbols-rounded">search</span>
          <h3>Find a Ride</h3>
          <p>Search rides published by your colleagues</p>
          <span className="dashboard-action-link">Search available rides <span className="material-symbols-rounded">arrow_forward</span></span>
        </Link>
        <Link to="/app/offer" className="action-card big">
          <span className="dashboard-action-icon material-symbols-rounded">directions_car</span>
          <h3>Offer a Ride</h3>
          <p>Publish seats in your car or bike</p>
          <span className="dashboard-action-link">Publish a ride <span className="material-symbols-rounded">arrow_forward</span></span>
        </Link>
      </div>

      <div className="stat-grid dashboard-stat-grid">
        <div className="card stat">
          <span className="dashboard-stat-icon material-symbols-rounded">account_balance_wallet</span>
          <div className="stat-label">Wallet balance</div>
          <div className="stat-value">₹ {wallet.balance}</div>
          <Link to="/app/wallet" className="stat-link">Recharge →</Link>
        </div>
        <div className="card stat">
          <span className="dashboard-stat-icon material-symbols-rounded">event</span>
          <div className="stat-label">Upcoming trips</div>
          <div className="stat-value">{trips.length}</div>
          <Link to="/app/trips" className="stat-link">My Trips →</Link>
        </div>
        <div className="card stat">
          <span className="dashboard-stat-icon material-symbols-rounded">commute</span>
          <div className="stat-label">Rides you're offering</div>
          <div className="stat-value">{offered.length}</div>
          <Link to="/app/trips" className="stat-link">Manage →</Link>
        </div>
      </div>

      {trips.length > 0 && (
        <>
          <h2>Next trip</h2>
          <Link to={`/app/trips/${trips[0]._id}`} className="card ride-card">
            <div>
              <strong>{trips[0].pickup_point.address.split(',')[0]} → {trips[0].drop_point.address.split(',')[0]}</strong>
              <div className="muted">
                {formatDateTime(trips[0].ride.departure_at)} · driver {trips[0].driver && trips[0].driver.name}
              </div>
            </div>
          <span className={'badge ' + tripBadgeClass(trips[0].status)}>{statusLabel(trips[0].status)}</span>
          </Link>
        </>
      )}
    </div>
  )
}


