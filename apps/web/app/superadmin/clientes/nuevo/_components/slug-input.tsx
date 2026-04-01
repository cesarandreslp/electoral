'use client'

/**
 * Componente cliente para el campo slug del formulario de nuevo tenant.
 * Valida el slug en tiempo real en el browser usando regex.
 * Es el único componente 'use client' en el flujo de superadmin.
 */

import { useState } from 'react'

// Misma regex que usa createTenant() en el servidor
const REGEX_SLUG = /^[a-z0-9-]{3,}$/

interface SlugInputProps {
  value:    string
  onChange: (valor: string) => void
}

export function SlugInput({ value, onChange }: SlugInputProps) {
  const [tocado, setTocado] = useState(false)

  const valido  = REGEX_SLUG.test(value)
  const error   = tocado && value.length > 0 && !valido
  const vacio   = tocado && value.length === 0

  return (
    <div>
      <label
        htmlFor="slug"
        style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}
      >
        Slug de la campaña *
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input
          id="slug"
          name="slug"
          type="text"
          value={value}
          required
          autoComplete="off"
          placeholder="campana-gomez-2026"
          onChange={e => onChange(e.target.value.toLowerCase())}
          onBlur={() => setTocado(true)}
          style={{
            width:        '100%',
            padding:      '0.5rem 0.75rem',
            border:       `1px solid ${error || vacio ? '#ef4444' : valido && tocado ? '#22c55e' : '#cbd5e1'}`,
            borderRadius: '6px',
            fontSize:     '0.875rem',
            fontFamily:   'monospace',
            outline:      'none',
          }}
        />
        {/* Indicador visual de validación */}
        {tocado && value.length > 0 && (
          <span style={{ fontSize: '1rem' }}>{valido ? '✓' : '✗'}</span>
        )}
      </div>

      {/* Mensaje de error */}
      {(error || vacio) && (
        <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
          {vacio
            ? 'El slug es obligatorio'
            : 'Solo minúsculas, números y guiones. Mínimo 3 caracteres.'}
        </p>
      )}

      {/* Hint cuando está vacío y no tocado */}
      {!tocado && (
        <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.25rem' }}>
          Será la URL de la campaña: {value || 'mi-campana'}.campaignos.co
        </p>
      )}

      {/* Preview de URL cuando es válido */}
      {valido && tocado && (
        <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.25rem' }}>
          URL: <strong>{value}.campaignos.co</strong>
        </p>
      )}
    </div>
  )
}
