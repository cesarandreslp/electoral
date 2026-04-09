'use client'

import { useEffect, useState } from 'react'

interface BarraTopeProps {
  gastado:  number
  tope:     number
  porcentaje: number
}

function getColor(pct: number): string {
  if (pct > 100) return '#dc2626'
  if (pct > 80)  return '#f59e0b'
  if (pct > 60)  return '#eab308'
  return '#22c55e'
}

function formatCOP(amount: number): string {
  return `$${amount.toLocaleString('es-CO')}`
}

export function BarraTope({ gastado, tope, porcentaje }: BarraTopeProps) {
  const [width, setWidth] = useState(0)
  const color = getColor(porcentaje)
  const clampedPct = Math.min(porcentaje, 100)

  // Animación suave al cargar
  useEffect(() => {
    const timer = setTimeout(() => setWidth(clampedPct), 50)
    return () => clearTimeout(timer)
  }, [clampedPct])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        fontSize: '0.85rem', color: '#334155',
      }}>
        <span style={{ fontWeight: 600 }}>
          {formatCOP(gastado)} gastados de {formatCOP(tope)} permitidos
        </span>
        <span style={{ fontWeight: 700, color, fontSize: '1rem' }}>
          {porcentaje.toFixed(1)}%
        </span>
      </div>

      <div style={{
        height: '12px',
        background: '#e2e8f0',
        borderRadius: '9999px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${width}%`,
          background: color,
          borderRadius: '9999px',
          transition: 'width 0.8s ease-out',
        }} />
      </div>

      {porcentaje > 100 && (
        <div style={{
          fontSize: '0.8rem', color: '#dc2626', fontWeight: 600,
        }}>
          TOPE SUPERADO en {formatCOP(gastado - tope)}
        </div>
      )}
    </div>
  )
}
