import { headers } from 'next/headers'
import { LoginForm } from './_components/login-form'

export const metadata = { title: 'Iniciar sesión' }

/**
 * Página de login del portal de tenant.
 * Server Component — lee el nombre del tenant inyectado por el middleware
 * en el header x-tenant-name para personalizarla sin exponer datos al cliente.
 */
export default async function TenantLoginPage() {
  const headersList = await headers()
  const tenantName  = headersList.get('x-tenant-name') ?? 'Campaña'

  return <LoginForm tenantName={tenantName} />
}
