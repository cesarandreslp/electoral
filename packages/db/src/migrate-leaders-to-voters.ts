#!/usr/bin/env tsx
import { config } from 'dotenv'
config({ path: '../../.env' })

/**
 * Migra cada `Leader` existente a una fila `Voter` (fusión Leader→Voter:
 * "líder" pasa a ser un rol implícito de Voter, no una tabla propia).
 *
 * SOLO DESARROLLO — corre ANTES de tocar el schema (con `Leader` todavía
 * existiendo), para que el Voter nuevo nazca con el MISMO id que el Leader
 * viejo. Así todas las referencias sueltas que ya apuntan a ese id
 * (QrRegistration.leaderId, VoterDuplicateAlert.*LeaderId,
 * LeaderAnalysis.leaderId, y Voter.leaderId de otros electores) siguen
 * siendo válidas sin tocarlas.
 *
 * Los líderes de HOY no tienen campo cédula (Leader nunca lo pidió), pero
 * Voter la requiere (NOT NULL, cifrada, deduplicada por hash). Como estamos
 * en pruebas, este script les genera una cédula numérica plausible
 * (formato colombiano, 10 dígitos) — NO usar contra datos reales.
 *
 * Uso:
 *   pnpm db:migrate-leaders-to-voters
 */

import { createHash, randomInt } from 'crypto'
import { neonConfig } from '@neondatabase/serverless'
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'
import { encrypt, decrypt } from './crypto'

neonConfig.webSocketConstructor = ws

function calcularCedulaHash(cedula: string): string {
  return createHash('sha256').update(cedula.trim()).digest('hex')
}

/** Cédula colombiana de prueba: 10 dígitos, prefijo "100" (rango moderno). */
function generarCedulaPrueba(): string {
  return '100' + String(randomInt(0, 10_000_000)).padStart(7, '0')
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Este script no puede ejecutarse con NODE_ENV=production.')
    process.exit(1)
  }

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('DATABASE_URL no está definida en .env')
    process.exit(1)
  }

  const adapter = new PrismaNeon({ connectionString })
  const db      = new PrismaClient({ adapter })

  const leaders = await db.leader.findMany()
  console.log(`Migrando ${leaders.length} Leader(s) a Voter...`)

  const cedulasUsadas = new Set<string>()
  let migrados = 0

  for (const leader of leaders) {
    // Cédula única (dentro de este lote y contra electores ya existentes)
    let cedula: string
    let cedulaHash: string
    do {
      cedula     = generarCedulaPrueba()
      cedulaHash = calcularCedulaHash(cedula)
    } while (
      cedulasUsadas.has(cedulaHash) ||
      (await db.voter.findFirst({ where: { tenantId: leader.tenantId, cedulaHash } }))
    )
    cedulasUsadas.add(cedulaHash)

    await db.voter.create({
      data: {
        id:           leader.id, // clave del truco: mismo id que el Leader viejo
        tenantId:     leader.tenantId,
        cedula:       encrypt(cedula),
        cedulaHash,
        name:         leader.name,
        phone:        leader.phone, // ciphertext copiado tal cual (mismo encrypt())
        zone:         leader.zone,
        targetVotes:  leader.targetVotes,
        status:       leader.status,
        leaderId:     leader.parentLeaderId,
      },
    })
    migrados++
    console.log(`  ✓ ${leader.name} → Voter(id=${leader.id}, cedula=${cedula})`)
  }

  const totalLeaders = await db.leader.count()
  const nuevos = await db.voter.findMany({ where: { id: { in: leaders.map((l) => l.id) } } })

  if (migrados !== totalLeaders || nuevos.length !== totalLeaders) {
    console.error(`✗ Verificación falló: ${totalLeaders} Leader(s), ${migrados} migrados, ${nuevos.length} Voter(s) encontrados.`)
    process.exit(1)
  }

  // Confirmar que el ciphertext de phone copiado sigue siendo descifrable
  for (const v of nuevos) {
    if (v.phone) decrypt(v.phone)
  }

  console.log(`✓ ${migrados} Leader(s) migrados a Voter correctamente. Verificá en Prisma Studio antes de seguir.`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
