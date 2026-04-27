import { type NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Runtime Node.js: middleware no toca @campaignos/db (la resolución de tenant
// vive en /api/resolve-tenant), pero NextAuth getToken() funciona en ambos.
// Mantenemos nodejs por consistencia con el resto del runtime de la app.
export const runtime = 'nodejs'

const RUTAS_PUBLICAS = [
  '/login',
  '/registro/',
  '/no-autorizado',
  '/api/auth',
  '/api/resolve-tenant',
]

const SUBDOMINIOS_RESERVADOS = new Set(['www', 'api', 'admin'])

function esRutaPublica(pathname: string): boolean {
  return RUTAS_PUBLICAS.some((r) => pathname.startsWith(r))
}

/**
 * Middleware multi-tenant con resolución por sesión (no por host).
 *
 * Modos soportados:
 *
 *   1) Single-host  (sin TENANT_BASE_DOMAIN o host === baseDomain):
 *      La app funciona con resolución por JWT. El subdominio no aporta nada.
 *      Login en /login, dashboard del tenant según session.user.tenantId.
 *
 *   2) Subdominio    (acme.<baseDomain>):
 *      Decoración visual. El subdominio se valida contra session.user.tenantSlug.
 *      Si coincide → reescribe internamente al baseDomain y deja pasar.
 *      Si NO coincide y el rol no es SUPERADMIN → redirige al baseDomain
 *      (el usuario va a SU tenant, no al subdominio que escribió).
 *
 *   3) Dominio custom de cliente:
 *      Cuando el host no termina en baseDomain ni es vercel.app, el endpoint
 *      /api/resolve-tenant decide si el dominio está registrado en algún
 *      Tenant.domain. La validación efectiva del tenant sigue siendo el JWT.
 *
 * NUNCA inyectamos x-tenant-id por header. La fuente de verdad es el JWT.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname     = request.nextUrl.hostname

  // Permitir siempre rutas públicas y assets internos
  if (esRutaPublica(pathname)) {
    return NextResponse.next()
  }

  // Normalizar el dominio base. Sin él operamos en single-host.
  // Ejemplo: TENANT_BASE_DOMAIN="campagnioss-cesar-lozanos-projects.vercel.app"
  // o "tu-dominio.co" en producción con dominio propio.
  const baseDomain = (process.env.TENANT_BASE_DOMAIN ?? '').replace(/^\./, '')

  const token = await getToken({ req: request })
  const tenantSlugSesion = (token?.tenantSlug as string | null | undefined) ?? null
  const role = token?.role as string | undefined
  const esSuperadmin = role === 'SUPERADMIN'

  // ── MODO 2 — subdominio sobre el baseDomain ───────────────────────────────
  if (baseDomain && hostname.endsWith(`.${baseDomain}`) && hostname !== baseDomain) {
    const subdominio = hostname.slice(0, -1 - baseDomain.length)

    // Subdominios reservados (www/api/admin) → reescribir al baseDomain.
    if (SUBDOMINIOS_RESERVADOS.has(subdominio)) {
      const url = request.nextUrl.clone()
      url.hostname = baseDomain
      return NextResponse.rewrite(url)
    }

    // Sin sesión → al login del baseDomain
    if (!token) {
      const url = request.nextUrl.clone()
      url.hostname = baseDomain
      url.pathname = '/login'
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }

    // SUPERADMIN puede entrar a cualquier subdominio (auditoría/visibilidad).
    // Para usuarios de tenant, el subdominio DEBE coincidir con su tenantSlug.
    if (!esSuperadmin && subdominio !== tenantSlugSesion) {
      const url = request.nextUrl.clone()
      url.hostname = baseDomain
      url.pathname = tenantSlugSesion ? '/' : '/login'
      return NextResponse.redirect(url)
    }

    // Subdominio coincide → reescribir al baseDomain (decorativo, mismo path).
    const rewritten = request.nextUrl.clone()
    rewritten.hostname = baseDomain
    return NextResponse.rewrite(rewritten)
  }

  // ── MODO 3 — dominio custom de cliente ────────────────────────────────────
  if (baseDomain &&
      hostname !== baseDomain &&
      !hostname.endsWith(`.${baseDomain}`) &&
      !hostname.endsWith('.vercel.app') &&
      hostname !== 'localhost') {
    try {
      const resolveUrl = new URL('/api/resolve-tenant', request.nextUrl.origin)
      resolveUrl.searchParams.set('domain', hostname)
      const res = await fetch(resolveUrl.toString())
      if (res.ok) {
        const rewritten = request.nextUrl.clone()
        rewritten.hostname = baseDomain
        return NextResponse.rewrite(rewritten)
      }
    } catch (err) {
      console.error('[middleware] error resolviendo dominio custom:', err)
    }
    return new NextResponse('Dominio no configurado', { status: 404 })
  }

  // ── MODO 1 — single-host: dejar pasar ─────────────────────────────────────
  // Sin sesión y ruta protegida → /login. Las rutas /superadmin/* y /(tenant)/*
  // las protegen sus propios layouts contra el JWT.
  if (!token) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|icons|robots\\.txt).*)',
  ],
}
