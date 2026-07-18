import { useState } from 'react'
import { Link } from 'react-router-dom'
import { seedDemo } from '../api/seed'

export default function Landing() {
  const [demo, setDemo] = useState(null)

  return (
    <div className="auth-page landing-page">
      <div className="landing">
        <div className="landing-hero">
          <div className="landing-mark"><span className="material-symbols-rounded">directions_car</span></div>
          <p className="eyebrow">Enterprise mobility workspace</p>
          <h1>Ascend</h1>
          <p className="tagline">Enterprise Ride Sharing Platform</p>
          <p className="muted">
            Employees of a registered organization share rides with each other — find a ride,
            offer your own vehicle, track trips live, pay in-app, and chat with colleagues.
            Fully internal to your company.
          </p>
        </div>
        <div className="landing-actions">
          <Link className="action-card" to="/login">
            <span className="landing-card-icon material-symbols-rounded">login</span>
            <h3>Login</h3>
            <p>Employee or admin of a registered organization</p>
          </Link>
          <Link className="action-card" to="/signup">
            <span className="landing-card-icon material-symbols-rounded">person_add</span>
            <h3>Employee Sign Up</h3>
            <p>Join your company with its join code</p>
          </Link>
          <Link className="action-card" to="/register-org">
            <span className="landing-card-icon material-symbols-rounded">business</span>
            <h3>Register Organization</h3>
            <p>Set up your company and its admin account</p>
          </Link>
        </div>
        <div className="demo-box">
          <button className="btn btn-outline" onClick={() => setDemo(seedDemo())}>
            Load demo data
          </button>
          {demo && (
            <div className="card demo-creds">
              <p><strong>Demo loaded.</strong> Organization join codes: {demo.joinCodes.map(code => <code key={code} style={{ marginLeft: 6 }}>{code}</code>)}</p>
              <table className="table">
                <tbody>
                  {demo.accounts.map(a => (
                    <tr key={a.email}>
                      <td>{a.label}</td>
                      <td><code>{a.email}</code></td>
                      <td><code>{a.password}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="muted">Tip: open two browser tabs and log in as two different users to try chat and booking flows against each other.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

