'use client'

import { useState } from 'react'
import { FotoE14 } from './foto-e14'
import { FormManualE14 } from './form-manual-e14'
import { FormIncidente } from './form-incidente'
import type { MyAssignment, CandidateView, TransmissionDetail } from '../../actions'

type Step = 'idle' | 'photo' | 'manual' | 'incident'

interface ExtractedResult {
  data: { candidateId: string; votes: number }[]
  confidence: string
  discrepancies: string[]
}

export function TestigoFlow({
  assignment,
  candidates,
  initialTransmission,
}: {
  assignment: MyAssignment
  candidates: CandidateView[]
  initialTransmission: TransmissionDetail | null
}) {
  const [step, setStep] = useState<Step>('idle')
  const [extracted, setExtracted] = useState<ExtractedResult | null>(null)
  const [transmitted, setTransmitted] = useState(!!initialTransmission?.finalData)

  const status = initialTransmission?.verificationStatus ?? 'PENDIENTE'

  function handlePhotoExtracted(result: ExtractedResult) {
    setExtracted(result)
    setStep('manual') // Ir al formulario para verificar
  }

  function handleTransmitted() {
    setTransmitted(true)
    setStep('idle')
  }

  // Si ya transmitió, mostrar estado
  if (transmitted && (step === 'idle' || step === 'incident')) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <StatusCard status={status} transmission={initialTransmission} />

        <button
          onClick={() => { setTransmitted(false); setStep('idle') }}
          style={{
            padding: '0.75rem', fontSize: '0.875rem', borderRadius: '8px',
            border: '1px solid #cbd5e1', background: '#fff', color: '#334155',
            cursor: 'pointer', fontWeight: 500,
          }}
        >
          Volver a transmitir
        </button>

        {step === 'idle' && (
          <button
            onClick={() => setStep('incident')}
            style={{
              padding: '0.75rem', fontSize: '0.875rem', borderRadius: '8px',
              border: '1px solid #fecaca', background: '#fff', color: '#ef4444',
              cursor: 'pointer', fontWeight: 500,
            }}
          >
            Reportar incidente
          </button>
        )}

        {step === 'incident' && (
          <FormIncidente
            votingTableId={assignment.votingTableId}
            onClose={() => setStep('idle')}
          />
        )}
      </div>
    )
  }

  if (step === 'photo') {
    return (
      <FotoE14
        votingTableId={assignment.votingTableId}
        onExtracted={handlePhotoExtracted}
        onCancel={() => setStep('idle')}
        onManualFallback={() => setStep('manual')}
      />
    )
  }

  if (step === 'manual') {
    return (
      <FormManualE14
        votingTableId={assignment.votingTableId}
        tableNumber={assignment.tableNumber}
        stationName={assignment.stationName}
        municipality={assignment.municipality}
        department={assignment.department}
        candidates={candidates}
        extractedData={extracted?.data ?? null}
        extractedConfidence={extracted?.confidence ?? null}
        onTransmitted={handleTransmitted}
        onBack={() => setStep('idle')}
      />
    )
  }

  if (step === 'incident') {
    return (
      <FormIncidente
        votingTableId={assignment.votingTableId}
        onClose={() => setStep('idle')}
      />
    )
  }

  // Estado idle — pantalla principal con los 3 pasos
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Paso 1: Fotografiar */}
      <button
        onClick={() => setStep('photo')}
        style={{
          padding: '1.5rem', fontSize: '1.1rem', borderRadius: '12px',
          border: 'none', background: '#1e40af', color: '#fff',
          cursor: 'pointer', fontWeight: 700, textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>&#128247;</div>
        Fotografía el acta E-14
        <div style={{ fontSize: '0.8rem', fontWeight: 400, opacity: 0.8, marginTop: '0.25rem' }}>
          Paso 1 de 3 — Toma una foto clara del formulario
        </div>
      </button>

      {/* Enlace secundario para digitación manual */}
      <button
        onClick={() => setStep('manual')}
        style={{
          padding: '0.75rem', fontSize: '0.85rem', borderRadius: '8px',
          border: '1px solid #cbd5e1', background: '#fff', color: '#64748b',
          cursor: 'pointer',
        }}
      >
        ¿Problemas con la foto? Digita los datos manualmente
      </button>

      {/* Reportar incidente */}
      <button
        onClick={() => setStep('incident')}
        style={{
          padding: '0.75rem', fontSize: '0.85rem', borderRadius: '8px',
          border: '1px solid #fecaca', background: '#fff', color: '#ef4444',
          cursor: 'pointer',
        }}
      >
        Reportar incidente
      </button>
    </div>
  )
}

function StatusCard({ status, transmission }: {
  status: string
  transmission: TransmissionDetail | null
}) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    VERIFICADO:      { bg: '#dcfce7', text: '#166534', border: '#22c55e' },
    SOLO_MANUAL:     { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
    SOLO_FOTO:       { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
    ADVERTENCIA:     { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
    BAJA_CONFIANZA:  { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
    PENDIENTE:       { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' },
  }
  const c = colors[status] ?? colors.PENDIENTE

  const labels: Record<string, string> = {
    VERIFICADO:     'Verificado — datos manual y foto coinciden',
    SOLO_MANUAL:    'Transmitido — solo datos manuales',
    SOLO_FOTO:      'Transmitido — solo foto procesada por IA',
    ADVERTENCIA:    'Advertencia — hay diferencias entre manual y foto',
    BAJA_CONFIANZA: 'Confianza baja — se requiere revisión manual',
    PENDIENTE:      'Pendiente de transmisión',
  }

  return (
    <div style={{
      background: c.bg, border: `2px solid ${c.border}`, borderRadius: '12px',
      padding: '1.25rem',
    }}>
      <div style={{ fontWeight: 700, fontSize: '1rem', color: c.text }}>
        {labels[status] ?? status}
      </div>
      {transmission?.manualSubmittedAt && (
        <div style={{ fontSize: '0.8rem', color: c.text, opacity: 0.8, marginTop: '0.25rem' }}>
          Manual: {new Date(transmission.manualSubmittedAt).toLocaleTimeString('es-CO')}
        </div>
      )}
      {transmission?.photoSubmittedAt && (
        <div style={{ fontSize: '0.8rem', color: c.text, opacity: 0.8 }}>
          Foto: {new Date(transmission.photoSubmittedAt).toLocaleTimeString('es-CO')}
          {transmission.extractionConfidence && ` — Confianza: ${transmission.extractionConfidence}`}
        </div>
      )}
    </div>
  )
}
