/**
 * Cliente Groq para tareas de IA en tiempo real.
 *
 * Usa la API OpenAI-compatible de Groq con llama-3.3-70b-versatile.
 * Se usa fetch nativo — sin SDKs externos.
 *
 * Env var requerida: GROQ_API_KEY
 *
 * Reservado para: notificaciones inteligentes, sala de situación día E.
 */

import type { E14ExtractionResult } from './index'

const BASE_URL     = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL        = 'llama-3.3-70b-versatile'
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

interface GroqChoice {
  message: { role: string; content: string }
}

interface GroqResponse {
  choices: GroqChoice[]
}

/**
 * Envía un mensaje al modelo Groq y retorna el contenido de la respuesta.
 *
 * @param systemPrompt - Instrucciones de sistema para el modelo
 * @param userMessage  - Mensaje del usuario
 * @returns Contenido de la respuesta del modelo (string)
 * @throws Error si la API key no está configurada, la API falla, o la respuesta es vacía
 */
export async function chatGroq(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY no está configurada en las variables de entorno.')
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
    throw new Error(`Groq API error ${res.status}: ${body}`)
  }

  const data = (await res.json()) as GroqResponse

  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('Groq API retornó una respuesta vacía.')
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
 * Extrae datos del formulario E-14 de una imagen usando Groq Vision.
 * Usa meta-llama/llama-4-scout-17b-16e-instruct con capacidades de visión.
 *
 * @param imageBase64 - Imagen codificada en base64
 * @param mimeType    - Tipo MIME de la imagen (image/jpeg, image/png, etc.)
 */
export async function extractE14WithGroq(
  imageBase64: string,
  mimeType: string,
): Promise<E14ExtractionResult> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY no está configurada en las variables de entorno.')
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
    throw new Error(`Groq Vision API error ${res.status}: ${body}`)
  }

  const data = (await res.json()) as GroqResponse
  const rawResponse = data.choices?.[0]?.message?.content ?? ''

  try {
    // Extraer JSON de la respuesta (puede venir envuelto en markdown)
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
