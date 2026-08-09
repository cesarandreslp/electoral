'use client'

import { useState } from 'react'
import { enviarEncuestasAhora } from '../../actions'

const MENSAJES: Record<string, (count?: number) => string> = {
  success_count: (count) => `Enviado a ${count} elector(es) pendiente(s).`,
  success_zero:  () => 'No hay electores pendientes — todos ya fueron contactados.',
  sin_credenciales_whatsapp: () => 'Falta configurar el WhatsApp Token y Phone ID en Configuración.',
  whatsapp_deshabilitado: () => 'WhatsApp está apagado para encuestas — actívalo en Configuración.',
  daily_limit_reached: () => 'Se alcanzó el límite diario de mensajes de esta campaña.',
  outside_allowed_hours: () => 'Fuera del horario permitido (5:00 a.m. – 8:00 p.m.).',
}

export function EnviarAhoraButton() {
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState<{ texto: string; ok: boolean } | null>(null)

  async function handleClick() {
    setLoading(true)
    setMensaje(null)
    try {
      const res = await enviarEncuestasAhora()
      if (res.status === 'success') {
        const texto = res.count ? MENSAJES.success_count(res.count) : MENSAJES.success_zero()
        setMensaje({ texto, ok: true })
      } else if (res.status === 'skipped') {
        const texto = MENSAJES[res.reason ?? '']?.() ?? `Omitido: ${res.reason}`
        setMensaje({ texto, ok: false })
      } else {
        setMensaje({ texto: res.error ?? 'Error desconocido al enviar.', ok: false })
      }
    } catch {
      setMensaje({ texto: 'Error de conexión al enviar.', ok: false })
    } finally {
      setLoading(false)
      setTimeout(() => setMensaje(null), 8000)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-md font-semibold transition"
      >
        {loading ? 'Enviando…' : 'Enviar ahora'}
      </button>
      {mensaje && (
        <div className={`text-xs px-3 py-2 rounded-lg border max-w-xs text-right ${mensaje.ok ? 'text-green-700 bg-green-50 border-green-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}>
          {mensaje.texto}
        </div>
      )}
    </div>
  )
}
