'use server'

/**
 * Server Actions del módulo DIA_E.
 * Todas las acciones verifican autenticación, rol y módulo con requireModule('DIA_E').
 * groqResult y zhipuResult NUNCA se retornan al cliente — solo auditoría.
 */

import { requireModule, requireModuleOrScreen } from '@/lib/auth-helpers'
import { getTenantConnection } from '@/lib/tenant'
import { getTenantDb, Prisma }  from '@campaignos/db'
import {
  extractE14WithGroq,
  extractE14WithZhipu,
  consensoE14,
}                              from '@campaignos/ai'
import { getTenantAiKeys }     from '@/lib/tenant-ai'
import { put }                 from '@vercel/blob'
import { revalidatePath }      from 'next/cache'

// ── Helper ───────────────────────────────────────────────────────────────────

async function getDbAndSession(
  roles: Parameters<typeof requireModule>[1] = [],
  screenKey?: string,
  accion: 'view' | 'edit' = 'view',
) {
  const session  = screenKey
    ? await requireModuleOrScreen('DIA_E', roles, screenKey, accion)
    : await requireModule('DIA_E', roles)
  const tenantId = session.user.tenantId as string
  const userId   = session.user.userId
  const conn     = await getTenantConnection(tenantId)
  const db       = getTenantDb(conn)
  return { db, tenantId, userId, session }
}

// ── Tipos exportados ─────────────────────────────────────────────────────────

export interface CandidateView {
  id:    string
  name:  string
  party: string | null
  partyLogoUrl: string | null
  photoUrl:     string | null
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
  // Códigos DIVIPOLA — el E-14 físico los imprime junto al nombre
  // ("DEPARTAMENTO: 11 - CAUCA", "MUNICIPIO: 001 - POPAYAN").
  departmentCode:       string
  municipalityDivipola: string
  /** Cargo en disputa (ALCALDE, CONCEJAL…) — encabeza el acta. De TenantConfig. */
  cargo:         string | null
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

/**
 * El candidato propio NO se captura acá: ya está marcado en CORE
 * (Voter.isCandidate, ver setCandidato). Esta función lo refleja en la tabla
 * Candidate — que sí necesita fila propia porque el E-14 referencia
 * candidateId — creándolo la primera vez y sincronizando el nombre si cambió.
 * Idempotente: se puede llamar en cada listCandidates() sin efectos raros.
 */
async function sincronizarCandidatoPropio(
  db: ReturnType<typeof getTenantDb>,
  tenantId: string,
): Promise<void> {
  const voterCandidato = await db.voter.findFirst({
    where:  { tenantId, isCandidate: true },
    select: { name: true },
  })
  const filaPropia = await db.candidate.findFirst({ where: { tenantId, isOwn: true } })

  if (!voterCandidato) {
    // Se desmarcó el candidato en CORE — la fila queda, pero deja de ser "propia"
    // (no se borra: puede tener votos de E-14 ya transmitidos apuntando a ella).
    if (filaPropia) await db.candidate.update({ where: { id: filaPropia.id }, data: { isOwn: false } })
    return
  }

  if (!filaPropia) {
    await db.candidate.create({
      data: { tenantId, name: voterCandidato.name, isOwn: true, order: 0 },
    })
  } else if (filaPropia.name !== voterCandidato.name) {
    await db.candidate.update({ where: { id: filaPropia.id }, data: { name: voterCandidato.name } })
  }
}

export async function listCandidates(): Promise<CandidateView[]> {
  const { db, tenantId } = await getDbAndSession()
  await sincronizarCandidatoPropio(db, tenantId)
  // Por número de tarjetón — es el orden del acta física, no "el nuestro primero".
  return db.candidate.findMany({ where: { tenantId }, orderBy: { order: 'asc' } })
}

/** Sube un archivo a Vercel Blob y devuelve su URL; null si no vino archivo. */
async function subirImagen(file: File | null, tenantId: string, prefijo: string): Promise<string | null> {
  if (!file || file.size === 0) return null
  const blob = await put(`dia-e/${tenantId}/${prefijo}-${Date.now()}-${file.name}`, file, { access: 'public' })
  return blob.url
}

/**
 * Alta de candidato RIVAL — el propio se toma de CORE (ver sincronizarCandidatoPropio).
 * Recibe FormData porque trae foto y logo de la agrupación.
 */
export async function createCandidate(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const { db, tenantId } = await getDbAndSession(['ADMIN_CAMPANA'], 'DIA_E_CONFIGURACION', 'edit')

    const name  = String(formData.get('name') ?? '').trim()
    const party = String(formData.get('party') ?? '').trim()
    const order = parseInt(String(formData.get('order') ?? '0')) || 0
    if (!name) return { success: false, error: 'Falta el nombre del candidato.' }

    const [photoUrl, partyLogoUrl] = await Promise.all([
      subirImagen(formData.get('photo') as File | null, tenantId, 'foto'),
      subirImagen(formData.get('partyLogo') as File | null, tenantId, 'logo'),
    ])

    await db.candidate.create({
      data: { tenantId, name, party: party || null, partyLogoUrl, photoUrl, isOwn: false, order },
    })
    revalidatePath('/dia-e/sala/configuracion')
    return { success: true }
  } catch (err) {
    console.error('[createCandidate]', err instanceof Error ? err.message : err)
    return { success: false, error: 'No se pudo crear el candidato.' }
  }
}

