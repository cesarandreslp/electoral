'use client'

import type { TransmissionDetail } from '../../actions'

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  VERIFICADO:      { bg: '#dcfce7', text: '#166534', border: '#22c55e' },
  SOLO_MANUAL:     { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
  SOLO_FOTO:       { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
  ADVERTENCIA:     { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
  BAJA_CONFIANZA:  { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
  PENDIENTE:       { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' },
}

export function DetalleTransmision({
  detail: d,
  onClose,
}: {
  detail: TransmissionDetail
  onClose: () => void
}) {
  const colors = STATUS_COLORS[d.verificationStatus] ?? STATUS_COLORS.PENDIENTE

  return (
    <div style={{
      background: '#fff', borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      border: `2px solid ${colors.border}`,
      padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>
            Mesa {d.tableNumber} — {d.stationName}
          </h3>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
            Testigo: {d.witnessEmail}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{
            padding: '0.2rem 0.6rem', borderRadius: '9999px',
            fontSize: '0.75rem', fontWeight: 600,
            background: colors.bg, color: colors.text,
          }}>
            {d.verificationStatus}
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: '1.2rem',
            cursor: 'pointer', color: '#94a3b8',
          }}>
            &times;
          </button>
        </div>
      </div>

      {/* Datos lado a lado */}
      <div style={{ display: 'grid', gridTemplateColumns: d.extractedData ? '1fr 1fr' : '1fr', gap: '1rem' }}>
        {/* Datos manuales */}
        {d.manualData && (
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '0.5rem' }}>
              DATOS MANUALES
              {d.manualSubmittedAt && (
                <span style={{ fontWeight: 400, marginLeft: '0.5rem' }}>
                  {new Date(d.manualSubmittedAt).toLocaleTimeString('es-CO')}
                </span>
              )}
            </div>
            <VotesList data={d.manualData} total={d.manualTotal} />
          </div>
        )}

        {/* Datos extraídos */}
        {d.extractedData && (
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '0.5rem' }}>
              DATOS IA
              {d.extractionConfidence && (
                <span style={{
                  marginLeft: '0.5rem', padding: '0.1rem 0.3rem', borderRadius: '4px',
                  fontSize: '0.65rem',
                  background: d.extractionConfidence === 'ALTA' ? '#dcfce7' : d.extractionConfidence === 'MEDIA' ? '#fef3c7' : '#fee2e2',
                  color: d.extractionConfidence === 'ALTA' ? '#166534' : d.extractionConfidence === 'MEDIA' ? '#92400e' : '#991b1b',
                }}>
                  {d.extractionConfidence}
                </span>
              )}
            </div>
            <VotesList data={d.extractedData} total={d.extractedTotal} />
          </div>
        )}
      </div>

      {/* Discrepancias */}
      {d.discrepancies && d.discrepancies.length > 0 && (
        <div style={{
          background: '#fee2e2', borderRadius: '8px', padding: '0.75rem',
          fontSize: '0.8rem', color: '#991b1b',
        }}>
          <strong>Discrepancias detectadas:</strong> {d.discrepancies.join(', ')}
        </div>
      )}

      {/* Foto */}
      {d.photoUrl && (
        <div>
          <a
            href={d.photoUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '0.4rem 0.9rem', fontSize: '0.8rem', borderRadius: '6px',
              border: '1px solid #1e40af', background: '#fff', color: '#1e40af',
              textDecoration: 'none', fontWeight: 500,
            }}
          >
            Ver foto original
          </a>
        </div>
      )}

      {/* Notas */}
      {d.notes && (
        <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
          Notas: {d.notes}
        </div>
      )}
    </div>
  )
}

function VotesList({ data, total }: {
  data: { candidateId: string; votes: number }[]
  total: number | null
}) {
  return (
    <div style={{
      background: '#f8fafc', borderRadius: '8px', padding: '0.75rem',
      fontSize: '0.8rem',
    }}>
      {data.map((v, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '0.2rem 0', borderBottom: '1px solid #e2e8f0',
        }}>
          <span style={{ color: '#334155' }}>{v.candidateId}</span>
          <span style={{ fontWeight: 600, color: '#0f172a' }}>{v.votes}</span>
        </div>
      ))}
      {total !== null && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '0.4rem 0 0', fontWeight: 700, color: '#0f172a',
        }}>
          <span>Total</span>
          <span>{total}</span>
        </div>
      )}
    </div>
  )
}
