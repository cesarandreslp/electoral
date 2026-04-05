'use server'

/**
 * Server Actions del módulo DIA_E.
 * Todas las acciones verifican autenticación, rol y módulo con requireModule('DIA_E').
 * groqResult y zhipuResult NUNCA se retornan al cliente — solo auditoría.
 */

import { requireModule }       from '@/lib/auth-helpers'
import { getTenantConnection } from '@/lib/tenant'
import { getTenantDb, Prisma }  from '@campaignos/db'
import {
  extractE14WithGroq,
  extractE14WithZhipu,
  consensoE14,
}                              from '@campaignos/ai'
import { revalidatePath }      from 'next/cache'

// ── Helper ───────────────────────────────────────────────────────────────────

async function getDbAndSession(roles: Parameters<typeof requireModule>[1] = []) {
  const session  = await requireModule('DIA_E', roles)
  const tenantId = session.user.tenantId as string
  const userId   = session.user.id as string
  const conn     = await getTenantConnection(tenantId)
  const db       = getTenantDb(conn)
  return { db, tenantId, userId, session }
}

// ── Tipos exportados ─────────────────────────────────────────────────────────

export interface CandidateView {
  id:    string
  name:  string
  party: string | null
  isOwn: boolean
  order: number
}

export interface WitnessAssignmentView {
  id:            string
  userId:        string
  userEmail:     string
  userName:      string | null
  votingTableId: string
  tableNumber:   number
  stationName:   string
  municipality:  string
  department:    string
  isPrimary:     boolean
  confirmedAt:   Date | null
}

export interface MyAssignment {
  assignmentId:  string
  votingTableId: string
  tableNumber:   number
  stationName:   string
  stationAddress: string
  municipality:  string
  department:    string
  isPrimary:     boolean
  confirmedAt:   Date | null
}

export interface TransmissionView {
  id:                  string
  votingTableId:       string
  tableNumber:         number
  stationName:         string
  witnessEmail:        string
  verificationStatus:  string
  ownCandidateVotes:   number | null
  transmittedAt:       Date | null
  hasManual:           boolean
  hasPhoto:            boolean
  extractionConfidence: string | null
}

export interface TransmissionDetail {
  id:                   string
  votingTableId:        string
  tableNumber:          number
  stationName:          string
  witnessEmail:         string
  verificationStatus:   string
  manualData:           { candidateId: string; votes: number }[] | null
  manualTotal:          number | null
  extractedData:        { candidateId: string; votes: number }[] | null
  extractedTotal:       number | null
  extractionConfidence: string | null
  discrepancies:        string[] | null
  finalData:            { candidateId: string; votes: number }[] | null
  photoUrl:             string | null
  notes:                string | null
  manualSubmittedAt:    Date | null
  photoSubmittedAt:     Date | null
}

export interface IncidentView {
  id:            string
  reportedBy:    string
  reporterEmail: string
  votingTableId: string | null
  type:          string
  description:   string
  severity:      string
  photoUrl:      string | null
  status:        string
  createdAt:     Date
}

export interface ElectionResultView {
  candidateId:   string
  candidateName: string
  party:         string | null
  isOwn:         boolean
  totalVotes:    number
  tableCount:    number
  totalTables:   number
  percentage:    number
}

export interface DashboardDiaE {
  mesasTotales:       number
  mesasConTestigo:    number
  mesasTransmitidas:  number
  mesasVerificadas:   number
  mesasAdvertencia:   number
  mesasSinReportar:   number
  incidentesAlta:     number
  incidentesMedia:    number
  incidentesBaja:     number
}

// ── CANDIDATOS ───────────────────────────────────────────────────────────────

export async function listCandidates(): Promise<CandidateView[]> {
  const { db, tenantId } = await getDbAndSession()
  return db.candidate.findMany({
    where:   { tenantId },
    orderBy: { order: 'asc' },
  })
}

