import { type NextRequest, NextResponse } from 'next/server'

/**
 * Middleware de resolución de tenant.
 *
 * Responsabilidades:
 *   1. Leer el header Host para identificar qué tenant hace la petición
 *   2. Distinguir entre el panel del superadmin y los tenants
 *   3. Inyectar el slug del tenant en los headers para uso en Server Components
 *
 * Flujo completo (cuando getTenant() esté implementado):
 *   Host: campana-demo.campaignos.co  →  slug = "campana-demo"
 *   Host: admin.campaignos.co         →  panel superadmin
 *   Host: campana2026.com             →  dominio propio del cliente
 */
export async function middleware(request: NextRequest) {
  // ── Paso 1: Extraer el hostname de la petición ────────────────────────────
  const host = request.headers.get('host') ?? ''

  // ── Paso 2: Normalizar el host según el entorno ───────────────────────────
  // En desarrollo usamos subdominios de localhost (ej: campana-demo.localhost:3000)
  // En producción usamos subdominios del dominio base (ej: campana-demo.campaignos.co)
  // TODO: mover el dominio base a una variable de entorno (NEXT_PUBLIC_BASE_DOMAIN)
  const dominioBase =
    process.env.NODE_ENV === 'development' ? '.localhost:3000' : '.campaignos.co'

  const slug = host.replace(dominioBase, '')

  // ── Paso 3: Detectar si es el panel del superadmin ────────────────────────
  if (slug === 'admin') {
    // Reescribir la URL internamente al grupo de rutas (superadmin)
    const url = request.nextUrl.clone()
    url.pathname = `/superadmin${request.nextUrl.pathname}`
    return NextResponse.rewrite(url)
  }

  // ── Paso 4: Resolver el tenant en la DB del superadmin ────────────────────
  // TODO: descomentar cuando getTenant() esté implementado en lib/tenant.ts
  //
  // const tenant = await getTenant(slug)
  // if (!tenant) {
  //   return NextResponse.redirect(new URL('/404', request.url))
  // }
  //
  // Por ahora solo inyectamos el slug — getTenant() se implementa en la Tarea 02

  // ── Paso 5: Inyectar el slug del tenant en los headers ────────────────────
  // Los Server Components leerán este header con headers() de next/headers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-slug', slug)

  // TODO: cuando getTenant() esté activo, también inyectar:
  // requestHeaders.set('x-tenant-id', tenant.id)
  // requestHeaders.set('x-tenant-modules', tenant.activeModules.join(','))

  // ── Paso 6: Continuar la petición con los headers enriquecidos ────────────
  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  // Excluir rutas estáticas, archivos del PWA y API interna de Next.js
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|icons|robots\\.txt).*)',
  ],
}
