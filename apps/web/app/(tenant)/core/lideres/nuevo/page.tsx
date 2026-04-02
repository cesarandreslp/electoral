'use client'

import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import { createLeader, listLeaders, type CreateLeaderInput } from '../../actions'

export default function NuevoLiderPage() {
  const [nombre,         setNombre]         = useState('')
  const [zona,           setZona]           = useState('')
  const [telefono,       setTelefono]       = useState('')
  const [meta,           setMeta]           = useState(0)
  const [parentId,       setParentId]       = useState('')
  const [lideresSuperiores, setLideresSuperiores] = useState<{ id: string; name: string; zone: string | null }[]>([])
  const [error,          setError]          = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Cargar líderes para el select de superior al montar
  useState(() => {
    listLeaders().then((ls) =>
      setLideresSuperiores(ls.map((l) => ({ id: l.id, name: l.name, zone: l.zone })))
    )
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const input: CreateLeaderInput = {
        name:            nombre,
        zone:            zona || undefined,
        phone:           telefono || undefined,
        targetVotes:     meta,
        parentLeaderId:  parentId || undefined,
      }

      const res = await createLeader(input)

      if (res.success) {
        router.push(`/core/lideres/${res.leaderId}`)
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <div style={{ maxWidth: '500px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Nuevo líder</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        <Campo label="Nombre *">
          <input
            type="text" value={nombre} onChange={e => setNombre(e.target.value)}
            required placeholder="Juan Pérez" style={estiloInput}
          />
        </Campo>

        <Campo label="Zona / Barrio">
          <input
            type="text" value={zona} onChange={e => setZona(e.target.value)}
            placeholder="Comuna 7 — El Poblado" style={estiloInput}
          />
        </Campo>

        <Campo label="Teléfono">
          <input
            type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
            placeholder="300 000 0000" style={estiloInput}
          />
        </Campo>

        <Campo label="Meta de votos *">
          <input
            type="number" value={meta} onChange={e => setMeta(Number(e.target.value))}
            required min={0} style={estiloInput}
          />
        </Campo>

        <Campo label="Líder superior (opcional)">
          <select
            value={parentId}
            onChange={e => setParentId(e.target.value)}
            style={{ ...estiloInput, background: '#fff' }}
          >
            <option value="">— Sin líder superior —</option>
            {lideresSuperiores.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}{l.zone ? ` (${l.zone})` : ''}
              </option>
            ))}
          </select>
        </Campo>

        {error && (
          <div style={{ padding: '0.625rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="submit" disabled={isPending}
            style={{
              background: isPending ? '#94a3b8' : '#0f172a', color: '#fff',
              padding: '0.625rem 1.25rem', borderRadius: '6px', border: 'none',
              cursor: isPending ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 600,
            }}
          >
            {isPending ? 'Guardando...' : 'Crear líder'}
          </button>
          <button
            type="button" onClick={() => router.back()}
            style={{
              background: 'transparent', color: '#64748b',
              padding: '0.625rem 1.25rem', borderRadius: '6px',
              border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.875rem',
            }}
          >
            Cancelar
          </button>
        </div>

      </form>
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const estiloInput: React.CSSProperties = {
  width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1',
  borderRadius: '6px', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
}
