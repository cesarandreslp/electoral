import { redirect } from 'next/navigation'
import { requireAuthOrRedirect } from '@/lib/auth-helpers'
import { AppShell, type NavItem } from '@/app/_components/app-shell'

const SCREENS_ENCUESTAS = [
  'ENCUESTAS_DASHBOARD', 'ENCUESTAS_CAMPANAS', 'ENCUESTAS_RESULTADOS', 'ENCUESTAS_CONFIGURACION',
]

export default async function EncuestasLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuthOrRedirect(
    ['ADMIN_CAMPANA', 'COORDINADOR'],
    '/login',
    SCREENS_ENCUESTAS,
  )

  if (!session.user.activeModules.includes('ENCUESTAS')) {
    redirect('/no-autorizado')
  }

  const isAdmin        = session.user.role === 'ADMIN_CAMPANA'
  const personalizado  = session.user.role === 'PERSONALIZADO'
  const puedeVer = (screenKey: string) => !personalizado || Boolean(session.user.customPermissions[screenKey]?.canView)

  const nav: NavItem[] = [
    ...(puedeVer('ENCUESTAS_DASHBOARD')  ? [{ href: '/encuestas', label: 'Dashboard' } as NavItem] : []),
    ...(puedeVer('ENCUESTAS_CAMPANAS')   ? [{ href: '/encuestas/campanas', label: 'Campañas' } as NavItem] : []),
    ...(puedeVer('ENCUESTAS_RESULTADOS') ? [{ href: '/encuestas/resultados', label: 'Resultados' } as NavItem] : []),
    ...((isAdmin || (personalizado && puedeVer('ENCUESTAS_CONFIGURACION')))
      ? [{ href: '/encuestas/configuracion', label: 'Configuración API' } as NavItem] : []),
  ]

  return (
    <AppShell
      moduleName="ENCUESTAS"
      moduleKey="ENCUESTAS"
      tenantName={session.user.tenantName ?? 'Campaña'}
      userEmail={session.user.email ?? ''}
      userRole={session.user.role}
      nav={nav}
      activeModules={session.user.activeModules}
    >
      {children}
    </AppShell>
  )
}
