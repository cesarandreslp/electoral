'use client'

import { useState } from 'react'
import type { TerritoryRow } from '../../actions'

type SortKey = keyof TerritoryRow
type SortDir = 'asc' | 'desc'

/** Tabla de análisis territorial con ordenamiento y resaltado condicional */
export function TablaTerritorio({
  data,
  onExportCSV,
}: {
  data:        TerritoryRow[]
  onExportCSV: () => Promise<string>
}) {
  const [sortKey, setSortKey] = useState<SortKey>('municipio')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [exporting, setExporting] = useState(false)

  const sorted = [...data].sort((a, b) => {
    const va = a[sortKey]
    const vb = b[sortKey]
    const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number)
    return sortDir === 'asc' ? cmp : -cmp
  })

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const csv = await onExportCSV()
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = 'analisis-territorial.csv'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  function colorAvance(pct: number): string {
    if (pct >= 80) return '#dcfce7' // verde
    if (pct >= 50) return '#fef9c3' // amarillo
    return '#fee2e2'                // rojo
  }

  const headerStyle: React.CSSProperties = {
    padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.75rem',
    color: '#64748b', cursor: 'pointer', userSelect: 'none',
    borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap',
  }

  const cellStyle: React.CSSProperties = {
    padding: '0.5rem 0.75rem', fontSize: '0.875rem', borderBottom: '1px solid #f1f5f9',
  }

  const columns: { key: SortKey; label: string; align?: 'right' }[] = [
    { key: 'municipio',      label: 'Municipio' },
    { key: 'divipola',       label: 'DIVIPOLA' },
    { key: 'registrados',    label: 'Registrados',    align: 'right' },
    { key: 'comprometidos',  label: 'Comprometidos',  align: 'right' },
    { key: 'pctAvance',      label: '% Avance',       align: 'right' },
    { key: 'meta',           label: 'Meta',            align: 'right' },
    { key: 'brecha',         label: 'Brecha',          align: 'right' },
    { key: 'lideresActivos', label: 'Líderes activos', align: 'right' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button
          onClick={handleExport}
          disabled={exporting}
          style={{
            padding: '0.5rem 1rem', fontSize: '0.875rem', borderRadius: '6px',
            border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer',
          }}
        >
          {exporting ? 'Exportando...' : 'Exportar CSV'}
        </button>
      </div>

      <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  style={{ ...headerStyle, textAlign: col.align ?? 'left' }}
                >
                  {col.label} {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={i}>
                <td style={cellStyle}>{row.municipio}</td>
                <td style={cellStyle}>{row.divipola}</td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>{row.registrados}</td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>{row.comprometidos}</td>
                <td style={{
                  ...cellStyle, textAlign: 'right', fontWeight: 600,
                  background: colorAvance(row.pctAvance),
                }}>
                  {row.pctAvance}%
                </td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>{row.meta}</td>
                <td style={{ ...cellStyle, textAlign: 'right', color: row.brecha > 0 ? '#ef4444' : '#22c55e' }}>
                  {row.brecha}
                </td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>{row.lideresActivos}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} style={{ ...cellStyle, textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                  Sin datos territoriales
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
