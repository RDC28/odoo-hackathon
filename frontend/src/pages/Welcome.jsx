import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import * as api from '../api/api'
import { useState, useEffect } from 'react'

export default function Welcome() {
  const navigate = useNavigate()
  const { user, refresh } = useAuth()
  const [loading, setLoading] = useState(false)
  
  const [step, setStep] = useState(1)
  const [branches, setBranches] = useState([])
  const [home, setHome] = useState('')
  const [officeId, setOfficeId] = useState('')

  useEffect(() => {
    if (user && user.company_id) {
      api.getCompanyBranches(user.company_id).then(bs => {
        setBranches(bs)
        if (bs.length > 0) setOfficeId(bs[0]._id)
      })
    }
  }, [user])

  async function handleCompleteStep1() {
    if (!home.trim() || !officeId) return
    setStep(2)
  }

  async function handleSelect(path) {
    setLoading(true)
    try {
      const selectedBranch = branches.find(b => b._id === officeId)
      await api.completeOnboarding({
        home: { address: home },
        office: { label: selectedBranch.name, address: selectedBranch.address, lat: selectedBranch.lat, lng: selectedBranch.lng }
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
            <label>Home Address</label>
            <input 
              placeholder="e.g. 123 Main St, Apartment 4B" 
              value={home} 
              onChange={e => setHome(e.target.value)} 
              required
            />
          </div>

          <div className="field" style={{ marginTop: '1rem' }}>
            <label>Primary Office Branch</label>
            <select value={officeId} onChange={e => setOfficeId(e.target.value)} required>
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name} - {b.address}</option>
              ))}
              {branches.length === 0 && <option value="">No branches found</option>}
            </select>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '2rem' }} 
            onClick={handleCompleteStep1}
            disabled={!home.trim() || !officeId}
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

