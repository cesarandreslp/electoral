/**
 * Cliente Zhipu Flash (Z-AI) para análisis de fidelidad de líderes.
 *
 * Usa la API OpenAI-compatible de ZhipuAI con el modelo glm-4-flash.
 * Se usa fetch nativo — sin SDKs externos.
 *
 * Env var requerida: ZHIPU_API_KEY
 */

const BASE_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const MODEL    = 'glm-4-flash'

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
