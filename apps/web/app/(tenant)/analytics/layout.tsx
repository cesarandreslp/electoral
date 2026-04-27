import { redirect } from 'next/navigation'
import { requireAuthOrRedirect } from '@/lib/auth-helpers'
import { AppShell, type NavItem } from '@/app/_components/app-shell'

export default async function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuthOrRedirect(
    ['ADMIN_CAMPANA', 'COORDINADOR'],
    '/login',
  )

  if (!session.user.activeModules.includes('ANALYTICS')) {
    redirect('/no-autorizado')
  }

  const nav: NavItem[] = [
    { href: '/analytics',               label: 'Dashboard' },
    { href: '/analytics/territorio',    label: 'Territorio' },
    { href: '/analytics/lideres',       label: 'Líderes' },
    { href: '/analytics/proyeccion',    label: 'Proyección' },
    { href: '/analytics/configuracion', label: 'Configuración' },
  ]

  return (
    <AppShell
      moduleName="ANALYTICS"
      tenantName={session.user.tenantName ?? 'Campaña'}
      userEmail={session.user.email ?? ''}
      userRole={session.user.role}
      nav={nav}
    >
      {children}
    </AppShell>
  )
}
