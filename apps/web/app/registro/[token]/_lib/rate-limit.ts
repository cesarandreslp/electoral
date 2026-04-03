/**
 * Rate limiter en memoria para el formulario público de registro por QR.
 * Máximo 10 registros por IP por hora.
 *
 * Nota: en Vercel serverless cada instancia tiene su propio Map.
 * Es aceptable para MVP — el límite actúa por instancia, no globalmente.
 * Para producción a escala, reemplazar con Redis (Upstash).
 */

interface EntradaIP {
  count:     number
  resetAt:   number  // timestamp UNIX en ms
}

const mapa = new Map<string, EntradaIP>()

const LIMITE_POR_HORA = 10
const VENTANA_MS      = 60 * 60 * 1000  // 1 hora

/**
 * Verifica si la IP puede realizar un intento más.
 * @returns true si se permite, false si supera el límite
 */
export function verificarRateLimit(ip: string): boolean {
  const ahora  = Date.now()
  const entrada = mapa.get(ip)

  if (!entrada || ahora > entrada.resetAt) {
    // Primera solicitud o ventana expirada — resetear contador
    mapa.set(ip, { count: 1, resetAt: ahora + VENTANA_MS })
    return true
  }

  if (entrada.count >= LIMITE_POR_HORA) {
    return false
  }

  entrada.count++
  return true
}
