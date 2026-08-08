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
