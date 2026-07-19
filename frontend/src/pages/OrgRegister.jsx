import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as api from '../api/api'
import { useAuth } from '../context/AuthContext'

export default function OrgRegister() {
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [f, setF] = useState({ companyName: '', industry: '', address: '', adminName: '', email: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const set = k => e => setF({ ...f, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setError('')
    try {
      const { company } = await api.registerOrganization(f)
      refresh()
      setResult(company)
    } catch (err) { setError(err.message) }
  }

  if (result) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h2> Organization registered</h2>
          <p><strong>{result.name}</strong> is set up. Share this join code with your employees — they need it to sign up:</p>
          <div className="join-code">{result.join_code}</div>
          <p className="muted">The code is also visible any time in the Admin Dashboard → Settings tab.</p>
          <button className="btn btn-primary" onClick={() => navigate('/admin')}>Go to Admin Dashboard</button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-path-switch" aria-label="Choose account type">
          <Link className="auth-path-option" to="/signup">
            <span className="material-symbols-rounded">person_add</span>
            <div><strong>Employee sign up</strong><small>Join an existing workspace</small></div>
          </Link>
          <div className="auth-path-option active">
            <span className="material-symbols-rounded">business</span>
            <div><strong>Register organization</strong><small>Create a new workspace</small></div>
          </div>
        </div>
        <h2>Register Organization</h2>
        <p className="muted">Create your company workspace and its admin account.</p>
        <div className="field"><label>Company name</label><input required value={f.companyName} onChange={set('companyName')} placeholder="Odoo Pvt. Ltd." /></div>
        <div className="form-row">
          <div className="field"><label>Industry</label><input value={f.industry} onChange={set('industry')} placeholder="Software" /></div>
          <div className="field"><label>Registered address</label><input value={f.address} onChange={set('address')} placeholder="Gandhinagar" /></div>
        </div>
        <hr />
        <div className="field"><label>Admin name</label><input required value={f.adminName} onChange={set('adminName')} /></div>
        <div className="form-row">
          <div className="field"><label>Admin email</label><input required type="email" value={f.email} onChange={set('email')} /></div>
          <div className="field"><label>Phone</label><input value={f.phone} onChange={set('phone')} /></div>
        </div>
        <div className="field"><label>Password</label><input required type="password" minLength={6} value={f.password} onChange={set('password')} /></div>
        {error && <div className="error">{error}</div>}
        <button className="btn btn-primary btn-block" type="submit">Create Organization</button>
        <p className="muted center">Already registered? <Link to="/login">Login</Link></p>
      </form>
    </div>
  )
}

