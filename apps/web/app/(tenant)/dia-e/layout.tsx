
import Link        from 'next/link'
import { redirect } from 'next/navigation'
import { requireAuthOrRedirect } from '@/lib/auth-helpers'

// Next.js requiere default export en layout.tsx
export default async function DiaELayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuthOrRedirect(
    ['ADMIN_CAMPANA', 'COORDINADOR', 'LIDER', 'TESTIGO'],
    '/login',
  )

  if (!session.user.activeModules.includes('DIA_E')) {
    redirect('/no-autorizado')
  }

  const tenantName = session.user.tenantName ?? 'Campaña'
  const role       = session.user.role
  const isTestigo  = role === 'TESTIGO'

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width:         '220px',
          background:    '#0f172a',
          color:         '#fff',
          padding:       '1.5rem 1rem',
          display:       'flex',
          flexDirection: 'column',
          gap:           '0.5rem',
          flexShrink:    0,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1.5rem' }}>
          {tenantName}
          <div style={{ fontSize: '0.7rem', fontWeight: 400, opacity: 0.6, marginTop: '2px' }}>
            CampaignOS · DÍA E
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {isTestigo ? (
            <>
              <NavLink href="/dia-e/testigo">Mi mesa</NavLink>
            </>
          ) : (
            <>
              <NavLink href="/dia-e/sala">Sala de situación</NavLink>
              <NavLink href="/dia-e/sala/resultados">Resultados</NavLink>
              <NavLink href="/dia-e/sala/asignaciones">Asignaciones</NavLink>
              <NavLink href="/dia-e/sala/incidentes">Incidentes</NavLink>
              <NavLink href="/dia-e/sala/configuracion">Configuración</NavLink>
            </>
          )}
        </nav>

        <div style={{ marginTop: 'auto', fontSize: '0.75rem', opacity: 0.5 }}>
          {session.user.email}
          <div style={{ opacity: 0.7 }}>{role}</div>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '2rem', background: '#f8fafc', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        color:          '#94a3b8',
        textDecoration: 'none',
        padding:        '0.5rem 0.75rem',
        borderRadius:   '6px',
        fontSize:       '0.875rem',
      }}
    >
      {children}
    </Link>
  )
}