/**
 * Completa foto / agrupación / número de tarjetón de un candidato ya existente
 * — incluido el propio, cuyo NOMBRE sigue viniendo de CORE (no se toca acá).
 */
export async function actualizarDatosTarjeton(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const { db, tenantId } = await getDbAndSession(['ADMIN_CAMPANA'], 'DIA_E_CONFIGURACION', 'edit')

    const id = String(formData.get('id') ?? '')
    const candidato = await db.candidate.findFirst({ where: { id, tenantId } })
    if (!candidato) return { success: false, error: 'Candidato no encontrado.' }

    const party    = String(formData.get('party') ?? '').trim()
    const ordenRaw = String(formData.get('order') ?? '')
    const [photoUrl, partyLogoUrl] = await Promise.all([
      subirImagen(formData.get('photo') as File | null, tenantId, 'foto'),
      subirImagen(formData.get('partyLogo') as File | null, tenantId, 'logo'),
    ])

    await db.candidate.update({
      where: { id },
      data: {
        ...(party      !== ''   && { party }),
        ...(ordenRaw   !== ''   && { order: parseInt(ordenRaw) || 0 }),
        ...(photoUrl     !== null && { photoUrl }),      // solo si subieron una nueva
        ...(partyLogoUrl !== null && { partyLogoUrl }),
      },
    })
    revalidatePath('/dia-e/sala/configuracion')
    return { success: true }
  } catch (err) {
    console.error('[actualizarDatosTarjeton]', err instanceof Error ? err.message : err)
    return { success: false, error: 'No se pudo actualizar.' }
  }
}

export async function updateCandidate(
  id: string,
  data: { name?: string; party?: string; isOwn?: boolean; order?: number },
): Promise<{ success: boolean }> {
  try {
    const { db } = await getDbAndSession(['ADMIN_CAMPANA'], 'DIA_E_CONFIGURACION', 'edit')
    await db.candidate.update({ where: { id }, data })
    revalidatePath('/dia-e/sala/configuracion')
    return { success: true }
  } catch (err) {
    console.error('[updateCandidate]', err instanceof Error ? err.message : err)
    return { success: false }
  }
}

export async function deleteCandidate(id: string): Promise<{ success: boolean; error?: string }> {
  const { db, tenantId } = await getDbAndSession(['ADMIN_CAMPANA'], 'DIA_E_CONFIGURACION', 'edit')

  const candidato = await db.candidate.findFirst({ where: { id, tenantId } })
  if (!candidato) return { success: false, error: 'Candidato no encontrado.' }
  // El propio se administra desde CORE (ficha del elector → "Marcar como candidato"),
  // no desde acá — si no, quedaría desincronizado con Voter.isCandidate.
  if (candidato.isOwn) {
    return { success: false, error: 'El candidato propio se cambia en CORE, en la ficha del elector.' }
  }

  await db.candidate.delete({ where: { id } })
  revalidatePath('/dia-e/sala/configuracion')
  return { success: true }
}

// ── ASIGNACIÓN DE TESTIGOS ───────────────────────────────────────────────────