export async function createCandidate(data: {
  name: string; party?: string; isOwn?: boolean; order?: number
}): Promise<{ success: boolean }> {
  try {
    const { db, tenantId } = await getDbAndSession(['ADMIN_CAMPANA'])
    await db.candidate.create({
      data: {
        tenantId,
        name:  data.name,
        party: data.party ?? null,
        isOwn: data.isOwn ?? false,
        order: data.order ?? 0,
      },
    })
    revalidatePath('/dia-e/sala/configuracion')
    return { success: true }
  } catch (err) {
    console.error('[createCandidate]', err instanceof Error ? err.message : err)
    return { success: false }
  }
}

export async function updateCandidate(
  id: string,
  data: { name?: string; party?: string; isOwn?: boolean; order?: number },
): Promise<{ success: boolean }> {
  try {
    const { db } = await getDbAndSession(['ADMIN_CAMPANA'])
    await db.candidate.update({ where: { id }, data })
    revalidatePath('/dia-e/sala/configuracion')
    return { success: true }
  } catch (err) {
    console.error('[updateCandidate]', err instanceof Error ? err.message : err)
    return { success: false }
  }
}

export async function deleteCandidate(id: string): Promise<void> {
  const { db } = await getDbAndSession(['ADMIN_CAMPANA'])
  await db.candidate.delete({ where: { id } })
  revalidatePath('/dia-e/sala/configuracion')
}

// ── ASIGNACIÓN DE TESTIGOS ───────────────────────────────────────────────────

export async function assignWitness(
  witnessUserId: string,
  votingTableId: string,
  isPrimary: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db, tenantId } = await getDbAndSession(['ADMIN_CAMPANA', 'COORDINADOR'])

    // Verificar que el usuario es TESTIGO
    const user = await db.user.findUnique({
      where: { id: witnessUserId },
      select: { role: true },
    })
    if (!user || user.role !== 'TESTIGO') {
      return { success: false, error: 'El usuario no tiene rol TESTIGO.' }
    }

    await db.witnessAssignment.upsert({
      where: { tenantId_votingTableId_isPrimary: { tenantId, votingTableId, isPrimary } },
      update: { userId: witnessUserId, confirmedAt: null },
      create: { tenantId, userId: witnessUserId, votingTableId, isPrimary },
    })

    revalidatePath('/dia-e/sala/asignaciones')
    return { success: true }
  } catch (err) {
    console.error('[assignWitness]', err instanceof Error ? err.message : err)
    return { success: false, error: 'Error al asignar testigo.' }
  }
}

export async function listWitnessAssignments(filters?: {
  hasWitness?: boolean
}): Promise<WitnessAssignmentView[]> {
  const { db, tenantId } = await getDbAndSession(['ADMIN_CAMPANA', 'COORDINADOR'])

  // Obtener todas las mesas con sus asignaciones
  const tables = await db.votingTable.findMany({
    include: {
      station: {
        include: { municipality: { include: { department: true } } },
      },
    },
  })

  const assignments = await db.witnessAssignment.findMany({
    where: { tenantId },
  })
  const assignMap = new Map(assignments.map(a => [a.votingTableId + ':' + a.isPrimary, a]))

  // Obtener datos de usuarios
  const userIds = [...new Set(assignments.map(a => a.userId))]
  const users = userIds.length > 0
    ? await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, name: true },
      })
    : []
  const userMap = new Map(users.map(u => [u.id, u]))

  const results: WitnessAssignmentView[] = []

  for (const table of tables) {
    const assignment = assignMap.get(table.id + ':true')
    if (filters?.hasWitness === true && !assignment) continue
    if (filters?.hasWitness === false && assignment) continue

    results.push({
      id:            assignment?.id ?? '',
      userId:        assignment?.userId ?? '',
      userEmail:     assignment ? (userMap.get(assignment.userId)?.email ?? '') : '',
      userName:      assignment ? (userMap.get(assignment.userId)?.name ?? null) : null,
      votingTableId: table.id,
      tableNumber:   table.number,
      stationName:   table.station.name,
      municipality:  table.station.municipality.name,
      department:    table.station.municipality.department.name,
      isPrimary:     true,
      confirmedAt:   assignment?.confirmedAt ?? null,
    })
  }

  return results
}

