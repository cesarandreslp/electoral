import { requireAuthOrRedirect } from '@/lib/auth-helpers'
import { getConfiguracion, listarDepartamentos } from './actions'
import { listarRoles, listarUsuarios } from './actions-roles'
import { listVoterOptions } from '../actions'
import { ConfigForm }     from './_components/config-form'
import { RolesPanel }     from './_components/roles-panel'
import { UsuariosPanel }  from './_components/usuarios-panel'

export const metadata = { title: 'Configuración' }

/** Configuración de la campaña — solo ADMIN_CAMPANA. */
export default async function ConfiguracionPage() {
  await requireAuthOrRedirect(['ADMIN_CAMPANA'])
  const [cfg, departamentos, roles, usuarios, electores] = await Promise.all([
    getConfiguracion(), listarDepartamentos(), listarRoles(), listarUsuarios(), listVoterOptions(),
  ])

  return (
    <div style={{ maxWidth: '640px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.35rem' }}>
        Configuración de la campaña
      </h1>
      <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        Claves de IA propias, dominio y branding de tu campaña.
      </p>
      <ConfigForm inicial={cfg} departamentos={departamentos} />

      <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '2rem 0 0.35rem' }}>Roles y permisos</h2>
      <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
        Crea roles con acceso acotado a pantallas puntuales — para gente del
        primer anillo del candidato (agenda, logística, rutas, etc.).
      </p>
      <RolesPanel roles={roles} />

      <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '2rem 0 0.35rem' }}>Usuarios</h2>
      <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
        Cuentas de staff con acceso al panel — asigna un rol fijo o uno personalizado.
      </p>
      <UsuariosPanel usuarios={usuarios} roles={roles} electores={electores} />
    </div>
  )
}
