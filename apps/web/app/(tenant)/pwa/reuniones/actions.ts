'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-helpers'
import { getTenantDb } from '@campaignos/db'
import { getTenantConnection } from '@/lib/tenant'
import { idsSubarbol } from '@/app/(tenant)/core/actions'

export interface ReunionListado {
  id:        string
  title:     string
  date:      string
  asistentes: { id: string; name: string }[]
}

/** Reuniones convocadas por el elector logueado, con quién asistió. */
export async function listarReuniones(): Promise<ReunionListado[]> {
  const session = await requireAuth(['ELECTOR', 'LIDER'])
  if (!session.user.voterId) return []

  const db = getTenantDb(await getTenantConnection(session.user.tenantId))

  const reuniones = await db.meeting.findMany({
    where:   { tenantId: session.user.tenantId, leaderId: session.user.voterId },
    include: { attendees: { include: { voter: { select: { id: true, name: true } } } } },
    orderBy: { date: 'desc' },
  })

  return reuniones.map((r) => ({
    id:    r.id,
    title: r.title,
    date:  r.date.toISOString(),
    asistentes: r.attendees.map((a) => ({ id: a.voter.id, name: a.voter.name })),
  }))
}

/** Convoca una nueva reunión. */
export async function crearReunion(title: string, date: string) {
  const session = await requireAuth(['ELECTOR', 'LIDER'])
  if (!session.user.voterId) return { success: false, error: 'Cuenta sin elector enlazado.' }
  if (!title.trim()) return { success: false, error: 'Falta el título.' }

  const db = getTenantDb(await getTenantConnection(session.user.tenantId))

  await db.meeting.create({
    data: {
      tenantId: session.user.tenantId,
      leaderId: session.user.voterId,
      title:    title.trim(),
      date:     new Date(date),
    },
  })

  revalidatePath('/pwa/reuniones')
  return { success: true }
}

/** Marca o quita la asistencia de un elector de su propia red a una reunión que convocó. */
export async function marcarAsistencia(meetingId: string, voterId: string, asistio: boolean) {
  const session = await requireAuth(['ELECTOR', 'LIDER'])
  if (!session.user.voterId) return { success: false, error: 'Cuenta sin elector enlazado.' }

  const db = getTenantDb(await getTenantConnection(session.user.tenantId))

  const meeting = await db.meeting.findFirst({
    where: { id: meetingId, tenantId: session.user.tenantId, leaderId: session.user.voterId },
  })
  if (!meeting) return { success: false, error: 'Reunión no encontrada.' }

  const permitidos = await idsSubarbol(session.user.voterId, session.user.tenantId, db)
  if (!permitidos.has(voterId)) return { success: false, error: 'Ese elector no es de tu red.' }

  if (asistio) {
    await db.meetingAttendance.upsert({
      where:  { meetingId_voterId: { meetingId, voterId } },
      create: { meetingId, voterId },
      update: {},
    })
  } else {
    await db.meetingAttendance.deleteMany({ where: { meetingId, voterId } })
  }

  revalidatePath('/pwa/reuniones')
  return { success: true }
}
