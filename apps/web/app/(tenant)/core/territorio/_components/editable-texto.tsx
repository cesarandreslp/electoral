'use client'

import { useState } from 'react'

/** Texto que se convierte en input al hacer clic, para corregir valores sin una pantalla aparte. */
export function EditableTexto({ valor, onGuardar, negrita, placeholder, permitirVacio }: {
  valor: string
  onGuardar: (v: string) => void
  negrita?: boolean
  placeholder?: string
  /** Si es true, guardar un valor vacío es válido (ej: quitar la etiqueta especial de un puesto). */
  permitirVacio?: boolean
}) {
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(valor)

  if (!editando) {
    return (
      <span
        onClick={(e) => { e.stopPropagation(); setEditando(true) }}
        style={{ fontSize: '0.875rem', fontWeight: negrita ? 600 : 400, cursor: 'text', color: valor ? 'inherit' : '#94a3b8' }}
        title="Clic para corregir"
      >
        {valor || placeholder || '(vacío)'}
      </span>
    )
  }

  return (
    <input
      type="text" autoFocus value={texto} onChange={(e) => setTexto(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onBlur={() => {
        setEditando(false)
        const nuevo = texto.trim()
        if (nuevo === valor) return
        if (!nuevo && !permitirVacio) return
        onGuardar(nuevo)
      }}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      style={{ fontSize: '0.875rem', padding: '0.1rem 0.3rem', border: '1px solid #cbd5e1', borderRadius: 4, width: '100%', boxSizing: 'border-box' }}
    />
  )
}