export async function confirmWitnessAssignment(assignmentId: string): Promise<void> {
  const { db } = await getDbAndSession(['TESTIGO'])
  await db.witnessAssignment.update({
    where: { id: assignmentId },
    data:  { confirmedAt: new Date() },
  })
  revalidatePath('/dia-e/testigo')
}

export async function getMyAssignment(): Promise<MyAssignment | null> {
  const { db, tenantId, userId } = await getDbAndSession()

  const assignment = await db.witnessAssignment.findFirst({
    where: { tenantId, userId },
  })
  if (!assignment) return null

  const table = await db.votingTable.findUnique({
    where:   { id: assignment.votingTableId },
    include: {
      station: {
        include: { municipality: { include: { department: true } } },
      },
    },
  })
  if (!table) return null

  return {
    assignmentId:   assignment.id,
    votingTableId:  table.id,
    tableNumber:    table.number,
    stationName:    table.station.name,
    stationAddress: table.station.address,
    municipality:   table.station.municipality.name,
    department:     table.station.municipality.department.name,
    isPrimary:      assignment.isPrimary,
    confirmedAt:    assignment.confirmedAt,
  }
}

export async function exportAssignmentsCSV(): Promise<string> {
  const rows = await listWitnessAssignments()
  const header = 'Mesa,Puesto,Municipio,Departamento,Testigo Email,Testigo Nombre,Confirmado'
  const lines = rows.map(r =>
    `${r.tableNumber},"${r.stationName}","${r.municipality}","${r.department}","${r.userEmail}","${r.userName ?? ''}",${r.confirmedAt ? 'Sí' : 'No'}`
  )
  return [header, ...lines].join('\n')
}

// ── TRANSMISIÓN E-14 ─────────────────────────────────────────────────────────

/** Transmite datos manuales del E-14 */
export async function submitManualE14(
  votingTableId: string,
  votes: { candidateId: string; votes: number }[],
  actaTotal: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db, tenantId, userId } = await getDbAndSession(['TESTIGO'])

    // Verificar que el testigo está asignado a esta mesa
    const assignment = await db.witnessAssignment.findFirst({
      where: { tenantId, userId, votingTableId },
    })
    if (!assignment) {
      return { success: false, error: 'No estás asignado a esta mesa.' }
    }

    const manualTotal = votes.reduce((sum, v) => sum + v.votes, 0)

    // Upsert la transmisión
    const existing = await db.e14Transmission.findUnique({
      where: { votingTableId },
    })

    if (existing) {
      await db.e14Transmission.update({
        where: { votingTableId },
        data: {
          manualData:        votes,
          manualTotal:       actaTotal,
          manualSubmittedAt: new Date(),
        },
      })
    } else {
      await db.e14Transmission.create({
        data: {
          tenantId,
          votingTableId,
          witnessUserId: userId,
          manualData:        votes,
          manualTotal:       actaTotal,
          manualSubmittedAt: new Date(),
        },
      })
    }

    await runVerification(votingTableId, db)

    revalidatePath('/dia-e/testigo')
    revalidatePath('/dia-e/sala')
    return { success: true }
  } catch (err) {
    console.error('[submitManualE14]', err instanceof Error ? err.message : err)
    return { success: false, error: 'Error al transmitir datos.' }
  }
}

