import { auth } from '@campaignos/auth'
import { redirect } from 'next/navigation'
import { LoginForm } from './_components/login-form'

export const metadata = { title: 'Iniciar sesión — CampaignOS' }

/**
 * Página de login universal de CampaignOS.
 * Server Component: si ya hay sesión, redirige al destino correcto sin
 * mostrar el formulario.
 *
 * Resolución del destino post-login:
 *   - SUPERADMIN  → /superadmin
 *   - cualquier otro rol → /
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const session = await auth()
  const params  = await searchParams

  if (session?.user) {
    const destino = params.callbackUrl
      ?? (session.user.role === 'SUPERADMIN' ? '/superadmin' : '/')
    redirect(destino)
  }

  return <LoginForm callbackUrl={params.callbackUrl} />
}
