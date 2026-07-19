import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import * as api from '../../api/api'
import { useAuth } from '../../context/AuthContext'
import NotificationCenter from '../../components/NotificationCenter'

const tabClass = ({ isActive }) => 'admin-tab' + (isActive ? ' active' : '')

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [company, setCompany] = useState(null)

  useEffect(() => { api.getCompany(user.company_id).then(setCompany) }, [user.company_id])

  if (!company) return null

  return (
    <div className="admin">
      <header className="admin-header">
        <div className="admin-shell admin-header-inner">
          <div>
            <strong>{company.name}</strong>
            <span className="join-chip">Join code: {company.join_code}</span>
          </div>
          <div className="admin-header-actions">
            <NotificationCenter userId={user._id} />
            <button className="btn btn-outline btn-sm" onClick={() => { logout(); navigate('/') }}>Logout</button>
          </div>
        </div>
      </header>
      <nav className="admin-tabs">
        <div className="admin-shell admin-tabs-inner">
          <NavLink end to="/admin" className={tabClass}>Overview</NavLink>
          <NavLink to="/admin/employees" className={tabClass}>Employees</NavLink>
          <NavLink to="/admin/vehicles" className={tabClass}>Vehicles</NavLink>
          <NavLink to="/admin/settings" className={tabClass}>Settings</NavLink>
        </div>
      </nav>
      <main className="admin-main">
        <Outlet context={{ company, setCompany }} />
      </main>
    </div>
  )
}

