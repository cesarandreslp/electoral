'use client'

import { useEffect, useState } from 'react'
import { getRutaDia, guardarDireccionRuta, sugerirOrdenRuta, guardarOrdenRuta, type ItemRuta } from '../actions'
import { type AnfitrionOption } from '../../agenda/actions'

function hoyISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function PanelRutas({ anfitriones }: { anfitriones: AnfitrionOption[] }) {
  const [anfitrionId, setAnfitrionId] = useState(anfitriones[0]?.id ?? '')
  const [fecha, setFecha] = useState(hoyISO())
  const [items, setItems] = useState<ItemRuta[]>([])
  const [cargando, setCargando] = useState(false)
  const [direcciones, setDirecciones] = useState<Record<string, string>>({})

  async function cargar() {
    if (!anfitrionId) return
    setCargando(true)
    setItems(await getRutaDia(anfitrionId, fecha))
    setCargando(false)
  }

  useEffect(() => { void cargar() }, [anfitrionId, fecha])

  async function onGuardarDireccion(id: string, tipo: ItemRuta['tipo']) {
    const direccion = direcciones[id]?.trim()
    if (!direccion) return
    const res = await guardarDireccionRuta(id, tipo, direccion)
    if (!res.success) alert('No se pudo guardar.')
    else if (!res.geocodificado) alert('Dirección guardada, pero no se pudo ubicar en el mapa — revisa que esté completa.')
    await cargar()
  }

  async function onSugerir() {
    const ordenIds = await sugerirOrdenRuta(items)
    const reordenado = ordenIds.map((id) => items.find((i) => i.id === id)!).filter(Boolean)
    setItems(reordenado)
  }

  function mover(index: number, delta: number) {
    const destino = index + delta
    if (destino < 0 || destino >= items.length) return
    const copia = [...items]
    ;[copia[index], copia[destino]] = [copia[destino], copia[index]]
    setItems(copia)
  }

  async function onGuardarOrden() {
    const res = await guardarOrdenRuta(items.map((i) => ({ id: i.id, tipo: i.tipo })))
    if (!res.success) alert('No se pudo guardar el orden.')
  }

  if (anfitriones.length === 0) {
    return <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Todavía no hay candidato ni jefes de debate marcados.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <select value={anfitrionId} onChange={(e) => setAnfitrionId(e.target.value)}
          style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}>
          {anfitriones.map((a) => <option key={a.id} value={a.id}>{a.name}{a.isCandidate ? ' (candidato)' : ''}</option>)}
        </select>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
          style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }} />
        <button onClick={onSugerir}
          style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.4rem 0.9rem', fontSize: '0.85rem', cursor: 'pointer' }}>
          Sugerir por cercanía
        </button>
        <button onClick={onGuardarOrden}
          style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.4rem 0.9rem', fontSize: '0.85rem', cursor: 'pointer' }}>
          Guardar orden
        </button>
      </div>

      {cargando && <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Cargando...</div>}
      {!cargando && items.length === 0 && <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Sin reuniones ese día.</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {items.map((item, index) => (
          <div key={item.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  {index + 1}. {item.titulo} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>({item.tipo === 'agenda' ? 'agenda' : 'convocatoria'})</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  {new Date(item.startsAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  {item.direccion ? ` · ${item.direccion}` : ' · sin dirección'}
                  {item.lat === null && item.direccion ? ' (sin ubicar)' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button onClick={() => mover(index, -1)} disabled={index === 0}
                  style={{ border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '6px', width: '26px', height: '26px', cursor: 'pointer' }}>↑</button>
                <button onClick={() => mover(index, 1)} disabled={index === items.length - 1}
                  style={{ border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '6px', width: '26px', height: '26px', cursor: 'pointer' }}>↓</button>
              </div>
            </div>
            {!item.direccion && (
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                <input
                  value={direcciones[item.id] ?? ''} onChange={(e) => setDirecciones((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  placeholder="Dirección" style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                />
                <button onClick={() => onGuardarDireccion(item.id, item.tipo)}
                  style={{ border: 'none', background: '#0f172a', color: '#fff', borderRadius: '6px', padding: '0.35rem 0.7rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                  Guardar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
