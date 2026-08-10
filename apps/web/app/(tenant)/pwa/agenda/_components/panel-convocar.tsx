'use client'

import { useEffect, useState } from 'react'
import {
  crearConvocatoria, getConvocatoriasCreadas, listarElectoresParaConvocar,
  type ConvocatoriaListado, type SeleccionDestinatarios,
} from '../actions'

type Modo = SeleccionDestinatarios['modo']

export function PanelConvocar() {
  const [convocatorias, setConvocatorias] = useState<ConvocatoriaListado[]>([])
  const [electores, setElectores] = useState<{ id: string; name: string; zone: string | null }[]>([])

  const [titulo, setTitulo] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [lugar, setLugar] = useState('')
  const [modo, setModo] = useState<Modo>('todos')
  const [zona, setZona] = useState('')
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [busqueda, setBusqueda] = useState('')
  const [creando, setCreando] = useState(false)

  async function cargar() {
    const [c, e] = await Promise.all([getConvocatoriasCreadas(), listarElectoresParaConvocar()])
    setConvocatorias(c)
    setElectores(e)
  }

  useEffect(() => { void cargar() }, [])

  function toggleSeleccionado(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function onCrear(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim() || !startsAt) return

    const destinatarios: SeleccionDestinatarios =
      modo === 'zona' ? { modo: 'zona', zona } :
      modo === 'individual' ? { modo: 'individual', voterIds: [...seleccionados] } :
      { modo }

    setCreando(true)
    const res = await crearConvocatoria({ titulo, startsAt, lugar: lugar || undefined, destinatarios })
    if (!res.success) alert(res.error)
    setTitulo(''); setStartsAt(''); setLugar(''); setSeleccionados(new Set())
    setCreando(false)
    await cargar()
  }

  const electoresFiltrados = busqueda
    ? electores.filter((e) => e.name.toLowerCase().includes(busqueda.toLowerCase()))
    : electores

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <form onSubmit={onCrear} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Convocar electores</div>
        <input
          value={titulo} onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título" required
          style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
        />
        <input
          type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required
          style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
        />
        <input
          value={lugar} onChange={(e) => setLugar(e.target.value)}
          placeholder="Lugar (opcional)"
          style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
        />

        <select
          value={modo} onChange={(e) => setModo(e.target.value as Modo)}
          style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
        >
          <option value="todos">Todos los electores</option>
          <option value="lideres">Solo líderes</option>
          <option value="zona">Por zona</option>
          <option value="individual">Selección puntual</option>
        </select>

        {modo === 'zona' && (
          <input
            value={zona} onChange={(e) => setZona(e.target.value)}
            placeholder="Nombre de la zona" required
            style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
          />
        )}

        {modo === 'individual' && (
          <div style={{ border: '1px solid #f1f5f9', borderRadius: '8px', padding: '0.5rem' }}>
            <input
              value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar elector..."
              style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.4rem', fontSize: '0.8rem', marginBottom: '0.4rem' }}
            />
            <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {electoresFiltrados.map((el) => (
                <label key={el.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                  <input type="checkbox" checked={seleccionados.has(el.id)} onChange={() => toggleSeleccionado(el.id)} />
                  {el.name} {el.zone && <span style={{ color: '#94a3b8' }}>· {el.zone}</span>}
                </label>
              ))}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem' }}>{seleccionados.size} seleccionado(s)</div>
          </div>
        )}

        <button
          type="submit" disabled={creando}
          style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.5rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
        >
          {creando ? 'Convocando...' : '+ Convocar'}
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {convocatorias.length === 0 && (
          <div style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>Todavía no has convocado a nadie.</div>
        )}
        {convocatorias.map((c) => (
          <div key={c.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem 1rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.titulo}</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {new Date(c.startsAt).toLocaleString('es-CO')} · {c.totalDestinatarios} convocado(s){c.lugar ? ` · ${c.lugar}` : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
