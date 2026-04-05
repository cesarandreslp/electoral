'use client'

import { useState } from 'react'
import { exportWitnessProgressCSV } from '../../actions'
import type { WitnessProgress } from '../../actions'

export function TablaProgreso({ witnesses }: { witnesses: WitnessProgress[] }) {
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const csv = await exportWitnessProgressCSV()
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `progreso-testigos-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Error al exportar.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={{
      background: '#fff', borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflowX: 'auto',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1rem 1.25rem',
      }}>
        <h2 style={{ margin: 0, fontSize: '1rem', color: '#334155' }}>
          Progreso de testigos ({witnesses.length})
        </h2>
        <button
          onClick={handleExport}
          disabled={exporting || witnesses.length === 0}
          style={{
            padding: '0.4rem 0.9rem', fontSize: '0.8rem', borderRadius: '6px',
            border: '1px solid #1e40af', background: '#fff', color: '#1e40af',
            cursor: exporting ? 'not-allowed' : 'pointer', fontWeight: 600,
          }}
        >
          {exporting ? 'Exportando...' : 'Exportar CSV'}
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Email', 'Nombre', 'Sesiones', 'Evaluaciones', 'Aprobadas', 'Certificados', 'Puntaje prom.'].map(h => (
              <th key={h} style={headerStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {witnesses.map(w => (
            <tr key={w.userId}>
              <td style={cellStyle}>{w.email}</td>
              <td style={cellStyle}>{w.name ?? '—'}</td>
              <td style={{ ...cellStyle, textAlign: 'center' }}>{w.sessionsAttended}</td>
              <td style={{ ...cellStyle, textAlign: 'center' }}>{w.quizzesAttempted}</td>
              <td style={{ ...cellStyle, textAlign: 'center' }}>
                <span style={{
                  background: w.quizzesPassed > 0 ? '#dcfce7' : '#f1f5f9',
                  color: w.quizzesPassed > 0 ? '#166534' : '#94a3b8',
                  padding: '0.1rem 0.4rem', borderRadius: '4px',
                  fontSize: '0.8rem', fontWeight: 600,
                }}>
                  {w.quizzesPassed}
                </span>
              </td>
              <td style={{ ...cellStyle, textAlign: 'center' }}>{w.certificatesEarned}</td>
              <td style={{ ...cellStyle, textAlign: 'center' }}>
                {w.avgScore !== null ? `${w.avgScore}%` : '—'}
              </td>
            </tr>
          ))}
          {witnesses.length === 0 && (
            <tr>
              <td colSpan={7} style={{ ...cellStyle, textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                No hay testigos registrados
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

const headerStyle: React.CSSProperties = {
  padding: '0.5rem 1.25rem', textAlign: 'left', fontSize: '0.75rem',
  color: '#64748b', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap',
}
const cellStyle: React.CSSProperties = {
  padding: '0.5rem 1.25rem', fontSize: '0.875rem', borderBottom: '1px solid #f1f5f9',
}
