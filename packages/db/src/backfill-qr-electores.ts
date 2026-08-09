#!/usr/bin/env tsx
import { config } from 'dotenv'
config({ path: '../../.env' })

/**
 * Backfill: crea el QR de captación propio (QrRegistration.leaderId = su
 * propio id) para electores que se crearon ANTES de que esto se generara
 * automáticamente en cada alta (ver apps/web/lib/qr.ts). Idempotente —
 * salta a quien ya tenga uno activo.
 *
 * SOLO DESARROLLO. Uso: pnpm db:backfill-qr-electores
 */

import { randomUUID } from 'crypto'
import { neonConfig } from '@neondatabase/serverless'
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

async function main() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
  const db = new PrismaClient({ adapter })

  const todos = await db.voter.findMany({ select: { id: true, tenantId: true, name: true } })
  const conQr = await db.qrRegistration.findMany({
    where: { isActive: true, leaderId: { in: todos.map((v) => v.id) } },
    select: { leaderId: true },
  })
  const yaTienen = new Set(conQr.map((q) => q.leaderId))

  const sinQr = todos.filter((v) => !yaTienen.has(v.id))
  console.log(`${sinQr.length}/${todos.length} electores sin QR propio.`)

  for (const v of sinQr) {
    await db.qrRegistration.create({
      data: { tenantId: v.tenantId, leaderId: v.id, token: randomUUID() },
    })
  }

  console.log(`✓ ${sinQr.length} QR creados.`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
