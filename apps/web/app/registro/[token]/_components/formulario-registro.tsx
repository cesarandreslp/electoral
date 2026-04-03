'use client'

import { useState, useTransition } from 'react'
import { registrarseConQR, type RegistroQRInput } from '../actions'

interface Puesto {
  id:     string
  name:   string
  tables: { id: string; number: number }[]
}

interface FormularioRegistroProps {
  token:   string
  refId?:  string
  puestos: Puesto[]
}

export function FormularioRegistro({ token, refId, puestos }: FormularioRegistroProps) {
  const [nombre,    setNombre]    = useState('')
  const [cedula,    setCedula]    = useState('')
  const [telefono,  setTelefono]  = useState('')
  const [direccion, setDireccion] = useState('')
  const [puestoId,  setPuestoId]  = useState('')
  const [mesaId,    setMesaId]    = useState('')
  const [mensaje,   setMensaje]   = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [enviado,   setEnviado]   = useState(false)
  const [voterId,   setVoterId]   = useState<string | null>(null)
  const [copiado,   setCopiado]   = useState(false)

  const [isPending, startTransition] = useTransition()

  const mesasDelPuesto = puestos.find((p) => p.id === puestoId)?.tables ?? []

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMensaje(null)

    const input: RegistroQRInput = {
      nombre:    nombre.trim(),
      cedula:    cedula.trim(),
      telefono:  telefono.trim() || undefined,
      direccion: direccion.trim() || undefined,
      puestoId:  puestoId || undefined,
      mesaId:    mesaId   || undefined,
    }

    startTransition(async () => {
      const res = await registrarseConQR(token, input, refId)
      if (res.success) {
        setMensaje({ tipo: 'ok', texto: res.message })
        setEnviado(true)
        if (res.voterId) setVoterId(res.voterId)
      } else {
        setMensaje({ tipo: 'error', texto: res.error })
      }
    })
  }

  // Pantalla de éxito — ya no se puede enviar de nuevo
  if (enviado && mensaje?.tipo === 'ok') {
    const linkReferido = voterId
      ? `${typeof window !== 'undefined' ? window.location.origin : ''}/registro/${token}?ref=${voterId}`
      : null

    async function copiarLink() {
      if (!linkReferido) return
      try {
        await navigator.clipboard.writeText(linkReferido)
        setCopiado(true)
        setTimeout(() => setCopiado(false), 2500)
      } catch {
        // Fallback para navegadores sin soporte de clipboard API
        const el = document.createElement('input')
        el.value = linkReferido
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
        setCopiado(true)
        setTimeout(() => setCopiado(false), 2500)
      }
    }

    return (
      <div
        style={{
          background:   '#fff',
          borderRadius: '12px',
          border:       '1px solid #e2e8f0',
          padding:      '2rem',
          textAlign:    'center',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
        <p style={{ fontSize: '1rem', fontWeight: 600, color: '#166534', margin: '0 0 1.5rem' }}>
          {mensaje.texto}
        </p>

        {linkReferido && (
          <div
            style={{
              background:   '#f8fafc',
              border:       '1px solid #e2e8f0',
              borderRadius: '10px',
              padding:      '1.25rem',
              textAlign:    'left',
            }}
          >
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', margin: '0 0 0.75rem' }}>
              ¿Quieres invitar a tus conocidos? Comparte este link:
            </p>
            <div
              style={{
                background:   '#fff',
                border:       '1px solid #cbd5e1',
                borderRadius: '8px',
                padding:      '0.6rem 0.75rem',
                fontSize:     '0.75rem',
                color:        '#64748b',
                wordBreak:    'break-all',
                marginBottom: '0.75rem',
                fontFamily:   'monospace',
              }}
            >
              {linkReferido}
            </div>
            <button
              onClick={copiarLink}
              style={{
                width:        '100%',
                background:   copiado ? '#dcfce7' : '#0f172a',
                color:        copiado ? '#166534' : '#fff',
                border:       'none',
                borderRadius: '8px',
                padding:      '0.75rem',
                fontSize:     '0.9rem',
                fontWeight:   700,
                cursor:       'pointer',
                transition:   'all 0.2s',
              }}
            >
              {copiado ? '¡Link copiado!' : 'Copiar link'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        <Campo label="Nombre completo *">
          <input
            type="text" value={nombre} onChange={e => setNombre(e.target.value)}
            required placeholder="María García López" autoComplete="name"
            style={estiloInput}
          />
        </Campo>

        <Campo label="Número de cédula *">
          <input
            type="number" value={cedula} onChange={e => setCedula(e.target.value)}
            required placeholder="1234567890" inputMode="numeric"
            style={estiloInput}
          />
        </Campo>

        <Campo label="Teléfono celular">
          <input
            type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
            placeholder="300 000 0000" inputMode="tel" autoComplete="tel"
            style={estiloInput}
          />
        </Campo>

        <Campo label="Dirección">
          <input
            type="text" value={direccion} onChange={e => setDireccion(e.target.value)}
            placeholder="Cra 45 #23-10, Barrio Laureles" autoComplete="street-address"
            style={estiloInput}
          />
        </Campo>

        {puestos.length > 0 && (
          <Campo label="Puesto de votación">
            <select
              value={puestoId}
              onChange={e => { setPuestoId(e.target.value); setMesaId('') }}
              style={{ ...estiloInput, background: '#fff' }}
            >
              <option value="">— Seleccionar puesto —</option>
              {puestos.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Campo>
        )}

        {mesasDelPuesto.length > 0 && (
          <Campo label="Mesa">
            <select
              value={mesaId}
              onChange={e => setMesaId(e.target.value)}
              style={{ ...estiloInput, background: '#fff' }}
            >
              <option value="">— Seleccionar mesa —</option>
              {mesasDelPuesto.map((m) => (
                <option key={m.id} value={m.id}>Mesa {m.number}</option>
              ))}
            </select>
          </Campo>
        )}

        {mensaje && (
          <div style={{
            padding: '0.75rem 1rem', borderRadius: '8px',
            background: mensaje.tipo === 'ok' ? '#dcfce7' : '#fee2e2',
            color:      mensaje.tipo === 'ok' ? '#166534' : '#991b1b',
            fontSize: '0.875rem',
          }}>
            {mensaje.texto}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          style={{
            background:   isPending ? '#94a3b8' : '#0f172a',
            color:        '#fff',
            padding:      '0.875rem 1rem',
            borderRadius: '10px',
            border:       'none',
            cursor:       isPending ? 'not-allowed' : 'pointer',
            fontSize:     '1rem',
            fontWeight:   700,
            marginTop:    '0.5rem',
          }}
        >
          {isPending ? 'Registrando...' : 'Registrarme'}
        </button>

      </form>
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const estiloInput: React.CSSProperties = {
  width:        '100%',
  padding:      '0.75rem',
  border:       '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize:     '1rem',   // Grande para móvil
  outline:      'none',
  boxSizing:    'border-box',
}
