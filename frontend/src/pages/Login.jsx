import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const DEMO_SHORTCUTS = [
  { label: 'Demo organisation admin', role: 'admin', email: 'admin@demo.com', password: 'demo123' },
  { label: 'Demo driver · Raj Patel', role: 'employee', email: 'raj@demo.com', password: 'demo123' },
  { label: 'Demo rider · Priya Nair', role: 'employee', email: 'priya@demo.com', password: 'demo123' },
  { label: 'Super Admin', role: 'superadmin', email: 'superadmin@platform.com', password: 'superadmin123' },
]

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [role, setRole] = useState('employee')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    try {
      const u = await login(email, password)
      if (role === 'superadmin') {
        if (u.role !== 'superadmin') throw new Error('You do not have superadmin privileges')
        navigate('/superadmin')
        return
      }
      if (role === 'admin' && u.role !== 'admin') {
        throw new Error('You do not have admin privileges for this organization')
      }
      if (role === 'employee' && u.role === 'admin') {
        navigate('/admin')
      } else {
        navigate(u.role === 'admin' ? '/admin' : '/app')
      }
    } catch (err) { setError(err.message) }
  }

  return (
    <div className="auth-page">
      <form className="auth-card login-card" onSubmit={submit}>
        <div className="auth-mark"><span className="material-symbols-rounded">lock_open</span></div>
        <p className="eyebrow">Ascend account access</p>
        <h2>Welcome back</h2>
        <p className="muted">Login to continue to Ascend.</p>
        <div className="role-tabs">
          <button type="button" className={`role-tab ${role === 'employee' ? 'active' : ''}`} onClick={() => setRole('employee')}>Employee</button>
          <button type="button" className={`role-tab ${role === 'admin' ? 'active' : ''}`} onClick={() => setRole('admin')}>Org Admin</button>
          <button type="button" className={`role-tab ${role === 'superadmin' ? 'active' : ''}`} onClick={() => setRole('superadmin')}>Super Admin</button>
        </div>
        <div className="field"><label>Email</label><input required type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className="field"><label>Password</label><input required type="password" value={password} onChange={e => setPassword(e.target.value)} /></div>
        {error && <div className="error">{error}</div>}
        <div className="btn-row space-between" style={{ marginTop: '2rem' }}>
          <button className="btn btn-primary" type="submit" style={{ flex: 1 }}>Login</button>
        </div>
        <p className="muted center" style={{ marginTop: '1rem' }}>
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>

        <div className="demo-login-picker">
          <label htmlFor="demo-account">Demo account shortcut</label>
          <select id="demo-account" defaultValue="" onChange={e => {
            const shortcut = DEMO_SHORTCUTS.find(item => item.email === e.target.value)
            if (!shortcut) return
            setRole(shortcut.role)
            setEmail(shortcut.email)
            setPassword(shortcut.password)
            setError('')
          }}>
            <option value="">Choose a demo account</option>
            {DEMO_SHORTCUTS.map(shortcut => <option key={shortcut.email} value={shortcut.email}>{shortcut.label} · {shortcut.email}</option>)}
          </select>
          <p className="muted">Selecting an account fills the login form for you.</p>
        </div>
      </form>
    </div>
  )
}