/** Procesa la foto del E-14 — descarga server-side, envía a ambas IAs en paralelo */
export async function submitPhotoE14(
  votingTableId: string,
  photoUrl: string,
): Promise<{
  success: boolean
  extractedData?: { candidateId: string; votes: number }[]
  confidence?: string
  discrepancies?: string[]
  error?: string
}> {
  try {
    const { db, tenantId, userId } = await getDbAndSession(['TESTIGO'])

    // Verificar asignación
    const assignment = await db.witnessAssignment.findFirst({
      where: { tenantId, userId, votingTableId },
    })
    if (!assignment) {
      return { success: false, error: 'No estás asignado a esta mesa.' }
    }

    // Descargar imagen desde Vercel Blob — server-side
    const imageResponse = await fetch(photoUrl)
    if (!imageResponse.ok) {
      return { success: false, error: 'No se pudo descargar la imagen.' }
    }
    const arrayBuffer = await imageResponse.arrayBuffer()
    const base64      = Buffer.from(arrayBuffer).toString('base64')
    const mimeType    = imageResponse.headers.get('content-type') ?? 'image/jpeg'

    // Llamar a ambas IAs en paralelo
    const [groqResult, zhipuResult] = await Promise.all([
      extractE14WithGroq(base64, mimeType).catch(err => {
        console.error('[Groq E14]', err instanceof Error ? err.message : err)
        return null
      }),
      extractE14WithZhipu(base64, mimeType).catch(err => {
        console.error('[Zhipu E14]', err instanceof Error ? err.message : err)
        return null
      }),
    ])

    // Si ninguna IA respondió
    if (!groqResult && !zhipuResult) {
      // Guardar solo la foto
      const existing = await db.e14Transmission.findUnique({ where: { votingTableId } })
      if (existing) {
        await db.e14Transmission.update({
          where: { votingTableId },
          data:  { photoUrl, photoSubmittedAt: new Date() },
        })
      } else {
        await db.e14Transmission.create({
          data: { tenantId, votingTableId, witnessUserId: userId, photoUrl, photoSubmittedAt: new Date() },
        })
      }
      return { success: false, error: 'No se pudo procesar la imagen. Digita los datos manualmente.' }
    }

    // Consenso — si solo una IA respondió, usar esa
    let extractedData: { candidateId: string; votes: number }[]
    let confidence: string
    let discrepanciesArr: string[]

    if (groqResult && zhipuResult) {
      const consenso = consensoE14(groqResult, zhipuResult)
      extractedData  = consenso.data.candidatos
        .filter(c => c.votos !== null)
        .map(c => ({ candidateId: c.nombre, votes: c.votos! }))
      confidence     = consenso.confidence
      discrepanciesArr = consenso.discrepancies
    } else {
      const result   = (groqResult ?? zhipuResult)!
      extractedData  = result.candidatos
        .filter(c => c.votos !== null)
        .map(c => ({ candidateId: c.nombre, votes: c.votos! }))
      confidence     = 'MEDIA'
      discrepanciesArr = []
    }

    const extractedTotal = extractedData.reduce((sum, v) => sum + v.votes, 0)

    // Guardar en DB
    const existing = await db.e14Transmission.findUnique({ where: { votingTableId } })
    const photoData = {
      photoUrl,
      extractedData,
      extractedTotal,
      extractionConfidence: confidence,
      groqResult:           groqResult ? { rawResponse: groqResult.rawResponse } : Prisma.DbNull,
      zhipuResult:          zhipuResult ? { rawResponse: zhipuResult.rawResponse } : Prisma.DbNull,
      discrepancies:        discrepanciesArr.length > 0 ? discrepanciesArr : Prisma.DbNull,
      photoSubmittedAt:     new Date(),
    }

    if (existing) {
      await db.e14Transmission.update({ where: { votingTableId }, data: photoData })
    } else {
      await db.e14Transmission.create({
        data: { tenantId, votingTableId, witnessUserId: userId, ...photoData },
      })
    }

    await runVerification(votingTableId, db)

    revalidatePath('/dia-e/testigo')
    revalidatePath('/dia-e/sala')
    return { success: true, extractedData, confidence, discrepancies: discrepanciesArr }
  } catch (err) {
    console.error('[submitPhotoE14]', err instanceof Error ? err.message : err)
    return { success: false, error: 'Error al procesar la foto.' }
  }
}

