import { type NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getTenant } from '@/lib/tenant'

// Runtime Node.js requerido: este middleware importa @campaignos/db → ws (módulo Node.js)
// incompatible con el Edge Runtime de Vercel.
export const runtime = 'nodejs'

// ── Rutas públicas por tipo de host ──────────────────────────────────────────
// Las rutas públicas NO requieren sesión activa.

const RUTAS_PUBLICAS_SUPERADMIN = ['/superadmin/login']
const RUTAS_PUBLICAS_TENANT     = ['/login', '/registro/']

// Rutas que siempre se permiten sin importar el host (API de auth, archivos, etc.)
const RUTAS_SIEMPRE_PERMITIDAS  = ['/api/auth']

/**
 * Middleware de resolución de tenant + verificación de sesión.
 *
 * Casos:
 *   A) Host = admin.* → panel superadmin
 *      - Inyectar x-is-superadmin: 'true'
 *      - Reescribir a /superadmin/...
 *      - Verificar sesión con rol SUPERADMIN (excepto /superadmin/login)
 *
 *   B) Host = [slug].* → portal de tenant
 *      - Resolver tenant en DB superadmin
 *      - 404 si no existe o está inactivo
 *      - Inyectar x-tenant-id, x-tenant-slug, x-tenant-name, x-tenant-modules
 *      - Verificar sesión activa (excepto /login)
 *
 *   C) Host desconocido → 404
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host         = request.headers.get('host') ?? ''

  // Siempre permitir rutas de la API de auth y similares
  if (RUTAS_SIEMPRE_PERMITIDAS.some((r) => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  // ── Normalizar el host según entorno ──────────────────────────────────────
  // Producción: TENANT_BASE_DOMAIN debe definirse en el entorno (ej: ".tu-dominio.co").
  // Desarrollo: por defecto .localhost:3000 — sobrescribible con TENANT_BASE_DOMAIN.
  const dominioBase = process.env.TENANT_BASE_DOMAIN
    ?? (process.env.NODE_ENV === 'development' ? '.localhost:3000' : '')

  if (!dominioBase) {
    // Sin dominio base configurado en producción no hay forma de resolver tenants.
    // Mejor responder 500 explícito que mapear hosts a slugs erróneos.
    console.error('[middleware] TENANT_BASE_DOMAIN no está definido en producción')
    return new NextResponse('Configuración de tenant inválida', { status: 500 })
  }

  const slug = host.replace(dominioBase, '')

  // ── CASO A: Panel del superadmin ──────────────────────────────────────────
  if (slug === 'admin') {
    const urlReescrita    = request.nextUrl.clone()
    urlReescrita.pathname = `/superadmin${pathname === '/' ? '' : pathname}`

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-is-superadmin', 'true')

    // Ruta pública de superadmin → pasar sin verificar sesión
    if (RUTAS_PUBLICAS_SUPERADMIN.some((r) => pathname.startsWith(r))) {
      return NextResponse.rewrite(urlReescrita, { request: { headers: requestHeaders } })
    }

    // Verificar sesión con rol SUPERADMIN
    const token = await getToken({ req: request })

    if (!token || token.role !== 'SUPERADMIN') {
      const loginUrl      = request.nextUrl.clone()
      loginUrl.pathname   = '/superadmin/login'
      loginUrl.searchParams.set('callbackUrl', pathname)
      // Redirigir SIN reescribir (el redirect siempre apunta al mismo host)
      return NextResponse.redirect(loginUrl)
    }

    return NextResponse.rewrite(urlReescrita, { request: { headers: requestHeaders } })
  }

  // ── CASO B: Portal de tenant ──────────────────────────────────────────────
  if (slug && slug !== host) {
    // Ruta pública del tenant → resolver tenant igual pero omitir verificación de sesión
    const esPublica = RUTAS_PUBLICAS_TENANT.some((r) => pathname.startsWith(r))

    const tenant = await getTenant(slug)

    if (!tenant) {
      return new NextResponse('Campaña no encontrada', { status: 404 })
    }

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-tenant-id',      tenant.id)
    requestHeaders.set('x-tenant-slug',    tenant.slug)
    requestHeaders.set('x-tenant-name',    tenant.name)
    requestHeaders.set('x-tenant-modules', tenant.activeModules.join(','))

    if (esPublica) {
      return NextResponse.next({ request: { headers: requestHeaders } })
    }

    // Verificar sesión activa del tenant
    const token = await getToken({ req: request })

    if (!token || token.tenantId !== tenant.id) {
      const loginUrl    = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // ── CASO C: Host desconocido ──────────────────────────────────────────────
  return new NextResponse('No encontrado', { status: 404 })
}

export const config = {
  // Excluir rutas estáticas, archivos del PWA y rutas internas de Next.js
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|icons|robots\\.txt).*)',
  ],
}
