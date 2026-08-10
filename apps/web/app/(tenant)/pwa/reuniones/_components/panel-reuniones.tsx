'use client'

import { useEffect, useState } from 'react'
import {
  listarReuniones, crearReunion, marcarAsistencia, agregarProspecto, quitarProspecto,
  type ReunionListado,
} from '../actions'
import { getMisConvocatorias, type ConvocatoriaListado } from '../../agenda/actions'

interface ElectorRed {
  id:   string
  name: string
}

export function PanelReuniones() {
  const [reuniones, setReuniones] = useState<ReunionListado[] | null>(null)
  const [convocatorias, setConvocatorias] = useState<ConvocatoriaListado[]>([])
  const [red, setRed] = useState<ElectorRed[]>([])
  const [expandida, setExpandida] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [tipo, setTipo] = useState<'RED_INTERNA' | 'RECLUTAMIENTO'>('RED_INTERNA')
  const [creando, setCreando] = useState(false)

  const [prospNombre, setProspNombre] = useState('')
  const [prospTelefono, setProspTelefono] = useState('')

  async function cargar() {
    const [r, conv, resRed] = await Promise.all([
      listarReuniones(),
      getMisConvocatorias(),
      fetch('/api/core/mis-electores').then((res) => res.json()).catch(() => ({ electores: [] })),
    ])
    setReuniones(r)
    setConvocatorias(conv)
    setRed((resRed.electores ?? []).map((e: ElectorRed) => ({ id: e.id, name: e.name })))
  }

  useEffect(() => { void cargar() }, [])

  async function onCrear(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !date) return
    setCreando(true)
    await crearReunion(title, date, tipo)
    setTitle('')
    setDate('')
    setCreando(false)
    await cargar()
  }

  async function onAgregarProspecto(meetingId: string) {
    if (!prospNombre.trim()) return
    await agregarProspecto(meetingId, prospNombre, prospTelefono || undefined)
    setProspNombre('')
    setProspTelefono('')
    await cargar()
  }

  async function onQuitarProspecto(prospectoId: string) {
    await quitarProspecto(prospectoId)
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
      {convocatorias.length > 0 && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e3a8a', marginBottom: '0.5rem' }}>Estás convocado a</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {convocatorias.map((c) => (
              <div key={c.id} style={{ fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 600 }}>{c.titulo}</div>
                <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                  {new Date(c.startsAt).toLocaleString('es-CO')} · convoca {c.convocanteName}
                  {c.lugar ? ` · ${c.lugar}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={onCrear} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', flex: 1 }}>
            <input type="radio" checked={tipo === 'RED_INTERNA'} onChange={() => setTipo('RED_INTERNA')} />
            Con mi red
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', flex: 1 }}>
            <input type="radio" checked={tipo === 'RECLUTAMIENTO'} onChange={() => setTipo('RECLUTAMIENTO')} />
            Reclutamiento
          </label>
        </div>
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
        const esReclutamiento = r.tipo === 'RECLUTAMIENTO'
        const conteo = esReclutamiento ? r.prospectos.length : r.asistentes.length
        return (
          <div key={r.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpandida(expandida === r.id ? null : r.id)}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  {r.title} {esReclutamiento && <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#7c3aed', background: '#ede9fe', borderRadius: '4px', padding: '0.1rem 0.4rem', marginLeft: '0.3rem' }}>RECLUTAMIENTO</span>}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {new Date(r.date).toLocaleDateString('es-CO')} · {conteo} {esReclutamiento ? 'prospecto' : 'asistente'}{conteo === 1 ? '' : 's'}
                </div>
              </div>
              <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{expandida === r.id ? 'Ocultar' : esReclutamiento ? 'Ver prospectos' : 'Marcar asistencia'}</span>
            </div>

            {expandida === r.id && esReclutamiento && (
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {r.prospectos.map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <div>
                      <div>{p.name}</div>
                      {p.phone && <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{p.phone}</div>}
                    </div>
                    <button onClick={() => onQuitarProspecto(p.id)} style={{ border: 'none', background: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer' }}>Quitar</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem' }}>
                  <input
                    value={prospNombre} onChange={(e) => setProspNombre(e.target.value)}
                    placeholder="Nombre" style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.4rem', fontSize: '0.8rem' }}
                  />
                  <input
                    value={prospTelefono} onChange={(e) => setProspTelefono(e.target.value)}
                    placeholder="Teléfono (opcional)" style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.4rem', fontSize: '0.8rem' }}
                  />
                  <button onClick={() => onAgregarProspecto(r.id)} style={{ border: 'none', background: '#0f172a', color: '#fff', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer' }}>+</button>
                </div>
              </div>
            )}

            {expandida === r.id && !esReclutamiento && (
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
