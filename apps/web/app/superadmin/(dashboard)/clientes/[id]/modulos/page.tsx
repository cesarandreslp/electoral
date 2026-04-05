import Link from 'next/link'
import { getTenantModules, toggleModule } from '../../../../actions'
import type { ModuleKey } from '../../../../actions'

export default async function ModulosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: tenantId } = await params
  const { tenant, modules } = await getTenantModules(tenantId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
      <div>
        <Link href="/clientes" style={{ color: '#64748b', fontSize: '0.8rem', textDecoration: 'none' }}>
          &larr; Volver a clientes
        </Link>
        <h1 style={{ margin: '0.5rem 0 0', fontSize: '1.5rem', color: '#0f172a' }}>
          Módulos — {tenant.name}
        </h1>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
          {tenant.slug}
        </p>
      </div>

      <div style={{
        background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        overflow: 'hidden',
      }}>
        {modules.map((mod) => {
          const esCORE = mod.key === 'CORE'

          async function handleToggle() {
            'use server'
            await toggleModule(tenantId, mod.key as ModuleKey)
          }

          return (
            <div
              key={mod.key}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>
                  {mod.label}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {mod.descripcion}
                </div>
              </div>

              <form action={handleToggle}>
                <button
                  type="submit"
                  disabled={esCORE}
                  title={esCORE ? 'CORE es obligatorio y no se puede desactivar' : undefined}
                  style={{
                    padding: '0.4rem 0.9rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    cursor: esCORE ? 'not-allowed' : 'pointer',
                    border: `1px solid ${mod.isActive ? '#22c55e' : '#cbd5e1'}`,
                    background: mod.isActive ? '#dcfce7' : '#f8fafc',
                    color: mod.isActive ? '#166534' : '#64748b',
                    opacity: esCORE ? 0.6 : 1,
                  }}
                >
                  {mod.isActive ? 'Activo' : 'Inactivo'}
                </button>
              </form>
            </div>
          )
        })}
      </div>
    </div>
  )
}
