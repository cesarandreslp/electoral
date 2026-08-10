import { redirect } from 'next/navigation'
import { requireAuthOrRedirect } from '@/lib/auth-helpers'
import { getBranding } from '@/lib/branding'
import { LogoutButton } from '@/app/_components/logout-button'
import { NavBar } from './_components/nav-bar'

/**
 * Antes /pwa no tenía guardia a nivel de página — dependía solo de que la API
 * devolviera 401. Se agrega acá porque ahora también entran electores
 * (rol ELECTOR) por su propio login, no solo staff con cuenta de admin.
 *
 * También es donde faltaba el branding de campaña (logo/color) que sí tiene
 * el AppShell de /core — la PWA no pasa por ahí, quedaba con la marca
 * genérica de Vectra.
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
  const { logoUrl, primaryColor } = await getBranding()

  return (
    // Sin este fondo explícito, el navegador aplica su oscurecimiento automático
    // a la página (se ve negra) — el resto de la app lo evita con bg-slate-50
    // del AppShell, pero /pwa no pasa por ahí.
    <div style={{ minHeight: '100vh', background: '#f1f5f9', paddingBottom: '4rem' }}>
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.75rem 1rem 0', maxWidth: '480px', margin: '0 auto', boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={session.user.tenantName ?? 'Campaña'} style={{ height: '28px', width: 'auto', objectFit: 'contain' }} />
          )}
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: primaryColor ?? '#0f172a' }}>
            {session.user.tenantName}
          </span>
        </div>
        <LogoutButton
          tono="claro"
          redirectTo={esElector ? `/electores/login?c=${session.user.tenantSlug ?? ''}` : '/login'}
        />
      </div>
      {children}
      <NavBar mostrarEncuestas={session.user.activeModules.includes('ENCUESTAS')} />
    </div>
  )
}
