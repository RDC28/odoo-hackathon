// OpenStreetMap services: Nominatim (geocoding) + OSRM (routing).
// Both are free public endpoints — fine for a prototype.

export async function geocode(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=in&q=${encodeURIComponent(q)}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  const data = await res.json()
  return data.map(r => ({ address: r.display_name, lat: +r.lat, lng: +r.lon }))
}

export async function fetchRoute(from, to) {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
  const res = await fetch(url)
  const data = await res.json()
  const r = data.routes && data.routes[0]
  if (!r) throw new Error('No route found between these locations')
  return {
    coords: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distance_km: +(r.distance / 1000).toFixed(1),
    duration_min: Math.max(1, Math.round(r.duration / 60)),
  }
}

export function haversineKm(a, b) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}
