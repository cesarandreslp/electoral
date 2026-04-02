import Link                      from 'next/link'
import { auth }                  from '@campaignos/auth'
import { listLeaders }           from '../actions'
import { BarraProgreso }         from './_components/barra-progreso'

export const metadata = { title: 'Líderes' }

export default async function LideresPage() {
  const session = await auth()
  const esAdmin = ['ADMIN_CAMPANA', 'COORDINADOR'].includes(session?.user?.role ?? '')

  const lideres = await listLeaders()

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Líderes</h1>
        {esAdmin && (
          <Link
            href="/core/lideres/nuevo"
            style={{
              background:     '#0f172a',
              color:          '#fff',
              padding:        '0.5rem 1rem',
              borderRadius:   '6px',
              textDecoration: 'none',
              fontSize:       '0.875rem',
            }}
          >
            + Nuevo líder
          </Link>
        )}
      </div>

      {lideres.length === 0 ? (
        <div style={{ color: '#64748b', marginTop: '2rem' }}>
          No hay líderes registrados todavía.
          {esAdmin && <> <Link href="/core/lideres/nuevo">Crear el primero →</Link></>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {lideres.map((lider) => (
            <Link
              key={lider.id}
              href={`/core/lideres/${lider.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                style={{
                  background:   '#fff',
                  border:       '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding:      '1.25rem',
                  cursor:       'pointer',
                  transition:   'box-shadow 0.15s',
                }}
              >
                {/* Encabezado */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{lider.name}</div>
                    {lider.zone && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                        {lider.zone}
                      </div>
                    )}
                  </div>
                  <EstadoBadge status={lider.status} />
                </div>

                {/* Barra de progreso */}
                <BarraProgreso
                  valor={lider.comprometidos}
                  meta={lider.targetVotes}
                  pct={lider.pctAvance}
                />

                {/* Métricas */}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.75rem', color: '#64748b' }}>
                  <span>{lider.totalElectores} electores</span>
                  <span>{lider.comprometidos} comprometidos</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function EstadoBadge({ status }: { status: string }) {
  const colores: Record<string, { bg: string; color: string }> = {
    ACTIVO:     { bg: '#dcfce7', color: '#166534' },
    INACTIVO:   { bg: '#fef9c3', color: '#854d0e' },
    SUSPENDIDO: { bg: '#fee2e2', color: '#991b1b' },
  }
  const c = colores[status] ?? { bg: '#f1f5f9', color: '#475569' }

  return (
    <span
      style={{
        background:   c.bg,
        color:        c.color,
        padding:      '0.15rem 0.5rem',
        borderRadius: '999px',
        fontSize:     '0.7rem',
        fontWeight:   600,
        whiteSpace:   'nowrap',
      }}
    >
      {status}
    </span>
  )
}
