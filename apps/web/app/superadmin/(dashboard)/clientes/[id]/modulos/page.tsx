import Link from 'next/link'
import { getTenantModules, toggleModule } from '../../../../actions'
import type { ModuleKey } from '../../../../actions'

export default async function ModulosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: tenantId } = await params
  const { tenant, modules } = await getTenantModules(tenantId)

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <Link href="/superadmin/clientes" className="text-slate-500 text-xs hover:text-granate transition">
          &larr; Volver a clientes
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Módulos — {tenant.name}
        </h1>
        <p className="mt-1 text-xs text-slate-400 font-mono">{tenant.slug}</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {modules.map((mod) => {
          const esCORE = mod.key === 'CORE'

          async function handleToggle() {
            'use server'
            await toggleModule(tenantId, mod.key as ModuleKey)
          }

          return (
            <div
              key={mod.key}
              className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-100 last:border-0"
            >
              <div className="leading-snug">
                <div className="font-semibold text-sm text-slate-900">{mod.label}</div>
                <div className="text-xs text-slate-500">{mod.descripcion}</div>
              </div>

              <form action={handleToggle}>
                <button
                  type="submit"
                  disabled={esCORE}
                  title={esCORE ? 'CORE es obligatorio y no se puede desactivar' : undefined}
                  className={`shrink-0 px-3.5 py-1.5 rounded-md border text-xs font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed ${
                    mod.isActive
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700 enabled:hover:bg-emerald-100'
                      : 'border-slate-300 bg-slate-50 text-slate-500 enabled:hover:bg-slate-100'
                  }`}
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
