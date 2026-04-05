'use client'

import { useState } from 'react'
import type { TransmissionView, TransmissionDetail } from '../../actions'
import { getTransmissionStatus } from '../../actions'
import { DetalleTransmision } from './detalle-transmision'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  VERIFICADO:      { bg: '#dcfce7', text: '#166534' },
  SOLO_MANUAL:     { bg: '#dbeafe', text: '#1e40af' },
  SOLO_FOTO:       { bg: '#dbeafe', text: '#1e40af' },
  ADVERTENCIA:     { bg: '#fee2e2', text: '#991b1b' },
  BAJA_CONFIANZA:  { bg: '#fef3c7', text: '#92400e' },
  PENDIENTE:       { bg: '#f1f5f9', text: '#64748b' },
}

export function TablaTransmisiones({
  transmissions,
}: {
  transmissions: TransmissionView[]
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail]         = useState<TransmissionDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [filter, setFilter]         = useState<string>('')

  const filtered = filter
    ? transmissions.filter(t => t.verificationStatus === filter)
    : transmissions

  async function handleSelectRow(tx: TransmissionView) {
    if (selectedId === tx.id) {
      setSelectedId(null)
      setDetail(null)
      return
    }
    setSelectedId(tx.id)
    setLoadingDetail(true)
    const d = await getTransmissionStatus(tx.votingTableId)
    setDetail(d)
    setLoadingDetail(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <FilterBtn label="Todos" active={!filter} onClick={() => setFilter('')} />
        <FilterBtn label="Verificados" active={filter === 'VERIFICADO'} onClick={() => setFilter('VERIFICADO')} />
        <FilterBtn label="Advertencia" active={filter === 'ADVERTENCIA'} onClick={() => setFilter('ADVERTENCIA')} />
        <FilterBtn label="Solo manual" active={filter === 'SOLO_MANUAL'} onClick={() => setFilter('SOLO_MANUAL')} />
        <FilterBtn label="Solo foto" active={filter === 'SOLO_FOTO'} onClick={() => setFilter('SOLO_FOTO')} />
        <FilterBtn label="Baja confianza" active={filter === 'BAJA_CONFIANZA'} onClick={() => setFilter('BAJA_CONFIANZA')} />
      </div>

      {/* Tabla */}
      <div style={{
        background: '#fff', borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflowX: 'auto',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Mesa', 'Puesto', 'Testigo', 'Estado', 'Votos propios', 'Hora'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(tx => {
              const colors = STATUS_COLORS[tx.verificationStatus] ?? STATUS_COLORS.PENDIENTE
              return (
                <tr
                  key={tx.id}
                  onClick={() => handleSelectRow(tx)}
                  style={{ cursor: 'pointer', background: selectedId === tx.id ? '#f8fafc' : undefined }}
                >
                  <td style={tdStyle}>{tx.tableNumber}</td>
                  <td style={tdStyle}>{tx.stationName}</td>
                  <td style={{ ...tdStyle, fontSize: '0.8rem' }}>{tx.witnessEmail}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '0.15rem 0.5rem', borderRadius: '9999px',
                      fontSize: '0.7rem', fontWeight: 600,
                      background: colors.bg, color: colors.text,
                    }}>
                      {tx.verificationStatus}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    {tx.ownCandidateVotes ?? '—'}
                  </td>
                  <td style={{ ...tdStyle, fontSize: '0.8rem', color: '#64748b' }}>
                    {tx.transmittedAt
                      ? new Date(tx.transmittedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                  No hay transmisiones {filter ? 'con este estado' : ''}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Panel de detalle */}
      {selectedId && (
        loadingDetail
          ? <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Cargando detalle...</div>
          : detail && <DetalleTransmision detail={detail} onClose={() => { setSelectedId(null); setDetail(null) }} />
      )}
    </div>
  )
}

function FilterBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.3rem 0.7rem', fontSize: '0.75rem', borderRadius: '6px',
        border: `1px solid ${active ? '#1e40af' : '#cbd5e1'}`,
        background: active ? '#dbeafe' : '#fff',
        color: active ? '#1e40af' : '#64748b',
        cursor: 'pointer', fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </button>
  )
}

const thStyle: React.CSSProperties = {
  padding: '0.5rem 1rem', textAlign: 'left', fontSize: '0.75rem',
  color: '#64748b', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap',
}
const tdStyle: React.CSSProperties = {
  padding: '0.5rem 1rem', fontSize: '0.85rem', borderBottom: '1px solid #f1f5f9',
}
