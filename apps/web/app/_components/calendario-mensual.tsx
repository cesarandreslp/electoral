'use client'

/**
 * Calendario mensual tipo Google Calendar — grilla de 7 columnas con chips de
 * eventos por día, sin dependencias nuevas (CSS grid puro). Reutilizado por
 * la agenda del anfitrión (PWA) y la vista admin de agenda (CORE).
 */

import { useState } from 'react'

export interface EventoCalendario {
  id:    string
  fecha: string // 'YYYY-MM-DD' en hora local del evento
  label: string
  color: string // background del chip
}

interface Props {
  eventos:    EventoCalendario[]
  onDiaClick?: (fecha: Date, eventosDelDia: EventoCalendario[]) => void
  mesInicial?: Date
}

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function claveFecha(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function CalendarioMensual({ eventos, onDiaClick, mesInicial }: Props) {
  const [mes, setMes] = useState(() => {
    const d = mesInicial ?? new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const porDia = new Map<string, EventoCalendario[]>()
  for (const e of eventos) {
    const lista = porDia.get(e.fecha) ?? []
    lista.push(e)
    porDia.set(e.fecha, lista)
  }

  const primerDiaSemana = mes.getDay()
  const diasEnMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
  const celdas: (Date | null)[] = [
    ...Array(primerDiaSemana).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => new Date(mes.getFullYear(), mes.getMonth(), i + 1)),
  ]
  while (celdas.length % 7 !== 0) celdas.push(null)

  const hoy = new Date()
  const esHoy = (d: Date) => d.toDateString() === hoy.toDateString()

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0' }}>
        <button
          type="button" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}
          style={{ border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '0.9rem' }}
        >
          ←
        </button>
        <div style={{ fontWeight: 600, fontSize: '1rem', textTransform: 'capitalize' }}>
          {mes.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
        </div>
        <button
          type="button" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}
          style={{ border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '0.9rem' }}
        >
          →
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #e2e8f0' }}>
        {DIAS_SEMANA.map((d) => (
          <div key={d} style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {celdas.map((d, i) => {
          if (!d) return <div key={i} style={{ minHeight: '96px', background: '#fafafa', borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }} />
          const eventosDia = porDia.get(claveFecha(d)) ?? []
          return (
            <div
              key={i}
              onClick={() => onDiaClick?.(d, eventosDia)}
              style={{
                minHeight: '96px', padding: '0.35rem',
                borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9',
                cursor: onDiaClick ? 'pointer' : 'default',
              }}
            >
              <div style={{
                fontSize: '0.75rem', fontWeight: esHoy(d) ? 700 : 500,
                color: esHoy(d) ? '#fff' : '#0f172a',
                background: esHoy(d) ? '#0f172a' : 'transparent',
                width: '20px', height: '20px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.25rem',
              }}>
                {d.getDate()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {eventosDia.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    style={{
                      fontSize: '0.68rem', background: e.color, color: '#fff', borderRadius: '3px',
                      padding: '1px 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}
                  >
                    {e.label}
                  </div>
                ))}
                {eventosDia.length > 3 && (
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>+{eventosDia.length - 3} más</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
