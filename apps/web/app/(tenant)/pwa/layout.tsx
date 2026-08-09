import { redirect } from 'next/navigation'
import { requireAuthOrRedirect } from '@/lib/auth-helpers'
import { LogoutButton } from '@/app/_components/logout-button'

/**
 * Antes /pwa no tenía guardia a nivel de página — dependía solo de que la API
 * devolviera 401. Se agrega acá porque ahora también entran electores
 * (rol ELECTOR) por su propio login, no solo staff con cuenta de admin.
 */
export default async function PwaLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuthOrRedirect(
    ['ADMIN_CAMPANA', 'COORDINADOR', 'LIDER', 'TESTIGO', 'ELECTOR'],
    '/login',
  )

  if (!session.user.activeModules.includes('CORE')) {
    redirect('/no-autorizado')
  }

  const esElector = session.user.role === 'ELECTOR'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.75rem 1rem 0' }}>
        <LogoutButton
          tono="claro"
          redirectTo={esElector ? `/electores/login?c=${session.user.tenantSlug ?? ''}` : '/login'}
        />
      </div>
      {children}
    </div>
  )
}
