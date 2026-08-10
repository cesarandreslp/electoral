'use client'

import { useEffect, useState } from 'react'
import { soyAnfitrion } from './actions'
import { PanelAgendaAnfitrion } from './_components/panel-agenda-anfitrion'
import { PanelConvocar } from './_components/panel-convocar'
import { PanelAgendaElector } from './_components/panel-agenda-elector'

export default function PwaAgendaPage() {
  const [esAnfitrion, setEsAnfitrion] = useState<boolean | null>(null)

  useEffect(() => { void soyAnfitrion().then(setEsAnfitrion) }, [])

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem' }}>Agenda</h1>
      <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 1rem' }}>
        {esAnfitrion
          ? 'Publica tus huecos disponibles y convoca a electores.'
          : 'Consulta los horarios disponibles del candidato o jefes de debate y reserva tu cita.'}
      </p>

      {esAnfitrion === null && <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.875rem' }}>Cargando...</div>}
      {esAnfitrion === true && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <PanelAgendaAnfitrion />
          <PanelConvocar />
        </div>
      )}
      {esAnfitrion === false && <PanelAgendaElector />}
    </div>
  )
}
