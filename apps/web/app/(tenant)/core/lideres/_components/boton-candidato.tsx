'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setCandidato } from '../../actions'

export function BotonCandidato({ id, esCandidato }: { id: string; esCandidato: boolean }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function alternar() {
    if (!esCandidato && !confirm('¿Marcar como el candidato de la campaña? Dejará de aparecer en el panel de líderes y en el ranking. Si había otro candidato marcado, se desmarca.')) return
    startTransition(async () => {
      await setCandidato(id, !esCandidato)
      router.refresh()
    })
  }

  return (
    <button
      onClick={alternar}
      disabled={isPending}
      style={{
        background: esCandidato ? '#fef2f2' : '#f1f5f9',
        color:      esCandidato ? '#991b1b' : '#475569',
        border:     '1px solid ' + (esCandidato ? '#fecaca' : '#e2e8f0'),
        padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.875rem',
        cursor: isPending ? 'wait' : 'pointer',
      }}
    >
      {esCandidato ? 'Quitar como candidato' : 'Marcar como candidato'}
    </button>
  )
}