/** Función interna de verificación cruzada — NO exportar */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runVerification(votingTableId: string, db: any): Promise<void> {
  const tx = await db.e14Transmission.findUnique({ where: { votingTableId } })
  if (!tx) return

  const hasManual = !!tx.manualData && tx.manualSubmittedAt
  const hasPhoto  = !!tx.extractedData && tx.photoSubmittedAt

  let status: string
  let finalData = null

  if (hasManual && hasPhoto) {
    // Comparar manual vs extraído
    const manualArr    = tx.manualData as { candidateId: string; votes: number }[]
    const extractedArr = tx.extractedData as { candidateId: string; votes: number }[]
    const manualTotal  = manualArr.reduce((s: number, v: { votes: number }) => s + v.votes, 0)
    const extractTotal = extractedArr.reduce((s: number, v: { votes: number }) => s + v.votes, 0)

    const diff = Math.abs(manualTotal - extractTotal)
    const pct  = manualTotal > 0 ? (diff / manualTotal) * 100 : (extractTotal > 0 ? 100 : 0)

    if (pct < 2) {
      status    = 'VERIFICADO'
      finalData = extractedArr // foto = más confiable cuando coinciden
    } else {
      status    = 'ADVERTENCIA'
      finalData = null // mostrar ambos, no definir finalData
    }
  } else if (hasManual && !hasPhoto) {
    status    = 'SOLO_MANUAL'
    finalData = tx.manualData
  } else if (!hasManual && hasPhoto) {
    const conf = tx.extractionConfidence
    if (conf === 'BAJA') {
      status    = 'BAJA_CONFIANZA'
      finalData = tx.extractedData // con flag de revisión
    } else {
      status    = 'SOLO_FOTO'
      finalData = tx.extractedData
    }
  } else {
    status = 'PENDIENTE'
  }

  await db.e14Transmission.update({
    where: { votingTableId },
    data: {
      verificationStatus: status,
      finalData,
      finalizedAt:        finalData ? new Date() : null,
    },
  })
}

/** Estado completo de transmisión para una mesa */
export async function getTransmissionStatus(votingTableId: string): Promise<TransmissionDetail | null> {
  const { db, tenantId } = await getDbAndSession()

  const tx = await db.e14Transmission.findUnique({ where: { votingTableId } })
  if (!tx || tx.tenantId !== tenantId) return null

  const user = await db.user.findUnique({
    where: { id: tx.witnessUserId },
    select: { email: true },
  })

  const table = await db.votingTable.findUnique({
    where:   { id: votingTableId },
    include: { station: true },
  })

  return {
    id:                   tx.id,
    votingTableId:        tx.votingTableId,
    tableNumber:          table?.number ?? 0,
    stationName:          table?.station.name ?? '',
    witnessEmail:         user?.email ?? '',
    verificationStatus:   tx.verificationStatus,
    manualData:           tx.manualData as { candidateId: string; votes: number }[] | null,
    manualTotal:          tx.manualTotal,
    extractedData:        tx.extractedData as { candidateId: string; votes: number }[] | null,
    extractedTotal:       tx.extractedTotal,
    extractionConfidence: tx.extractionConfidence,
    discrepancies:        tx.discrepancies as string[] | null,
    finalData:            tx.finalData as { candidateId: string; votes: number }[] | null,
    photoUrl:             tx.photoUrl,
    notes:                tx.notes,
    manualSubmittedAt:    tx.manualSubmittedAt,
    photoSubmittedAt:     tx.photoSubmittedAt,
    // groqResult y zhipuResult NUNCA se retornan — solo auditoría
  }
}

