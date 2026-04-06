/**
 * Proveedor SMS abstracto (mock) para desarrollo.
 * Loguea el intento y retorna éxito simulado.
 * TODO: reemplazar con proveedor real (Twilio, Masivapp, etc.)
 */

import type { MessagingProvider, MessagePayload, SendResult } from '../types'

export class AbstractSmsProvider implements MessagingProvider {
  channel = 'SMS' as const
  name = 'abstract-sms'

  async send(payload: MessagePayload): Promise<SendResult> {
    console.log(
      '[SMS-MOCK] Para:', payload.to,
      '| Mensaje:', payload.body.substring(0, 50)
    )
    return { success: true, providerMsgId: 'mock-' + Date.now() }
  }
}
