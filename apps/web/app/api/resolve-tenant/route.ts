import { NextRequest, NextResponse } from 'next/server'
import { getTenant } from '@/lib/tenant'

/**
 * GET /api/resolve-tenant?domain=<hostname>
 *
 * Devuelve 200 si el host está registrado como dominio custom de algún Tenant
 * activo (campo Tenant.domain). Devuelve 404 en caso contrario.
 *
 * NO devuelve la connectionString ni datos sensibles — solo un OK boolean.
 * El middleware lo usa para decidir si reescribir el host al baseDomain.
 *
 * Es público intencionalmente: el atacante a lo sumo descubre qué dominios
 * custom están registrados, lo cual no expone datos.
 */
export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get('domain')

  if (!domain) {
    return NextResponse.json({ error: 'falta parámetro domain' }, { status: 400 })
  }

  const tenant = await getTenant(domain)

  if (!tenant) {
    return NextResponse.json({ ok: false }, { status: 404 })
  }

  // Solo retornamos slug — útil para que el middleware o un client logger
  // lo aproveche. NO retornar id ni connectionString.
  return NextResponse.json(
    { ok: true, slug: tenant.slug },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  )
}
