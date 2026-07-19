import { useEffect, useState } from 'react'
import * as api from '../api/api'
import { useAuth } from '../context/AuthContext'
import PlacePickerModal from '../components/PlacePickerModal'

const iconFor = label => label === 'Home' ? 'home' : label === 'Office' ? 'business' : 'location_on'

export default function SavedPlaces() {
  const { user } = useAuth()
  const [places, setPlaces] = useState([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  const load = () => api.myPlaces(user._id).then(setPlaces)
  useEffect(() => { load() }, [user._id])

  function openAdd() {
    setError('')
    setEditing(null)
    setPickerOpen(true)
  }

  function openEdit(place) {
    setError('')
    setEditing(place)
    setPickerOpen(true)
  }

  async function savePlace(place) {
    setError('')
    try {
      const duplicate = !editing && ['Home', 'Office'].includes(place.label)
        ? places.find(item => item.label === place.label)
        : null
      if (editing) await api.updatePlace(editing._id, place)
      else if (duplicate) await api.updatePlace(duplicate._id, place)
      else await api.addPlace(user._id, place)
      setPickerOpen(false)
      setEditing(null)
      await load()
    } catch (err) { setError(err.message) }
  }

  async function remove(place) {
    if (!confirm(`Remove ${place.label}?`)) return
    await api.removePlace(place._id)
    load()
  }

  return (
    <div className="page saved-places-page">
      <div className="saved-places-heading">
        <div>
          <p className="eyebrow">Personal shortcuts</p>
          <h1>Your places</h1>
          <p className="muted">Save reliable pickup points for faster ride searches and ride offers.</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <span className="material-symbols-rounded">add_location_alt</span> Add place
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {places.length === 0 ? (
        <div className="card saved-places-empty">
          <span className="material-symbols-rounded">location_on</span>
          <h2>Save your regular places</h2>
          <p className="muted">Add your home, office, or a preferred pickup point. You can fine-tune every place on the map.</p>
          <button className="btn btn-primary" onClick={openAdd}>Add your first place</button>
        </div>
      ) : (
        <div className="saved-place-grid">
          {places.map(place => (
            <article key={place._id} className="card saved-place-card">
              <div className="saved-place-icon"><span className="material-symbols-rounded">{iconFor(place.label)}</span></div>
              <div className="saved-place-content">
                <div className="saved-place-title"><h2>{place.label}</h2>{place.label !== 'Other' && <span className="badge badge-blue">Personal</span>}</div>
                <p>{place.address}</p>
                <small>{Number(place.lat).toFixed(4)}, {Number(place.lng).toFixed(4)}</small>
              </div>
              <div className="saved-place-actions">
                <button className="btn btn-outline btn-sm" onClick={() => openEdit(place)}><span className="material-symbols-rounded">edit</span> Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(place)} aria-label={`Remove ${place.label}`}><span className="material-symbols-rounded">delete</span></button>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="card saved-places-note">
        <span className="material-symbols-rounded">lock</span>
        <div><strong>Private to you</strong><p className="muted">Your personal places are used only to help you find or offer rides. Your organization workplace is managed separately by your admin.</p></div>
      </div>

      {pickerOpen && <PlacePickerModal place={editing} onCancel={() => { setPickerOpen(false); setEditing(null) }} onConfirm={savePlace} />}
    </div>
  )
}