/** Lista de transmisiones para la sala de situación */
export async function listTransmissions(filters?: {
  verificationStatus?: string
}): Promise<TransmissionView[]> {
  const { db, tenantId } = await getDbAndSession(['ADMIN_CAMPANA', 'COORDINADOR'])

  const where: Record<string, unknown> = { tenantId }
  if (filters?.verificationStatus) {
    where.verificationStatus = filters.verificationStatus
  }

  const transmissions = await db.e14Transmission.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
  })

  // Obtener info de mesas y testigos
  const tableIds = transmissions.map((t: { votingTableId: string }) => t.votingTableId)
  const userIds  = [...new Set(transmissions.map((t: { witnessUserId: string }) => t.witnessUserId))]

  const [tables, users, candidates] = await Promise.all([
    tableIds.length > 0
      ? db.votingTable.findMany({
          where: { id: { in: tableIds } },
          include: { station: true },
        })
      : [],
    userIds.length > 0
      ? db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true } })
      : [],
    db.candidate.findMany({ where: { tenantId, isOwn: true }, select: { id: true, name: true } }),
  ])

  const tableMap = new Map(tables.map((t: { id: string; number: number; station: { name: string } }) => [t.id, t]))
  const userMap  = new Map(users.map((u: { id: string; email: string }) => [u.id, u]))
  const ownCandidateNames = new Set(candidates.map((c: { name: string }) => c.name.toLowerCase()))

  return transmissions.map((tx: {
    id: string; votingTableId: string; witnessUserId: string
    verificationStatus: string; finalData: unknown; manualData: unknown
    extractedData: unknown; extractionConfidence: string | null
    manualSubmittedAt: Date | null; photoSubmittedAt: Date | null; photoUrl: string | null
  }) => {
    const table = tableMap.get(tx.votingTableId)
    const user  = userMap.get(tx.witnessUserId)

    // Calcular votos del candidato propio
    let ownVotes: number | null = null
    const data = (tx.finalData ?? tx.manualData ?? tx.extractedData) as
      { candidateId: string; votes: number }[] | null
    if (data) {
      for (const v of data) {
        if (ownCandidateNames.has(v.candidateId.toLowerCase())) {
          ownVotes = (ownVotes ?? 0) + v.votes
        }
      }
    }

    return {
      id:                   tx.id,
      votingTableId:        tx.votingTableId,
      tableNumber:          table?.number ?? 0,
      stationName:          table?.station?.name ?? '',
      witnessEmail:         user?.email ?? '',
      verificationStatus:   tx.verificationStatus,
      ownCandidateVotes:    ownVotes,
      transmittedAt:        tx.manualSubmittedAt ?? tx.photoSubmittedAt,
      hasManual:            !!tx.manualData,
      hasPhoto:             !!tx.photoUrl,
      extractionConfidence: tx.extractionConfidence,
    }
  })
}

// ── INCIDENTES ───────────────────────────────────────────────────────────────

export async function reportIncident(data: {
  votingTableId?: string
  type:        string
  description: string
  severity:    string
  photoUrl?:   string
}): Promise<{ success: boolean }> {
  try {
    const { db, tenantId, userId } = await getDbAndSession()
    await db.incident.create({
      data: {
        tenantId,
        reportedBy:    userId,
        votingTableId: data.votingTableId ?? null,
        type:          data.type,
        description:   data.description,
        severity:      data.severity,
        photoUrl:      data.photoUrl ?? null,
      },
    })
    revalidatePath('/dia-e/sala/incidentes')
    return { success: true }
  } catch (err) {
    console.error('[reportIncident]', err instanceof Error ? err.message : err)
    return { success: false }
  }
}

export async function listIncidents(filters?: {
  status?: string; severity?: string; type?: string
}): Promise<IncidentView[]> {
  const { db, tenantId } = await getDbAndSession(['ADMIN_CAMPANA', 'COORDINADOR'])

  const where: Record<string, unknown> = { tenantId }
  if (filters?.status) where.status = filters.status
  if (filters?.severity) where.severity = filters.severity
  if (filters?.type) where.type = filters.type

  const incidents = await db.incident.findMany({
    where,
    orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
  })

  const userIds = [...new Set(incidents.map((i: { reportedBy: string }) => i.reportedBy))]
  const users = userIds.length > 0
    ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true } })
    : []
  const userMap = new Map(users.map((u: { id: string; email: string }) => [u.id, u.email]))

  return incidents.map((i: {
    id: string; reportedBy: string; votingTableId: string | null
    type: string; description: string; severity: string
    photoUrl: string | null; status: string; createdAt: Date
  }) => ({
    ...i,
    reporterEmail: userMap.get(i.reportedBy) ?? '',
  }))
}

