'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getEncuestaPendiente } from '../actions'

export function BannerEncuesta() {
  const router = useRouter()
  const [pendientes, setPendientes] = useState(0)

  useEffect(() => {
    void getEncuestaPendiente().then((p) => setPendientes(p.length))
  }, [])

  if (pendientes === 0) return null

  return (
    <div
      onClick={() => router.push('/pwa/encuestas')}
      style={{
        background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '10px',
        padding: '0.875rem 1rem', marginBottom: '0.75rem', cursor: 'pointer',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}
    >
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#3730a3' }}>Hay una nueva encuesta</div>
        <div style={{ fontSize: '0.75rem', color: '#4338ca', marginTop: '2px' }}>
          {pendientes} pregunta{pendientes === 1 ? '' : 's'} pendiente{pendientes === 1 ? '' : 's'} · toca para responder
        </div>
      </div>
      <span style={{ color: '#4338ca', fontSize: '1.1rem' }}>→</span>
    </div>
  )
}
