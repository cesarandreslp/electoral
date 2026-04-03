'use client'

/**
 * Badge de notificaciones no leídas en el sidebar.
 * Hace polling cada 60 segundos al endpoint /api/notificaciones.
 * No requiere websocket — aceptable para MVP.
 */

import { useEffect, useState } from 'react'

export function BadgeNotificaciones() {
  const [total, setTotal] = useState<number | null>(null)

  async function cargar() {
    try {
      const res  = await fetch('/api/notificaciones', { credentials: 'same-origin' })
      if (!res.ok) return
      const data = await res.json()
      setTotal(data.total ?? 0)
    } catch {
      // Sin conexión — mantener valor anterior
    }
  }

  useEffect(() => {
    // Carga inicial
    cargar()

    // Polling cada 60 segundos
    const intervalo = setInterval(cargar, 60_000)
    return () => clearInterval(intervalo)
  }, [])

  if (!total) return null

  return (
    <span
      style={{
        display:         'inline-flex',
        alignItems:      'center',
        justifyContent:  'center',
        background:      '#ef4444',
        color:           '#fff',
        borderRadius:    '999px',
        fontSize:        '0.65rem',
        fontWeight:      700,
        minWidth:        '16px',
        height:          '16px',
        padding:         '0 4px',
        marginLeft:      '6px',
        verticalAlign:   'middle',
        lineHeight:      1,
      }}
    >
      {total > 99 ? '99+' : total}
    </span>
  )
}
