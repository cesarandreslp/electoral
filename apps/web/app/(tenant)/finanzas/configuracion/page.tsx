import { requireModule } from '@/lib/auth-helpers'
import { getFinanceConfig } from '../actions'
import { FinanceConfigForm } from './_components/finance-config-form'

export default async function ConfiguracionPage() {
  await requireModule('FINANZAS', ['ADMIN_CAMPANA'])

  const config = await getFinanceConfig()

  return (
    <div style={{ maxWidth: '650px' }}>
      <h1 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', color: '#0f172a' }}>
        Configuración financiera
      </h1>
      <FinanceConfigForm initialConfig={config} />
    </div>
  )
}
