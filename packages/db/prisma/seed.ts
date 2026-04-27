/**
 * Seed de la base de datos del superadmin.
 * Crea datos mínimos para desarrollo y pruebas locales.
 *
 * Ejecutar con: pnpm db:seed (desde packages/db)
 */

import { neonConfig } from '@neondatabase/serverless'
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'
import { seedDivipola } from '../src/seed-divipola'

// Configurar WebSocket para uso en Node.js (fuera del edge runtime)
neonConfig.webSocketConstructor = ws

async function main() {
  const connectionString = process.env.DATABASE_URL_SUPERADMIN
  if (!connectionString) {
    throw new Error('DATABASE_URL_SUPERADMIN no está definida en las variables de entorno')
  }

  // PrismaNeon@6 recibe directamente PoolConfig — gestiona el Pool internamente
  const adapter = new PrismaNeon({ connectionString })
  const db      = new PrismaClient({ adapter })

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

  // ── Estructura territorial DIVIPOLA completa ──────────────────────────────
  // 33 departamentos (32 + Bogotá D.C.) y 1.103 municipios oficiales DANE.
  console.log('Cargando DIVIPOLA…')
  const r = await seedDivipola(db)
  console.log(`✓ DIVIPOLA: ${r.departments} departamentos, ${r.municipalities} municipios`)

  // ── Comuna, barrio, puesto y mesa de muestra (solo para desarrollo) ───────
  const medellin = await db.municipality.findUnique({ where: { divipola: '05001' } })
  if (medellin) {
    const comuna = await db.commune.upsert({
      where:  { id: 'seed-comuna-10' },
      update: {},
      create: {
        id:             'seed-comuna-10',
        name:           'Comuna 10 — La Candelaria',
        type:           'COMUNA',
        municipalityId: medellin.id,
      },
    })

    await db.neighborhood.upsert({
      where:  { id: 'seed-barrio-centro' },
      update: {},
      create: { id: 'seed-barrio-centro', name: 'El Centro', communeId: comuna.id },
    })

    const puesto = await db.votingStation.upsert({
      where:  { id: 'seed-puesto-01' },
      update: {},
      create: {
        id:             'seed-puesto-01',
        name:           'Institución Educativa La Candelaria',
        address:        'Calle 52 # 50-20, Medellín',
        municipalityId: medellin.id,
        lat:            6.2442,
        lng:            -75.5812,
      },
    })

    await db.votingTable.upsert({
      where:  { stationId_number: { stationId: puesto.id, number: 1 } },
      update: {},
      create: { number: 1, stationId: puesto.id, voterCapacity: 350 },
    })

    console.log(`✓ Muestra: ${comuna.name} + 1 puesto + 1 mesa`)
  }

  // ── Material global de formación de ejemplo ────────────────────────────────
  const materialGlobal = await db.globalTrainingMaterial.upsert({
    where: { id: 'seed-material-guia-testigos' },
    update: {},
    create: {
      id: 'seed-material-guia-testigos',
      title: 'Guía para testigos electorales',
      description: 'Material oficial de formación para testigos electorales y de escrutinio',
      type: 'SLIDES',
      fileUrl: 'https://gamma.app/docs/guia-para-Testigos-Electorales-8drs4myl6ufr7ep',
      fileSize: null,
      order: 1,
      isActive: true,
    },
  })

  console.log(`✓ Material global: ${materialGlobal.title}`)
  console.log('\nSeed completado correctamente.')

  await db.$disconnect()
}

main().catch((err) => {
  console.error('Error en el seed:', err)
  process.exit(1)
})
