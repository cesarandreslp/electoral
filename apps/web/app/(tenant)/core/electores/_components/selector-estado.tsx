'use client'

/**
 * Selector rápido de estado de compromiso — inline en la tabla de electores.
 * Llama a updateVoterCommitment() sin recargar la página completa.
 */

import { useTransition } from 'react'
import { updateVoterCommitment, type CommitmentStatus } from '../../actions'

const ESTADOS: { value: CommitmentStatus; label: string }[] = [
  { value: 'SIN_CONTACTAR', label: 'Sin contactar' },
  { value: 'CONTACTADO',    label: 'Contactado' },
  { value: 'SIMPATIZANTE',  label: 'Simpatizante' },
  { value: 'COMPROMETIDO',  label: 'Comprometido' },
  { value: 'VOTO_SEGURO',   label: 'Voto seguro' },
]

interface SelectorEstadoProps {
  voterId:      string
  estadoActual: CommitmentStatus
}

export function SelectorEstado({ voterId, estadoActual }: SelectorEstadoProps) {
  const [isPending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nuevoEstado = e.target.value as CommitmentStatus
    startTransition(async () => {
      await updateVoterCommitment(voterId, nuevoEstado)
    })
  }

  return (
    <select
      defaultValue={estadoActual}
      onChange={handleChange}
      disabled={isPending}
      style={{
        padding:      '0.25rem 0.5rem',
        border:       '1px solid #cbd5e1',
        borderRadius: '6px',
        fontSize:     '0.8rem',
        background:   isPending ? '#f1f5f9' : '#fff',
        cursor:       isPending ? 'wait' : 'pointer',
        opacity:      isPending ? 0.7 : 1,
      }}
    >
      {ESTADOS.map((e) => (
        <option key={e.value} value={e.value}>{e.label}</option>
      ))}
    </select>
  )
}
