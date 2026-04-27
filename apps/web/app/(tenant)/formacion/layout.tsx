import { redirect } from 'next/navigation'
import { requireAuthOrRedirect } from '@/lib/auth-helpers'
import { AppShell, type NavItem } from '@/app/_components/app-shell'

export default async function FormacionLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuthOrRedirect(
    ['ADMIN_CAMPANA', 'COORDINADOR', 'TESTIGO'],
    '/login',
  )

  if (!session.user.activeModules.includes('FORMACION')) {
    redirect('/no-autorizado')
  }

  const isAdmin = session.user.role === 'ADMIN_CAMPANA'

  const nav: NavItem[] = [
    { href: '/formacion',               label: 'Materiales' },
    { href: '/formacion/sesiones',      label: 'Sesiones' },
    { href: '/formacion/evaluaciones',  label: 'Evaluaciones' },
    { href: '/formacion/certificados',  label: 'Mis certificados' },
    ...(isAdmin ? [{ href: '/formacion/reportes', label: 'Reportes' } as NavItem] : []),
  ]

  return (
    <AppShell
      moduleName="FORMACIÓN"
      tenantName={session.user.tenantName ?? 'Campaña'}
      userEmail={session.user.email ?? ''}
      userRole={session.user.role}
      nav={nav}
    >
      {children}
    </AppShell>
  )
}
