import Link from 'next/link'
import { LogoutButton } from './logout-button'

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
    // md:flex — sin esto el sidebar `md:static` y el contenido se apilan en
    // vertical en desktop, y toda la app arranca debajo del menú.
    <div className="min-h-[100dvh] bg-slate-50 md:flex">
      {/* Dos toggles independientes, ambos CSS puro (sin JS ni hidratación):
          - drawer:   abre el cajón en móvil
          - collapse: oculta el sidebar en escritorio
          Los peers van nombrados porque conviven como hermanos del <aside>. */}
      <input id="appshell-toggle"   type="checkbox" className="peer/drawer hidden" />
      <input id="appshell-collapse" type="checkbox" className="peer/collapse hidden" />

      {/* Top bar — solo móvil */}
      <header className="md:hidden fixed top-0 inset-x-0 z-20 flex items-center justify-between bg-granate-dark text-white px-3 h-14 shadow">
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
        // `hidden!` en md: sin el !, peer-checked:block gana la cascada y el velo
        // se queda tapando la pantalla al girar el móvil o ensanchar la ventana
        // con el menú abierto.
        className="fixed inset-0 z-30 bg-black/50 hidden peer-checked/drawer:block md:hidden!"
        aria-hidden
      />

      {/* Sidebar */}
      <aside
        className="
          fixed inset-y-0 left-0 z-40 w-64 bg-granate-dark text-white px-5 py-6
          flex flex-col gap-2 overflow-hidden
          -translate-x-full peer-checked/drawer:translate-x-0
          transition-all duration-200
          md:static md:translate-x-0 md:w-56 md:flex-shrink-0
          peer-checked/collapse:md:w-0 peer-checked/collapse:md:px-0
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

        <div className="mb-6 whitespace-nowrap">
          <div className="font-bold text-base leading-tight">{tenantName}</div>
          <div className="text-[11px] font-semibold text-plata mt-0.5 uppercase tracking-wider">
            Vectra · {moduleName}
          </div>
        </div>

        <nav className="flex flex-col gap-0.5">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-2 text-plata hover:bg-white/10 hover:text-white rounded-md px-3 py-2 text-sm whitespace-nowrap transition"
            >
              <span className="w-0.5 h-4 rounded-full bg-transparent group-hover:bg-oliva-light transition" aria-hidden />
              <span className="flex-1">{item.label}</span>
              {item.badge}
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t border-white/10 text-xs leading-tight whitespace-nowrap">
          <div className="truncate text-plata">{userEmail}</div>
          <div className="text-plata/70 font-semibold mt-0.5 mb-3 uppercase tracking-wider text-[10px]">
            {userRole}
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Contenido */}
      {/* min-w-0 evita que una tabla ancha empuje el layout y rompa el flex */}
      <main className="flex-1 min-w-0 pt-14 md:pt-0 min-h-[100dvh] flex flex-col">
        {/* Barra de escritorio: alberga el botón de ocultar el menú */}
        <div className="hidden md:flex items-center gap-3 h-12 px-8 border-b border-slate-200 bg-white">
          <label
            htmlFor="appshell-collapse"
            className="cursor-pointer p-1.5 -ml-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-granate transition"
            aria-label="Mostrar u ocultar el menú"
            title="Mostrar u ocultar el menú"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </label>
          <span className="text-sm font-medium text-slate-600 truncate">{moduleName}</span>
          <div className="ml-auto">
            <LogoutButton tono="claro" />
          </div>
        </div>

        <div className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 md:p-8 overflow-x-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
