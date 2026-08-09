/**
 * Índice de compromiso de un elector — combina las tres señales de
 * actividad que un líder puede ver de su gente: encuestas respondidas,
 * asistencia a reuniones y masificación (personas que captó con su QR).
 * Heurística determinista, sin IA — mismo espíritu que el índice de
 * fidelidad de líderes en el módulo Analytics, pero a nivel elector.
 *
 * No reemplaza `commitmentStatus` (ese lo sigue editando el líder a mano);
 * es una segunda lectura, calculada, de "qué tan activo" es alguien.
 */

export interface SenalesCompromiso {
  encuestasRespondidas: number
  encuestasTotal:       number // preguntas de la campaña activa; 0 = no aplica, se excluye del promedio
  reunionesAsistidas:   number
  personasCaptadas:     number // gente que registró bajo su propio QR/link
}

export type NivelCompromiso = 'alto' | 'medio' | 'bajo'

export interface IndiceCompromiso {
  score: number // 0-100
  nivel: NivelCompromiso
}

/** Techo para no dejar que un solo súper-captador o asistente perfecto domine el promedio. */
const TECHO_REUNIONES = 5
const TECHO_PERSONAS  = 5

export function calcularIndiceCompromiso(s: SenalesCompromiso): IndiceCompromiso {
  const partes: number[] = []

  if (s.encuestasTotal > 0) {
    partes.push((s.encuestasRespondidas / s.encuestasTotal) * 100)
  }
  partes.push((Math.min(s.reunionesAsistidas, TECHO_REUNIONES) / TECHO_REUNIONES) * 100)
  partes.push((Math.min(s.personasCaptadas, TECHO_PERSONAS) / TECHO_PERSONAS) * 100)

  const score = Math.round(partes.reduce((a, b) => a + b, 0) / partes.length)
  const nivel: NivelCompromiso = score >= 60 ? 'alto' : score >= 25 ? 'medio' : 'bajo'

  return { score, nivel }
}
