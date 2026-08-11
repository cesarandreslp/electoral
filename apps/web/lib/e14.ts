/**
 * Reglas del formulario E-14 (acta de escrutinio de la Registraduría).
 * Vive fuera de dia-e/actions.ts porque ese archivo es 'use server' y solo
 * puede exportar funciones async.
 */

/**
 * Cargos uninominales: el tarjetón es de foto + agrupación, y el testigo
 * identifica el renglón del acta por la cara y el logo, no leyendo el nombre.
 * Por eso ahí foto y agrupación son obligatorias, no opcionales.
 * En cuerpos colegiados (concejo, asamblea, cámara, senado) el tarjetón va por
 * lista de partido, así que la foto individual no aplica igual.
 */
const CARGOS_UNINOMINALES = ['ALCALDE', 'GOBERNADOR', 'PRESIDENTE'] as const

export function requiereFotoYAgrupacion(cargo: string | null | undefined): boolean {
  return Boolean(cargo && (CARGOS_UNINOMINALES as readonly string[]).includes(cargo))
}

/** Etiqueta del cargo tal como encabeza el acta física ("ALCALDE", "GOBERNADOR"…). */
export function tituloActa(cargo: string | null | undefined): string {
  return cargo ?? 'CORPORACIÓN'
}

export interface Nivelacion {
  e11:         number // TOTAL VOTANTES FORMULARIO E-11
  urna:        number // TOTAL VOTOS DEL CARGO EN LA URNA
  incinerados: number // TOTAL VOTOS INCINERADOS
}

export interface ChequeoNivelacion {
  ok:      boolean
  errores: string[]
  avisos:  string[]
}

/**
 * Valida el bloque "NIVELACIÓN DE LA MESA" contra los votos digitados.
 *
 * - La suma de votos digitados DEBE igualar los votos en la urna: si no, el
 *   testigo transcribió mal y no tiene sentido transmitir.
 * - Votantes E-11 vs votos en urna deberían coincidir; si no, el acta física
 *   tiene una inconsistencia real (sobran o faltan votos en la urna) que se
 *   reclama en la mesa. Es aviso, no bloqueo: el testigo transmite lo que dice
 *   el acta, no lo que debería decir.
 */
export function validarNivelacion(sumaDigitada: number, n: Nivelacion): ChequeoNivelacion {
  const errores: string[] = []
  const avisos:  string[] = []

  if (n.urna <= 0) {
    errores.push('Falta el total de votos en la urna (bloque de nivelación).')
  } else if (sumaDigitada !== n.urna) {
    const dif = Math.abs(sumaDigitada - n.urna)
    errores.push(`La suma digitada (${sumaDigitada}) no coincide con los votos en la urna (${n.urna}). Diferencia: ${dif}.`)
  }

  if (n.e11 > 0 && n.urna > 0 && n.e11 !== n.urna) {
    const dif = n.urna - n.e11
    avisos.push(
      dif > 0
        ? `Hay ${dif} voto(s) MÁS en la urna que votantes en el E-11 — inconsistencia del acta, déjala reclamada en la mesa.`
        : `Hay ${Math.abs(dif)} voto(s) MENOS en la urna que votantes en el E-11 — inconsistencia del acta, déjala reclamada en la mesa.`,
    )
  }

  return { ok: errores.length === 0, errores, avisos }
}
