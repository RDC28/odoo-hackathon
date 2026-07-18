import { useEffect, useState } from 'react'
import * as api from '../api/api'
import { useAuth } from '../context/AuthContext'
import LocationInput from '../components/LocationInput'

export default function SavedPlaces() {
  const { user } = useAuth()
  const [places, setPlaces] = useState([])
  const [label, setLabel] = useState('Home')
  const [loc, setLoc] = useState(null)
  const [error, setError] = useState('')
  const [branches, setBranches] = useState([])
  const [officeId, setOfficeId] = useState('')

  const load = () => api.myPlaces(user._id).then(setPlaces)
  
  useEffect(() => { 
    load() 
    if (user && user.company_id) {
      api.getCompanyBranches(user.company_id).then(bs => {
        setBranches(bs)
        if (bs.length > 0) setOfficeId(bs[0]._id)
      })
    }
  }, [user])

  async function submit(e) {
    e.preventDefault()
    setError('')
    
    let placeData = null
    if (label === 'Office') {
      if (!officeId) { setError('Select an office branch'); return }
      const branch = branches.find(b => b._id === officeId)
      if (!branch) { setError('Invalid branch'); return }
      placeData = { label: branch.name, address: branch.address, lat: branch.lat, lng: branch.lng }
    } else {
      if (!loc) { setError('Pick a location from the suggestions'); return }
      placeData = { label: label || 'Place', ...loc }
    }

    // Prevent duplicates by removing any existing place with the same label
    const existing = places.find(p => p.label.toLowerCase() === placeData.label.toLowerCase())
    if (existing) {
      await api.removePlace(existing._id)
    }

    await api.addPlace(user._id, placeData)
    if (label !== 'Office') setLoc(null)
    load()
  }

  return (
    <div className="page">
      <h1>Saved Places</h1>
      <p className="muted">Saved places show up as one-tap chips when you find or offer a ride.</p>

      <form className="card form" onSubmit={submit}>
        <div className="field">
          <label>Label</label>
          <select value={label} onChange={e => setLabel(e.target.value)}>
            <option value="Home">Home</option>
            <option value="Office">Office</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {label === 'Office' ? (
          <div className="field">
            <label>Office Branch</label>
            <select value={officeId} onChange={e => setOfficeId(e.target.value)}>
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name} - {b.address}</option>
              ))}
              {branches.length === 0 && <option value="">No branches found</option>}
            </select>
          </div>
        ) : (
          <LocationInput label="Location" value={loc} onChange={setLoc} />
        )}
        
        {error && <div className="error">{error}</div>}
        <button className="btn btn-primary" type="submit" disabled={label === 'Office' && branches.length === 0}>Save Place</button>
      </form>

      {places.map(p => (
        <div key={p._id} className="card ride-card">
          <div>
            <strong> {p.label}</strong>
            <div className="muted">{p.address}</div>
          </div>
          <button className="btn btn-danger btn-sm" onClick={async () => { await api.removePlace(p._id); load() }}>Remove</button>
        </div>
      ))}
    </div>
  )
}

