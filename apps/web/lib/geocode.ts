/**
 * Geocoding con Nominatim (OpenStreetMap) — gratis, sin API key.
 * Política de uso: 1 req/seg y User-Agent identificable. El llamador debe
 * respetar el rate limit (ver geocodificarPendientes). Best-effort: null si falla.
 */

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const q = address.trim()
  if (!q) return null

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', q)
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', '1')
    url.searchParams.set('countrycodes', 'co') // acotar a Colombia mejora la precisión

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Vectra/1.0 (plataforma de campañas electorales)' },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null

    const data = (await res.json()) as Array<{ lat: string; lon: string }>
    const hit  = data[0]
    if (!hit) return null

    const lat = parseFloat(hit.lat)
    const lng = parseFloat(hit.lon)
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
  } catch {
    return null
  }
}
