'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setTieneAgenda } from '../actions'

export function BotonJefeDebate({ id, tieneAgenda }: { id: string; tieneAgenda: boolean }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function alternar() {
    if (!tieneAgenda && !confirm('¿Marcar como jefe de debate? Tendrá agenda propia reservable por electores y podrá convocar reuniones.')) return
    startTransition(async () => {
      await setTieneAgenda(id, !tieneAgenda)
      router.refresh()
    })
  }

  return (
    <button
      onClick={alternar}
      disabled={isPending}
      style={{
        background: tieneAgenda ? '#eff6ff' : '#f1f5f9',
        color:      tieneAgenda ? '#1e40af' : '#475569',
        border:     '1px solid ' + (tieneAgenda ? '#bfdbfe' : '#e2e8f0'),
        padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.875rem',
        cursor: isPending ? 'wait' : 'pointer',
      }}
    >
      {tieneAgenda ? 'Quitar como jefe de debate' : 'Marcar como jefe de debate'}
    </button>
  )
}
