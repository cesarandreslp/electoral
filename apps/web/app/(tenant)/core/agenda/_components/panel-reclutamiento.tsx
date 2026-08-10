'use client'

import { useState } from 'react'
import { type ReunionReclutamientoAdmin } from '../actions'

export function PanelReclutamiento({ reuniones }: { reuniones: ReunionReclutamientoAdmin[] }) {
  const [expandida, setExpandida] = useState<string | null>(null)

  if (reuniones.length === 0) {
    return (
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', color: '#94a3b8', fontSize: '0.875rem' }}>
        Todavía no hay reuniones de reclutamiento.
      </div>
    )
  }

  const totalProspectos = reuniones.reduce((acc, r) => acc + r.prospectos.length, 0)

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#64748b' }}>
        {reuniones.length} reunión(es) · {totalProspectos} prospecto(s) en total
      </div>
      {reuniones.map((r) => (
        <div key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div
            onClick={() => setExpandida(expandida === r.id ? null : r.id)}
            style={{ padding: '0.9rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.title}</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                {new Date(r.date).toLocaleDateString('es-CO')} · organiza {r.organizadorName} · {r.prospectos.length} prospecto(s)
              </div>
            </div>
            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{expandida === r.id ? 'Ocultar' : 'Ver'}</span>
          </div>
          {expandida === r.id && (
            <div style={{ padding: '0 1.25rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {r.prospectos.length === 0 && <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Sin prospectos todavía.</div>}
              {r.prospectos.map((p, i) => (
                <div key={i} style={{ fontSize: '0.85rem' }}>
                  {p.name}{p.phone ? ` · ${p.phone}` : ''}{p.notes ? ` — ${p.notes}` : ''}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
