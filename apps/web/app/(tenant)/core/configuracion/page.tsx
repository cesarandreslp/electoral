import { requireAuthOrRedirect } from '@/lib/auth-helpers'
import { getConfiguracion }      from './actions'
import { ConfigForm }            from './_components/config-form'

export const metadata = { title: 'Configuración' }

/** Configuración de la campaña — solo ADMIN_CAMPANA. */
export default async function ConfiguracionPage() {
  await requireAuthOrRedirect(['ADMIN_CAMPANA'])
  const cfg = await getConfiguracion()

  return (
    <div style={{ maxWidth: '640px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.35rem' }}>
        Configuración de la campaña
      </h1>
      <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        Claves de IA propias, dominio y branding de tu campaña.
      </p>
      <ConfigForm inicial={cfg} />
    </div>
  )
}
