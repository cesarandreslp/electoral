#!/usr/bin/env tsx
import { config } from 'dotenv'
config({ path: '../../.env' })

/**
 * Crea 5 usuarios de PRUEBA (uno por rol) en la DB del superadmin.
 *
 * SOLO DESARROLLO. El script aborta si NODE_ENV === 'production'.
 *
 * Las contraseñas se generan al vuelo y se imprimen UNA SOLA VEZ por consola.
 * No se almacenan en código ni en archivos de semilla — copialas al ejecutar.
 *
 * Uso:
 *   pnpm db:create-test-users
 *
 * Requisitos:
 *   - DATABASE_URL_SUPERADMIN definida en .env
 *   - Tenant 'demo-campana' creado previamente (ver `pnpm db:seed`)
 */

import { randomBytes } from 'crypto'
import { neonConfig } from '@neondatabase/serverless'
import { PrismaClient, type UserRole } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import bcrypt from 'bcryptjs'
import ws from 'ws'

const SUPERADMIN_TENANT_ID = '__superadmin__'
const DEMO_TENANT_SLUG     = 'demo-campana'

neonConfig.webSocketConstructor = ws

interface PlantillaUsuario {
  email: string
  name:  string
  role:  UserRole
}

const PLANTILLAS_GLOBALES: PlantillaUsuario[] = [
  { email: 'superadmin@test.local', name: 'Super Administrador (test)', role: 'SUPERADMIN' },
]

const PLANTILLAS_TENANT: PlantillaUsuario[] = [
  { email: 'admin@test.local',       name: 'Admin Campaña (test)', role: 'ADMIN_CAMPANA' },
  { email: 'coordinador@test.local', name: 'Coordinador (test)',   role: 'COORDINADOR'   },
  { email: 'lider@test.local',       name: 'Líder (test)',         role: 'LIDER'         },
  { email: 'testigo@test.local',     name: 'Testigo (test)',       role: 'TESTIGO'       },
]

function generarPassword(): string {
  // 16 bytes base64url → ~22 chars, suficiente entropía sin caracteres ambiguos
  return randomBytes(16).toString('base64url')
}

async function upsertUsuario(
  db: PrismaClient,
  plantilla: PlantillaUsuario,
  tenantId: string,
): Promise<{ email: string; password: string; existente: boolean }> {
  const existente = await db.user.findUnique({ where: { email: plantilla.email } })

  if (existente) {
    return { email: plantilla.email, password: '(ya existía — sin cambios)', existente: true }
  }

  const password     = generarPassword()
  const passwordHash = await bcrypt.hash(password, 12)

  await db.user.create({
    data: {
      tenantId,
      name:         plantilla.name,
      email:        plantilla.email,
      passwordHash,
      role:         plantilla.role,
      isActive:     true,
    },
  })

  return { email: plantilla.email, password, existente: false }
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Este script no puede ejecutarse con NODE_ENV=production.')
    process.exit(1)
  }

  const connectionString = process.env.DATABASE_URL_SUPERADMIN
  if (!connectionString) {
    console.error('DATABASE_URL_SUPERADMIN no está definida en .env')
    process.exit(1)
  }

  console.log('\n══════════════════════════════════════════════════')
  console.log('  Crear usuarios de PRUEBA — CampaignOS')
  console.log('══════════════════════════════════════════════════\n')

  const adapter = new PrismaNeon({ connectionString })
  const db      = new PrismaClient({ adapter })

  try {
    const tenantDemo = await db.tenant.findUnique({ where: { slug: DEMO_TENANT_SLUG } })
    if (!tenantDemo) {
      console.error(`Tenant '${DEMO_TENANT_SLUG}' no existe. Corre primero: pnpm db:seed`)
      process.exit(1)
    }

    const resultados: { rol: string; email: string; password: string }[] = []

    for (const plantilla of PLANTILLAS_GLOBALES) {
      const r = await upsertUsuario(db, plantilla, SUPERADMIN_TENANT_ID)
      resultados.push({ rol: plantilla.role, email: r.email, password: r.password })
    }

    for (const plantilla of PLANTILLAS_TENANT) {
      const r = await upsertUsuario(db, plantilla, tenantDemo.id)
      resultados.push({ rol: plantilla.role, email: r.email, password: r.password })
    }

    console.log('Credenciales generadas (cópialas ahora — no se vuelven a mostrar):\n')
    console.log('Rol             | Email                       | Contraseña')
    console.log('----------------|-----------------------------|-------------------------')
    for (const r of resultados) {
      const rol      = r.rol.padEnd(15)
      const email    = r.email.padEnd(27)
      console.log(`${rol} | ${email} | ${r.password}`)
    }

    console.log(`\nTenant para roles no-SUPERADMIN: ${tenantDemo.name} (${tenantDemo.slug})`)
    console.log('SUPERADMIN entra por:           admin.[dominio]/login')
    console.log(`Otros roles entran por:         ${tenantDemo.slug}.[dominio]/login\n`)
  } finally {
    await db.$disconnect()
  }
}

main().catch((err) => {
  console.error('\nError inesperado:', err instanceof Error ? err.message : err)
  process.exit(1)
})
