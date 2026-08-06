import Link from 'next/link'
import { listTenants } from '../actions'

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
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Estado general de las campañas en la plataforma.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard titulo="Total clientes"     valor={String(total)}   />
        <StatCard titulo="Clientes activos"   valor={String(activos)} />
        <StatCard titulo="Módulos más usados" valor={modulosMasUsados} />
      </div>

      {tenants.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-600 text-sm">No hay clientes registrados todavía.</p>
          <Link
            href="/superadmin/clientes/nuevo"
            className="inline-block mt-3 bg-granate text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-granate-dark transition"
          >
            Crear el primero
          </Link>
        </div>
      )}
    </div>
  )
}

function StatCard({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-oliva mb-2">
        {titulo}
      </div>
      <div className="text-2xl font-bold text-slate-900 leading-tight">{valor}</div>
    </div>
  )
}
