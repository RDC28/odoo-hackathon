import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../api/api'
import { useAuth } from '../context/AuthContext'

const quickLinks = [
  { to: '/app/trips', label: ' My Trips' },
  { to: '/app/vehicles', label: ' My Vehicle' },
  { to: '/app/history', label: ' Ride History' },
  { to: '/app/wallet', label: ' Wallet & Payments' },
  { to: '/app/places', label: ' Saved Places' },
  { to: '/app/chat', label: ' Chat' },
]

export default function Settings() {
  const { user, refresh } = useAuth()
  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState(user.phone || '')
  const [saved, setSaved] = useState(false)

  async function save(e) {
    e.preventDefault()
    await api.updateProfile(user._id, { name, phone })
    refresh()
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="page">
      <h1>Settings</h1>

      <form className="card form" onSubmit={save}>
        <h3>Profile</h3>
        <div className="form-row">
          <div className="field"><label>Name</label><input value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="field"><label>Phone</label><input value={phone} onChange={e => setPhone(e.target.value)} /></div>
        </div>
        <div className="muted">Email: {user.email} · Department: {user.department || '—'}</div>
        <button className="btn btn-primary" type="submit">{saved ? ' Saved' : 'Save Profile'}</button>
      </form>

      <div className="card">
        <h3>Quick access</h3>
        <div className="quick-links">
          {quickLinks.map(l => <Link key={l.to} to={l.to} className="quick-link">{l.label}</Link>)}
        </div>
      </div>

      <div className="card">
        <h3>Help & Support</h3>
        <p className="muted">Ride chat is available from an active booking until drop-off. For other questions, contact your admin.</p>
      </div>
    </div>
  )
}

