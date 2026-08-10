'use client'

import { useEffect, useState } from 'react'
import { getMiAgenda, crearEntradaAgenda, eliminarEntradaAgenda, type EntradaAgenda } from '../actions'
import { CalendarioMensual, type EventoCalendario } from '@/app/_components/calendario-mensual'

function claveFechaLocal(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function colorEntrada(e: EntradaAgenda): string {
  if (!e.disponible) return '#64748b' // compromiso propio
  return e.reservadoPor ? '#2563eb' : '#16a34a' // reservado / libre
}

function labelEntrada(e: EntradaAgenda): string {
  const hora = new Date(e.startsAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  if (!e.disponible) return `${hora} ${e.titulo}`
  return e.reservadoPor ? `${hora} Reservado` : `${hora} Libre`
}

export function PanelAgendaAnfitrion() {
  const [entradas, setEntradas] = useState<EntradaAgenda[] | null>(null)
  const [disponible, setDisponible] = useState(true)
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [titulo, setTitulo] = useState('')
  const [creando, setCreando] = useState(false)
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(null)

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

  const eventos: EventoCalendario[] = entradas.map((e) => ({
    id: e.id, fecha: claveFechaLocal(e.startsAt), label: labelEntrada(e), color: colorEntrada(e),
  }))

  const entradasDelDia = diaSeleccionado
    ? entradas.filter((e) => claveFechaLocal(e.startsAt) === claveFechaLocal(diaSeleccionado.toISOString()))
    : []

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

      <CalendarioMensual eventos={eventos} onDiaClick={(fecha) => setDiaSeleccionado(fecha)} />

      {diaSeleccionado && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
            {diaSeleccionado.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          {entradasDelDia.length === 0 && (
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Sin entradas ese día.</div>
          )}
          {entradasDelDia.map((e) => (
            <div key={e.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  {e.disponible ? (e.reservadoPor ? `Reservado — ${e.reservanteName}` : 'Hueco disponible') : e.titulo}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {new Date(e.startsAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} – {new Date(e.endsAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  {e.motivo ? ` · ${e.motivo}` : ''}
                </div>
              </div>
              {!e.reservadoPor && (
                <button onClick={() => onEliminar(e.id)} style={{ border: 'none', background: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer' }}>Borrar</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
