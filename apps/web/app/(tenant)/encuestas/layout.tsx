import { redirect } from 'next/navigation'
import { requireAuthOrRedirect } from '@/lib/auth-helpers'
import { AppShell, type NavItem } from '@/app/_components/app-shell'

export default async function EncuestasLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuthOrRedirect(
    ['ADMIN_CAMPANA', 'COORDINADOR'],
    '/login',
  )

  if (!session.user.activeModules.includes('ENCUESTAS')) {
    redirect('/no-autorizado')
  }

  const isAdmin = session.user.role === 'ADMIN_CAMPANA'

  const nav: NavItem[] = [
    { href: '/encuestas',            label: 'Dashboard' },
    { href: '/encuestas/campanas',   label: 'Campañas' },
    { href: '/encuestas/resultados', label: 'Resultados' },
    ...(isAdmin
      ? [
          { href: '/encuestas/configuracion', label: 'Configuración API' } as NavItem,
        ]
      : []),
  ]

  return (
    <AppShell
      moduleName="ENCUESTAS"
      tenantName={session.user.tenantName ?? 'Campaña'}
      userEmail={session.user.email ?? ''}
      userRole={session.user.role}
      nav={nav}
    >
      {children}
    </AppShell>
  )
}
