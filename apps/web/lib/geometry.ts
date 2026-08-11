/**
 * Punto-en-polígono por ray-casting. Asume un polígono simple (sin huecos,
 * sin auto-intersección) como array de [lat, lng] — mismo orden que usa
 * Leaflet para dibujar.
 */
export function puntoEnPoligono(punto: [number, number], poligono: [number, number][]): boolean {
  const [px, py] = punto
  let dentro = false

  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i]
    const [xj, yj] = poligono[j]

    const cruza = (yi > py) !== (yj > py) &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi

    if (cruza) dentro = !dentro
  }

  return dentro
}

const RADIO_TIERRA_KM = 6371

/** Distancia en línea recta entre dos puntos (lat, lng) — fórmula haversine. */
export function distanciaHaversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const radianes = (grados: number) => (grados * Math.PI) / 180
  const dLat = radianes(b.lat - a.lat)
  const dLng = radianes(b.lng - a.lng)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h = sinLat * sinLat + Math.cos(radianes(a.lat)) * Math.cos(radianes(b.lat)) * sinLng * sinLng
  return 2 * RADIO_TIERRA_KM * Math.asin(Math.sqrt(h))
}

/**
 * Orden sugerido por cercanía (nearest-neighbor greedy) — parte del primer
 * punto de la lista (se asume ya ordenada cronológicamente) y en cada paso
 * salta al más cercano de los que quedan. No es óptimo (TSP es NP-difícil),
 * pero es suficiente para una sugerencia editable a mano.
 */
export function sugerirOrdenPorCercania<T extends { id: string; lat: number; lng: number }>(puntos: T[]): string[] {
  if (puntos.length === 0) return []
  const restantes = [...puntos]
  const orden: string[] = []

  let actual = restantes.shift()!
  orden.push(actual.id)

  while (restantes.length > 0) {
    let mejorIdx = 0
    let mejorDist = Infinity
    for (let i = 0; i < restantes.length; i++) {
      const d = distanciaHaversineKm(actual, restantes[i])
      if (d < mejorDist) { mejorDist = d; mejorIdx = i }
    }
    actual = restantes.splice(mejorIdx, 1)[0]
    orden.push(actual.id)
  }

  return orden
}
