import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as api from '../api/api'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [f, setF] = useState({ joinCode: '', name: '', email: '', phone: '', password: '', confirm: '', department: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const set = k => e => setF({ ...f, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (f.password !== f.confirm) { setError('Passwords do not match'); return }
    try {
      await api.signupEmployee(f)
      setSuccess(true)
    } catch (err) { setError(err.message) }
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h2>Registration Request Sent</h2>
          <p className="muted">Your account has been created and sent to your Organization Admin for approval. You will be able to log in once they approve it.</p>
          <button className="btn btn-primary btn-block" onClick={() => navigate('/login')} style={{ marginTop: '20px' }}>Return to Login</button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h2>Create Account</h2>
        <p className="muted">Join your company's Ascend workspace.</p>
        <div className="field"><label>Organization join code</label><input required value={f.joinCode} onChange={set('joinCode')} placeholder="e.g. DEMO01" style={{ textTransform: 'uppercase' }} /></div>
        <div className="field"><label>Full name</label><input required value={f.name} onChange={set('name')} /></div>
        <div className="form-row">
          <div className="field"><label>Email</label><input required type="email" value={f.email} onChange={set('email')} /></div>
          <div className="field"><label>Phone</label><input value={f.phone} onChange={set('phone')} /></div>
        </div>
        <div className="field"><label>Department</label><input value={f.department} onChange={set('department')} placeholder="Engineering" /></div>
        <div className="form-row">
          <div className="field"><label>Password</label><input required type="password" minLength={6} value={f.password} onChange={set('password')} /></div>
          <div className="field"><label>Confirm password</label><input required type="password" value={f.confirm} onChange={set('confirm')} /></div>
        </div>
        {error && <div className="error">{error}</div>}
        <div className="btn-row space-between" style={{ marginTop: '2rem' }}>
          <button className="btn btn-primary" type="submit" style={{ flex: 1 }}>Register</button>
        </div>
        <p className="muted center" style={{ marginTop: '1rem' }}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
        
        <div style={{ marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          <p className="muted center" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>Demo Quick Actions</p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <button type="button" className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }} 
              onClick={() => { 
                setF({
                  ...f,
                  name: 'Demo Employee',
                  email: 'demo' + Math.floor(Math.random() * 1000) + '@odoo.com',
                  password: 'demo123',
                  confirm: 'demo123',
                  joinCode: 'DEMO01',
                  department: 'Engineering'
                })
              }}>
              Autofill Registration
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
