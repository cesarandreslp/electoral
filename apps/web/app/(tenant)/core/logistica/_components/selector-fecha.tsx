'use client'

import { useRouter } from 'next/navigation'

export function SelectorFechaLogistica({ fecha }: { fecha: string }) {
  const router = useRouter()

  return (
    <input
      type="date" value={fecha}
      onChange={(e) => router.push(`/core/logistica?fecha=${e.target.value}`)}
      style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.875rem' }}
    />
  )
}
