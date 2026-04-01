/**
 * Seed de la base de datos del superadmin.
 * Crea datos mínimos para desarrollo y pruebas locales.
 *
 * Ejecutar con: pnpm db:seed (desde packages/db)
 */

import { neonConfig, Pool } from '@neondatabase/serverless'
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'

// Configurar WebSocket para uso en Node.js (fuera del edge runtime)
neonConfig.webSocketConstructor = ws

async function main() {
  const connectionString = process.env.DATABASE_URL_SUPERADMIN
  if (!connectionString) {
    throw new Error('DATABASE_URL_SUPERADMIN no está definida en las variables de entorno')
  }

  const pool = new Pool({ connectionString })
  const adapter = new PrismaNeon(pool)
  const db = new PrismaClient({ adapter })

  console.log('Iniciando seed de la base de datos del superadmin...')

  // ── Tenant de prueba ──────────────────────────────────────────────────────
  // NOTA: en producción, connectionString debe estar cifrada con AES-256.
  // Para el seed usamos la misma DB del superadmin como placeholder.
  // Ver lib/crypto.ts para la implementación del cifrado.
  const tenant = await db.tenant.upsert({
    where: { slug: 'demo-campana' },
    update: {},
    create: {
      slug: 'demo-campana',
      name: 'Campaña Demo 2026',
      connectionString: process.env.DATABASE_URL_SUPERADMIN ?? '',
      isActive: true,
    },
  })

  console.log(`✓ Tenant: ${tenant.name} (slug: ${tenant.slug})`)

  // ── Módulos activos del tenant de prueba ──────────────────────────────────
  // Solo CORE está activo por defecto. Los demás requieren suscripción.
  const modulosCore = ['CORE']
  for (const moduleKey of modulosCore) {
    await db.tenantModule.upsert({
      where: {
        tenantId_moduleKey: { tenantId: tenant.id, moduleKey },
      },
      update: {},
      create: { tenantId: tenant.id, moduleKey, isActive: true },
    })
  }

  console.log(`✓ Módulos activos: ${modulosCore.join(', ')}`)

  // ── Estructura territorial de prueba ──────────────────────────────────────
  // Antioquia → Medellín → Comuna 10 (La Candelaria) → Barrio El Centro

  const departamento = await db.department.upsert({
    where: { code: '05' },
    update: {},
    create: { code: '05', name: 'Antioquia' },
  })

  const municipio = await db.municipality.upsert({
    where: { divipola: '05001' },
    update: {},
    create: {
      divipola: '05001',
      name: 'Medellín',
      departmentId: departamento.id,
    },
  })

  const comuna = await db.commune.upsert({
    where: { id: 'seed-comuna-10' },
    update: {},
    create: {
      id: 'seed-comuna-10',
      name: 'Comuna 10 — La Candelaria',
      type: 'COMUNA',
      municipalityId: municipio.id,
    },
  })

  await db.neighborhood.upsert({
    where: { id: 'seed-barrio-centro' },
    update: {},
    create: {
      id: 'seed-barrio-centro',
      name: 'El Centro',
      communeId: comuna.id,
    },
  })

  console.log(`✓ Territorio: ${departamento.name} → ${municipio.name} → ${comuna.name}`)

  // ── Puesto de votación y mesa de prueba ───────────────────────────────────
  const puesto = await db.votingStation.upsert({
    where: { id: 'seed-puesto-01' },
    update: {},
    create: {
      id: 'seed-puesto-01',
      name: 'Institución Educativa La Candelaria',
      address: 'Calle 52 # 50-20, Medellín',
      municipalityId: municipio.id,
      lat: 6.2442,
      lng: -75.5812,
    },
  })

  await db.votingTable.upsert({
    where: { stationId_number: { stationId: puesto.id, number: 1 } },
    update: {},
    create: { number: 1, stationId: puesto.id, voterCapacity: 350 },
  })

  console.log(`✓ Puesto de votación: ${puesto.name} (1 mesa)`)
  console.log('\nSeed completado correctamente.')

  await db.$disconnect()
  await pool.end()
}

main().catch((err) => {
  console.error('Error en el seed:', err)
  process.exit(1)
})
