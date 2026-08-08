'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createVotingStation, updateVotingStation, type VotingStationSummary } from '../actions'
import { EditableTexto } from './editable-texto'

export function PuestosPanel({ municipalityId, puestosIniciales }: {
  municipalityId: string
  puestosIniciales: VotingStationSummary[]
}) {
  const [nombre, setNombre]     = useState('')
  const [direccion, setDireccion] = useState('')
  const [lat, setLat]           = useState('')
  const [lng, setLng]           = useState('')
  const [especial, setEspecial] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function guardarCampo(id: string, data: { name?: string; address?: string; lat?: number; lng?: number; specialLabel?: string }) {
    startTransition(async () => {
      const res = await updateVotingStation(id, data)
      if (res.success) router.refresh()
      else setError(res.error)
    })
  }

  function agregar() {
    setError(null)
    startTransition(async () => {
      const res = await createVotingStation({
        name: nombre, address: direccion, municipalityId,
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
        specialLabel: especial || undefined,
      })
      if (res.success) {
        setNombre(''); setDireccion(''); setLat(''); setLng(''); setEspecial('')
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1.25rem' }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Puestos de votación</h2>

      {puestosIniciales.length === 0 ? (
        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Sin puestos cargados en este municipio todavía.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <Th>Nombre</Th>
              <Th>Dirección</Th>
              <Th>Lat</Th>
              <Th>Lng</Th>
              <Th>Mesas</Th>
              <Th>Especial</Th>
            </tr>
          </thead>
          <tbody>
            {puestosIniciales.map((p) => (
              <tr key={p.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <Td>
                  <EditableTexto valor={p.name} onGuardar={(v) => guardarCampo(p.id, { name: v })} negrita />
                </Td>
                <Td>
                  <EditableTexto valor={p.address} onGuardar={(v) => guardarCampo(p.id, { address: v })} />
                </Td>
                <Td>
                  <EditableTexto
                    valor={p.lat != null ? String(p.lat) : ''} placeholder="—"
                    onGuardar={(v) => { const n = Number(v); if (Number.isFinite(n)) guardarCampo(p.id, { lat: n }) }}
                  />
                </Td>
                <Td>
                  <EditableTexto
                    valor={p.lng != null ? String(p.lng) : ''} placeholder="—"
                    onGuardar={(v) => { const n = Number(v); if (Number.isFinite(n)) guardarCampo(p.id, { lng: n }) }}
                  />
                </Td>
                <Td>{p.tablesCount}</Td>
                <Td>
                  <EditableTexto
                    valor={p.specialLabel ?? ''} placeholder="normal" permitirVacio
                    onGuardar={(v) => guardarCampo(p.id, { specialLabel: v })}
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        <input
          type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del puesto" style={{ ...estiloInput, flex: '1 1 200px' }}
        />
        <input
          type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)}
          placeholder="Dirección" style={{ ...estiloInput, flex: '1 1 200px' }}
        />
        <input
          type="text" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)}
          placeholder="Latitud (opcional)" style={{ ...estiloInput, flex: '0 1 140px' }}
        />
        <input
          type="text" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)}
          placeholder="Longitud (opcional)" style={{ ...estiloInput, flex: '0 1 140px' }}
        />
        <input
          type="text" value={especial} onChange={(e) => setEspecial(e.target.value)}
          placeholder="Etiqueta especial (vacío = normal)" style={{ ...estiloInput, flex: '1 1 200px' }}
        />
        <button
          onClick={agregar} disabled={isPending || !nombre.trim() || !direccion.trim()}
          style={estiloBoton}
        >
          + Agregar puesto
        </button>
      </div>
      {error && <p style={{ color: '#991b1b', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</p>}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{children}</th>
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '0.5rem 0.75rem' }}>{children}</td>
}

const estiloInput: React.CSSProperties = {
  padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1',
  borderRadius: '6px', fontSize: '0.875rem', outline: 'none', background: '#fff',
}

const estiloBoton: React.CSSProperties = {
  background: '#0f172a', color: '#fff', border: 'none',
  padding: '0.5rem 1rem', borderRadius: 6, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
}
