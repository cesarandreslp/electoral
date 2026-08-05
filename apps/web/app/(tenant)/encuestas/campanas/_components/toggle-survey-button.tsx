'use client'

import { useState } from 'react'
import { toggleSurveyEnabled } from '../../actions'

export function ToggleSurveyButton({ campaignId, isEnabled }: { campaignId: string, isEnabled: boolean }) {
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    setLoading(true)
    await toggleSurveyEnabled(campaignId)
    setLoading(false)
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
        isEnabled 
          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
      }`}
    >
      {loading ? 'Cambiando...' : (isEnabled ? 'Sí (Activa)' : 'No (Inactiva)')}
    </button>
  )
}
