'use client'

/**
 * Formulario de creación de nuevo tenant.
 * Es un componente cliente para manejar el estado del slug en tiempo real.
 * Llama a createTenant() al hacer submit.
 */

import { useState, useTransition } from 'react'
import { createTenant, type ModuleKey } from '../../../actions'
import { SlugInput } from './_components/slug-input'

// Módulos disponibles para activar en una nueva campaña
const MODULOS_DISPONIBLES: { key: ModuleKey; label: string; descripcion: string }[] = [
  { key: 'CORE',           label: 'CORE',           descripcion: 'Obligatorio — territorios, líderes, electores' },
  { key: 'ANALYTICS',      label: 'Analytics',      descripcion: 'KPIs, mapa de calor, proyección de votos' },
  { key: 'FORMACION',      label: 'Formación',      descripcion: 'Capacitación de testigos y evaluaciones' },
  { key: 'DIA_E',          label: 'Día E',          descripcion: 'Transmisión E-14 y sala de situación' },
  { key: 'COMUNICACIONES', label: 'Comunicaciones', descripcion: 'SMS / WhatsApp / email segmentado' },
  { key: 'FINANZAS',       label: 'Finanzas',       descripcion: 'Control de gastos y límites legales' },
]

export default function NuevoClientePage() {
  // Estado del formulario
  const [nombre,     setNombre]     = useState('')
  const [slug,       setSlug]       = useState('')
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [modulos,    setModulos]    = useState<ModuleKey[]>(['CORE'])
  const [resultado,  setResultado]  = useState<string | null>(null)
  const [esError,    setEsError]    = useState(false)

  const [isPending, startTransition] = useTransition()

  function toggleModulo(key: ModuleKey) {
    if (key === 'CORE') return // CORE siempre activo, no se puede desmarcar
    setModulos(prev =>
      prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setResultado(null)

    startTransition(async () => {
      const res = await createTenant({
        name:          nombre,
        slug,
        adminEmail:    email,
        adminPassword: password,
        modules:       modulos,
      })

      if (res.success) {
        setResultado(`Tenant creado correctamente. ID: ${res.tenantId}`)
        setEsError(false)
        // Limpiar formulario
        setNombre(''); setSlug(''); setEmail(''); setPassword('')
        setModulos(['CORE'])
      } else {
        setResultado(res.error)
        setEsError(true)
      }
    })
  }

  return (
    <div style={{ maxWidth: '600px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        Nuevo cliente
      </h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Nombre de la campaña */}
        <Campo label="Nombre de la campaña *">
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            required
            placeholder="Campaña Gómez 2026"
            style={estiloInput}
          />
        </Campo>

        {/* Slug — componente cliente con validación en tiempo real */}
        <SlugInput value={slug} onChange={setSlug} />

        {/* Email del administrador */}
        <Campo label="Email del administrador *">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="admin@campana.com"
            style={estiloInput}
          />
        </Campo>

        {/* Contraseña del administrador */}
        <Campo label="Contraseña del administrador *">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Mínimo 8 caracteres"
            style={estiloInput}
          />
        </Campo>

        {/* Módulos disponibles */}
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
            Módulos activos
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {MODULOS_DISPONIBLES.map(({ key, label, descripcion }) => (
              <label
                key={key}
                style={{
                  display:      'flex',
                  alignItems:   'flex-start',
                  gap:          '0.5rem',
                  cursor:       key === 'CORE' ? 'not-allowed' : 'pointer',
                  opacity:      key === 'CORE' ? 0.7 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={modulos.includes(key)}
                  onChange={() => toggleModulo(key)}
                  disabled={key === 'CORE'}
                  style={{ marginTop: '2px' }}
                />
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{label}</span>
                  <span style={{ color: '#64748b', fontSize: '0.8rem' }}> — {descripcion}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Resultado */}
        {resultado && (
          <div
            style={{
              padding:      '0.75rem 1rem',
              borderRadius: '6px',
              background:   esError ? '#fee2e2' : '#dcfce7',
              color:        esError ? '#991b1b' : '#166534',
              fontSize:     '0.875rem',
            }}
          >
            {resultado}
          </div>
        )}

        {/* Botón submit */}
        <button
          type="submit"
          disabled={isPending}
          style={{
            background:   isPending ? '#94a3b8' : '#1e40af',
            color:        '#fff',
            padding:      '0.625rem 1.25rem',
            borderRadius: '6px',
            border:       'none',
            cursor:       isPending ? 'not-allowed' : 'pointer',
            fontSize:     '0.875rem',
            fontWeight:   600,
            alignSelf:    'flex-start',
          }}
        >
          {isPending ? 'Creando...' : 'Crear cliente'}
        </button>

      </form>
    </div>
  )
}

// Helper de layout para campos del formulario
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
  width:        '100%',
  padding:      '0.5rem 0.75rem',
  border:       '1px solid #cbd5e1',
  borderRadius: '6px',
  fontSize:     '0.875rem',
  outline:      'none',
  boxSizing:    'border-box',
}
