import { redirect } from 'next/navigation'
import { requireAuthOrRedirect } from '@/lib/auth-helpers'
import { AppShell, type NavItem } from '@/app/_components/app-shell'
import { BadgeNotificaciones } from './_components/badge-notificaciones'

export default async function CoreLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuthOrRedirect(
    ['ADMIN_CAMPANA', 'COORDINADOR', 'LIDER', 'TESTIGO'],
    '/login',
  )

  if (!session.user.activeModules.includes('CORE')) {
    redirect('/no-autorizado')
  }

  const esAdmin = ['ADMIN_CAMPANA', 'COORDINADOR'].includes(session.user.role)

  const nav: NavItem[] = [
    { href: '/core',           label: 'Dashboard' },
    { href: '/core/lideres',   label: 'Líderes' },
    { href: '/core/electores', label: 'Electores' },
    ...(esAdmin
      ? [
          { href: '/core/importar', label: 'Importar' } as NavItem,
          { href: '/core/qr',       label: 'QR de captación' } as NavItem,
        ]
      : []),
    { href: '/core/alertas', label: 'Alertas', badge: <BadgeNotificaciones /> },
  ]

  return (
    <AppShell
      moduleName={'CORE'}
      tenantName={session.user.tenantName ?? 'Campaña'}
      userEmail={session.user.email ?? ''}
      userRole={session.user.role}
      nav={nav}
    >
      {children}
    </AppShell>
  )
}
