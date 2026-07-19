import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import NotificationCenter from '../../components/NotificationCenter'

export default function SuperAdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user || user.role !== 'superadmin') {
    return (
      <div className="superadmin-layout">
        <div className="superadmin-main center" style={{ marginTop: '10%' }}>
          <h2>Access Denied</h2>
          <p>You must be a Super Admin to view this page.</p>
          <button className="btn btn-primary" onClick={() => navigate('/login')}>Back to Login</button>
        </div>
      </div>
    )
  }

  return (
    <div className="superadmin-layout">
      <nav className="superadmin-sidebar">
        <div className="superadmin-sidebar-header">
          <div className="superadmin-brand"><span className="material-symbols-rounded">hub</span> Ascend</div>
          <p className="superadmin-label">Platform console</p>
          <p className="muted superadmin-email">{user.email}</p>
        </div>
        <div className="superadmin-nav">
          <p className="superadmin-nav-label">Manage</p>
          <NavLink to="/superadmin/overview" className={({ isActive }) => 'superadmin-nav-item' + (isActive ? ' active' : '')}><span className="material-symbols-rounded">dashboard</span>Overview</NavLink>
          <NavLink to="/superadmin/organizations" className={({ isActive }) => 'superadmin-nav-item' + (isActive ? ' active' : '')}><span className="material-symbols-rounded">business</span>Organizations</NavLink>
        </div>
        <div className="superadmin-footer">
          <button className="btn btn-outline" onClick={() => { logout(); navigate('/') }}><span className="material-symbols-rounded">logout</span>Logout</button>
        </div>
      </nav>
      <main className="superadmin-main">
        <div className="superadmin-main-toolbar"><NotificationCenter userId={user._id} /></div>
        <Outlet />
      </main>
    </div>
  )
}
