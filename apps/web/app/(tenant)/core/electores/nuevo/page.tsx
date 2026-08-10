'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createVoter, listVoterOptions, listVotingStations, type CreateVoterInput, type CommitmentStatus, type StationOption } from '../../actions'

export default function NuevoElectorPage() {
  const searchParams = useSearchParams()
  // Prellenado al venir de "+ Elector" en la ficha de un elector con red
  // (antes existía un flujo aparte de "crear líder" — ya no: todos se crean
  // como electores, "líder" es una etiqueta que aparece sola al llegar a 10
  // directos, no algo que se elige al crear a alguien).
  const leaderIdInicial = searchParams.get('leaderId') ?? ''

  const [cedula,    setCedula]    = useState('')
  const [nombre,    setNombre]    = useState('')
  const [apodo,     setApodo]     = useState('')
  const [telefono,  setTelefono]  = useState('')
  const [direccion, setDireccion] = useState('')
  const [leaderId,  setLeaderId]  = useState(leaderIdInicial)
  const [estado,    setEstado]    = useState<CommitmentStatus>('SIN_CONTACTAR')
  const [puestoId,  setPuestoId]  = useState('')
  const [mesaId,    setMesaId]    = useState('')
  const [lideres,   setLideres]   = useState<{ id: string; name: string }[]>([])
  const [puestos,   setPuestos]   = useState<StationOption[]>([])
  const [error,     setError]     = useState<string | null>(null)
  const [exito,     setExito]     = useState(false)

  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Cargar candidatos a "reporta a" (cualquier elector) y puestos de votación al montar.
  useEffect(() => {
    listVoterOptions().then((ls) => setLideres(ls.map((l) => ({ id: l.id, name: l.name }))))
    listVotingStations().then(setPuestos)
  }, [])
  const mesasDelPuesto = puestos.find((p) => p.id === puestoId)?.tables ?? []

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const input: CreateVoterInput = {
        cedula,
        name:             nombre,
        apodo:            apodo || undefined,
        phone:            telefono || undefined,
        address:          direccion || undefined,
        leaderId:         leaderId || undefined,
        votingTableId:    mesaId || undefined,
        commitmentStatus: estado,
      }

      const res = await createVoter(input)

      if (res.success) {
        setExito(true)
        // Limpiar para crear otro
        setCedula(''); setNombre(''); setApodo(''); setTelefono(''); setDireccion('')
        setLeaderId(leaderIdInicial); setEstado('SIN_CONTACTAR'); setPuestoId(''); setMesaId('')
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

        <Campo label="Apodo">
          <input
            type="text" value={apodo} onChange={e => setApodo(e.target.value)}
            placeholder="Como le dicen normalmente (ej: Nacho, La Cucha)" style={estiloInput}
          />
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '3px' }}>
            Se usa en el mensaje de invitación cuando comparte su QR — hace que sea más cercano.
          </div>
        </Campo>

        <Campo label="Teléfono">
          <input
            type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
            placeholder="300 000 0000" style={estiloInput}
          />
        </Campo>

        <Campo label="Dirección">
          <input
            type="text" value={direccion} onChange={e => setDireccion(e.target.value)}
            placeholder="Cra 45 #23-10, Barrio Laureles, Medellín" style={estiloInput}
          />
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '3px' }}>
            Se usa para ubicar al elector en el mapa del dashboard.
          </div>
        </Campo>

        <Campo label="Reporta a (opcional)">
          <select
            value={leaderId} onChange={e => setLeaderId(e.target.value)}
            style={{ ...estiloInput, background: '#fff' }}
          >
            <option value="">— Nadie (electo directo) —</option>
            {lideres.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </Campo>

        <Campo label="Puesto de votación">
          <select
            value={puestoId}
            onChange={e => { setPuestoId(e.target.value); setMesaId('') }}
            style={{ ...estiloInput, background: '#fff' }}
          >
            <option value="">— Sin puesto asignado —</option>
            {puestos.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Campo>

        {mesasDelPuesto.length > 0 && (
          <Campo label="Mesa">
            <select
              value={mesaId} onChange={e => setMesaId(e.target.value)}
              style={{ ...estiloInput, background: '#fff' }}
            >
              <option value="">— Sin mesa asignada —</option>
              {mesasDelPuesto.map((m) => (
                <option key={m.id} value={m.id}>Mesa {m.number}</option>
              ))}
            </select>
          </Campo>
        )}

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
