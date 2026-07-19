import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="auth-page landing-page">
      <main className="landing landing-simple">
        <header className="landing-topbar">
          <div className="landing-wordmark"><span className="material-symbols-rounded">directions_car</span> Ascend</div>
        </header>

        <section className="landing-entry">
          <div className="landing-entry-copy">
            <p className="eyebrow">Private mobility for your organization</p>
            <h1>Share the ride.<br /><span>Move together.</span></h1>
            <p className="landing-lede">Find and offer everyday rides with people in your trusted company network.</p>
          </div>

          <div className="landing-entry-actions">
            <Link className="landing-entry-card landing-entry-card-primary" to="/login">
              <span className="landing-entry-icon material-symbols-rounded">login</span>
              <span className="landing-entry-card-content"><strong>Log in</strong><small>Access your Ascend workspace</small></span>
              <span className="material-symbols-rounded landing-entry-arrow">arrow_forward</span>
            </Link>
            <Link className="landing-entry-card" to="/signup">
              <span className="landing-entry-icon material-symbols-rounded">person_add</span>
              <span className="landing-entry-card-content"><strong>Sign up</strong><small>Join your organization or create one</small></span>
              <span className="material-symbols-rounded landing-entry-arrow">arrow_forward</span>
            </Link>
          </div>

          <div className="landing-entry-note"><span className="material-symbols-rounded">lock</span> Internal to your organization</div>
        </section>

        <footer className="landing-simple-footer">
          <span><span className="material-symbols-rounded">route</span> Plan your commute</span>
          <span><span className="material-symbols-rounded">payments</span> Transparent fares</span>
          <span><span className="material-symbols-rounded">verified_user</span> Trusted company network</span>
        </footer>
      </main>
    </div>
  )
}
