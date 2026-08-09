'use client'

import { useState } from 'react'
import { saveSurveyConfig } from '../../actions'

export function SurveyConfigForm({ initial }: { initial: any }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function action(formData: FormData) {
    setLoading(true)
    setMessage('')

    const tokenIngresado = (formData.get('whatsappToken') as string)?.trim()

    const res = await saveSurveyConfig({
      whatsappToken: tokenIngresado || undefined,
      whatsappPhoneId: formData.get('whatsappPhoneId') as string,
      whatsappVerifyToken: formData.get('whatsappVerifyToken') as string,
      botName: formData.get('botName') as string,
      surveyDailyLimit: parseInt(formData.get('surveyDailyLimit') as string) || 250,
    })

    if (res.success) {
      setMessage('Configuración guardada correctamente.')
    } else {
      setMessage(res.error || 'Error desconocido.')
    }
    setLoading(false)
  }

  return (
    <form action={action} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-1">Nombre del Bot</label>
        <input name="botName" defaultValue={initial.botName} className="w-full border rounded px-3 py-2" required />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">WhatsApp Token (Meta)</label>
        <input
          name="whatsappToken" type="password" autoComplete="off"
          placeholder={initial.hasWhatsappToken ? '•••••••• (ya configurado)' : 'EAAG…'}
          className="w-full border rounded px-3 py-2"
        />
        <p className="text-xs text-slate-500 mt-1">Dejar en blanco para no cambiar el que ya está guardado.</p>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Phone Number ID (Meta)</label>
        <input name="whatsappPhoneId" defaultValue={initial.whatsappPhoneId} className="w-full border rounded px-3 py-2" />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Verify Token (Para Webhook)</label>
        <input name="whatsappVerifyToken" defaultValue={initial.whatsappVerifyToken} className="w-full border rounded px-3 py-2" />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Límite Diario de Mensajes</label>
        <input name="surveyDailyLimit" type="number" defaultValue={initial.surveyDailyLimit} className="w-full border rounded px-3 py-2" required />
      </div>

      <button disabled={loading} className="w-full bg-granate text-white font-semibold py-2 rounded-md hover:bg-granate-dark disabled:opacity-50 transition">
        {loading ? 'Guardando...' : 'Guardar Configuración'}
      </button>
      
      {message && <div className="text-sm mt-2 text-center text-slate-700">{message}</div>}
    </form>
  )
}
