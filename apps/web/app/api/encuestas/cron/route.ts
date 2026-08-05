import { NextResponse } from 'next/server'
import { getTenantDb, superadminDb } from '@campaignos/db'
import { getTenantConnection } from '@/lib/tenant'
import { dailyLimitService } from '@/lib/encuestas/daily-limit'
import { conversationEngine } from '@/lib/encuestas/conversation-engine'
import { formatInTimeZone } from 'date-fns-tz'

const TIMEZONE = 'America/Bogota'
const BATCH_SIZE = 50

/**
 * Verifica si la hora actual en Bogotá está dentro del horario permitido:
 * 5:00 AM – 8:00 PM
 */
function isWithinAllowedHours(): boolean {
  const now = new Date()
  const timeStr = formatInTimeZone(now, TIMEZONE, 'HH:mm')
  const [hours, minutes] = timeStr.split(':').map(Number)
  const timeInMinutes = hours * 60 + minutes

  const start = 5 * 60 // 5:00 AM
  const end = 20 * 60  // 8:00 PM

  return timeInMinutes >= start && timeInMinutes <= end
}

/**
 * GET /api/encuestas/cron
 * Endpoint protegido para ejecutar el envío automático de mensajes de encuestas a
 * electores pendientes en todos los tenants activos.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  
  // En producción, Vercel envía el CRON_SECRET en el header de autorización.
  // cron-job.org puede enviar un token estático en el header o params.
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    request.url.indexOf(`token=${process.env.CRON_SECRET}`) === -1
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isWithinAllowedHours()) {
    console.log('[CRON ENCUESTAS] Fuera de horario permitido. Skiped.')
    return NextResponse.json({ status: 'skipped', reason: 'outside_allowed_hours' })
  }

  let totalProcessed = 0
  const resultsByTenant: Record<string, any> = {}

  try {
    const tenants = await superadminDb.tenant.findMany({ where: { isActive: true } })

    for (const tenant of tenants) {
      try {
        const connStr = await getTenantConnection(tenant.id)
        const tenantDb = getTenantDb(connStr)
        const config = await tenantDb.tenantConfig.findUnique({ where: { tenantId: tenant.id } })
        
        // Si no tiene token de WhatsApp configurado, saltamos este tenant
        if (!config || !config.whatsappToken || !config.whatsappPhoneId) {
          continue
        }

        const dailyLimit = config.surveyDailyLimit || 250
        const remaining = await dailyLimitService.getRemainingCapacity(tenantDb, dailyLimit)

        if (remaining <= 0) {
          resultsByTenant[tenant.id] = { status: 'skipped', reason: 'daily_limit_reached' }
          continue
        }

        const effectiveBatchSize = Math.min(BATCH_SIZE, remaining)

        // Buscar electores en estado PENDIENTE de este tenant, limitados al lote
        const pendingVoters = await tenantDb.voter.findMany({
          where: {
            tenantId: tenant.id,
            conversationState: 'PENDIENTE',
            phone: { not: null },
          },
          take: effectiveBatchSize,
          orderBy: { createdAt: 'asc' }
        })

        if (pendingVoters.length === 0) {
          resultsByTenant[tenant.id] = { status: 'success', count: 0 }
          continue
        }

        console.log(`[CRON ENCUESTAS] Tenant ${tenant.id}: Procesando ${pendingVoters.length} pendientes.`)
        
        let successCount = 0
        const credentials = { token: config.whatsappToken, phoneId: config.whatsappPhoneId }

        for (const voter of pendingVoters) {
          if (!voter.phone) continue
          
          try {
            await conversationEngine.startConversation(
              voter.id,
              voter.phone,
              tenant.id,
              tenantDb,
              credentials
            )
            successCount++
            totalProcessed++
            // Delay ligero para no saturar la API de Meta
            await new Promise(r => setTimeout(r, 500))
          } catch (err) {
            console.error(`[CRON ENCUESTAS] Error con voter ${voter.id}:`, err)
          }
        }

        resultsByTenant[tenant.id] = { status: 'success', count: successCount, dailyRemaining: remaining - successCount }

      } catch (e) {
        console.error(`[CRON ENCUESTAS] Error procesando tenant ${tenant.id}:`, e)
        resultsByTenant[tenant.id] = { status: 'error', message: (e as Error).message }
      }
    }

    return NextResponse.json({
      status: 'success',
      totalProcessed,
      resultsByTenant
    })

  } catch (error) {
    console.error('[CRON ENCUESTAS] Error global:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
