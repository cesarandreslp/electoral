/**
 * Proveedor WhatsApp abstracto (mock) para desarrollo.
 * Loguea el intento y retorna éxito simulado.
 * TODO: reemplazar con proveedor real (WhatsApp Business API, etc.)
 */

import type { MessagingProvider, MessagePayload, SendResult } from '../types'

export class AbstractWhatsappProvider implements MessagingProvider {
  channel = 'WHATSAPP' as const
  name = 'abstract-whatsapp'

  async send(payload: MessagePayload): Promise<SendResult> {
    console.log(
      '[WA-MOCK] Para:', payload.to,
      '| Mensaje:', payload.body.substring(0, 50)
    )
    return { success: true, providerMsgId: 'mock-' + Date.now() }
  }
}
