'use client'

import { useEffect, useState } from 'react'
import { getMiAgenda, crearEntradaAgenda, eliminarEntradaAgenda, type EntradaAgenda } from '../actions'

export function PanelAgendaAnfitrion() {
  const [entradas, setEntradas] = useState<EntradaAgenda[] | null>(null)
  const [disponible, setDisponible] = useState(true)
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [titulo, setTitulo] = useState('')
  const [creando, setCreando] = useState(false)

  async function cargar() {
    setEntradas(await getMiAgenda())
  }

  useEffect(() => { void cargar() }, [])

  async function onCrear(e: React.FormEvent) {
    e.preventDefault()
    if (!startsAt || !endsAt) return
    setCreando(true)
    const res = await crearEntradaAgenda({ startsAt, endsAt, disponible, titulo: titulo || undefined })
    if (!res.success) alert(res.error)
    setStartsAt(''); setEndsAt(''); setTitulo('')
    setCreando(false)
    await cargar()
  }

  async function onEliminar(id: string) {
    const res = await eliminarEntradaAgenda(id)
    if (!res.success) alert(res.error)
    await cargar()
  }

  if (entradas === null) return <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.875rem' }}>Cargando...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <form onSubmit={onCrear} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Publicar en mi agenda</div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', flex: 1 }}>
            <input type="radio" checked={disponible} onChange={() => setDisponible(true)} />
            Hueco para reservar
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', flex: 1 }}>
            <input type="radio" checked={!disponible} onChange={() => setDisponible(false)} />
            Compromiso propio
          </label>
        </div>
        {!disponible && (
          <input
            value={titulo} onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título del compromiso" required={!disponible}
            style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
          />
        )}
        <input
          type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required
          style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
        />
        <input
          type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required
          style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
        />
        <button
          type="submit" disabled={creando}
          style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.5rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
        >
          {creando ? 'Guardando...' : '+ Agregar'}
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {entradas.length === 0 && (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>Tu agenda está vacía.</div>
        )}
        {entradas.map((e) => (
          <div key={e.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                {e.disponible ? (e.reservadoPor ? `Reservado — ${e.reservanteName}` : 'Hueco disponible') : e.titulo}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {new Date(e.startsAt).toLocaleString('es-CO')} – {new Date(e.endsAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                {e.motivo ? ` · ${e.motivo}` : ''}
              </div>
            </div>
            {!e.reservadoPor && (
              <button onClick={() => onEliminar(e.id)} style={{ border: 'none', background: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer' }}>Borrar</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
