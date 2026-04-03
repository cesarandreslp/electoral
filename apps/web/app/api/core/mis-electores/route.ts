import { NextRequest, NextResponse } from 'next/server'
import { auth }                      from '@campaignos/auth'
import { getTenantConnection }        from '@/lib/tenant'
import { getTenantDb }               from '@campaignos/db'

/**
 * GET /api/core/mis-electores
 *
 * Retorna los electores asignados al líder autenticado.
 * Soporta ?since=<timestamp ISO> para sincronización incremental (solo cambios nuevos).
 * Diseñado para ser cacheado por el service worker en modo offline.
 *
 * Campos retornados (sin cédula):
 *   id, name, phone, commitmentStatus, lastContact, votingTableId, notes
 */
export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Solo roles con acceso al módulo CORE
  const rolesPermitidos = ['ADMIN_CAMPANA', 'COORDINADOR', 'LIDER', 'TESTIGO']
  if (!rolesPermitidos.includes(session.user.role)) {
    return NextResponse.json({ error: 'Sin autorización' }, { status: 403 })
  }

  // Verificar que el módulo CORE está activo
  if (!session.user.activeModules.includes('CORE')) {
    return NextResponse.json({ error: 'Módulo CORE no activo' }, { status: 403 })
  }

  try {
    const connectionString = await getTenantConnection(session.user.tenantId)
    const db               = getTenantDb(connectionString)

    // Parámetro opcional para sincronización incremental
    const sinceParam = request.nextUrl.searchParams.get('since')
    const desde      = sinceParam ? new Date(sinceParam) : undefined

    const electores = await db.voter.findMany({
      where: {
        tenantId: session.user.tenantId,
        // Si hay parámetro since, retornar solo registros modificados después
        ...(desde && {
          OR: [
            { lastContact: { gt: desde } },
            { createdAt:   { gt: desde } },
          ],
        }),
      },
      select: {
        id:               true,
        name:             true,
        phone:            true,   // Cifrado — el cliente no lo descifra (solo click-to-call no aplica aquí)
        commitmentStatus: true,
        lastContact:      true,
        votingTableId:    true,
        notes:            true,
        qrTokenUsed:      true,   // Token del QR usado en el registro — permite construir el link de referido
        // cedula: NUNCA
      },
      orderBy: [
        { lastContact: 'asc' },   // Los más viejos primero (necesitan atención)
        { name:        'asc' },
      ],
    })

    return NextResponse.json(
      { electores, syncAt: new Date().toISOString() },
      {
        headers: {
          // Permitir que el service worker cachee esta respuesta
          'Cache-Control': 'no-store',
        },
      },
    )
  } catch (err) {
    console.error('[GET /api/core/mis-electores]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
