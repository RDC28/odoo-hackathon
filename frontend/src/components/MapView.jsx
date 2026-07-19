import { useEffect, useRef } from 'react'
import L from 'leaflet'

const StartIcon = L.divIcon({
  className: 'map-pin map-pin-start',
  html: '<span class="material-symbols-rounded">radio_button_checked</span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
})

const DropIcon = L.divIcon({
  className: 'map-pin map-pin-drop',
  html: '<span class="material-symbols-rounded">location_on</span>',
  iconSize: [34, 34],
  iconAnchor: [17, 31],
})

const CarIcon = L.divIcon({
  className: 'map-pin map-pin-car',
  html: '<span class="material-symbols-rounded">directions_car</span>',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
})

const PoiIcon = L.divIcon({
  className: 'map-pin map-pin-poi',
  html: '<span class="material-symbols-rounded">location_on</span>',
  iconSize: [30, 30],
  iconAnchor: [15, 28],
})

function iconFor(marker) {
  if (marker.car) return CarIcon
  if (marker.kind === 'start' || marker.kind === 'pickup') return StartIcon
  if (marker.kind === 'drop' || marker.kind === 'destination') return DropIcon
  return PoiIcon
}

export default function MapView({
  center = [23.03, 72.58],
  zoom = 12,
  markers = [],
  polyline = null,
  height = 320,
  interactive = false,
  onMapPick,
  onMarkerDrag,
  autoFit = true,
}) {
  const divRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const onMapPickRef = useRef(onMapPick)
  const onMarkerDragRef = useRef(onMarkerDrag)

  useEffect(() => { onMapPickRef.current = onMapPick }, [onMapPick])
  useEffect(() => { onMarkerDragRef.current = onMarkerDrag }, [onMarkerDrag])

  // The Leaflet map is created once; refs let its stable handlers use the latest callbacks.
  useEffect(() => {
    const map = L.map(divRef.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
    }).setView(center, zoom)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    const layer = L.layerGroup().addTo(map)
    const handleClick = e => {
      if (interactive && onMapPickRef.current) {
        onMapPickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng })
      }
    }
    map.on('click', handleClick)
    mapRef.current = map
    layerRef.current = layer

    const resizeObserver = new ResizeObserver(() => map.invalidateSize({ pan: false }))
    resizeObserver.observe(divRef.current)
    requestAnimationFrame(() => map.invalidateSize({ pan: false }))

    return () => {
      resizeObserver.disconnect()
      map.off('click', handleClick)
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
    // The map instance is intentionally created once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Stringifying marker content avoids rebuilding layers when callers create a new array with unchanged markers.
  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()

    markers.forEach(marker => {
      const leafletMarker = L.marker([marker.lat, marker.lng], {
        icon: iconFor(marker),
        draggable: Boolean(marker.draggable && onMarkerDragRef.current),
        keyboard: true,
        title: marker.label || '',
      }).addTo(layer)

      if (marker.label) leafletMarker.bindPopup(marker.label)
      if (marker.draggable && onMarkerDragRef.current) {
        leafletMarker.on('dragend', () => {
          const point = leafletMarker.getLatLng()
          onMarkerDragRef.current(marker.id, { lat: point.lat, lng: point.lng })
        })
      }
    })

    if (polyline && polyline.length > 1) {
      const line = L.polyline(polyline, {
        color: '#232323',
        weight: 5,
        opacity: 0.88,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(layer)
      if (autoFit) map.fitBounds(line.getBounds(), { padding: [36, 36], maxZoom: 15 })
    } else if (autoFit && markers.length > 1) {
      map.fitBounds(L.latLngBounds(markers.map(m => [m.lat, m.lng])), { padding: [44, 44], maxZoom: 15 })
    } else if (autoFit && markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 14)
    }
  }, [JSON.stringify(markers), JSON.stringify(polyline), autoFit])

  return (
    <div
      ref={divRef}
      className={'map-box' + (interactive ? ' map-box-interactive' : '')}
      style={{ height }}
      aria-label={interactive ? 'Interactive map. Click to drop a location pin.' : 'Map'}
    />
  )
}
