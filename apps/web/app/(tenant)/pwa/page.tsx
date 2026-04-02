'use client'

/**
 * Home de la PWA para líderes de base.
 * Ultra-simple, optimizada para celular.
 * Usa SWR para cachear la lista de electores y soportar modo offline.
 *
 * Los electores se ordenan por lastContact ASC (los más viejos primero)
 * para que el líder vea quiénes necesitan atención urgente.
 */

import useSWR         from 'swr'
import Link           from 'next/link'

interface Elector {
  id:               string
  name:             string
  phone:            string | null
  commitmentStatus: string
  lastContact:      string | null
  votingTableId:    string | null
  notes:            string | null
}

const COLORES: Record<string, string> = {
  SIN_CONTACTAR: '#94a3b8',
  CONTACTADO:    '#60a5fa',
  SIMPATIZANTE:  '#fbbf24',
  COMPROMETIDO:  '#4ade80',
  VOTO_SEGURO:   '#22c55e',
}

async function fetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Error al cargar electores')
  return res.json()
}

export default function PwaHomePage() {
  const { data, error, isLoading, mutate } = useSWR<{ electores: Elector[] }>(
    '/api/core/mis-electores',
    fetcher,
    {
      // Revalidar al volver a la app (útil en celular al cambiar de pestaña)
      revalidateOnFocus:      true,
      // Mantener datos anteriores mientras recarga (mejor UX offline)
      keepPreviousData:       true,
      // Reintentar en error (red inestable en campo)
      errorRetryCount:        3,
      errorRetryInterval:     5000,
    },
  )

  const electores = data?.electores ?? []

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '1rem', fontFamily: 'system-ui, sans-serif' }}>

      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Mis electores</h1>
          {!isLoading && (
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
              {electores.length} registros
            </div>
          )}
        </div>
        <button
          onClick={() => mutate()}
          style={{
            background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '6px',
            padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem', color: '#64748b',
          }}
        >
          Actualizar
        </button>
      </div>

      {/* Estado de carga / error */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.875rem' }}>
          Cargando...
        </div>
      )}

      {error && (
        <div style={{
          background: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem',
          borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1rem',
        }}>
          Sin conexión — mostrando datos guardados localmente.
        </div>
      )}

      {/* Lista de electores */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {electores.map((elector) => (
          <Link
            key={elector.id}
            href={`/pwa/electores/${elector.id}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div
              style={{
                background:   '#fff',
                border:       '1px solid #e2e8f0',
                borderLeft:   `4px solid ${COLORES[elector.commitmentStatus] ?? '#cbd5e1'}`,
                borderRadius: '8px',
                padding:      '0.875rem 1rem',
                display:      'flex',
                justifyContent: 'space-between',
                alignItems:   'center',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{elector.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                  {elector.lastContact
                    ? `Último contacto: ${new Date(elector.lastContact).toLocaleDateString('es-CO')}`
                    : 'Sin contacto registrado'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {/* Botón click-to-call — solo si hay teléfono */}
                {elector.phone && (
                  <a
                    href={`tel:${elector.phone}`}
                    onClick={e => e.stopPropagation()}
                    style={{
                      background:     '#dbeafe',
                      color:          '#1e40af',
                      padding:        '0.4rem 0.6rem',
                      borderRadius:   '6px',
                      fontSize:       '1rem',
                      textDecoration: 'none',
                    }}
                  >
                    📞
                  </a>
                )}

                {/* Indicador de estado */}
                <div
                  style={{
                    width:        '10px',
                    height:       '10px',
                    borderRadius: '50%',
                    background:   COLORES[elector.commitmentStatus] ?? '#cbd5e1',
                    flexShrink:   0,
                  }}
                />
              </div>
            </div>
          </Link>
        ))}

        {!isLoading && electores.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.875rem' }}>
            No tienes electores asignados todavía.
          </div>
        )}
      </div>
    </div>
  )
}
