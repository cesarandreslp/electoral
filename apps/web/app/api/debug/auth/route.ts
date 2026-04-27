import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { superadminDb } from '@campaignos/db'

export const runtime = 'nodejs'

/**
 * Endpoint de diagnóstico TEMPORAL — borrar tras resolver el bug de login.
 * Protegido con shared secret en header X-Debug-Token (= ENCRYPTION_KEY).
 *
 * GET  /api/debug/auth     → reporta estado del entorno
 * POST /api/debug/auth     → ejecuta autenticarUsuario(email, password)
 */
async function checkSecret(req: NextRequest): Promise<boolean> {
  const sent     = req.headers.get('x-debug-token') ?? ''
  const expected = process.env.ENCRYPTION_KEY ?? ''
  return sent.length > 0 && sent === expected
}

export async function GET(req: NextRequest) {
  if (!(await checkSecret(req))) return new NextResponse('forbidden', { status: 403 })

  const env = {
    NODE_ENV:                   process.env.NODE_ENV,
    DATABASE_URL_SUPERADMIN:    process.env.DATABASE_URL_SUPERADMIN ? 'set' : 'MISSING',
    NEXTAUTH_SECRET:            process.env.NEXTAUTH_SECRET ? 'set' : 'MISSING',
    AUTH_SECRET:                process.env.AUTH_SECRET ? 'set' : 'MISSING',
    NEXTAUTH_URL:               process.env.NEXTAUTH_URL ?? 'MISSING',
    AUTH_TRUST_HOST:            process.env.AUTH_TRUST_HOST ?? 'MISSING',
    ENCRYPTION_KEY:             process.env.ENCRYPTION_KEY ? 'set' : 'MISSING',
    TENANT_BASE_DOMAIN:         process.env.TENANT_BASE_DOMAIN ?? 'MISSING',
  }

  let dbCheck: unknown
  try {
    const count = await superadminDb.user.count()
    dbCheck = { ok: true, userCount: count }
  } catch (err) {
    dbCheck = { ok: false, error: err instanceof Error ? err.message : String(err) }
  }

  return NextResponse.json({ env, dbCheck })
}

export async function POST(req: NextRequest) {
  if (!(await checkSecret(req))) return new NextResponse('forbidden', { status: 403 })

  let body: { email?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const email    = body.email
  const password = body.password
  if (!email || !password) return NextResponse.json({ error: 'missing email/password' }, { status: 400 })

  try {
    const usuario = await superadminDb.user.findUnique({ where: { email } })
    if (!usuario) return NextResponse.json({ step: 'findUnique', result: 'no user' })

    const passwordValida = await bcrypt.compare(password, usuario.passwordHash)
    return NextResponse.json({
      step:           'bcrypt',
      userFound:      true,
      userActive:     usuario.isActive,
      role:           usuario.role,
      tenantId:       usuario.tenantId,
      passwordValid:  passwordValida,
    })
  } catch (err) {
    return NextResponse.json({
      step:  'exception',
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack?.slice(0, 1500) : undefined,
    }, { status: 500 })
  }
}
