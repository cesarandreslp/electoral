import { redirect } from 'next/navigation'
import { requireAuthOrRedirect } from '@/lib/auth-helpers'
import { AppShell, type NavItem } from '@/app/_components/app-shell'

export default async function ComunicacionesLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuthOrRedirect(
    ['ADMIN_CAMPANA', 'COORDINADOR'],
    '/login',
  )

  if (!session.user.activeModules.includes('COMUNICACIONES')) {
    redirect('/no-autorizado')
  }

  const isAdmin = session.user.role === 'ADMIN_CAMPANA'

  const nav: NavItem[] = [
    { href: '/comunicaciones',            label: 'Dashboard' },
    { href: '/comunicaciones/campanas',   label: 'Campañas' },
    { href: '/comunicaciones/plantillas', label: 'Plantillas' },
    ...(isAdmin
      ? [
          { href: '/comunicaciones/automatizaciones', label: 'Automatizaciones' } as NavItem,
          { href: '/comunicaciones/configuracion',    label: 'Config SMTP' } as NavItem,
        ]
      : []),
  ]

  return (
    <AppShell
      moduleName="COMUNICACIONES"
      tenantName={session.user.tenantName ?? 'Campaña'}
      userEmail={session.user.email ?? ''}
      userRole={session.user.role}
      nav={nav}
    >
      {children}
    </AppShell>
  )
}
