import { redirect } from 'next/navigation'
import { requireAuthOrRedirect } from '@/lib/auth-helpers'
import { AppShell, type NavItem } from '@/app/_components/app-shell'

const SCREENS_DIA_E = [
  'DIA_E_TESTIGO', 'DIA_E_SALA', 'DIA_E_RESULTADOS',
  'DIA_E_ASIGNACIONES', 'DIA_E_INCIDENTES', 'DIA_E_CONFIGURACION',
]

export default async function DiaELayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuthOrRedirect(
    ['ADMIN_CAMPANA', 'COORDINADOR', 'LIDER', 'TESTIGO'],
    '/login',
    SCREENS_DIA_E,
  )

  if (!session.user.activeModules.includes('DIA_E')) {
    redirect('/no-autorizado')
  }

  const isTestigo     = session.user.role === 'TESTIGO'
  const personalizado = session.user.role === 'PERSONALIZADO'
  const puedeVer = (screenKey: string) => !personalizado || Boolean(session.user.customPermissions[screenKey]?.canView)

  const nav: NavItem[] = personalizado
    ? [
        ...(puedeVer('DIA_E_TESTIGO')       ? [{ href: '/dia-e/testigo', label: 'Mi mesa' } as NavItem] : []),
        ...(puedeVer('DIA_E_SALA')          ? [{ href: '/dia-e/sala', label: 'Sala de situación' } as NavItem] : []),
        ...(puedeVer('DIA_E_RESULTADOS')    ? [{ href: '/dia-e/sala/resultados', label: 'Resultados' } as NavItem] : []),
        ...(puedeVer('DIA_E_ASIGNACIONES')  ? [{ href: '/dia-e/sala/asignaciones', label: 'Asignaciones' } as NavItem] : []),
        ...(puedeVer('DIA_E_INCIDENTES')    ? [{ href: '/dia-e/sala/incidentes', label: 'Incidentes' } as NavItem] : []),
        ...(puedeVer('DIA_E_CONFIGURACION') ? [{ href: '/dia-e/sala/configuracion', label: 'Configuración' } as NavItem] : []),
      ]
    : isTestigo
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
      moduleKey="DIA_E"
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
