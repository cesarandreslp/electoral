/**
 * "Temperatura" de un elector según su estado de compromiso — usado por el
 * mapa de calor tanto en la PWA (mi gente) como en el dashboard del admin
 * (toda la campaña), para que ambos hablen el mismo idioma de colores.
 */

export type Temperatura = 'frio' | 'tibio' | 'caliente'

const TEMPERATURA_POR_ESTADO: Record<string, Temperatura> = {
  SIN_CONTACTAR: 'frio',
  CONTACTADO:    'frio',
  SIMPATIZANTE:  'tibio',
  COMPROMETIDO:  'caliente',
  VOTO_SEGURO:   'caliente',
}

// Intensidad para el heat layer — más alto pesa más en el gradiente.
const INTENSIDAD_POR_ESTADO: Record<string, number> = {
  SIN_CONTACTAR: 0.25,
  CONTACTADO:    0.35,
  SIMPATIZANTE:  0.6,
  COMPROMETIDO:  0.85,
  VOTO_SEGURO:   1.0,
}

export const COLOR_TEMPERATURA: Record<Temperatura, string> = {
  frio:     '#3b82f6',
  tibio:    '#f59e0b',
  caliente: '#ef4444',
}

export const ETIQUETA_TEMPERATURA: Record<Temperatura, string> = {
  frio:     'Fría',
  tibio:    'Tibia',
  caliente: 'Caliente',
}

// Gradiente para leaflet.heat: azul (frío) → amarillo (tibio) → rojo (caliente).
export const GRADIENTE_CALOR: Record<number, string> = {
  0.0: '#3b82f6',
  0.5: '#f59e0b',
  1.0: '#ef4444',
}

export function temperaturaDeEstado(estado: string): Temperatura {
  return TEMPERATURA_POR_ESTADO[estado] ?? 'frio'
}

export function intensidadDeEstado(estado: string): number {
  return INTENSIDAD_POR_ESTADO[estado] ?? 0.25
}
