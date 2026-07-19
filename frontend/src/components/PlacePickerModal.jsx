import { useEffect, useRef, useState } from 'react'
import LocationInput from './LocationInput'
import MapView from './MapView'
import { reverseGeocode } from '../api/geo'

const DEFAULT_CENTER = { lat: 23.03, lng: 72.58 }

export default function PlacePickerModal({ place, onCancel, onConfirm }) {
  const [draft, setDraft] = useState(place || { label: 'Other', address: '', ...DEFAULT_CENTER })
  const [error, setError] = useState('')
  const [resolving, setResolving] = useState(false)
  const modalRef = useRef(null)
  const onCancelRef = useRef(onCancel)

  useEffect(() => {
    setDraft(place || { label: 'Other', address: '', ...DEFAULT_CENTER })
    setError('')
  }, [place])

  useEffect(() => {
    onCancelRef.current = onCancel
  }, [onCancel])

  useEffect(() => {
    modalRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = event => {
      if (event.key === 'Escape') onCancelRef.current()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  async function resolvePoint(point) {
    setResolving(true)
    setError('')
    try {
      const result = await reverseGeocode(point.lat, point.lng)
      setDraft(current => ({ ...current, ...result }))
    } catch (err) {
      setError(err.message || 'Could not resolve this map point.')
      setDraft(current => ({ ...current, ...point, address: current.address || 'Pinned location' }))
    } finally {
      setResolving(false)
    }
  }

  function handleMapPick(point) {
    resolvePoint(point)
  }

  function handleMarkerDrag(id, point) {
    resolvePoint(point)
  }

  function submit(e) {
    e.preventDefault()
    if (!draft.address || !draft.lat || !draft.lng) {
      setError('Search for a place or drop the pin on the map first.')
      return
    }
    onConfirm(draft)
  }

  const marker = draft.lat && draft.lng
    ? [{ id: 'place-pin', lat: draft.lat, lng: draft.lng, label: draft.address || 'Selected place', kind: 'pickup', draggable: true }]
    : []

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && onCancel()}>
      <form ref={modalRef} tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="place-picker-title" className="place-picker-modal" onSubmit={submit}>
        <div className="place-picker-head">
          <div>
            <p className="eyebrow">Pin your place</p>
            <h2 id="place-picker-title">{place ? 'Edit saved place' : 'Add a saved place'}</h2>
            <p className="muted">Search an address, then adjust the pin to your exact pickup point.</p>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onCancel}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <div className="form-row place-picker-fields">
          <div className="field">
            <label>Place label</label>
            <select value={draft.label} onChange={e => setDraft(current => ({ ...current, label: e.target.value }))}>
              <option value="Home">Home</option>
              <option value="Office">Office</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <LocationInput label="Search address" value={draft.address ? draft : null} onChange={value => value && setDraft(current => ({ ...current, ...value }))} placeholder="Search your address" />
        </div>

        <MapView
          center={[draft.lat || DEFAULT_CENTER.lat, draft.lng || DEFAULT_CENTER.lng]}
          zoom={14}
          markers={marker}
          height={330}
          interactive
          autoFit={false}
          onMapPick={handleMapPick}
          onMarkerDrag={handleMarkerDrag}
        />
        <div className="place-picker-hint">
          <span className="material-symbols-rounded">touch_app</span>
          Click the map or drag the pin to refine the location.
          {resolving && <span className="muted"> Resolving address…</span>}
        </div>
        {draft.address && <div className="place-picker-address"><span className="material-symbols-rounded">location_on</span>{draft.address}</div>}
        {error && <div className="error">{error}</div>}

        <div className="btn-row place-picker-actions">
          <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={resolving}>Save place</button>
        </div>
      </form>
    </div>
  )
}
