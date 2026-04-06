/**
 * Dispatcher central de mensajería.
 * Selecciona el proveedor correcto según el canal y gestiona el envío
 * individual y por lotes con rate-limiting entre batches.
 */

import { SmtpEmailProvider } from './providers/email-smtp'
import { AbstractSmsProvider } from './providers/sms-abstract'
import { AbstractWhatsappProvider } from './providers/whatsapp-abstract'
import type { MessagingProvider, MessagePayload, SendResult, SmtpConfig } from './types'

/**
 * Retorna el proveedor adecuado según el canal.
 * Para EMAIL requiere smtpConfig; SMS y WhatsApp usan mocks por ahora.
 */
export function getProvider(
  channel: string,
  smtpConfig?: SmtpConfig
): MessagingProvider {
  switch (channel) {
    case 'EMAIL':
      if (!smtpConfig) {
        throw new Error('Se requiere smtpConfig para enviar emails.')
      }
      return new SmtpEmailProvider(smtpConfig)
    case 'SMS':
      return new AbstractSmsProvider()
    case 'WHATSAPP':
      return new AbstractWhatsappProvider()
    default:
      throw new Error(`Canal no soportado: ${channel}`)
  }
}

/**
 * Envía un mensaje individual a través del proveedor correspondiente.
 */
export async function sendMessage(
  payload: MessagePayload,
  smtpConfig?: SmtpConfig
): Promise<SendResult> {
  const provider = getProvider(payload.channel, smtpConfig)
  return provider.send(payload)
}

/**
 * Envía mensajes en lotes para no saturar los proveedores.
 * Procesa `batchSize` mensajes en paralelo, con un delay de 100ms entre batches.
 * Retorna los resultados en el mismo orden que los payloads.
 */
export async function sendBatch(
  payloads: MessagePayload[],
  smtpConfig?: SmtpConfig,
  batchSize: number = 10
): Promise<SendResult[]> {
  const results: SendResult[] = []

  for (let i = 0; i < payloads.length; i += batchSize) {
    const chunk = payloads.slice(i, i + batchSize)
    const chunkResults = await Promise.all(
      chunk.map(p => sendMessage(p, smtpConfig))
    )
    results.push(...chunkResults)

    // Delay entre batches para no saturar el proveedor
    if (i + batchSize < payloads.length) {
      await new Promise(r => setTimeout(r, 100))
    }
  }

  return results
}
