#!/usr/bin/env tsx
import { config } from 'dotenv'
config({ path: '../../.env' })

/**
 * Importa el directorio real de puestos de votación de Guadalajara de Buga
 * (Presidencia 2026, segunda vuelta), obtenido de la API pública de
 * resultados de la Registraduría:
 *   https://resultadosprecpresidente2026-2v.registraduria.gov.co/json/ACT/PR/{codigoZona}.json
 * (zonas 3102201..3102206 = comunas urbanas 1-6, 3102298 = puesto especial
 * "CARCEL", 3102299 = puestos rurales de los corregimientos).
 *
 * Crea VotingStation (sin lat/lng excepto la Cárcel, ya georreferenciada) +
 * sus VotingTable (una por mesa), asignadas a la comuna/corregimiento real
 * — por número de zona en las urbanas, por punto-en-polígono para la
 * cárcel, y por coincidencia de nombre para las rurales.
 *
 * SOLO DESARROLLO. Uso: pnpm db:import-puestos-buga <ruta-al-json>
 */

import { readFileSync } from 'fs'
import { neonConfig } from '@neondatabase/serverless'
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

type Punto = [number, number]

interface PuestoRaw { codigo: string; nombre: string; mesas: number; zona: string }

function puntoEnPoligono(punto: Punto, poligono: Punto[]): boolean {
  const [px, py] = punto
  let dentro = false
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i]
    const [xj, yj] = poligono[j]
    const cruza = (yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
    if (cruza) dentro = !dentro
  }
  return dentro
}

function normalizar(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // saca tildes
    .replace(/^(el|la|los)\s+/, '')
    .replace(/\s+/g, '') // ignora espacios ("Quebrada Seca" vs "QUEBRADASECA")
    .trim()
}

const CARCEL_LAT = 3.92211
const CARCEL_LNG = -76.29657

async function main() {
  const rutaJson = process.argv[2]
  if (!rutaJson) {
    console.error('Uso: pnpm db:import-puestos-buga <ruta-al-json>')
    process.exit(1)
  }
  const puestos: PuestoRaw[] = JSON.parse(readFileSync(rutaJson, 'utf-8'))

  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
  const db = new PrismaClient({ adapter })

  const buga = await db.municipality.findFirstOrThrow({ where: { divipola: '76111' } })
  const territorio = await db.commune.findMany({ where: { municipalityId: buga.id } })
  const comunasUrbanas = territorio.filter((c) => c.type === 'COMUNA')
  const corregimientos = territorio.filter((c) => c.type === 'CORREGIMIENTO')

  let creados = 0
  let mesasCreadas = 0
  const sinAsignar: string[] = []

  for (const p of puestos) {
    let comuna: (typeof territorio)[number] | undefined

    if (p.zona === '98') {
      // Cárcel — ya georreferenciada por INPEC. Cae fuera de todos los polígonos
      // mapeados (hueco real del KML entre zona urbana y corregimientos), así
      // que no depende de comuna: se crea directo más abajo.
    } else if (p.zona === '99') {
      // Rural — coincidencia de nombre contra los corregimientos ya importados
      const nombreNorm = normalizar(p.nombre)
      comuna = corregimientos.find((c) => nombreNorm.includes(normalizar(c.name)))
    } else {
      // Zonas 01-06 = Comuna 1-6 directamente
      const num = parseInt(p.zona, 10)
      comuna = comunasUrbanas.find((c) => c.name === `Comuna ${num}`)
    }

    const esCarcel = p.zona === '98'
    if (!comuna && !esCarcel) {
      sinAsignar.push(`${p.nombre} (zona ${p.zona})`)
      continue
    }

    const nombreLimpio = p.nombre.trim().replace(/\s+/g, ' ')
    const direccion = esCarcel
      ? 'Calle 15 # 8-40, Buga'
      : `${comuna!.name}, Guadalajara de Buga, Valle del Cauca`

    const existente = await db.votingStation.findFirst({
      where: { municipalityId: buga.id, name: { equals: esCarcel ? 'Cárcel de Buga' : nombreLimpio, mode: 'insensitive' } },
    })
    const estacion = existente
      ? await db.votingStation.update({
          where: { id: existente.id },
          data: esCarcel ? { specialLabel: 'Cárcel', lat: CARCEL_LAT, lng: CARCEL_LNG } : {},
        })
      : await db.votingStation.create({
          data: {
            name: esCarcel ? 'Cárcel de Buga' : nombreLimpio,
            address: direccion,
            municipalityId: buga.id,
            ...(esCarcel ? { lat: CARCEL_LAT, lng: CARCEL_LNG, specialLabel: 'Cárcel' } : {}),
          },
        })

    const mesasExistentes = await db.votingTable.count({ where: { stationId: estacion.id } })
    for (let n = mesasExistentes + 1; n <= p.mesas; n++) {
      await db.votingTable.create({ data: { number: n, stationId: estacion.id, voterCapacity: 350 } })
      mesasCreadas++
    }

    creados++
    console.log(`✓ ${nombreLimpio} → ${comuna?.name ?? '(cárcel, fuera de polígonos mapeados)'} (${p.mesas} mesas)`)
  }

  console.log(`\n✓ ${creados}/${puestos.length} puestos procesados, ${mesasCreadas} mesas creadas.`)
  if (sinAsignar.length > 0) {
    console.log(`⚠ Sin comuna/corregimiento asignado: ${sinAsignar.join(', ')}`)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
