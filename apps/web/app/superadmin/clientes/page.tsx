import { DataTable } from '@campaignos/ui'
import { listTenants, toggleTenantStatus, type TenantSummary } from '../actions'

export const metadata = { title: 'Clientes — Superadmin' }

export default async function ClientesPage() {
  const tenants = await listTenants()

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Clientes</h1>
        <a
          href="/clientes/nuevo"
          style={{
            background: '#1e40af', color: '#fff', padding: '0.5rem 1rem',
            borderRadius: '6px', textDecoration: 'none', fontSize: '0.875rem',
          }}
        >
          + Nuevo cliente
        </a>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
        <DataTable
          keyField="id"
          rows={tenants}
          emptyMessage="No hay clientes registrados"
          columns={[
            {
              key:    'name',
              header: 'Nombre',
            },
            {
              key:    'slug',
              header: 'Slug',
              render: (_, row) => (
                <code style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>
                  {(row as TenantSummary).slug}
                </code>
              ),
            },
            {
              key:    'isActive',
              header: 'Estado',
              render: (_, row) => {
                const tenant = row as TenantSummary
                return (
                  <span
                    style={{
                      background:   tenant.isActive ? '#dcfce7' : '#fee2e2',
                      color:        tenant.isActive ? '#166534' : '#991b1b',
                      padding:      '0.15rem 0.6rem',
                      borderRadius: '999px',
                      fontSize:     '0.75rem',
                      fontWeight:   600,
                    }}
                  >
                    {tenant.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                )
              },
            },
            {
              key:    'activeModules',
              header: 'Módulos',
              render: (_, row) => {
                const modulos = (row as TenantSummary).activeModules
                return (
                  <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                    {modulos.join(', ') || '—'}
                  </span>
                )
              },
            },
            {
              key:    'createdAt',
              header: 'Creado',
              render: (_, row) => (
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {new Date((row as TenantSummary).createdAt).toLocaleDateString('es-CO')}
                </span>
              ),
            },
            {
              key:    'id',
              header: 'Acciones',
              render: (_, row) => {
                const tenant = row as TenantSummary
                return (
                  <ToggleForm tenantId={tenant.id} isActive={tenant.isActive} />
                )
              },
            },
          ]}
        />
      </div>
    </div>
  )
}

// Componente de formulario para el toggle — usa Server Action directamente
function ToggleForm({ tenantId, isActive }: { tenantId: string; isActive: boolean }) {
  // Acción inline que llama al Server Action con el tenantId capturado
  async function accion() {
    'use server'
    await toggleTenantStatus(tenantId)
  }

  return (
    <form action={accion}>
      <button
        type="submit"
        style={{
          background: 'transparent',
          border:     `1px solid ${isActive ? '#ef4444' : '#22c55e'}`,
          color:      isActive ? '#ef4444' : '#22c55e',
          padding:    '0.2rem 0.6rem',
          borderRadius: '4px',
          cursor:     'pointer',
          fontSize:   '0.75rem',
        }}
      >
        {isActive ? 'Desactivar' : 'Activar'}
      </button>
    </form>
  )
}
