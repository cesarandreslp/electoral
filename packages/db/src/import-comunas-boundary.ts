#!/usr/bin/env tsx
import { config } from 'dotenv'
config({ path: '../../.env' })

/**
 * Importa los polígonos reales de las comunas de Guadalajara de Buga desde
 * un KML exportado de Google My Maps (Alcaldía de Buga — "División Política
 * y Administrativa Zona Urbana Municipio De Guadalajara De Buga"):
 *   https://www.google.com/maps/d/kml?mid=1RoVWEf3WFjx-J5z-GXcoGyQ3gwwwg3yg&forcekml=1
 *
 * Solo usa la carpeta "Comunas" del KML (6 polígonos simples, sin huecos).
 * Actualiza Commune.boundary por nombre exacto — las comunas deben existir
 * ya (sembradas en la sesión). SOLO DESARROLLO.
 *
 * Uso: pnpm db:import-comunas-boundary <ruta-al-kml>
 */

import { readFileSync } from 'fs'
import { neonConfig } from '@neondatabase/serverless'
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

async function main() {
  const rutaKml = process.argv[2]
  if (!rutaKml) {
    console.error('Uso: pnpm db:import-comunas-boundary <ruta-al-kml>')
    process.exit(1)
  }

  const kml = readFileSync(rutaKml, 'utf-8')
  const folderMatch = kml.match(/<Folder>\s*<name>Comunas<\/name>([\s\S]*?)<\/Folder>/)
  if (!folderMatch) throw new Error('No se encontró la carpeta "Comunas" en el KML.')

  const placemarks = [...folderMatch[1].matchAll(/<Placemark>([\s\S]*?)<\/Placemark>/g)]

  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
  const db = new PrismaClient({ adapter })

  let actualizadas = 0
  for (const [, pm] of placemarks) {
    const name = (pm.match(/<name>([\s\S]*?)<\/name>/) ?? [, ''])[1].trim()
    const coordsRaw = (pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/) ?? [, ''])[1].trim()
    if (!name || !coordsRaw) continue

    // KML: "lng,lat,alt lng,lat,alt ..." → Leaflet: [[lat,lng], ...]
    const boundary = coordsRaw.split(/\s+/).map((triple) => {
      const [lng, lat] = triple.split(',').map(Number)
      return [lat, lng]
    })

    const comuna = await db.commune.findFirst({ where: { name } })
    if (!comuna) {
      console.warn(`  ⚠ No existe una Commune llamada "${name}" — se omite.`)
      continue
    }

    await db.commune.update({ where: { id: comuna.id }, data: { boundary } })
    console.log(`✓ ${name}: ${boundary.length} puntos`)
    actualizadas++
  }

  console.log(`\n✓ ${actualizadas}/${placemarks.length} comunas actualizadas con su polígono real.`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
