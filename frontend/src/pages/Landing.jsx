import { useState } from 'react'
import { Link } from 'react-router-dom'
import { seedDemo } from '../api/seed'

export default function Landing() {
  const [demo, setDemo] = useState(null)

  return (
    <div className="auth-page">
      <div className="landing">
        <div className="landing-hero">
          <h1> Carpool</h1>
          <p className="tagline">Enterprise Carpooling Platform</p>
          <p className="muted">
            Employees of a registered organization share rides with each other — find a ride,
            offer your own vehicle, track trips live, pay in-app, and chat with colleagues.
            Fully internal to your company.
          </p>
        </div>
        <div className="landing-actions">
          <Link className="action-card" to="/login">
            <h3>Login</h3>
            <p>Employee or admin of a registered organization</p>
          </Link>
          <Link className="action-card" to="/signup">
            <h3>Employee Sign Up</h3>
            <p>Join your company with its join code</p>
          </Link>
          <Link className="action-card" to="/register-org">
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
              <p><strong>Demo loaded.</strong> Organization join code: <code>{demo.joinCode}</code></p>
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

