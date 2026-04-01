import { auth } from '@campaignos/auth'
import Link from 'next/link'
import { redirect } from 'next/navigation'

// Next.js requiere default export en layout.tsx — excepción a la regla de named exports
export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Verificar sesión y rol antes de renderizar cualquier contenido
  const session = await auth()
  if (!session?.user || session.user.role !== 'SUPERADMIN') {
    redirect('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar de navegación */}
      <aside
        style={{
          width: '220px',
          background: '#1e40af',
          color: '#fff',
          padding: '1.5rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1.5rem' }}>
          CampaignOS
          <div style={{ fontSize: '0.7rem', fontWeight: 400, opacity: 0.7 }}>
            Panel de administración
          </div>
        </div>

        {/*
          Los href usan la ruta que ve el browser (sin /superadmin/).
          El middleware reescribe admin.x.co/foo → /superadmin/foo en el servidor.
        */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <Link href="/" style={{ color: '#bfdbfe', textDecoration: 'none', padding: '0.5rem' }}>
            Dashboard
          </Link>
          <Link href="/clientes" style={{ color: '#bfdbfe', textDecoration: 'none', padding: '0.5rem' }}>
            Clientes
          </Link>
          <Link href="/clientes/nuevo" style={{ color: '#bfdbfe', textDecoration: 'none', padding: '0.5rem' }}>
            + Nuevo cliente
          </Link>
        </nav>

        <div style={{ marginTop: 'auto', fontSize: '0.75rem', opacity: 0.6 }}>
          {session.user.email}
        </div>
      </aside>

      {/* Contenido principal */}
      <main style={{ flex: 1, padding: '2rem', background: '#f8fafc' }}>
        {children}
      </main>
    </div>
  )
}
