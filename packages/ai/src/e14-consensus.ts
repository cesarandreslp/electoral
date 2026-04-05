/**
 * Función de consenso para resultados de extracción del E-14.
 * Compara los resultados de Groq y Zhipu y determina el nivel de confianza.
 */

import type { E14ExtractionResult } from './index'

export interface ConsensoResult {
  data: E14ExtractionResult
  confidence: 'ALTA' | 'MEDIA' | 'BAJA'
  discrepancies: string[]
}

/** Normaliza un nombre para comparación: trim, lowercase, sin acentos */
function normalize(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Determina el consenso entre dos resultados de extracción de E-14.
 *
 * - Si todos los candidatos coinciden en votos → ALTA
 * - Si difieren en 1 candidato → MEDIA (promedio redondeado)
 * - Si difieren en 2+ candidatos → BAJA (usa Groq como primario)
 */
export function consensoE14(
  groqResult: E14ExtractionResult,
  zhipuResult: E14ExtractionResult,
): ConsensoResult {
  // Mapear candidatos de Zhipu por nombre normalizado
  const zhipuMap = new Map<string, number | null>()
  for (const c of zhipuResult.candidatos) {
    zhipuMap.set(normalize(c.nombre), c.votos)
  }

  const discrepancies: string[] = []
  const mergedCandidatos: { nombre: string; votos: number | null }[] = []

  for (const gc of groqResult.candidatos) {
    const normalizedName = normalize(gc.nombre)
    const zhipuVotos     = zhipuMap.get(normalizedName)

    if (zhipuVotos !== undefined && gc.votos !== null && zhipuVotos !== null) {
      if (gc.votos === zhipuVotos) {
        // Coinciden
        mergedCandidatos.push({ nombre: gc.nombre, votos: gc.votos })
      } else {
        // Difieren
        discrepancies.push(gc.nombre)
        mergedCandidatos.push({
          nombre: gc.nombre,
          votos:  Math.round((gc.votos + zhipuVotos) / 2),
        })
      }
    } else {
      // Solo Groq tiene este candidato, o uno tiene null
      mergedCandidatos.push({ nombre: gc.nombre, votos: gc.votos })
      if (gc.votos !== null && zhipuVotos === undefined) {
        discrepancies.push(gc.nombre)
      }
    }
  }

  // Candidatos que solo Zhipu detectó
  for (const zc of zhipuResult.candidatos) {
    const normalizedName = normalize(zc.nombre)
    const yaIncluido     = groqResult.candidatos.some(
      gc => normalize(gc.nombre) === normalizedName,
    )
    if (!yaIncluido) {
      mergedCandidatos.push({ nombre: zc.nombre, votos: zc.votos })
      discrepancies.push(zc.nombre)
    }
  }

  // Determinar confianza
  let confidence: 'ALTA' | 'MEDIA' | 'BAJA'
  let finalData: E14ExtractionResult

  if (discrepancies.length === 0) {
    confidence = 'ALTA'
    finalData = {
      candidatos:  mergedCandidatos,
      totalVotos:  groqResult.totalVotos ?? zhipuResult.totalVotos,
      mesaNumero:  groqResult.mesaNumero ?? zhipuResult.mesaNumero,
      rawResponse: `consenso:ALTA groq:${groqResult.rawResponse.slice(0, 100)}`,
    }
  } else if (discrepancies.length === 1) {
    confidence = 'MEDIA'
    finalData = {
      candidatos:  mergedCandidatos,
      totalVotos:  groqResult.totalVotos ?? zhipuResult.totalVotos,
      mesaNumero:  groqResult.mesaNumero ?? zhipuResult.mesaNumero,
      rawResponse: `consenso:MEDIA disc:${discrepancies[0]}`,
    }
  } else {
    confidence = 'BAJA'
    // Groq como primario cuando la confianza es baja
    finalData = {
      candidatos:  groqResult.candidatos,
      totalVotos:  groqResult.totalVotos,
      mesaNumero:  groqResult.mesaNumero,
      rawResponse: `consenso:BAJA disc:${discrepancies.join(',')}`,
    }
  }

  return { data: finalData, confidence, discrepancies }
}
