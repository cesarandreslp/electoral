import { type NextRequest, NextResponse } from 'next/server'
import { getTenant } from '@/lib/tenant'

/**
 * Middleware de resolución de tenant.
 *
 * Flujo completo:
 *   1. Extraer el hostname del header Host
 *   2. Normalizar según entorno (dev vs producción)
 *   3. Detectar panel superadmin → reescribir a /superadmin/...
 *   4. Buscar tenant en DB (con caché TTL 5 min) → 404 si no existe
 *   5. Inyectar contexto del tenant en headers para Server Components
 */
export async function middleware(request: NextRequest) {
  // ── Paso 1: Extraer hostname ──────────────────────────────────────────────
  const host = request.headers.get('host') ?? ''

  // ── Paso 2: Normalizar el host según entorno ──────────────────────────────
  // TODO: mover NEXT_PUBLIC_BASE_DOMAIN a variable de entorno
  const dominioBase = process.env.NODE_ENV === 'development'
    ? '.localhost:3000'
    : '.campaignos.co'

  const slug = host.replace(dominioBase, '')

  // ── Paso 3: Detectar panel del superadmin ─────────────────────────────────
  if (slug === 'admin') {
    // Reescribir a /superadmin/... para que Next.js sirva app/superadmin/
    const url      = request.nextUrl.clone()
    url.pathname   = `/superadmin${request.nextUrl.pathname === '/' ? '' : request.nextUrl.pathname}`
    return NextResponse.rewrite(url)
  }

  // ── Paso 4: Resolver el tenant en la DB del superadmin ────────────────────
  // getTenant() usa caché en memoria con TTL de 5 minutos
  // La connectionString retornada ya está descifrada
  const tenant = await getTenant(slug)

  if (!tenant) {
    // Tenant no encontrado o inactivo — retornar 404
    return new NextResponse('Campaña no encontrada', { status: 404 })
  }

  // ── Paso 5: Inyectar contexto del tenant en headers ───────────────────────
  // Los Server Components leen estos headers con headers() de next/headers.
  // IMPORTANTE: la connectionString NO se inyecta en headers (seguridad).
  //             Solo se usa internamente en getTenantDb() desde Server Actions.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-id',      tenant.id)
  requestHeaders.set('x-tenant-slug',    tenant.slug)
  requestHeaders.set('x-tenant-name',    tenant.name)
  requestHeaders.set('x-tenant-modules', tenant.activeModules.join(','))

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  // Excluir rutas estáticas, archivos del PWA y rutas internas de Next.js
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|icons|robots\\.txt).*)',
  ],
}
