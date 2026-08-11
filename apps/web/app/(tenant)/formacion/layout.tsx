import { redirect } from 'next/navigation'
import { requireAuthOrRedirect } from '@/lib/auth-helpers'
import { AppShell, type NavItem } from '@/app/_components/app-shell'

const SCREENS_FORMACION = [
  'FORMACION_MATERIALES', 'FORMACION_SESIONES', 'FORMACION_EVALUACIONES',
  'FORMACION_CERTIFICADOS', 'FORMACION_REPORTES',
]

export default async function FormacionLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuthOrRedirect(
    ['ADMIN_CAMPANA', 'COORDINADOR', 'TESTIGO'],
    '/login',
    SCREENS_FORMACION,
  )

  if (!session.user.activeModules.includes('FORMACION')) {
    redirect('/no-autorizado')
  }

  const isAdmin       = session.user.role === 'ADMIN_CAMPANA'
  const personalizado = session.user.role === 'PERSONALIZADO'
  const puedeVer = (screenKey: string) => !personalizado || Boolean(session.user.customPermissions[screenKey]?.canView)

  const nav: NavItem[] = [
    ...(puedeVer('FORMACION_MATERIALES')   ? [{ href: '/formacion', label: 'Materiales' } as NavItem] : []),
    ...(puedeVer('FORMACION_SESIONES')     ? [{ href: '/formacion/sesiones', label: 'Sesiones' } as NavItem] : []),
    ...(puedeVer('FORMACION_EVALUACIONES') ? [{ href: '/formacion/evaluaciones', label: 'Evaluaciones' } as NavItem] : []),
    ...(puedeVer('FORMACION_CERTIFICADOS') ? [{ href: '/formacion/certificados', label: 'Mis certificados' } as NavItem] : []),
    ...((isAdmin || (personalizado && puedeVer('FORMACION_REPORTES')))
      ? [{ href: '/formacion/reportes', label: 'Reportes' } as NavItem]
      : []),
  ]

  return (
    <AppShell
      moduleName="FORMACIÓN"
      moduleKey="FORMACION"
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
