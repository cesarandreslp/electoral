#!/usr/bin/env tsx
/**
 * Script para crear el primer usuario SUPERADMIN en la base de datos del superadmin.
 * Los credentials NUNCA se guardan en código fuente ni en archivos de semilla.
 *
 * Uso:
 *   pnpm db:create-superadmin          ← desde la raíz del monorepo
 *   pnpm run db:create-superadmin      ← desde packages/db
 *
 * Requisitos:
 *   - DATABASE_URL_SUPERADMIN definida en .env
 *   - ENCRYPTION_KEY no es necesaria para este script
 */

import { createInterface } from 'readline'
import { neonConfig, Pool } from '@neondatabase/serverless'
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import bcrypt from 'bcryptjs'
import ws from 'ws'

// Debe coincidir con SUPERADMIN_TENANT_ID en packages/auth/src/config.ts
const SUPERADMIN_TENANT_ID = '__superadmin__'

// Configurar WebSocket para Node.js (fuera del edge runtime)
neonConfig.webSocketConstructor = ws

// ── Helpers de lectura por consola ────────────────────────────────────────────

/** Lee una línea de texto desde stdin con un prompt visible */
function readLine(prompt: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(prompt, (respuesta) => {
      rl.close()
      resolve(respuesta.trim())
    })
  })
}

/**
 * Lee una contraseña desde stdin sin mostrar los caracteres.
 * Muestra '*' por cada carácter escrito. Soporta backspace.
 */
function readPassword(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(prompt)

    const stdin = process.stdin

    // Activar modo raw para capturar tecla a tecla
    if (stdin.isTTY) stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')

    let password = ''

    function handler(caracter: string) {
      caracter = String(caracter)

      switch (caracter) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl+D — EOF
          if (stdin.isTTY) stdin.setRawMode(false)
          stdin.pause()
          stdin.removeListener('data', handler)
          process.stdout.write('\n')
          resolve(password)
          break

        case '\u0003': // Ctrl+C — cancelar
          process.stdout.write('\n')
          console.log('Cancelado.')
          process.exit(0)
          break

        case '\u007f': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1)
            // Borrar el último '*' en pantalla
            process.stdout.write('\b \b')
          }
          break

        default:
          // Solo agregar caracteres imprimibles
          if (caracter >= ' ') {
            password += caracter
            process.stdout.write('*')
          }
          break
      }
    }

    stdin.on('data', handler)
  })
}

// ── Validaciones ──────────────────────────────────────────────────────────────

function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validarPassword(password: string): boolean {
  return password.length >= 12
}

// ── Lógica principal ──────────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════')
  console.log('  Crear usuario SUPERADMIN — CampaignOS')
  console.log('══════════════════════════════════════\n')

  // ── Solicitar email ───────────────────────────────────────────────────────
  const email = await readLine('Email: ')

  if (!validarEmail(email)) {
    console.error('\nError: El email no tiene formato válido.')
    process.exit(1)
  }

  // ── Solicitar password (oculto) ───────────────────────────────────────────
  const password = await readPassword('Contraseña (mínimo 12 caracteres): ')

  if (!validarPassword(password)) {
    console.error('\nError: La contraseña debe tener al menos 12 caracteres.')
    process.exit(1)
  }

  // ── Confirmar password ────────────────────────────────────────────────────
  const confirmacion = await readPassword('Confirmar contraseña: ')

  if (password !== confirmacion) {
    console.error('\nError: Las contraseñas no coinciden.')
    process.exit(1)
  }

  // ── Conectar a la DB del superadmin ───────────────────────────────────────
  const connectionString = process.env.DATABASE_URL_SUPERADMIN
  if (!connectionString) {
    console.error('\nError: DATABASE_URL_SUPERADMIN no está definida en .env')
    process.exit(1)
  }

  const pool    = new Pool({ connectionString })
  const adapter = new PrismaNeon(pool)
  const db      = new PrismaClient({ adapter })

  try {
    // ── Verificar que el email no exista ──────────────────────────────────
    const existente = await db.user.findUnique({
      where: {
        tenantId_email: { tenantId: SUPERADMIN_TENANT_ID, email },
      },
    })

    if (existente) {
      console.error(`\nError: Ya existe un SUPERADMIN con el email "${email}".`)
      console.error('Para cambiar la contraseña usa el panel de administración.')
      process.exit(1)
    }

    // ── Crear el usuario ──────────────────────────────────────────────────
    process.stdout.write('\nCreando usuario...')

    // 12 rounds de bcrypt — balance entre seguridad y velocidad
    const passwordHash = await bcrypt.hash(password, 12)

    const usuario = await db.user.create({
      data: {
        tenantId:     SUPERADMIN_TENANT_ID,
        email,
        passwordHash,
        role:         'SUPERADMIN',
        isActive:     true,
      },
    })

    console.log(' ✓')
    console.log(`\n✓ Superadmin creado exitosamente: ${usuario.email}`)
    console.log('\nAhora puedes iniciar sesión en admin.campaignos.co/login\n')

  } finally {
    await db.$disconnect()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('\nError inesperado:', err instanceof Error ? err.message : err)
  process.exit(1)
})