export async function assignWitness(
  witnessUserId: string,
  votingTableId: string,
  isPrimary: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db, tenantId } = await getDbAndSession(['ADMIN_CAMPANA', 'COORDINADOR'], 'DIA_E_ASIGNACIONES', 'edit')

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
  const { db, tenantId } = await getDbAndSession(['ADMIN_CAMPANA', 'COORDINADOR'], 'DIA_E_ASIGNACIONES')

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
  const { db } = await getDbAndSession(['TESTIGO'], 'DIA_E_TESTIGO', 'edit')
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

  const [table, config] = await Promise.all([
    db.votingTable.findUnique({
      where:   { id: assignment.votingTableId },
      include: {
        station: {
          include: { municipality: { include: { department: true } } },
        },
      },
    }),
    db.tenantConfig.findUnique({
      where:  { tenantId },
      select: { electionOffice: true },
    }),
  ])
  if (!table) return null

  return {
    assignmentId:   assignment.id,
    votingTableId:  table.id,
    tableNumber:    table.number,
    stationName:    table.station.name,
    stationAddress: table.station.address,
    municipality:   table.station.municipality.name,
    department:     table.station.municipality.department.name,
    departmentCode:       table.station.municipality.department.code,
    municipalityDivipola: table.station.municipality.divipola,
    cargo:          config?.electionOffice ?? null,
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

/** Transmite datos manuales del E-14, incluido el bloque de nivelación de la mesa. */
export async function submitManualE14(
  votingTableId: string,
  votes: { candidateId: string; votes: number }[],
  actaTotal: number,
  nivelacion?: { e11: number; urna: number; incinerados: number },
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db, tenantId, userId } = await getDbAndSession(['TESTIGO'], 'DIA_E_TESTIGO', 'edit')

    // Verificar que el testigo está asignado a esta mesa
    const assignment = await db.witnessAssignment.findFirst({
      where: { tenantId, userId, votingTableId },
    })
    if (!assignment) {
      return { success: false, error: 'No estás asignado a esta mesa.' }
    }

    const manualTotal = votes.reduce((sum, v) => sum + v.votes, 0)

    const datosNivelacion = nivelacion
      ? {
          nivelacionE11:         nivelacion.e11,
          nivelacionUrna:        nivelacion.urna,
          nivelacionIncinerados: nivelacion.incinerados,
        }
      : {}

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
          ...datosNivelacion,
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
          ...datosNivelacion,
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
    const { db, tenantId, userId } = await getDbAndSession(['TESTIGO'], 'DIA_E_TESTIGO', 'edit')

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

    // Llamar a ambas IAs en paralelo — SOLO con claves propias del tenant. Si
    // el tenant no configuró una de las dos, esa IA simplemente no participa
    // del consenso (en vez de caer en silencio a la clave global del SaaS);
    // el resto del flujo ya sabe degradar a una sola fuente o a captura manual.
    const { groq: groqKey, zhipu: zhipuKey } = await getTenantAiKeys(tenantId)
    const [groqResult, zhipuResult] = await Promise.all([
      groqKey
        ? extractE14WithGroq(base64, mimeType, groqKey).catch(err => {
            console.error('[Groq E14]', err instanceof Error ? err.message : err)
            return null
          })
        : Promise.resolve(null),
      zhipuKey
        ? extractE14WithZhipu(base64, mimeType, zhipuKey).catch(err => {
            console.error('[Zhipu E14]', err instanceof Error ? err.message : err)
            return null
          })
        : Promise.resolve(null),
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
  const { db, tenantId } = await getDbAndSession(['ADMIN_CAMPANA', 'COORDINADOR'], 'DIA_E_SALA')

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
  // El testigo transmite candidateId = Candidate.id; la IA, en cambio, devuelve
  // el NOMBRE leído de la foto. Hay que reconocer las dos formas o los votos
  // propios salen en blanco en la sala de situación.
  const clavesPropias = new Set<string>()
  for (const c of candidates as { id: string; name: string }[]) {
    clavesPropias.add(c.id.toLowerCase())
    clavesPropias.add(c.name.toLowerCase())
  }

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
        if (clavesPropias.has(v.candidateId.toLowerCase())) {
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
  const { db, tenantId } = await getDbAndSession(['ADMIN_CAMPANA', 'COORDINADOR'], 'DIA_E_INCIDENTES')

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
  const { db } = await getDbAndSession(['ADMIN_CAMPANA', 'COORDINADOR'], 'DIA_E_INCIDENTES', 'edit')
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
  const { db, tenantId } = await getDbAndSession(['ADMIN_CAMPANA', 'COORDINADOR'], 'DIA_E_RESULTADOS')

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
    // El acta se transmite con Candidate.id; la IA puede devolver el nombre.
    // Se suman las dos formas para no perder votos según la vía de captura.
    const votes = (votesByCand.get(c.id.toLowerCase()) ?? 0)
                + (votesByCand.get(c.name.toLowerCase()) ?? 0)
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
  const { db, tenantId } = await getDbAndSession(['ADMIN_CAMPANA', 'COORDINADOR'], 'DIA_E_SALA')

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
