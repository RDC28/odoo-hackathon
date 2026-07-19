import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificationCenter from './NotificationCenter'

const links = [
  { to: '/app', label: 'Dashboard', icon: 'home', end: true },
  { to: '/app/find', label: 'Find Ride', icon: 'search' },
  { to: '/app/offer', label: 'Offer Ride', icon: 'directions_car' },
  { to: '/app/trips', label: 'My Trips', icon: 'luggage' },
  { to: '/app/history', label: 'Ride History', icon: 'schedule' },
  { to: '/app/vehicles', label: 'My Vehicle', icon: 'commute' },
  { to: '/app/wallet', label: 'Wallet', icon: 'account_balance_wallet' },
  { to: '/app/transactions', label: 'Transactions', icon: 'receipt_long' },
  { to: '/app/feedback', label: 'Driver Feedback', icon: 'rate_review' },
  { to: '/app/chat', label: 'Chat', icon: 'chat_bubble' },
  { to: '/app/places', label: 'Saved Places', icon: 'location_on' },
  { to: '/app/settings', label: 'Settings', icon: 'settings' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand"><span className="material-symbols-rounded">directions_car</span> Ascend</div>
        <nav>
          {links.map(l => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              <span className="nav-icon material-symbols-rounded">{l.icon}</span> {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-mini">
            <div className="avatar">{user.name[0]}</div>
            <div>
              <div className="user-name">{user.name}</div>
              <div className="user-sub">{user.department}</div>
            </div>
          </div>
          {user.role === 'admin' && (
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin')}>Admin Dashboard</button>
          )}
          <button className="btn btn-outline btn-sm" onClick={() => { logout(); navigate('/') }}>Logout</button>
        </div>
      </aside>
      <main className="main">
        <div className="app-toolbar"><NotificationCenter userId={user._id} /></div>
        <Outlet />
      </main>
    </div>
  )
}
