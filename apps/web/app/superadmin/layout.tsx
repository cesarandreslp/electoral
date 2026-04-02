/**
 * Layout raíz del área superadmin.
 * Wrapper mínimo — sin auth check.
 * La protección de rutas la maneja el middleware (middleware.ts) y el
 * layout de (dashboard) para las rutas que requieren sesión activa.
 *
 * La página de login (app/superadmin/login/) está fuera del grupo
 * (dashboard) y por eso solo recibe este wrapper, sin sidebar.
 */

// Next.js requiere default export en layout.tsx — excepción a la regla de named exports
export default function SuperadminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
