import { redirect } from 'next/navigation'
import { requireAuthOrRedirect } from '@/lib/auth-helpers'
import { AppShell, type NavItem } from '@/app/_components/app-shell'

export default async function DiaELayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuthOrRedirect(
    ['ADMIN_CAMPANA', 'COORDINADOR', 'LIDER', 'TESTIGO'],
    '/login',
  )

  if (!session.user.activeModules.includes('DIA_E')) {
    redirect('/no-autorizado')
  }

  const isTestigo = session.user.role === 'TESTIGO'

  const nav: NavItem[] = isTestigo
    ? [{ href: '/dia-e/testigo', label: 'Mi mesa' }]
    : [
        { href: '/dia-e/sala',               label: 'Sala de situación' },
        { href: '/dia-e/sala/resultados',    label: 'Resultados' },
        { href: '/dia-e/sala/asignaciones',  label: 'Asignaciones' },
        { href: '/dia-e/sala/incidentes',    label: 'Incidentes' },
        { href: '/dia-e/sala/configuracion', label: 'Configuración' },
      ]

  return (
    <AppShell
      moduleName="DÍA E"
      tenantName={session.user.tenantName ?? 'Campaña'}
      userEmail={session.user.email ?? ''}
      userRole={session.user.role}
      nav={nav}
    >
      {children}
    </AppShell>
  )
}
