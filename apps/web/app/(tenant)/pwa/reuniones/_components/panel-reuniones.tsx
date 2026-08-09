'use client'

import { useEffect, useState } from 'react'
import { listarReuniones, crearReunion, marcarAsistencia, type ReunionListado } from '../actions'

interface ElectorRed {
  id:   string
  name: string
}

export function PanelReuniones() {
  const [reuniones, setReuniones] = useState<ReunionListado[] | null>(null)
  const [red, setRed] = useState<ElectorRed[]>([])
  const [expandida, setExpandida] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [creando, setCreando] = useState(false)

  async function cargar() {
    const [r, resRed] = await Promise.all([
      listarReuniones(),
      fetch('/api/core/mis-electores').then((res) => res.json()).catch(() => ({ electores: [] })),
    ])
    setReuniones(r)
    setRed((resRed.electores ?? []).map((e: ElectorRed) => ({ id: e.id, name: e.name })))
  }

  useEffect(() => { void cargar() }, [])

  async function onCrear(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !date) return
    setCreando(true)
    await crearReunion(title, date)
    setTitle('')
    setDate('')
    setCreando(false)
    await cargar()
  }

  async function toggleAsistio(meetingId: string, voterId: string, yaAsistio: boolean) {
    // Optimista — evita esperar el round-trip para que se sienta instantáneo al marcar varios.
    setReuniones((prev) =>
      (prev ?? []).map((r) => {
        if (r.id !== meetingId) return r
        const asistentes = yaAsistio
          ? r.asistentes.filter((a) => a.id !== voterId)
          : [...r.asistentes, { id: voterId, name: red.find((e) => e.id === voterId)?.name ?? '' }]
        return { ...r, asistentes }
      }),
    )
    await marcarAsistencia(meetingId, voterId, !yaAsistio)
  }

  if (reuniones === null) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.875rem' }}>Cargando...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <form onSubmit={onCrear} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <input
          value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Título de la reunión" required
          style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
        />
        <input
          type="date" value={date} onChange={(e) => setDate(e.target.value)} required
          style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
        />
        <button
          type="submit" disabled={creando}
          style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.5rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
        >
          {creando ? 'Creando...' : '+ Convocar reunión'}
        </button>
      </form>

      {reuniones.length === 0 && (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
          Todavía no has convocado ninguna reunión.
        </div>
      )}

      {reuniones.map((r) => {
        const asistentesIds = new Set(r.asistentes.map((a) => a.id))
        return (
          <div key={r.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpandida(expandida === r.id ? null : r.id)}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.title}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {new Date(r.date).toLocaleDateString('es-CO')} · {r.asistentes.length} asistente{r.asistentes.length === 1 ? '' : 's'}
                </div>
              </div>
              <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{expandida === r.id ? 'Ocultar' : 'Marcar asistencia'}</span>
            </div>

            {expandida === r.id && (
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {red.length === 0 && <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No tienes electores en tu red todavía.</div>}
                {red.map((e) => {
                  const asistio = asistentesIds.has(e.id)
                  return (
                    <label key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={asistio} onChange={() => toggleAsistio(r.id, e.id, asistio)} />
                      {e.name}
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
