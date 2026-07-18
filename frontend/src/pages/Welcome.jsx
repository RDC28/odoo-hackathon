import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import * as api from '../api/api'
import { useEffect, useState } from 'react'
import LocationInput from '../components/LocationInput'
import { geocode } from '../api/geo'

export default function Welcome() {
  const navigate = useNavigate()
  const { user, refresh } = useAuth()
  const [loading, setLoading] = useState(false)
  
  const [step, setStep] = useState(1)
  const [home, setHome] = useState(null)
  const [office, setOffice] = useState(null)
  const [companyOffice, setCompanyOffice] = useState(null)

  useEffect(() => {
    let mounted = true
    api.getCompany(user.company_id).then(async company => {
      if (!company?.registered_address) return
      try {
        const [place] = await geocode(company.registered_address)
        if (mounted) setCompanyOffice(place || { address: company.registered_address, lat: 23.03, lng: 72.58 })
      } catch {
        if (mounted) setCompanyOffice({ address: company.registered_address, lat: 23.03, lng: 72.58 })
      }
    })
    return () => { mounted = false }
  }, [user.company_id])

  async function handleCompleteStep1() {
    if (!home || !office) return
    setStep(2)
  }

  async function handleSelect(path) {
    setLoading(true)
    try {
      await api.completeOnboarding({
        home,
        office,
      })
      await refresh()
      navigate(path)
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }

  return (
    <div className="center" style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      
      {step === 1 && (
        <div className="card form" style={{ width: 400, textAlign: 'left' }}>
          <h2 style={{ marginBottom: '0.5rem', textAlign: 'center' }}>Welcome, {user?.name.split(' ')[0]}!</h2>
          <p className="muted" style={{ marginBottom: '2rem', textAlign: 'center' }}>Before we start, let's set up your primary locations.</p>
          
          <div className="field">
            <LocationInput label="Home address" value={home} onChange={setHome} placeholder="Search your home location" />
          </div>

          <div className="field" style={{ marginTop: '1rem' }}>
            <label>Work address</label>
            <select value={office ? 'company-office' : ''} onChange={e => setOffice(e.target.value ? companyOffice : null)} disabled={!companyOffice}>
              <option value="">{companyOffice ? 'Select company workplace' : 'Loading company workplace…'}</option>
              {companyOffice && <option value="company-office">{companyOffice.address}</option>}
            </select>
            <div className="loc-hint">Your organization’s assigned workplace address.</div>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '2rem' }} 
            onClick={handleCompleteStep1}
            disabled={!home || !office}
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <>
          <h1 style={{ marginBottom: '10px' }}>You're all set!</h1>
          <p className="muted" style={{ marginBottom: '40px', fontSize: '1.2rem' }}>How would you like to get started today?</p>
          
          <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <div 
              className="card" 
              style={{ width: '300px', cursor: 'pointer', padding: '3rem 2rem', textAlign: 'center', transition: 'transform 0.2s, box-shadow 0.2s', opacity: loading ? 0.7 : 1, pointerEvents: loading ? 'none' : 'auto' }}
              onClick={() => handleSelect('/app/find')}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}></div>
              <h2 style={{ marginBottom: '0.5rem', color: 'var(--primary)' }}>Find a Ride</h2>
              <p className="muted">Search for colleagues heading your way and book a seat.</p>
            </div>

            <div 
              className="card" 
              style={{ width: '300px', cursor: 'pointer', padding: '3rem 2rem', textAlign: 'center', transition: 'transform 0.2s, box-shadow 0.2s', opacity: loading ? 0.7 : 1, pointerEvents: loading ? 'none' : 'auto' }}
              onClick={() => handleSelect('/app/offer')}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}></div>
              <h2 style={{ marginBottom: '0.5rem', color: 'var(--primary)' }}>Offer a Ride</h2>
              <p className="muted">Publish your route and share your vehicle with colleagues.</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
