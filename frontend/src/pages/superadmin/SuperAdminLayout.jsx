import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import ThemeToggle from '../../components/ThemeToggle'

export default function SuperAdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user || user.role !== 'superadmin') {
    return (
      <div className="layout">
        <div className="main-content center" style={{ marginTop: '10%' }}>
          <h2>Access Denied</h2>
          <p>You must be a Super Admin to view this page.</p>
          <button className="btn btn-primary" onClick={() => navigate('/login')}>Back to Login</button>
        </div>
      </div>
    )
  }

  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h2>Platform Admin</h2>
          <p className="muted" style={{ fontSize: '0.8rem' }}>{user.email}</p>
        </div>
        <div className="sidebar-nav">
          <NavLink to="/superadmin/overview" className="nav-item">Overview</NavLink>
          <NavLink to="/superadmin/organizations" className="nav-item">Organizations</NavLink>
        </div>
        <div className="sidebar-footer">
          <ThemeToggle />
          <button className="btn btn-outline" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => { logout(); navigate('/') }}>Logout</button>
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
