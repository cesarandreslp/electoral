'use server'

import { requireModuleOrScreen } from '@/lib/auth-helpers'
import { getTenantDb } from '@campaignos/db'
import { getTenantConnection } from '@/lib/tenant'
import { geocodeAddress } from '@/lib/geocode'
import { sugerirOrdenPorCercania } from '@/lib/geometry'
import { revalidatePath } from 'next/cache'

const ROLES_ADMIN = ['ADMIN_CAMPANA', 'COORDINADOR'] as const

export type TipoItemRuta = 'agenda' | 'convocatoria'

export interface ItemRuta {
  id:        string
  tipo:      TipoItemRuta
  titulo:    string
  startsAt:  string
  direccion: string | null
  lat:       number | null
  lng:       number | null
  ordenRuta: number | null
}

function rangoDelDia(fecha: string): { desde: Date; hasta: Date } {
  return { desde: new Date(`${fecha}T00:00:00`), hasta: new Date(`${fecha}T23:59:59.999`) }
}

/** Agenda + convocatorias de un anfitrión en un día — todo lo que necesita ruta. */
export async function getRutaDia(anfitrionId: string, fecha: string): Promise<ItemRuta[]> {
  const session = await requireModuleOrScreen('CORE', [...ROLES_ADMIN], 'CORE_RUTAS')
  const db = getTenantDb(await getTenantConnection(session.user.tenantId))
  const { desde, hasta } = rangoDelDia(fecha)

  const [entradas, convocatorias] = await Promise.all([
    db.agendaEntrada.findMany({
      where: { tenantId: session.user.tenantId, anfitrionId, startsAt: { gte: desde, lte: hasta } },
    }),
    db.convocatoria.findMany({
      where: { tenantId: session.user.tenantId, convocanteId: anfitrionId, startsAt: { gte: desde, lte: hasta } },
    }),
  ])

  const items: ItemRuta[] = [
    ...entradas.map((e): ItemRuta => ({
      id: e.id, tipo: 'agenda', titulo: e.titulo ?? (e.disponible ? 'Hueco reservado' : 'Compromiso'),
      startsAt: e.startsAt.toISOString(), direccion: e.direccion, lat: e.lat, lng: e.lng, ordenRuta: e.ordenRuta,
    })),
    ...convocatorias.map((c): ItemRuta => ({
      id: c.id, tipo: 'convocatoria', titulo: c.titulo,
      startsAt: c.startsAt.toISOString(), direccion: c.direccion, lat: c.lat, lng: c.lng, ordenRuta: c.ordenRuta,
    })),
  ]

  return items.sort((a, b) => {
    if (a.ordenRuta !== null && b.ordenRuta !== null) return a.ordenRuta - b.ordenRuta
    return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  })
}

/** Guarda/actualiza la dirección de un item y la geocodifica (best-effort). */
export async function guardarDireccionRuta(id: string, tipo: TipoItemRuta, direccion: string) {
  const session = await requireModuleOrScreen('CORE', [...ROLES_ADMIN], 'CORE_RUTAS', 'edit')
  const db = getTenantDb(await getTenantConnection(session.user.tenantId))

  const geo = await geocodeAddress(direccion)

  if (tipo === 'agenda') {
    const entrada = await db.agendaEntrada.findFirst({ where: { id, tenantId: session.user.tenantId } })
    if (!entrada) return { success: false, error: 'No encontrado.' }
    await db.agendaEntrada.update({ where: { id }, data: { direccion, lat: geo?.lat ?? null, lng: geo?.lng ?? null } })
  } else {
    const convocatoria = await db.convocatoria.findFirst({ where: { id, tenantId: session.user.tenantId } })
    if (!convocatoria) return { success: false, error: 'No encontrado.' }
    await db.convocatoria.update({ where: { id }, data: { direccion, lat: geo?.lat ?? null, lng: geo?.lng ?? null } })
  }

  revalidatePath('/core/rutas')
  return { success: true, geocodificado: Boolean(geo) }
}

/** Calcula el orden sugerido por cercanía — no lo persiste, el admin lo confirma. */
export async function sugerirOrdenRuta(items: ItemRuta[]): Promise<string[]> {
  await requireModuleOrScreen('CORE', [...ROLES_ADMIN], 'CORE_RUTAS')

  const conUbicacion = items.filter((i): i is ItemRuta & { lat: number; lng: number } => i.lat !== null && i.lng !== null)
  const sinUbicacion = items.filter((i) => i.lat === null || i.lng === null)

  const ordenSugerido = sugerirOrdenPorCercania(conUbicacion)
  return [...ordenSugerido, ...sinUbicacion.map((i) => i.id)]
}

/** Persiste el orden (manual o confirmado) — el índice en el array es la posición. */
export async function guardarOrdenRuta(items: { id: string; tipo: TipoItemRuta }[]) {
  const session = await requireModuleOrScreen('CORE', [...ROLES_ADMIN], 'CORE_RUTAS', 'edit')
  const db = getTenantDb(await getTenantConnection(session.user.tenantId))

  await Promise.all(items.map((item, index) =>
    item.tipo === 'agenda'
      ? db.agendaEntrada.updateMany({ where: { id: item.id, tenantId: session.user.tenantId }, data: { ordenRuta: index } })
      : db.convocatoria.updateMany({ where: { id: item.id, tenantId: session.user.tenantId }, data: { ordenRuta: index } }),
  ))

  revalidatePath('/core/rutas')
  return { success: true }
}
