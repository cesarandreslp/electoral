/**
 * Cliente Zhipu Flash (Z-AI) para análisis de fidelidad de líderes.
 *
 * Usa la API OpenAI-compatible de ZhipuAI con el modelo glm-4-flash.
 * Se usa fetch nativo — sin SDKs externos.
 *
 * Env var requerida: ZHIPU_API_KEY
 */

import type { E14ExtractionResult } from './index'

const BASE_URL     = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const MODEL        = 'glm-4-flash'
const VISION_MODEL = 'glm-4v-flash'

interface ZhipuChoice {
  message: { role: string; content: string }
}

interface ZhipuResponse {
  choices: ZhipuChoice[]
}

/**
 * Envía un mensaje al modelo Zhipu Flash y retorna el contenido de la respuesta.
 *
 * @param systemPrompt - Instrucciones de sistema para el modelo
 * @param userMessage  - Mensaje del usuario (contexto del líder en JSON)
 * @returns Contenido de la respuesta del modelo (string)
 * @throws Error si la API key no está configurada, la API falla, o la respuesta es vacía
 */
export async function chatZhipu(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.ZHIPU_API_KEY
  if (!apiKey) {
    throw new Error('ZHIPU_API_KEY no está configurada en las variables de entorno.')
  }

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage },
      ],
      temperature: 0.3,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '(sin cuerpo)')
    throw new Error(`Zhipu API error ${res.status}: ${body}`)
  }

  const data = (await res.json()) as ZhipuResponse

  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('Zhipu API retornó una respuesta vacía.')
  }

  return content
}

const E14_SYSTEM_PROMPT = `Eres un sistema de extracción de datos de formularios electorales colombianos. El formulario E-14 contiene los votos por candidato en una mesa de votación.
Extrae TODOS los candidatos y sus votos del formulario.
Responde SOLO con JSON válido en este formato exacto:
{ "candidatos": [{ "nombre": "string", "votos": number }], "totalVotos": number, "mesaNumero": "string" }
Si no puedes leer algún valor con certeza, usa null.
No inventes datos — solo extrae lo que es legible.`

/**
 * Extrae datos del formulario E-14 de una imagen usando Zhipu Vision.
 * Usa glm-4v-flash con capacidades de visión.
 *
 * @param imageBase64 - Imagen codificada en base64
 * @param mimeType    - Tipo MIME de la imagen (image/jpeg, image/png, etc.)
 */
export async function extractE14WithZhipu(
  imageBase64: string,
  mimeType: string,
): Promise<E14ExtractionResult> {
  const apiKey = process.env.ZHIPU_API_KEY
  if (!apiKey) {
    throw new Error('ZHIPU_API_KEY no está configurada en las variables de entorno.')
  }

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: E14_SYSTEM_PROMPT },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
          ],
        },
      ],
      temperature: 0.1,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '(sin cuerpo)')
    throw new Error(`Zhipu Vision API error ${res.status}: ${body}`)
  }

  const data = (await res.json()) as ZhipuResponse
  const rawResponse = data.choices?.[0]?.message?.content ?? ''

  try {
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(jsonMatch?.[0] ?? rawResponse)
    return {
      candidatos:  parsed.candidatos ?? [],
      totalVotos:  parsed.totalVotos ?? null,
      mesaNumero:  parsed.mesaNumero ?? null,
      rawResponse,
    }
  } catch {
    return {
      candidatos:  [],
      totalVotos:  null,
      mesaNumero:  null,
      rawResponse,
    }
  }
}
