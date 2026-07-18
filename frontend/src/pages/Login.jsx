import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login, logout } = useAuth()
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
      <form className="auth-card" onSubmit={submit}>
        <h2>Welcome back</h2>
        <p className="muted">Login to continue to Carpool.</p>
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

        <div style={{ marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          <p className="muted center" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>Demo Quick Logins</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button type="button" className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }} 
              onClick={() => { setRole('employee'); setEmail('raj@demo.com'); setPassword('demo123'); }}>
              Demo Employee
            </button>
            <button type="button" className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
              onClick={() => { setRole('admin'); setEmail('admin@demo.com'); setPassword('demo123'); }}>
              Demo Org Admin
            </button>
            <button type="button" className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
              onClick={() => { setRole('superadmin'); setEmail('superadmin@platform.com'); setPassword('superadmin123'); }}>
              Demo Super Admin
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
