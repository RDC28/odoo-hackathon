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

  const load = () => api.myPlaces(user._id).then(setPlaces)
  
  useEffect(() => { load() }, [user._id])

  async function submit(e) {
    e.preventDefault()
    setError('')
    
    if (!loc) { setError('Pick a location from the suggestions'); return }
    const placeData = { label: label || 'Place', ...loc }

    await api.addPlace(user._id, placeData)
    setLoc(null)
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

        <LocationInput label="Location" value={loc} onChange={setLoc} placeholder="Search an address" />
        
        {error && <div className="error">{error}</div>}
        <button className="btn btn-primary" type="submit">Save Place</button>
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
