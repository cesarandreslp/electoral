import { auth } from '@campaignos/auth'
import { redirect } from 'next/navigation'
import { LoginElectorForm } from './_components/login-form'

// El template del layout raíz ya añade " | Vectra"
export const metadata = { title: 'Iniciar sesión' }

interface Props {
  searchParams: Promise<{ c?: string }>
}

/**
 * Login para electores (no staff): cédula + teléfono, sin contraseña.
 * El slug de la campaña viene en ?c= (mismo patrón que /registro/[token])
 * porque acá no hay subdominio configurado que lo resuelva.
 */
export default async function LoginElectorPage({ searchParams }: Props) {
  const session = await auth()
  const params  = await searchParams

  if (session?.user) {
    redirect('/pwa')
  }

  return <LoginElectorForm slug={params.c ?? ''} />
}
