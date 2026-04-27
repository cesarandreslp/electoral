import Link from 'next/link'

export interface NavItem {
  href:   string
  label:  string
  badge?: React.ReactNode
}

export interface AppShellProps {
  moduleName: string
  tenantName: string
  userEmail:  string
  userRole:   string
  nav:        NavItem[]
  children:   React.ReactNode
}

/**
 * Shell de la app con sidebar responsive.
 *
 * Móvil (< md): top bar con hamburger; sidebar oculto, se desliza al activar.
 * Desktop (≥ md): sidebar fijo de 224px, sin top bar.
 *
 * Implementación CSS-only con un checkbox `peer` — no requiere JavaScript
 * cliente, así que funciona también en Server Components puros y mantiene
 * el shell sin hidratación.
 */
export function AppShell({
  moduleName,
  tenantName,
  userEmail,
  userRole,
  nav,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-[100dvh] bg-slate-50">
      <input id="appshell-toggle" type="checkbox" className="peer hidden" />

      {/* Top bar — solo móvil */}
      <header className="md:hidden fixed top-0 inset-x-0 z-20 flex items-center justify-between bg-slate-900 text-white px-3 h-14 shadow">
        <label
          htmlFor="appshell-toggle"
          className="cursor-pointer p-2 -ml-2 rounded-md hover:bg-white/10"
          aria-label="Abrir menú"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </label>
        <div className="text-sm font-semibold truncate flex-1 text-center">{tenantName}</div>
        <div className="text-[10px] opacity-60 uppercase tracking-wider w-10 text-right">{moduleName}</div>
      </header>

      {/* Backdrop — solo móvil cuando el sidebar está abierto */}
      <label
        htmlFor="appshell-toggle"
        className="md:hidden fixed inset-0 z-30 bg-black/50 hidden peer-checked:block"
        aria-hidden
      />

      {/* Sidebar */}
      <aside
        className="
          fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white px-5 py-6
          flex flex-col gap-2
          -translate-x-full peer-checked:translate-x-0 transition-transform duration-200
          md:static md:translate-x-0 md:w-56 md:flex-shrink-0
        "
      >
        {/* Botón cerrar — solo móvil */}
        <label
          htmlFor="appshell-toggle"
          className="md:hidden self-end cursor-pointer p-1 -mr-1 -mt-1 rounded hover:bg-white/10"
          aria-label="Cerrar menú"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M6 6l12 12M6 18L18 6" />
          </svg>
        </label>

        <div className="mb-6">
          <div className="font-bold text-base leading-tight">{tenantName}</div>
          <div className="text-[11px] font-normal opacity-60 mt-0.5 uppercase tracking-wider">
            CampaignOS · {moduleName}
          </div>
        </div>

        <nav className="flex flex-col gap-0.5">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 text-slate-300 hover:bg-white/5 hover:text-white rounded-md px-3 py-2 text-sm transition"
            >
              <span className="flex-1">{item.label}</span>
              {item.badge}
            </Link>
          ))}
        </nav>

        <div className="mt-auto text-xs opacity-50 leading-tight">
          <div className="truncate">{userEmail}</div>
          <div className="opacity-70 mt-0.5">{userRole}</div>
        </div>
      </aside>

      {/* Contenido */}
      <main className="md:ml-0 pt-14 md:pt-0 min-h-[100dvh] flex flex-col">
        <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-x-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
