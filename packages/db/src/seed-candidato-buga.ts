#!/usr/bin/env tsx
import { config } from 'dotenv'
config({ path: '../../.env' })

/**
 * Crea la estructura de campaña para Tuild Ramirez Tamayo (candidato a la
 * Alcaldía de Guadalajara de Buga): 1 candidato → 6 líderes (uno por comuna)
 * → 5 electores cada uno, y algunos de esos electores con 4 electores más
 * (segundo nivel de captación). Usa los barrios reales ya sembrados por
 * comuna para direcciones plausibles. SOLO DESARROLLO — datos de prueba.
 *
 * Uso: pnpm db:seed-candidato-buga
 */

import { createHash, randomInt } from 'crypto'
import { neonConfig } from '@neondatabase/serverless'
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'
import { encrypt } from './crypto'

neonConfig.webSocketConstructor = ws

const NOMBRES = [
  'Andrés', 'Camila', 'Diego', 'Valentina', 'Santiago', 'Mariana', 'Juan', 'Laura',
  'Carlos', 'Daniela', 'Felipe', 'Natalia', 'Julián', 'Paula', 'Sebastián', 'Alejandra',
  'Miguel', 'Carolina', 'David', 'Isabella', 'Nicolás', 'Gabriela', 'Óscar', 'Luisa',
  'Fernando', 'Camilo', 'Adriana', 'Ricardo', 'Sofía', 'Jorge',
]
const APELLIDOS = [
  'Gómez', 'Rodríguez', 'Martínez', 'López', 'García', 'Hernández', 'Pérez', 'Sánchez',
  'Ramírez', 'Torres', 'Flórez', 'Vargas', 'Castro', 'Ortiz', 'Rojas', 'Moreno',
  'Muñoz', 'Jiménez', 'Restrepo', 'Cárdenas', 'Salazar', 'Mejía', 'Zapata', 'Correa',
  'Londoño', 'Arango', 'Osorio', 'Gutiérrez', 'Peña', 'Cifuentes',
]

function calcularCedulaHash(cedula: string): string {
  return createHash('sha256').update(cedula.trim()).digest('hex')
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function* generadorNombres() {
  const combos = shuffle(NOMBRES.flatMap((n) => APELLIDOS.map((a) => `${n} ${a}`)))
  for (const c of combos) yield c
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Este script no puede ejecutarse con NODE_ENV=production.')
    process.exit(1)
  }

  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
  const db = new PrismaClient({ adapter })

  const cualquierVoter = await db.voter.findFirstOrThrow({ select: { tenantId: true } })
  const tenantId = cualquierVoter.tenantId

  const buga = await db.municipality.findFirstOrThrow({ where: { divipola: '76111' } })
  const comunas = await db.commune.findMany({
    where: { municipalityId: buga.id },
    include: { neighborhoods: true },
    orderBy: { name: 'asc' },
  })
  if (comunas.length === 0) throw new Error('No hay comunas sembradas para Buga.')

  const nombres = generadorNombres()
  const cedulasUsadas = new Set<string>()

  async function crearVoter(opts: {
    name: string; leaderId: string | null; zone?: string; address?: string
    targetVotes?: number
  }) {
    let cedula: string, cedulaHash: string
    do {
      cedula = '100' + String(randomInt(0, 10_000_000)).padStart(7, '0')
      cedulaHash = calcularCedulaHash(cedula)
    } while (
      cedulasUsadas.has(cedulaHash) ||
      (await db.voter.findFirst({ where: { tenantId, cedulaHash } }))
    )
    cedulasUsadas.add(cedulaHash)

    return db.voter.create({
      data: {
        tenantId,
        cedula: encrypt(cedula),
        cedulaHash,
        name: opts.name,
        leaderId: opts.leaderId,
        zone: opts.zone,
        address: opts.address,
        targetVotes: opts.targetVotes ?? 0,
      },
    })
  }

  // 1. Candidato — raíz de la jerarquía (líder implícito por tener followers)
  const candidato = await crearVoter({
    name: 'Tuild Ramirez Tamayo',
    leaderId: null,
    zone: 'Guadalajara de Buga',
    targetVotes: 20000,
  })
  console.log(`✓ Candidato: ${candidato.name} (${candidato.id})`)

  const todosLosElectores: { id: string; comunaNombre: string; barrios: string[] }[] = []

  // 2. Un líder por comuna, reportando al candidato
  for (const comuna of comunas) {
    const barrios = comuna.neighborhoods.map((b) => b.name)
    const barrioLider = barrios[randomInt(0, barrios.length)]

    const lider = await crearVoter({
      name: nombres.next().value as string,
      leaderId: candidato.id,
      zone: comuna.name,
      address: `Barrio ${barrioLider}, Guadalajara de Buga`,
      targetVotes: Math.round(20000 / comunas.length),
    })
    console.log(`  ✓ Líder ${comuna.name}: ${lider.name} (${lider.id})`)

    // 3. 5 electores por líder
    for (let i = 0; i < 5; i++) {
      const barrio = barrios[randomInt(0, barrios.length)]
      const elector = await crearVoter({
        name: nombres.next().value as string,
        leaderId: lider.id,
        address: `Barrio ${barrio}, Guadalajara de Buga`,
      })
      todosLosElectores.push({ id: elector.id, comunaNombre: comuna.name, barrios })
    }
  }
  console.log(`✓ ${todosLosElectores.length} electores creados (5 por líder)`)

  // 4. Algunos electores (al azar) consiguen 4 electores propios (segundo nivel)
  const promovidos = shuffle(todosLosElectores).slice(0, 5)
  for (const padre of promovidos) {
    for (let i = 0; i < 4; i++) {
      const barrio = padre.barrios[randomInt(0, padre.barrios.length)]
      await crearVoter({
        name: nombres.next().value as string,
        leaderId: padre.id,
        address: `Barrio ${barrio}, Guadalajara de Buga`,
      })
    }
    console.log(`  ✓ ${padre.comunaNombre}: un elector consiguió 4 referidos propios`)
  }

  console.log(`\n✓ Listo: 1 candidato + ${comunas.length} líderes + ${todosLosElectores.length} electores + ${promovidos.length * 4} referidos de segundo nivel`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
