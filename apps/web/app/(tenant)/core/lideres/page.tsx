import Link                      from 'next/link'
import { auth }                  from '@campaignos/auth'
import { listLeaders }           from '../actions'
import { BarraProgreso }         from './_components/barra-progreso'

export const metadata = { title: 'Líderes' }

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function LideresPage({ searchParams }: Props) {
  const params  = await searchParams
  const session = await auth()
  const esAdmin = ['ADMIN_CAMPANA', 'COORDINADOR'].includes(session?.user?.role ?? '')

  const lideres = await listLeaders({ search: params.q })
  // Solo líderes raíz: los sub-líderes se ven al entrar a su líder superior.
  // Al buscar, se muestran también los sub-líderes que hagan match (si no, el
  // filtro de raíz los escondería aunque la búsqueda sí los haya encontrado).
  const raices  = params.q ? lideres : lideres.filter((l) => l.parentLeaderId === null)

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

      <form method="GET" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <input
          name="q" defaultValue={params.q} placeholder="Buscar por nombre o cédula..."
          style={{ padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', flex: '1', maxWidth: '320px' }}
        />
        <button
          type="submit"
          style={{
            background: '#0f172a', color: '#fff', padding: '0.5rem 1rem',
            borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.875rem',
          }}
        >
          Buscar
        </button>
      </form>

      {raices.length === 0 ? (
        <div style={{ color: '#64748b', marginTop: '2rem' }}>
          {params.q ? 'Ningún líder coincide con la búsqueda.' : 'No hay líderes registrados todavía.'}
          {esAdmin && !params.q && <> <Link href="/core/lideres/nuevo">Crear el primero →</Link></>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {raices.map((lider) => (
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
