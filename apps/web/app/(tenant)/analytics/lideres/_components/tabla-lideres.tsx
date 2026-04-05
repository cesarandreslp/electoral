'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { LeaderAnalyticsRow, LeaderFilters } from '../../actions'
import { getLeaderAnalytics } from '../../actions'

const COLORES_CLASIF: Record<string, { bg: string; text: string }> = {
  VERDE:    { bg: '#dcfce7', text: '#166534' },
  AMARILLO: { bg: '#fef9c3', text: '#854d0e' },
  ROJO:     { bg: '#fee2e2', text: '#991b1b' },
}

/** Tabla de líderes con filtros, ordenamiento y badges de clasificación */
export function TablaLideres({ initialData }: { initialData: LeaderAnalyticsRow[] }) {
  const [data, setData]           = useState(initialData)
  const [zona, setZona]           = useState('')
  const [clasif, setClasif]       = useState('')
  const [desde, setDesde]         = useState('')
  const [hasta, setHasta]         = useState('')
  const [isPending, startTransition] = useTransition()

  // Zonas únicas para el filtro
  const zonas = [...new Set(initialData.map(l => l.zona).filter(Boolean))] as string[]

  function aplicarFiltros() {
    const filters: LeaderFilters = {}
    if (zona)   filters.zona          = zona
    if (clasif) filters.clasificacion = clasif as LeaderFilters['clasificacion']
    if (desde)  filters.desde         = desde
    if (hasta)  filters.hasta         = hasta

    startTransition(async () => {
      const result = await getLeaderAnalytics(Object.keys(filters).length > 0 ? filters : undefined)
      setData(result)
    })
  }

  function limpiarFiltros() {
    setZona('')
    setClasif('')
    setDesde('')
    setHasta('')
    startTransition(async () => {
      const result = await getLeaderAnalytics()
      setData(result)
    })
  }

  const headerStyle: React.CSSProperties = {
    padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.75rem',
    color: '#64748b', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap',
  }
  const cellStyle: React.CSSProperties = {
    padding: '0.5rem 0.75rem', fontSize: '0.875rem', borderBottom: '1px solid #f1f5f9',
  }
  const inputStyle: React.CSSProperties = {
    padding: '0.4rem 0.6rem', fontSize: '0.875rem', borderRadius: '6px',
    border: '1px solid #cbd5e1', background: '#fff',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Zona</label>
          <select value={zona} onChange={e => setZona(e.target.value)} style={inputStyle}>
            <option value="">Todas</option>
            {zonas.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Clasificación</label>
          <select value={clasif} onChange={e => setClasif(e.target.value)} style={inputStyle}>
            <option value="">Todas</option>
            <option value="VERDE">Verde (&ge; 70)</option>
            <option value="AMARILLO">Amarillo (40-69)</option>
            <option value="ROJO">Rojo (&lt; 40)</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={inputStyle} />
        </div>

        <button onClick={aplicarFiltros} disabled={isPending} style={{
          ...inputStyle, cursor: 'pointer', background: '#3b82f6', color: '#fff', border: 'none',
          padding: '0.5rem 1rem',
        }}>
          {isPending ? 'Cargando...' : 'Filtrar'}
        </button>

        <button onClick={limpiarFiltros} disabled={isPending} style={{
          ...inputStyle, cursor: 'pointer',
        }}>
          Limpiar
        </button>
      </div>

      {/* Tabla */}
      <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={headerStyle}>Nombre</th>
              <th style={headerStyle}>Zona</th>
              <th style={{ ...headerStyle, textAlign: 'right' }}>Electores</th>
              <th style={{ ...headerStyle, textAlign: 'right' }}>Comprometidos</th>
              <th style={{ ...headerStyle, textAlign: 'right' }}>% Avance</th>
              <th style={headerStyle}>Última actividad</th>
              <th style={{ ...headerStyle, textAlign: 'right' }}>Índ. fidelidad</th>
              <th style={headerStyle}>Clasificación</th>
              <th style={headerStyle}>Análisis</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => {
              const badge = COLORES_CLASIF[row.clasificacion]
              return (
                <tr key={row.id}>
                  <td style={{ ...cellStyle, fontWeight: 500 }}>{row.nombre}</td>
                  <td style={cellStyle}>{row.zona ?? '—'}</td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>{row.electoresAsignados}</td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>{row.comprometidos}</td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>{row.pctAvance}%</td>
                  <td style={cellStyle}>{row.ultimaActividad ?? 'Sin actividad'}</td>
                  <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 600 }}>{row.indiceFidelidad}</td>
                  <td style={cellStyle}>
                    <span style={{
                      padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem',
                      fontWeight: 600, background: badge.bg, color: badge.text,
                    }}>
                      {row.clasificacion}
                    </span>
                  </td>
                  <td style={cellStyle}>
                    <Link
                      href={`/analytics/lideres/${row.id}/analisis`}
                      style={{ color: '#3b82f6', fontSize: '0.875rem', textDecoration: 'none' }}
                    >
                      Ver análisis
                    </Link>
                  </td>
                </tr>
              )
            })}
            {data.length === 0 && (
              <tr>
                <td colSpan={9} style={{ ...cellStyle, textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                  No se encontraron líderes con los filtros seleccionados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
