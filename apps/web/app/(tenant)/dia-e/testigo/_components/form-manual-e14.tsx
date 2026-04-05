'use client'

import { useState } from 'react'
import { submitManualE14 } from '../../actions'
import type { CandidateView } from '../../actions'

interface VoteEntry {
  candidateId: string
  votes: number
}

export function FormManualE14({
  votingTableId,
  tableNumber,
  stationName,
  municipality,
  department,
  candidates,
  extractedData,
  extractedConfidence,
  onTransmitted,
  onBack,
}: {
  votingTableId: string
  tableNumber: number
  stationName: string
  municipality: string
  department: string
  candidates: CandidateView[]
  extractedData: VoteEntry[] | null
  extractedConfidence: string | null
  onTransmitted: () => void
  onBack: () => void
}) {
  // Inicializar votos — pre-llenar con datos extraídos si existen
  const allEntries = [
    ...candidates.map(c => c.id),
    'VOTOS_BLANCO',
    'VOTOS_NULOS',
  ]

  const extractedMap = new Map<string, number>()
  if (extractedData) {
    for (const e of extractedData) {
      extractedMap.set(e.candidateId.toLowerCase(), e.votes)
      // Intentar mapear por nombre del candidato
      const match = candidates.find(c => c.name.toLowerCase() === e.candidateId.toLowerCase())
      if (match) extractedMap.set(match.id, e.votes)
    }
    // Buscar votos en blanco/nulos
    for (const e of extractedData) {
      const lower = e.candidateId.toLowerCase()
      if (lower.includes('blanco')) extractedMap.set('VOTOS_BLANCO', e.votes)
      if (lower.includes('nulo')) extractedMap.set('VOTOS_NULOS', e.votes)
    }
  }

  const [votes, setVotes] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    for (const id of allEntries) {
      initial[id] = extractedMap.get(id) ?? 0
    }
    return initial
  })

  const [actaTotal, setActaTotal] = useState<number>(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentSum = Object.values(votes).reduce((a, b) => a + b, 0)
  const isValid    = actaTotal > 0 && currentSum === actaTotal

  // Determinar estado del botón de transmisión
  const hasExtracted = extractedData && extractedData.length > 0
  const hasManual    = Object.values(votes).some(v => v > 0)

  let submitLabel: string
  let submitColor: string
  let submitBg:    string

  if (hasExtracted && hasManual) {
    // Comparar
    const hasDiscrepancy = extractedData!.some(e => {
      const match = candidates.find(c => c.name.toLowerCase() === e.candidateId.toLowerCase())
      const manualVal = match ? votes[match.id] : undefined
      return manualVal !== undefined && manualVal !== e.votes
    })
    if (hasDiscrepancy) {
      submitLabel = 'Transmitir — Con advertencia \u26A0'
      submitColor = '#fff'
      submitBg    = '#ef4444'
    } else {
      submitLabel = 'Transmitir — Verificado \u2713'
      submitColor = '#fff'
      submitBg    = '#16a34a'
    }
  } else if (hasExtracted) {
    submitLabel = 'Transmitir — Solo foto IA'
    submitColor = '#fff'
    submitBg    = '#2563eb'
  } else {
    submitLabel = 'Transmitir — Solo manual'
    submitColor = '#000'
    submitBg    = '#fbbf24'
  }

  function updateVote(id: string, value: number) {
    setVotes(prev => ({ ...prev, [id]: Math.max(0, value) }))
  }

  async function handleSubmit() {
    if (!isValid) return
    setSubmitting(true)
    setError(null)

    const voteEntries: VoteEntry[] = Object.entries(votes).map(([candidateId, v]) => ({
      candidateId,
      votes: v,
    }))

    const result = await submitManualE14(votingTableId, voteEntries, actaTotal)

    setSubmitting(false)

    if (result.success) {
      onTransmitted()
    } else {
      setError(result.error ?? 'Error al transmitir.')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {/* Encabezado oficial E-14 */}
      <div style={{
        background: '#0f172a', color: '#fff', padding: '1rem 1.25rem',
        borderRadius: '12px 12px 0 0', textAlign: 'center',
      }}>
        <div style={{ fontSize: '0.7rem', letterSpacing: '1px', opacity: 0.7 }}>
          REGISTRADURÍA NACIONAL DEL ESTADO CIVIL
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.25rem 0' }}>
          Formulario E-14
        </div>
        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
          Registro de votación
        </div>
      </div>

      {/* Datos de la mesa */}
      <div style={{
        background: '#f1f5f9', padding: '0.75rem 1.25rem',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem',
        borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0',
      }}>
        <DataField label="Puesto de votación" value={stationName} />
        <DataField label="Número de mesa" value={String(tableNumber)} />
        <DataField label="Municipio" value={municipality} />
        <DataField label="Departamento" value={department} />
      </div>

      {/* Tabla de candidatos */}
      <div style={{
        background: '#fff', borderLeft: '1px solid #e2e8f0',
        borderRight: '1px solid #e2e8f0',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Candidato</th>
              <th style={{ ...thStyle, width: '90px', textAlign: 'center' }}>Votos</th>
              {hasExtracted && (
                <th style={{ ...thStyle, width: '80px', textAlign: 'center', fontSize: '0.65rem' }}>
                  IA detectó
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {candidates.map(c => {
              const extractedVal = extractedMap.get(c.id)
              const hasDiff = extractedVal !== undefined && extractedVal !== votes[c.id]
              return (
                <tr key={c.id} style={{ background: c.isOwn ? '#eff6ff' : undefined }}>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: c.isOwn ? 600 : 400 }}>{c.name}</span>
                      {c.isOwn && (
                        <span style={{
                          background: '#1e40af', color: '#fff',
                          padding: '0.1rem 0.35rem', borderRadius: '4px',
                          fontSize: '0.6rem', fontWeight: 700,
                        }}>
                          NUESTRO
                        </span>
                      )}
                      {c.party && (
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{c.party}</span>
                      )}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <input
                      type="number"
                      min="0"
                      value={votes[c.id] || ''}
                      onChange={e => updateVote(c.id, parseInt(e.target.value) || 0)}
                      style={voteInputStyle}
                    />
                  </td>
                  {hasExtracted && (
                    <td style={{ ...tdStyle, textAlign: 'center', fontSize: '0.75rem' }}>
                      {extractedVal !== undefined ? (
                        <span style={{ color: hasDiff ? '#ef4444' : '#16a34a', fontWeight: hasDiff ? 700 : 400 }}>
                          {extractedVal}
                          {hasDiff && (
                            <div style={{ fontSize: '0.6rem', color: '#ef4444' }}>
                              \u26A0 Dif: {Math.abs(extractedVal - votes[c.id])}
                            </div>
                          )}
                        </span>
                      ) : '—'}
                    </td>
                  )}
                </tr>
              )
            })}

            {/* Votos en blanco */}
            <VoteRow
              id="VOTOS_BLANCO"
              label="Votos en blanco"
              votes={votes}
              extractedMap={extractedMap}
              hasExtracted={!!hasExtracted}
              onChange={updateVote}
            />

            {/* Votos nulos */}
            <VoteRow
              id="VOTOS_NULOS"
              label="Votos nulos"
              votes={votes}
              extractedMap={extractedMap}
              hasExtracted={!!hasExtracted}
              onChange={updateVote}
            />
          </tbody>
        </table>
      </div>

      {/* Total y validación */}
      <div style={{
        background: '#f8fafc', padding: '1rem 1.25rem',
        borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0',
        borderBottom: '1px solid #e2e8f0', borderRadius: '0 0 12px 12px',
        display: 'flex', flexDirection: 'column', gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>
            Suma de votos digitados:
          </span>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0f172a' }}>
            {currentSum}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label style={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
            Total en el acta física:
          </label>
          <input
            type="number"
            min="0"
            value={actaTotal || ''}
            onChange={e => setActaTotal(parseInt(e.target.value) || 0)}
            style={{ ...voteInputStyle, width: '100px', fontSize: '1.1rem', fontWeight: 700 }}
          />
        </div>

        {actaTotal > 0 && currentSum !== actaTotal && (
          <div style={{
            background: '#fee2e2', color: '#991b1b', padding: '0.5rem 0.75rem',
            borderRadius: '6px', fontSize: '0.8rem',
          }}>
            La suma ({currentSum}) no coincide con el total del acta ({actaTotal}).
            Diferencia: {Math.abs(currentSum - actaTotal)}
          </div>
        )}

        {isValid && (
          <div style={{
            background: '#dcfce7', color: '#166534', padding: '0.5rem 0.75rem',
            borderRadius: '6px', fontSize: '0.8rem',
          }}>
            Los totales coinciden. Puedes transmitir.
          </div>
        )}

        {error && (
          <div style={{
            background: '#fee2e2', color: '#991b1b', padding: '0.5rem 0.75rem',
            borderRadius: '6px', fontSize: '0.8rem',
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={onBack} style={{
            flex: 1, padding: '0.75rem', fontSize: '0.85rem', borderRadius: '8px',
            border: '1px solid #cbd5e1', background: '#fff', color: '#334155',
            cursor: 'pointer',
          }}>
            Volver
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            style={{
              flex: 2, padding: '0.75rem', fontSize: '0.875rem', borderRadius: '8px',
              border: 'none', background: isValid ? submitBg : '#94a3b8',
              color: isValid ? submitColor : '#fff',
              cursor: isValid && !submitting ? 'pointer' : 'not-allowed',
              fontWeight: 700,
            }}
          >
            {submitting ? 'Transmitiendo...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function DataField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 500 }}>{value}</div>
    </div>
  )
}

function VoteRow({ id, label, votes, extractedMap, hasExtracted, onChange }: {
  id: string
  label: string
  votes: Record<string, number>
  extractedMap: Map<string, number>
  hasExtracted: boolean
  onChange: (id: string, value: number) => void
}) {
  const extractedVal = extractedMap.get(id)
  const hasDiff = extractedVal !== undefined && extractedVal !== votes[id]

  return (
    <tr style={{ background: '#fafafa' }}>
      <td style={{ ...tdStyle, fontStyle: 'italic', color: '#64748b' }}>{label}</td>
      <td style={{ ...tdStyle, textAlign: 'center' }}>
        <input
          type="number"
          min="0"
          value={votes[id] || ''}
          onChange={e => onChange(id, parseInt(e.target.value) || 0)}
          style={voteInputStyle}
        />
      </td>
      {hasExtracted && (
        <td style={{ ...tdStyle, textAlign: 'center', fontSize: '0.75rem' }}>
          {extractedVal !== undefined ? (
            <span style={{ color: hasDiff ? '#ef4444' : '#16a34a', fontWeight: hasDiff ? 700 : 400 }}>
              {extractedVal}
            </span>
          ) : '—'}
        </td>
      )}
    </tr>
  )
}

const thStyle: React.CSSProperties = {
  padding: '0.5rem 1.25rem', textAlign: 'left', fontSize: '0.7rem',
  color: '#64748b', borderBottom: '2px solid #e2e8f0', fontWeight: 600,
}
const tdStyle: React.CSSProperties = {
  padding: '0.4rem 1.25rem', fontSize: '0.85rem',
  borderBottom: '1px solid #f1f5f9',
}
const voteInputStyle: React.CSSProperties = {
  width: '70px', padding: '0.4rem', fontSize: '1rem', fontWeight: 600,
  textAlign: 'center', borderRadius: '6px', border: '1px solid #cbd5e1',
}
