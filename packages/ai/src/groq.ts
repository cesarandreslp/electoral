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

const BASE_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL    = 'llama-3.3-70b-versatile'

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
