import { redirect } from 'next/navigation'
import { requireAuthOrRedirect } from '@/lib/auth-helpers'
import { AppShell, type NavItem } from '@/app/_components/app-shell'

export default async function FinanzasLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuthOrRedirect(
    ['ADMIN_CAMPANA', 'COORDINADOR'],
    '/login',
  )

  if (!session.user.activeModules.includes('FINANZAS')) {
    redirect('/no-autorizado')
  }

  const isAdmin = session.user.role === 'ADMIN_CAMPANA'

  const nav: NavItem[] = [
    { href: '/finanzas',            label: 'Dashboard' },
    { href: '/finanzas/gastos',     label: 'Gastos' },
    { href: '/finanzas/donaciones', label: 'Donaciones' },
    ...(isAdmin
      ? [
          { href: '/finanzas/informes',      label: 'Informes' } as NavItem,
          { href: '/finanzas/configuracion', label: 'Configuración' } as NavItem,
        ]
      : []),
  ]

  return (
    <AppShell
      moduleName="FINANZAS"
      tenantName={session.user.tenantName ?? 'Campaña'}
      userEmail={session.user.email ?? ''}
      userRole={session.user.role}
      nav={nav}
    >
      {children}
    </AppShell>
  )
}
