import { useState } from 'react'
import MapView from './MapView'
import { reverseGeocode } from '../api/geo'

export default function RoutePicker({ from, to, setFrom, setTo }) {
  const [target, setTarget] = useState('start')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const markers = [
    ...(from ? [{ id: 'start', lat: from.lat, lng: from.lng, label: 'Start location', kind: 'start', draggable: true }] : []),
    ...(to ? [{ id: 'drop', lat: to.lat, lng: to.lng, label: 'Destination', kind: 'drop', draggable: true }] : []),
  ]

  async function resolvePoint(point, pointTarget = target) {
    setLoading(true)
    setError('')
    try {
      const result = await reverseGeocode(point.lat, point.lng)
      const value = { ...point, address: result.address }
      if (pointTarget === 'start') setFrom(value)
      else setTo(value)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleMapPick(point) {
    resolvePoint(point)
  }

  function handleMarkerDrag(id, point) {
    resolvePoint(point, id === 'start' ? 'start' : 'drop')
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError('Location access is not supported by this browser')
      return
    }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      position => resolvePoint({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }),
      () => {
        setLoading(false)
        setError('Allow location access or choose a point on the map')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    )
  }

  return (
    <div className="route-picker">
      <div className="route-picker-head">
        <div>
          <strong>Choose on map</strong>
          <p className="muted">Select a pin, then click the map or drag it to fine-tune the location.</p>
        </div>
        {loading && <span className="muted">Resolving address…</span>}
      </div>
      <div className="route-picker-actions">
        <button type="button" className={'chip' + (target === 'start' ? ' chip-on' : '')} onClick={() => setTarget('start')}>
          <span className="material-symbols-rounded chip-icon">radio_button_checked</span> Set start
        </button>
        <button type="button" className={'chip' + (target === 'drop' ? ' chip-on' : '')} onClick={() => setTarget('drop')}>
          <span className="material-symbols-rounded chip-icon">location_on</span> Set destination
        </button>
        <button type="button" className="chip" onClick={useCurrentLocation}>
          <span className="material-symbols-rounded chip-icon">my_location</span> Use my location
        </button>
      </div>
      <MapView
        center={from ? [from.lat, from.lng] : undefined}
        markers={markers}
        height={360}
        interactive
        autoFit
        onMapPick={handleMapPick}
        onMarkerDrag={handleMarkerDrag}
      />
      {error && <div className="loc-hint error-hint">{error}</div>}
    </div>
  )
}
