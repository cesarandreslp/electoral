#!/usr/bin/env tsx
import { config } from 'dotenv'
config({ path: '../../.env' })

/**
 * Crea un usuario de CUALQUIER rol en la base del superadmin.
 * Generaliza create-superadmin.ts para las pruebas por rol (Capa 0 del plan).
 * La contraseña NUNCA se pasa por argumento ni se guarda en código: se pide por
 * consola con eco oculto y la digita el usuario.
 *
 * Uso (desde packages/db, con stdin interactivo real):
 *   node_modules\.bin\tsx.CMD src\create-user.ts
 *
 * Para roles de tenant se pide el SLUG del tenant (ej: demo-campana) y se resuelve
 * a su id; el login valida que ese tenant exista y esté activo.
 */

import { neonConfig } from '@neondatabase/serverless'
import { PrismaClient, UserRole } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import bcrypt from 'bcryptjs'
import ws from 'ws'
import { readLine, readPassword } from './prompt'

// Debe coincidir con SUPERADMIN_TENANT_ID en packages/auth/src/config.ts
const SUPERADMIN_TENANT_ID = '__superadmin__'

neonConfig.webSocketConstructor = ws

const ROLES = ['SUPERADMIN', 'ADMIN_CAMPANA', 'COORDINADOR', 'LIDER', 'TESTIGO'] as const

function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function main() {
  console.log('\n══════════════════════════════════════')
  console.log('  Crear usuario — Vectra')
  console.log('══════════════════════════════════════\n')

  const email = await readLine('Email: ')
  if (!validarEmail(email)) {
    console.error('\nError: El email no tiene formato válido.')
    process.exit(1)
  }

  const name = (await readLine('Nombre (opcional, Enter para omitir): ')) || null

  const role = (await readLine(`Rol [${ROLES.join(' | ')}]: `)).toUpperCase()
  if (!ROLES.includes(role as (typeof ROLES)[number])) {
    console.error(`\nError: Rol inválido. Debe ser uno de: ${ROLES.join(', ')}`)
    process.exit(1)
  }

  const connectionString = process.env.DATABASE_URL_SUPERADMIN
  if (!connectionString) {
    console.error('\nError: DATABASE_URL_SUPERADMIN no está definida en .env')
    process.exit(1)
  }

  const adapter = new PrismaNeon({ connectionString })
  const db      = new PrismaClient({ adapter })

  try {
    // ── Resolver el tenant ────────────────────────────────────────────────
    let tenantId = SUPERADMIN_TENANT_ID
    if (role !== 'SUPERADMIN') {
      const slug = await readLine('Slug del tenant (ej: demo-campana): ')
      const tenant = await db.tenant.findUnique({ where: { slug } })
      if (!tenant) {
        console.error(`\nError: No existe un tenant con slug "${slug}".`)
        process.exit(1)
      }
      if (!tenant.isActive) {
        console.error(`\nError: El tenant "${slug}" está inactivo; el login lo rechazaría.`)
        process.exit(1)
      }
      tenantId = tenant.id
      console.log(`  → Tenant: ${tenant.name} (${tenant.id})`)
    }

    // ── Vincular a un Voter (para LIDER/TESTIGO) ──────────────────────────
    // Acota qué ve en el panel a su propio sub-árbol de electores (en vez de
    // toda la campaña). El id se copia de la URL de la ficha del líder en el
    // admin (/core/lideres/{id}) — no se valida aquí contra la DB del tenant.
    let voterId: string | null = null
    if (role === 'LIDER' || role === 'TESTIGO') {
      const respuesta = await readLine('Voter id a vincular (opcional, Enter para omitir): ')
      voterId = respuesta.trim() || null
    }

    // ── Contraseña (oculta) ───────────────────────────────────────────────
    const password = await readPassword('Contraseña (mínimo 12 caracteres): ')
    if (password.length < 12) {
      console.error('\nError: La contraseña debe tener al menos 12 caracteres.')
      process.exit(1)
    }
    const confirmacion = await readPassword('Confirmar contraseña: ')
    if (password !== confirmacion) {
      console.error('\nError: Las contraseñas no coinciden.')
      process.exit(1)
    }

    // ── Email único global ────────────────────────────────────────────────
    const existente = await db.user.findUnique({ where: { email } })
    if (existente) {
      console.error(`\nError: Ya existe un usuario con el email "${email}".`)
      process.exit(1)
    }

    process.stdout.write('\nCreando usuario...')
    const passwordHash = await bcrypt.hash(password, 12)
    const usuario = await db.user.create({
      data: {
        tenantId,
        name,
        email,
        passwordHash,
        role: role as UserRole,
        isActive: true,
        voterId,
      },
    })
    console.log(' ✓')
    console.log(`\n✓ Usuario creado: ${usuario.email} — rol ${usuario.role} — tenant ${usuario.tenantId}\n`)
  } finally {
    await db.$disconnect()
  }
}

main().catch((err) => {
  console.error('\nError inesperado:', err instanceof Error ? err.message : err)
  process.exit(1)
})