export async function updateIncidentStatus(
  id: string,
  status: string,
): Promise<void> {
  const { db } = await getDbAndSession(['ADMIN_CAMPANA', 'COORDINADOR'])
  await db.incident.update({
    where: { id },
    data: {
      status,
      resolvedAt: status === 'RESUELTO' ? new Date() : null,
    },
  })
  revalidatePath('/dia-e/sala/incidentes')
}

// ── RESULTADOS AGREGADOS ─────────────────────────────────────────────────────

export async function getElectionResults(): Promise<ElectionResultView[]> {
  const { db, tenantId } = await getDbAndSession(['ADMIN_CAMPANA', 'COORDINADOR'])

  const candidates = await db.candidate.findMany({
    where:   { tenantId },
    orderBy: { order: 'asc' },
  })

  // Transmisiones con datos finales (estados que reportan)
  const transmissions = await db.e14Transmission.findMany({
    where: {
      tenantId,
      verificationStatus: { in: ['VERIFICADO', 'SOLO_MANUAL', 'SOLO_FOTO'] },
      finalData: { not: Prisma.DbNull },
    },
  })

  const totalTables = await db.votingTable.count()

  // Agregar votos por candidato
  const votesByCand = new Map<string, number>()
  let totalAllVotes = 0
  let tablesReported = transmissions.length

  for (const tx of transmissions) {
    const data = tx.finalData as { candidateId: string; votes: number }[]
    if (!data) continue
    for (const v of data) {
      const key = v.candidateId.toLowerCase()
      votesByCand.set(key, (votesByCand.get(key) ?? 0) + v.votes)
      totalAllVotes += v.votes
    }
  }

  return candidates.map((c: { id: string; name: string; party: string | null; isOwn: boolean }) => {
    const votes = votesByCand.get(c.name.toLowerCase()) ?? 0
    return {
      candidateId:   c.id,
      candidateName: c.name,
      party:         c.party,
      isOwn:         c.isOwn,
      totalVotes:    votes,
      tableCount:    tablesReported,
      totalTables,
      percentage:    totalAllVotes > 0 ? Math.round((votes / totalAllVotes) * 1000) / 10 : 0,
    }
  })
}

export async function getDashboardDiaE(): Promise<DashboardDiaE> {
  const { db, tenantId } = await getDbAndSession(['ADMIN_CAMPANA', 'COORDINADOR'])

  const [
    mesasTotales,
    mesasConTestigo,
    transmissions,
    incidentesAlta,
    incidentesMedia,
    incidentesBaja,
  ] = await Promise.all([
    db.votingTable.count(),
    db.witnessAssignment.count({ where: { tenantId, isPrimary: true } }),
    db.e14Transmission.findMany({
      where:  { tenantId },
      select: { verificationStatus: true },
    }),
    db.incident.count({ where: { tenantId, status: 'ABIERTO', severity: 'ALTA' } }),
    db.incident.count({ where: { tenantId, status: 'ABIERTO', severity: 'MEDIA' } }),
    db.incident.count({ where: { tenantId, status: 'ABIERTO', severity: 'BAJA' } }),
  ])

  const statusCounts = new Map<string, number>()
  for (const tx of transmissions) {
    statusCounts.set(tx.verificationStatus, (statusCounts.get(tx.verificationStatus) ?? 0) + 1)
  }

  const mesasTransmitidas = transmissions.length
  const mesasVerificadas  = statusCounts.get('VERIFICADO') ?? 0
  const mesasAdvertencia  = (statusCounts.get('ADVERTENCIA') ?? 0) + (statusCounts.get('BAJA_CONFIANZA') ?? 0)

  return {
    mesasTotales,
    mesasConTestigo,
    mesasTransmitidas,
    mesasVerificadas,
    mesasAdvertencia,
    mesasSinReportar: mesasTotales - mesasTransmitidas,
    incidentesAlta,
    incidentesMedia,
    incidentesBaja,
  }
}
