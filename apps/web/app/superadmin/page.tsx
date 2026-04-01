import { listTenants } from './actions'

export const metadata = { title: 'Dashboard — Superadmin' }

export default async function SuperadminDashboard() {
  const tenants = await listTenants()

  // Calcular stats
  const total   = tenants.length
  const activos = tenants.filter(t => t.isActive).length

  // Contar módulos activos (excluyendo CORE que siempre está)
  const conteoModulos = tenants
    .flatMap(t => t.activeModules.filter(m => m !== 'CORE'))
    .reduce<Record<string, number>>((acc, mod) => {
      acc[mod] = (acc[mod] ?? 0) + 1
      return acc
    }, {})

  const modulosMasUsados = Object.entries(conteoModulos)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([mod, count]) => `${mod} (${count})`)
    .join(', ') || 'Ninguno aún'

  return (
    <div>
      <h1 style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 700 }}>
        Dashboard
      </h1>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <StatCard titulo="Total clientes"   valor={String(total)}   />
        <StatCard titulo="Clientes activos" valor={String(activos)} />
        <StatCard titulo="Módulos más usados" valor={modulosMasUsados} ancho="auto" />
      </div>

      {tenants.length === 0 && (
        <div style={{ marginTop: '3rem', color: '#64748b' }}>
          No hay clientes registrados todavía.{' '}
          <a href="/clientes/nuevo">Crear el primero →</a>
        </div>
      )}
    </div>
  )
}

function StatCard({
  titulo,
  valor,
  ancho = '180px',
}: {
  titulo: string
  valor:  string
  ancho?: string
}) {
  return (
    <div
      style={{
        background:   '#fff',
        border:       '1px solid #e2e8f0',
        borderRadius: '8px',
        padding:      '1.5rem',
        minWidth:     ancho,
      }}
    >
      <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
        {titulo}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>
        {valor}
      </div>
    </div>
  )
}
