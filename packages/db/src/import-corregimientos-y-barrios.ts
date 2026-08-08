#!/usr/bin/env tsx
import { config } from 'dotenv'
config({ path: '../../.env' })

/**
 * Completa el territorio de Guadalajara de Buga con datos reales del mismo
 * KML de la Alcaldía usado para las comunas:
 *   https://www.google.com/maps/d/kml?mid=1RoVWEf3WFjx-J5z-GXcoGyQ3gwwwg3yg&forcekml=1
 *
 * 1. Corregimientos Zona rural (18) → nuevas Commune (type=CORREGIMIENTO).
 * 2. Barrios (54, más completos y precisos que el set sembrado antes desde
 *    el POT 2000) → reemplaza los Neighborhood existentes de Buga. Cada
 *    barrio se asigna a la comuna/corregimiento que realmente lo contiene,
 *    por punto-en-polígono sobre el centroide — no por nombre a mano. Esto
 *    resuelve casos ambiguos como "Santa Rita"/"La Julia" con geometría
 *    real en vez de suposición.
 *
 * SOLO DESARROLLO. Uso: pnpm db:import-corregimientos-y-barrios <ruta-al-kml>
 */

import { readFileSync } from 'fs'
import { neonConfig } from '@neondatabase/serverless'
import { PrismaClient, Prisma } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

type Punto = [number, number]

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

function centroide(poligono: Punto[]): Punto {
  const lat = poligono.reduce((s, p) => s + p[0], 0) / poligono.length
  const lng = poligono.reduce((s, p) => s + p[1], 0) / poligono.length
  return [lat, lng]
}

function tituloCase(s: string): string {
  return s.trim().replace(/\S+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
}

function extraerFolder(kml: string, nombreFolder: string) {
  const escaped = nombreFolder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = kml.match(new RegExp(`<Folder>\\s*<name>${escaped}</name>([\\s\\S]*?)</Folder>`))
  if (!m) throw new Error(`No se encontró la carpeta "${nombreFolder}" en el KML.`)
  return [...m[1].matchAll(/<Placemark>([\s\S]*?)<\/Placemark>/g)].map(([, pm]) => {
    const name = (pm.match(/<name>([\s\S]*?)<\/name>/) ?? [, ''])[1].trim()
    const coordsRaw = (pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/) ?? [, ''])[1].trim()
    const boundary: Punto[] = coordsRaw
      ? coordsRaw.split(/\s+/).map((triple) => {
          const [lng, lat] = triple.split(',').map(Number)
          return [lat, lng] as Punto
        })
      : []
    return { name, boundary }
  }).filter((p) => p.name && p.boundary.length > 0)
}

async function main() {
  const rutaKml = process.argv[2]
  if (!rutaKml) {
    console.error('Uso: pnpm db:import-corregimientos-y-barrios <ruta-al-kml>')
    process.exit(1)
  }
  const kml = readFileSync(rutaKml, 'utf-8')

  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
  const db = new PrismaClient({ adapter })

  const buga = await db.municipality.findFirstOrThrow({ where: { divipola: '76111' } })

  // 1. Corregimientos → nuevas Commune (type=CORREGIMIENTO)
  const corregimientosKml = extraerFolder(kml, 'Corregimientos Zona rural')
  console.log(`Corregimientos en el KML: ${corregimientosKml.length}`)
  for (const c of corregimientosKml) {
    const nombreLimpio = tituloCase(c.name.replace(/^Corregimiento\s+(de\s+)?/i, ''))
    const existente = await db.commune.findFirst({ where: { name: nombreLimpio, municipalityId: buga.id } })
    if (existente) {
      await db.commune.update({ where: { id: existente.id }, data: { boundary: c.boundary } })
      console.log(`  ~ ${nombreLimpio} (ya existía, boundary actualizado)`)
    } else {
      await db.commune.create({
        data: { name: nombreLimpio, type: 'CORREGIMIENTO', municipalityId: buga.id, boundary: c.boundary },
      })
      console.log(`  ✓ ${nombreLimpio}: ${c.boundary.length} puntos`)
    }
  }

  // 2. Barrios → reemplazan el set sembrado antes, asignados por geometría real
  const barriosKml = extraerFolder(kml, 'Barrios')
  console.log(`\nBarrios en el KML: ${barriosKml.length}`)

  const comunasYCorregimientos = await db.commune.findMany({
    where: { municipalityId: buga.id, boundary: { not: Prisma.JsonNull } },
  })

  const deleted = await db.neighborhood.deleteMany({
    where: { commune: { municipalityId: buga.id } },
  })
  console.log(`Se reemplazan ${deleted.count} barrios sembrados antes (fuente menos precisa).`)

  let asignados = 0
  const sinAsignar: string[] = []
  for (const b of barriosKml) {
    const c = centroide(b.boundary)
    const contenedor = comunasYCorregimientos.find((cm) =>
      puntoEnPoligono(c, cm.boundary as unknown as Punto[]),
    )
    if (!contenedor) {
      sinAsignar.push(b.name)
      continue
    }
    await db.neighborhood.create({
      data: { name: b.name.trim(), communeId: contenedor.id, boundary: b.boundary },
    })
    asignados++
  }

  console.log(`✓ ${asignados}/${barriosKml.length} barrios asignados por geometría real.`)
  if (sinAsignar.length > 0) {
    console.log(`⚠ Sin comuna/corregimiento que los contenga (quedan sin crear): ${sinAsignar.join(', ')}`)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
