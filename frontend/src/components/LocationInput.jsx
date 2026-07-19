import { useEffect, useRef, useState } from 'react'
import { geocode } from '../api/geo'

export default function LocationInput({ label, value, onChange, placeholder, savedPlaces = [] }) {
  const [text, setText] = useState(value ? value.address : '')
  const [sugs, setSugs] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const timer = useRef(null)
  const reqId = useRef(0)

  useEffect(() => { if (value) setText(value.address) }, [value && value.address])

  function handleText(t) {
    setText(t)
    onChange(null)
    setFailed(false)
    clearTimeout(timer.current)
    if (t.trim().length < 3) { setSugs([]); setOpen(false); setLoading(false); return }
    setLoading(true)
    const myReq = ++reqId.current
    // Debounce geocoding so Nominatim is not called for every keystroke.
    timer.current = setTimeout(async () => {
      try {
        const results = await geocode(t)
        // Ignore a slow older response so it cannot overwrite newer suggestions.
        if (myReq !== reqId.current) return
        setSugs(results)
        setOpen(true)
      } catch {
        if (myReq !== reqId.current) return
        setSugs([])
        setFailed(true)
      }
      if (myReq === reqId.current) setLoading(false)
    }, 450)
  }

  function pick(p) {
    onChange({ address: p.address, lat: p.lat, lng: p.lng })
    setText(p.address)
    setOpen(false)
  }

  return (
    <div className="field loc-input">
      <label>{label}</label>
      <input
        value={text}
        placeholder={placeholder || 'Search a location…'}
        onChange={e => handleText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
        onFocus={() => sugs.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      />
      {savedPlaces.length > 0 && (
        <div className="chips">
          {savedPlaces.map(p => (
            <button type="button" key={p._id} className="chip" onClick={() => pick(p)}>
              <span className="material-symbols-rounded chip-icon">location_on</span>
              {p.label}
            </button>
          ))}
        </div>
      )}
      {loading && <div className="loc-hint">Searching…</div>}
      {failed && !loading && <div className="loc-hint error-hint">Couldn't search right now — try again.</div>}
      {open && sugs.length > 0 && (
        <div className="suggestions">
          {sugs.map((s, i) => (
            <div key={i} className="suggestion" onMouseDown={() => pick(s)}>{s.address}</div>
          ))}
        </div>
      )}
      {value && <div className="loc-picked"><span className="material-symbols-rounded">check</span> Location selected</div>}
    </div>
  )
}

