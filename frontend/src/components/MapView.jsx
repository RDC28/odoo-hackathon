import { useEffect, useRef } from 'react'
import L from 'leaflet'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow,
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
})

const CarIcon = L.divIcon({
  className: 'car-marker',
  html: '<span class="material-symbols-rounded car-marker-inner">directions_car</span>',
  iconSize: [34, 34], iconAnchor: [17, 17],
})

export default function MapView({ center = [23.03, 72.58], zoom = 12, markers = [], polyline = null, height = 320 }) {
  const divRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)

  useEffect(() => {
    const map = L.map(divRef.current).setView(center, zoom)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    return () => map.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const g = layerRef.current
    const map = mapRef.current
    if (!g || !map) return
    g.clearLayers()
    markers.forEach(m => {
      const icon = m.car ? CarIcon : DefaultIcon
      const mk = L.marker([m.lat, m.lng], { icon }).addTo(g)
      if (m.label) mk.bindPopup(m.label)
    })
    if (polyline && polyline.length > 1) {
      const line = L.polyline(polyline, { color: '#1971c2', weight: 5, opacity: 0.85 }).addTo(g)
      if (!markers.some(m => m.car)) map.fitBounds(line.getBounds(), { padding: [30, 30] })
    } else if (markers.length > 1) {
      map.fitBounds(L.latLngBounds(markers.map(m => [m.lat, m.lng])), { padding: [40, 40] })
    } else if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 14)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(markers), JSON.stringify(polyline)])

  return <div ref={divRef} className="map-box" style={{ height }} />
}

