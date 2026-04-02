'use client'

import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import { createVoter, listLeaders, type CreateVoterInput, type CommitmentStatus } from '../../actions'

export default function NuevoElectorPage() {
  const [cedula,    setCedula]    = useState('')
  const [nombre,    setNombre]    = useState('')
  const [telefono,  setTelefono]  = useState('')
  const [leaderId,  setLeaderId]  = useState('')
  const [estado,    setEstado]    = useState<CommitmentStatus>('SIN_CONTACTAR')
  const [lideres,   setLideres]   = useState<{ id: string; name: string }[]>([])
  const [error,     setError]     = useState<string | null>(null)
  const [exito,     setExito]     = useState(false)

  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Cargar líderes al montar
  useState(() => {
    listLeaders().then((ls) => setLideres(ls.map((l) => ({ id: l.id, name: l.name }))))
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const input: CreateVoterInput = {
        cedula,
        name:             nombre,
        phone:            telefono || undefined,
        leaderId:         leaderId || undefined,
        commitmentStatus: estado,
      }

      const res = await createVoter(input)

      if (res.success) {
        setExito(true)
        // Limpiar para crear otro
        setCedula(''); setNombre(''); setTelefono('')
        setLeaderId(''); setEstado('SIN_CONTACTAR')
        setTimeout(() => setExito(false), 3000)
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <div style={{ maxWidth: '500px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Nuevo elector</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        <Campo label="Cédula *">
          <input
            type="text" value={cedula} onChange={e => setCedula(e.target.value)}
            required placeholder="12345678" style={estiloInput}
          />
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '3px' }}>
            Se cifra automáticamente — no se almacena en texto plano.
          </div>
        </Campo>

        <Campo label="Nombre completo *">
          <input
            type="text" value={nombre} onChange={e => setNombre(e.target.value)}
            required placeholder="María García López" style={estiloInput}
          />
        </Campo>

        <Campo label="Teléfono">
          <input
            type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
            placeholder="300 000 0000" style={estiloInput}
          />
        </Campo>

        <Campo label="Líder asignado">
          <select
            value={leaderId} onChange={e => setLeaderId(e.target.value)}
            style={{ ...estiloInput, background: '#fff' }}
          >
            <option value="">— Sin líder asignado —</option>
            {lideres.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </Campo>

        <Campo label="Estado inicial">
          <select
            value={estado} onChange={e => setEstado(e.target.value as CommitmentStatus)}
            style={{ ...estiloInput, background: '#fff' }}
          >
            <option value="SIN_CONTACTAR">Sin contactar</option>
            <option value="CONTACTADO">Contactado</option>
            <option value="SIMPATIZANTE">Simpatizante</option>
            <option value="COMPROMETIDO">Comprometido</option>
            <option value="VOTO_SEGURO">Voto seguro</option>
          </select>
        </Campo>

        {error && (
          <div style={{ padding: '0.625rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {exito && (
          <div style={{ padding: '0.625rem', background: '#dcfce7', color: '#166534', borderRadius: '6px', fontSize: '0.875rem' }}>
            Elector creado correctamente.
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
            {isPending ? 'Guardando...' : 'Crear elector'}
          </button>
          <button
            type="button" onClick={() => router.push('/core/electores')}
            style={{
              background: 'transparent', color: '#64748b',
              padding: '0.625rem 1.25rem', borderRadius: '6px',
              border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.875rem',
            }}
          >
            Ver lista
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
