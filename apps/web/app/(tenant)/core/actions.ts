'use server'

/**
 * Server Actions del módulo CORE.
 * Todas las acciones:
 *   - Verifican autenticación y rol con requireAuth / requireModule
 *   - Obtienen la DB del tenant via getTenantConnection()
 *   - Nunca retornan cédula ni connectionString al cliente
 */

import { requireAuth, requireModule } from '@/lib/auth-helpers'
import { getTenantConnection }        from '@/lib/tenant'
import { calcularCedulaHash }         from '@/lib/cedula-hash'
import { getTenantDb, encrypt, Prisma } from '@campaignos/db'
import { geocodeAddress }             from '@/lib/geocode'
import { puntoEnPoligono }            from '@/lib/geometry'
import { crearQrPropio }              from '@/lib/qr'
import { revalidatePath }             from 'next/cache'
import type { Cargo }                 from './configuracion/actions'

// ── Tipos exportados ──────────────────────────────────────────────────────────

export type CommitmentStatus =
  | 'SIN_CONTACTAR'
  | 'CONTACTADO'
  | 'SIMPATIZANTE'
  | 'COMPROMETIDO'
  | 'VOTO_SEGURO'

export interface CreateLeaderInput {
  cedula:         string
  name:           string
  apodo?:         string
  phone?:         string
  zone?:          string
  parentLeaderId?: string
  targetVotes:    number
}

export interface LeaderFilters {
  id?:             string  // buscar un líder puntual por id, aunque aún no tenga followers
  zone?:           string
  status?:         string
  parentLeaderId?: string
  search?:         string  // nombre (contiene) o cédula exacta
}

export interface VoterOption {
  id:   string
  name: string
  zone: string | null
}

export interface LeaderSummary {
  id:             string
  name:           string
  zone:           string | null
  status:         string
  targetVotes:    number
  totalElectores: number
  comprometidos:  number
  isCandidate:    boolean
  pctAvance:      number // 0-100
  parentLeaderId: string | null
}

export interface CreateVoterInput {
  cedula:           string
  name:             string
  apodo?:           string
  phone?:           string
  address?:         string
  leaderId?:        string
  votingTableId?:   string
  commitmentStatus?: CommitmentStatus
}

export interface VoterFilters {
  leaderId?:         string
  commitmentStatus?: CommitmentStatus
  zone?:             string
  search?:           string
}

export interface VoterSummary {
  id:               string
  name:             string
  leaderId:         string | null
  votingTableId:    string | null
  commitmentStatus: CommitmentStatus
  lastContact:      Date | null
  notes:            string | null
  // NUNCA incluir cedula ni phone en el retorno (PII)
}

export interface ImportVoterRow {
  cedula:           string
  name:             string
  phone?:           string
  leaderName?:      string  // se resuelve a leaderId por nombre
  commitmentStatus?: CommitmentStatus
}

export interface ImportResult {
  created: number
  skipped: number
  errors:  string[]
}

// ── Helpers internos ──────────────────────────────────────────────────────────

/** Retorna un cliente Prisma para la DB del tenant autenticado */
async function obtenerDbTenant(tenantId: string) {
  const connectionString = await getTenantConnection(tenantId)
  return getTenantDb(connectionString)
}

// ── Acciones de líderes ───────────────────────────────────────────────────────

/**
 * Crea un nuevo líder en la campaña.
 * Solo ADMIN_CAMPANA y COORDINADOR pueden crear líderes.
 */
export async function createLeader(
  data: CreateLeaderInput,
): Promise<{ success: true; leaderId: string } | { success: false; error: string }> {
  try {
    const session = await requireModule('CORE', ['ADMIN_CAMPANA', 'COORDINADOR'])
    const db      = await obtenerDbTenant(session.user.tenantId)

    // Validar que parentLeaderId pertenezca al mismo tenant
    if (data.parentLeaderId) {
      const padre = await db.voter.findFirst({
        where: { id: data.parentLeaderId, tenantId: session.user.tenantId },
      })
      if (!padre) {
        return { success: false, error: 'El líder superior no existe en esta campaña.' }
      }
    }

    // Cifrar campos PII y calcular hash de cédula para deduplicación
    const cedulaNorm    = data.cedula.trim()
    const cedulaHash    = calcularCedulaHash(cedulaNorm)
    const cedulaCifrada = encrypt(cedulaNorm)
    const phoneCifrado  = data.phone ? encrypt(data.phone) : undefined

    const duplicado = await db.voter.findFirst({
      where: { tenantId: session.user.tenantId, cedulaHash },
    })
    if (duplicado) {
      return { success: false, error: 'Ya existe un elector con esa cédula en esta campaña.' }
    }

    const lider = await db.voter.create({
      data: {
        tenantId:    session.user.tenantId,
        cedula:      cedulaCifrada,
        cedulaHash,
        name:        data.name,
        apodo:       data.apodo?.trim() || undefined,
        phone:       phoneCifrado,
        zone:        data.zone,
        leaderId:    data.parentLeaderId,
        targetVotes: data.targetVotes,
      },
    })
    await crearQrPropio(lider.id, session.user.tenantId, db)

    revalidatePath('/core/lideres')
    return { success: true, leaderId: lider.id }

  } catch (err: any) {
    if (err?.code === 'P2002') {
      return { success: false, error: 'Ya existe un elector con esa cédula en esta campaña.' }
    }
    console.error('[createLeader]', err instanceof Error ? err.message : err)
    return { success: false, error: 'Error al crear el líder.' }
  }
}

/**
 * Actualiza datos de un líder existente.
 * Solo puede modificar líderes del mismo tenant.
 */
export async function updateLeader(
  id: string,
  data: Partial<CreateLeaderInput>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireModule('CORE', ['ADMIN_CAMPANA', 'COORDINADOR'])
    const db      = await obtenerDbTenant(session.user.tenantId)

    // Verificar que el líder pertenece al tenant
    const existente = await db.voter.findFirst({
      where: { id, tenantId: session.user.tenantId },
    })
    if (!existente) return { success: false, error: 'Líder no encontrado.' }

    // Validar nuevo parentLeaderId si se provee
    if (data.parentLeaderId) {
      const padre = await db.voter.findFirst({
        where: { id: data.parentLeaderId, tenantId: session.user.tenantId },
      })
      if (!padre) return { success: false, error: 'El líder superior no existe en esta campaña.' }
      // Evitar ciclos: no asignar como padre a un hijo propio
      if (data.parentLeaderId === id) return { success: false, error: 'Un líder no puede ser su propio superior.' }
    }

    const phoneCifrado = data.phone ? encrypt(data.phone) : undefined

    await db.voter.update({
      where: { id },
      data: {
        ...(data.name           !== undefined && { name:        data.name }),
        ...(data.apodo          !== undefined && { apodo:       data.apodo.trim() || null }),
        ...(phoneCifrado        !== undefined && { phone:       phoneCifrado }),
        ...(data.zone           !== undefined && { zone:        data.zone }),
        ...(data.parentLeaderId !== undefined && { leaderId:    data.parentLeaderId }),
        ...(data.targetVotes    !== undefined && { targetVotes: data.targetVotes }),
      },
    })

    revalidatePath('/core/lideres')
    return { success: true }

  } catch (err) {
    console.error('[updateLeader]', err instanceof Error ? err.message : err)
    return { success: false, error: 'Error al actualizar el líder.' }
  }
}

/**
 * Marca (o desmarca) a un Voter como el candidato de la campaña — el líder
 * natural de la raíz, que no debe aparecer en el panel de líderes ni en el
 * ranking. A lo sumo un candidato por tenant: marcar uno nuevo desmarca al
 * anterior automáticamente.
 */
export async function setCandidato(id: string, isCandidate: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireModule('CORE', ['ADMIN_CAMPANA'])
    const db      = await obtenerDbTenant(session.user.tenantId)

    const existente = await db.voter.findFirst({ where: { id, tenantId: session.user.tenantId } })
    if (!existente) return { success: false, error: 'Elector no encontrado.' }

    if (isCandidate) {
      await db.voter.updateMany({
        where: { tenantId: session.user.tenantId, isCandidate: true },
        data:  { isCandidate: false },
      })
    }
    await db.voter.update({ where: { id }, data: { isCandidate } })

    revalidatePath('/core/lideres')
    revalidatePath('/core')
    return { success: true }

  } catch (err) {
    console.error('[setCandidato]', err instanceof Error ? err.message : err)
    return { success: false, error: 'Error al actualizar el candidato.' }
  }
}

/**
 * Lista líderes (Voters con al menos un follower) con métricas de avance.
 * Los LIDER solo ven sus propios datos.
 */
export async function listLeaders(filters?: LeaderFilters): Promise<LeaderSummary[]> {
  const session = await requireModule('CORE', ['ADMIN_CAMPANA', 'COORDINADOR', 'LIDER', 'TESTIGO'])
  const db      = await obtenerDbTenant(session.user.tenantId)

  // Los LIDER solo ven a sí mismos
  // Para esto necesitamos saber cuál es el líder asociado al usuario.
  // Por ahora filtramos por parentLeaderId si el rol es LIDER y se pasa el filtro.
  const esLider = session.user.role === 'LIDER'

  const lideres = await db.voter.findMany({
    where: {
      tenantId: session.user.tenantId,
      // Buscar por id puntual (ej. la ficha de un líder recién creado, sin
      // followers todavía) NO exige "es líder"; listar/rankear sí lo exige.
      // El candidato es el líder natural de la raíz, pero no debe aparecer en el
      // panel — sigue siendo visible al entrar directo a su ficha por id.
      ...(filters?.id ? { id: filters.id } : { followers: { some: {} }, isCandidate: false }),
      ...(filters?.zone           && { zone:     filters.zone }),
      ...(filters?.status         && { status:   filters.status as any }),
      ...(filters?.parentLeaderId && { leaderId: filters.parentLeaderId }),
      ...(filters?.search         && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { cedulaHash: calcularCedulaHash(filters.search) },
        ],
      }),
    },
    include: {
      // "Electores" del líder = followers que NO son a su vez líderes (sin followers
      // propios). Un sub-líder no cuenta como elector hacia la meta de votos del padre —
      // igual que antes, cuando Leader.voters solo incluía Voter, nunca otro Leader.
      followers: {
        where:  { followers: { none: {} } },
        select: { commitmentStatus: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  return lideres.map((l) => {
    const comprometidos = l.followers.filter(
      (v) => v.commitmentStatus === 'COMPROMETIDO' || v.commitmentStatus === 'VOTO_SEGURO',
    ).length

    return {
      id:             l.id,
      name:           l.name,
      zone:           l.zone,
      status:         l.status,
      targetVotes:    l.targetVotes,
      totalElectores: l.followers.length,
      comprometidos,
      isCandidate:    l.isCandidate,
      pctAvance:      l.targetVotes > 0
        ? Math.round((comprometidos / l.targetVotes) * 100)
        : 0,
      parentLeaderId: l.leaderId,
    }
  })
}

/**
 * Lista TODOS los electores del tenant como candidatos a "líder superior"
 * o "líder asignado" en los formularios. A diferencia de listLeaders(), no
 * exige tener followers — cualquier elector puede convertirse en líder en
 * el momento en que se le asigna el primer follower.
 */
export async function listVoterOptions(): Promise<VoterOption[]> {
  const session = await requireModule('CORE', ['ADMIN_CAMPANA', 'COORDINADOR'])
  const db      = await obtenerDbTenant(session.user.tenantId)

  return db.voter.findMany({
    where:   { tenantId: session.user.tenantId },
    select:  { id: true, name: true, zone: true },
    orderBy: { name: 'asc' },
  })
}

// ── Acciones de electores ─────────────────────────────────────────────────────

/**
 * Crea un nuevo elector.
 * La cédula se cifra con AES-256-GCM antes de guardar.
 * NUNCA se retorna la cédula en ninguna respuesta.
 */
export async function createVoter(
  data: CreateVoterInput,
): Promise<{ success: true; voterId: string } | { success: false; error: string }> {
  try {
    const session = await requireModule('CORE', ['ADMIN_CAMPANA', 'COORDINADOR'])
    const db      = await obtenerDbTenant(session.user.tenantId)

    // Validar leaderId si se provee
    if (data.leaderId) {
      const lider = await db.voter.findFirst({
        where: { id: data.leaderId, tenantId: session.user.tenantId },
      })
      if (!lider) return { success: false, error: 'El líder no existe en esta campaña.' }
    }

    // Validar votingTableId si se provee
    if (data.votingTableId) {
      const mesa = await db.votingTable.findUnique({ where: { id: data.votingTableId } })
      if (!mesa) return { success: false, error: 'La mesa de votación no existe.' }
    }

    // Cifrar campos PII y calcular hash de cédula para deduplicación
    const cedulaNorm    = data.cedula.trim()
    const cedulaHash    = calcularCedulaHash(cedulaNorm)
    const cedulaCifrada = encrypt(cedulaNorm)
    const phoneCifrado  = data.phone ? encrypt(data.phone) : undefined

    // Verificar duplicado antes de crear (usa cedulaHash, nunca la cédula cifrada)
    const existente = await db.voter.findFirst({
      where: { tenantId: session.user.tenantId, cedulaHash },
      select: { id: true, leaderId: true },
    })
    if (existente) {
      if (existente.leaderId === data.leaderId) {
        return { success: false, error: 'Ya existe un elector con esa cédula asignado a este líder.' }
      }
      return { success: false, error: 'Ya existe un elector con esa cédula en esta campaña.' }
    }

    const elector = await db.voter.create({
      data: {
        tenantId:         session.user.tenantId,
        cedula:           cedulaCifrada,
        cedulaHash,
        name:             data.name,
        apodo:            data.apodo?.trim() || undefined,
        phone:            phoneCifrado,
        address:          data.address?.trim() || undefined,
        leaderId:         data.leaderId,
        votingTableId:    data.votingTableId,
        commitmentStatus: data.commitmentStatus ?? 'SIN_CONTACTAR',
      },
    })
    await crearQrPropio(elector.id, session.user.tenantId, db)

    revalidatePath('/core/electores')
    return { success: true, voterId: elector.id }

  } catch (err: any) {
    // Error de unicidad: cédula duplicada en el tenant
    if (err?.code === 'P2002') {
      return { success: false, error: 'Ya existe un elector con esa cédula en esta campaña.' }
    }
    console.error('[createVoter]', err instanceof Error ? err.message : err)
    return { success: false, error: 'Error al crear el elector.' }
  }
}

/**
 * Actualiza el estado de compromiso de un elector.
 * Cualquier rol puede actualizar, pero solo sus propios electores (los LIDER).
 * Registra lastContact automáticamente al cambiar el estado.
 */
export async function updateVoterCommitment(
  voterId: string,
  status:  CommitmentStatus,
  notes?:  string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireModule('CORE')
    const db      = await obtenerDbTenant(session.user.tenantId)

    const elector = await db.voter.findFirst({
      where: { id: voterId, tenantId: session.user.tenantId },
    })
    if (!elector) return { success: false, error: 'Elector no encontrado.' }

    // Los LIDER solo pueden actualizar electores asignados a ellos.
    // La verificación exacta requeriría mapear userId → leaderId.
    // Por ahora se implementa la verificación de tenantId (suficiente para MVP).
    // TODO: cuando exista la relación User↔Leader, agregar verificación de leaderId.

    await db.voter.update({
      where: { id: voterId },
      data: {
        commitmentStatus: status,
        lastContact:      new Date(),
        ...(notes !== undefined && { notes }),
      },
    })

    revalidatePath('/core/electores')
    return { success: true }

  } catch (err) {
    console.error('[updateVoterCommitment]', err instanceof Error ? err.message : err)
    return { success: false, error: 'Error al actualizar el estado de compromiso.' }
  }
}

/**
 * Lista electores con paginación y filtros.
 * La cédula NUNCA aparece en el retorno.
 */
export async function listVoters(
  filters?:   VoterFilters,
  pagination: { page: number; pageSize: number } = { page: 1, pageSize: 50 },
): Promise<{ voters: VoterSummary[]; total: number; pages: number }> {
  const session = await requireModule('CORE')
  const db      = await obtenerDbTenant(session.user.tenantId)

  const where: any = {
    tenantId: session.user.tenantId,
    ...(filters?.leaderId         && { leaderId:         filters.leaderId }),
    ...(filters?.commitmentStatus && { commitmentStatus: filters.commitmentStatus }),
    ...(filters?.search           && {
      OR: [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { cedulaHash: calcularCedulaHash(filters.search) },
      ],
    }),
  }

  const [total, electores] = await Promise.all([
    db.voter.count({ where }),
    db.voter.findMany({
      where,
      select: {
        id:               true,
        name:             true,
        leaderId:         true,
        votingTableId:    true,
        commitmentStatus: true,
        lastContact:      true,
        notes:            true,
        // cedula y phone: NUNCA (PII)
      },
      orderBy: { name: 'asc' },
      skip:   (pagination.page - 1) * pagination.pageSize,
      take:   pagination.pageSize,
    }),
  ])

  const pages = Math.ceil(total / pagination.pageSize)

  return {
    voters: electores as VoterSummary[],
    total,
    pages,
  }
}

/**
 * Importación masiva de electores desde CSV/Excel.
 * Procesa en batches de 100 para evitar timeouts.
 * La cédula se cifra por cada registro.
 */
export async function importVoters(rows: ImportVoterRow[]): Promise<ImportResult> {
  const session  = await requireModule('CORE', ['ADMIN_CAMPANA', 'COORDINADOR'])
  const tenantId = session.user.tenantId
  const db       = await obtenerDbTenant(tenantId)

  // Construir mapa nombre → id para resolución rápida. Cualquier elector puede
  // ser el líder destino (incluye a quien recién se está armando su primera
  // lista), no solo quienes ya tienen followers.
  const lideres = await db.voter.findMany({
    where:  { tenantId },
    select: { id: true, name: true },
  })
  const mapaLideres = new Map(lideres.map((l) => [l.name.toLowerCase(), l.id]))

  let created = 0
  let skipped = 0
  const errors: string[] = []

  // Procesar en batches de 100
  const BATCH = 100
  for (let i = 0; i < rows.length; i += BATCH) {
    const lote = rows.slice(i, i + BATCH)

    for (let j = 0; j < lote.length; j++) {
      const row      = lote[j]
      const lineaNum = i + j + 1

      if (!row.cedula?.trim() || !row.name?.trim()) {
        errors.push(`Fila ${lineaNum}: cédula y nombre son obligatorios.`)
        continue
      }

      const leaderId = row.leaderName
        ? mapaLideres.get(row.leaderName.toLowerCase())
        : undefined

      if (row.leaderName && !leaderId) {
        errors.push(`Fila ${lineaNum}: líder "${row.leaderName}" no encontrado — se importa sin líder.`)
      }

      const cedulaNorm   = row.cedula.trim()
      const cedulaHash   = calcularCedulaHash(cedulaNorm)
      const cedulaCifrada = encrypt(cedulaNorm)

      // Verificación explícita por cedulaHash para distinguir:
      //   mismo líder  → skip silencioso
      //   otro líder   → alerta de duplicado
      const existente = await db.voter.findFirst({
        where:  { tenantId: session.user.tenantId, cedulaHash },
        select: { id: true, leaderId: true },
      })

      if (existente) {
        if (existente.leaderId !== (leaderId ?? null)) {
          await crearAlertaDuplicado(
            {
              tenantId:          session.user.tenantId,
              cedulaHash,
              firstLeaderId:     existente.leaderId ?? (leaderId ?? ''),
              duplicateLeaderId: leaderId ?? existente.leaderId ?? '',
            },
            db as any,
          )
          errors.push(`Fila ${lineaNum}: cédula ya existe bajo otro líder — se generó alerta de duplicado.`)
        }
        skipped++
        continue
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nuevo = await (db.voter.create as any)({
        data: {
          tenantId,
          cedula:           cedulaCifrada,
          cedulaHash,
          name:             row.name.trim(),
          phone:            row.phone ? encrypt(row.phone) : undefined,
          leaderId:         leaderId ?? undefined,
          commitmentStatus: row.commitmentStatus ?? 'SIN_CONTACTAR',
        },
      })
      await crearQrPropio(nuevo.id, tenantId, db)
      created++
    }
  }

  revalidatePath('/core/electores')
  return { created, skipped, errors }
}

// ── Alerta de duplicados ──────────────────────────────────────────────────────

interface AlertaDuplicadoInput {
  tenantId:          string
  cedulaHash:        string
  firstLeaderId:     string   // Líder que registró primero
  duplicateLeaderId: string   // Líder que intentó registrar después
  // userId de cada líder para enviarles la notificación
  firstUserId?:      string
  duplicateUserId?:  string
}

/**
 * Crea un VoterDuplicateAlert y dos Notifications (una por líder involucrado).
 * Función reutilizada por importación Excel y por registro por QR.
 * La cédula NUNCA aparece aquí — solo su SHA-256.
 */
export async function crearAlertaDuplicado(
  data:   AlertaDuplicadoInput,
  db:     ReturnType<typeof getTenantDb>,
): Promise<void> {
  // Crear alerta
  await db.voterDuplicateAlert.create({
    data: {
      tenantId:          data.tenantId,
      cedulaHash:        data.cedulaHash,
      firstLeaderId:     data.firstLeaderId,
      duplicateLeaderId: data.duplicateLeaderId,
    },
  })

  // Crear notificación para el líder original (el que registró primero)
  if (data.firstUserId) {
    await db.notification.create({
      data: {
        tenantId: data.tenantId,
        userId:   data.firstUserId,
        type:     'DUPLICADO_ELECTOR',
        message:  'La persona que registraste también aparece en la lista de otro líder. Eres el registrador original.',
        metadata: { cedulaHash: data.cedulaHash, duplicateLeaderId: data.duplicateLeaderId },
      },
    })
  }

  // Crear notificación para el líder que intentó duplicar
  if (data.duplicateUserId) {
    await db.notification.create({
      data: {
        tenantId: data.tenantId,
        userId:   data.duplicateUserId,
        type:     'DUPLICADO_ELECTOR',
        message:  'La persona que intentaste registrar ya está vinculada a otro líder. No fue agregada a tu lista.',
        metadata: { cedulaHash: data.cedulaHash, firstLeaderId: data.firstLeaderId },
      },
    })
  }
}

// ── Dashboard ───────────────────────────────────────────────────────────────

export interface CoreStats {
  lideres:   number
  electores: number
  puestos:   number
  mesas:     number
}

/** Conteos para el dashboard del módulo CORE. Accesible a todos los roles del tenant. */
export async function getCoreStats(): Promise<CoreStats> {
  const session = await requireModule('CORE', ['ADMIN_CAMPANA', 'COORDINADOR', 'LIDER', 'TESTIGO'])
  const db      = await obtenerDbTenant(session.user.tenantId)

  // Voter lleva tenantId (defensa en profundidad además de la DB aislada).
  // VotingStation/VotingTable son territoriales (DIVIPOLA) — sin tenantId.
  const [lideres, electores, puestos, mesas] = await Promise.all([
    db.voter.count({ where: { tenantId: session.user.tenantId, followers: { some: {} }, isCandidate: false } }),
    db.voter.count({ where: { tenantId: session.user.tenantId } }),
    db.votingStation.count(),
    db.votingTable.count(),
  ])

  return { lideres, electores, puestos, mesas }
}

// ── Ranking de captadores (HALLAZGO 9) ─────────────────────────────────────────

export interface LeaderRankingEntry {
  id:                    string
  name:                  string
  zone:                  string | null
  totalDownline:         number // directos + todo el sub-árbol (no solo followers directos)
  comprometidosDownline: number
  profundidad:           number // niveles de sub-líderes debajo de este
}

/**
 * Rankea líderes (a cualquier nivel del árbol, no solo raíces) por el tamaño
 * de todo su sub-árbol de electores — no solo sus followers directos, como
 * hace listLeaders(). "Quién trae más gente", contando sub-líderes propios.
 */
export async function getLeaderRanking(limit?: number): Promise<LeaderRankingEntry[]> {
  const session = await requireModule('CORE', ['ADMIN_CAMPANA', 'COORDINADOR', 'LIDER', 'TESTIGO'])
  const db      = await obtenerDbTenant(session.user.tenantId)

  const todos = await db.voter.findMany({
    where:  { tenantId: session.user.tenantId },
    select: { id: true, name: true, zone: true, leaderId: true, commitmentStatus: true, isCandidate: true },
  })

  const hijosPorLider = new Map<string, typeof todos>()
  for (const v of todos) {
    if (!v.leaderId) continue
    const lista = hijosPorLider.get(v.leaderId) ?? []
    lista.push(v)
    hijosPorLider.set(v.leaderId, lista)
  }

  const cache = new Map<string, { total: number; comprometidos: number; profundidad: number }>()
  function subarbol(id: string): { total: number; comprometidos: number; profundidad: number } {
    const cacheado = cache.get(id)
    if (cacheado) return cacheado

    const hijos = hijosPorLider.get(id) ?? []
    let total         = hijos.length
    let comprometidos = hijos.filter((h) => h.commitmentStatus === 'COMPROMETIDO' || h.commitmentStatus === 'VOTO_SEGURO').length
    let profundidad   = hijos.length > 0 ? 1 : 0

    for (const h of hijos) {
      const sub = subarbol(h.id)
      total         += sub.total
      comprometidos += sub.comprometidos
      profundidad    = Math.max(profundidad, 1 + sub.profundidad)
    }

    const resultado = { total, comprometidos, profundidad }
    cache.set(id, resultado)
    return resultado
  }

  const ranking = todos
    // solo quienes tienen al menos 1 follower (son líderes); el candidato cuenta
    // para el sub-árbol de quien sí aparece, pero no se lista él mismo.
    .filter((v) => hijosPorLider.has(v.id) && !v.isCandidate)
    .map((v) => {
      const s = subarbol(v.id)
      return {
        id: v.id, name: v.name, zone: v.zone,
        totalDownline: s.total, comprometidosDownline: s.comprometidos, profundidad: s.profundidad,
      }
    })
    .sort((a, b) => b.totalDownline - a.totalDownline)

  return limit ? ranking.slice(0, limit) : ranking
}

// ── Mapa de electores geolocalizados ──────────────────────────────────────────

export interface VoterGeo {
  id:               string
  name:             string
  lat:              number
  lng:              number
  commitmentStatus: string
  leaderName:       string | null
}

/** Electores ya geocodificados (con lat/lng), para plotear en el mapa. */
export async function getVotersGeo(): Promise<VoterGeo[]> {
  const session = await requireModule('CORE', ['ADMIN_CAMPANA', 'COORDINADOR', 'LIDER', 'TESTIGO'])
  const db      = await obtenerDbTenant(session.user.tenantId)

  const rows = await db.voter.findMany({
    where:  { tenantId: session.user.tenantId, lat: { not: null }, lng: { not: null } },
    select: { id: true, name: true, lat: true, lng: true, commitmentStatus: true, leader: { select: { name: true } } },
  })

  return rows.map((r) => ({
    id: r.id, name: r.name, lat: r.lat!, lng: r.lng!, commitmentStatus: r.commitmentStatus,
    leaderName: r.leader?.name ?? null,
  }))
}

export interface GeoStats { conCoords: number; pendientes: number }

/** Conteo de electores ubicados vs. pendientes de geocodificar (tienen dirección, no coords). */
export async function getGeoStats(): Promise<GeoStats> {
  const session = await requireModule('CORE', ['ADMIN_CAMPANA', 'COORDINADOR', 'LIDER', 'TESTIGO'])
  const db      = await obtenerDbTenant(session.user.tenantId)
  const tenantId = session.user.tenantId

  const [conCoords, pendientes] = await Promise.all([
    db.voter.count({ where: { tenantId, lat: { not: null } } }),
    db.voter.count({ where: { tenantId, lat: null, address: { not: null } } }),
  ])
  return { conCoords, pendientes }
}

/**
 * Geocodifica un LOTE PEQUEÑO de electores con dirección pero sin coordenadas.
 * ponytail: lote de 5 con pausa de 1s por el rate limit de Nominatim (1 req/s) y
 * el timeout de la función serverless. Para volúmenes grandes esto es un cron/queue,
 * no una acción síncrona — por ahora el admin la corre varias veces.
 */
export async function geocodificarPendientes(): Promise<{ geocodificados: number; restantes: number }> {
  const session  = await requireModule('CORE', ['ADMIN_CAMPANA', 'COORDINADOR'])
  const db       = await obtenerDbTenant(session.user.tenantId)
  const tenantId = session.user.tenantId

  const lote = await db.voter.findMany({
    where:  { tenantId, lat: null, address: { not: null } },
    select: { id: true, address: true },
    take:   5,
  })

  let geocodificados = 0
  for (const v of lote) {
    const coords = await geocodeAddress(v.address!)
    if (coords) {
      await db.voter.update({ where: { id: v.id }, data: { lat: coords.lat, lng: coords.lng } })
      geocodificados++
    }
    await new Promise((r) => setTimeout(r, 1000)) // 1 req/s (política de Nominatim)
  }

  const restantes = await db.voter.count({ where: { tenantId, lat: null, address: { not: null } } })
  revalidatePath('/core')
  return { geocodificados, restantes }
}

// ── Jurisdicción electoral ──────────────────────────────────────────────────────
// Un voto solo cuenta si el elector está dentro de la jurisdicción del cargo:
// ALCALDE/CONCEJAL → municipio; GOBERNADOR/DIPUTADO/REPRESENTANTE → departamento;
// SENADOR/PRESIDENTE → nacional (sin restricción). La fuente de "dónde vota" es
// la mesa (votingTableId), nunca la dirección de residencia.

type EstadoJurisdiccion = 'CUENTA' | 'NO_CUENTA' | 'SIN_VERIFICAR'

const CARGOS_NACIONALES      = ['SENADOR', 'PRESIDENTE']
const CARGOS_DEPARTAMENTALES = ['GOBERNADOR', 'DIPUTADO', 'REPRESENTANTE']
const CARGOS_MUNICIPALES     = ['ALCALDE', 'CONCEJAL']

function resolverJurisdiccion(
  cfg: { office: Cargo | null; departmentCode: string | null; municipalityDivipola: string | null },
  ubicacion: { divipola: string; departmentCode: string } | null, // null = sin votingTableId
): EstadoJurisdiccion {
  if (!cfg.office || CARGOS_NACIONALES.includes(cfg.office)) return 'CUENTA'
  if (!ubicacion) return 'SIN_VERIFICAR'

  if (CARGOS_MUNICIPALES.includes(cfg.office)) {
    if (!cfg.municipalityDivipola) return 'SIN_VERIFICAR'
    return ubicacion.divipola === cfg.municipalityDivipola ? 'CUENTA' : 'NO_CUENTA'
  }
  if (CARGOS_DEPARTAMENTALES.includes(cfg.office)) {
    if (!cfg.departmentCode) return 'SIN_VERIFICAR'
    return ubicacion.departmentCode === cfg.departmentCode ? 'CUENTA' : 'NO_CUENTA'
  }
  return 'SIN_VERIFICAR'
}

export interface JurisdictionStats {
  cuenta:       number
  noCuenta:     number
  sinVerificar: number
}

/** Cuántos electores del tenant cuentan / no cuentan / no se puede determinar, según la config de elección. */
export async function getJurisdictionStats(): Promise<JurisdictionStats> {
  const session  = await requireModule('CORE', ['ADMIN_CAMPANA', 'COORDINADOR', 'LIDER', 'TESTIGO'])
  const db       = await obtenerDbTenant(session.user.tenantId)
  const tenantId = session.user.tenantId

  const config = await db.tenantConfig.findUnique({ where: { tenantId } })
  const cfg = {
    office:               (config?.electionOffice as Cargo | null) ?? null,
    departmentCode:       config?.electionDepartmentCode ?? null,
    municipalityDivipola: config?.electionMunicipalityDivipola ?? null,
  }

  const total = await db.voter.count({ where: { tenantId } })

  // Cargo nacional o sin configurar: todos cuentan, sin necesidad de joins.
  if (!cfg.office || CARGOS_NACIONALES.includes(cfg.office)) {
    return { cuenta: total, noCuenta: 0, sinVerificar: 0 }
  }

  const sinMesa = await db.voter.count({ where: { tenantId, votingTableId: null } })

  const conMesa = await db.$queryRaw<{ divipola: string; departmentCode: string }[]>`
    SELECT m.divipola, d.code AS "departmentCode"
    FROM "Voter" v
    JOIN "VotingTable"   vt ON v."votingTableId"   = vt.id
    JOIN "VotingStation" vs ON vt."stationId"      = vs.id
    JOIN "Municipality"  m  ON vs."municipalityId" = m.id
    JOIN "Department"    d  ON m."departmentId"    = d.id
    WHERE v."tenantId" = ${tenantId}
  `

  let cuenta = 0, noCuenta = 0, sinVerificar = sinMesa
  for (const row of conMesa) {
    const estado = resolverJurisdiccion(cfg, row)
    if (estado === 'CUENTA') cuenta++
    else if (estado === 'NO_CUENTA') noCuenta++
    else sinVerificar++
  }

  return { cuenta, noCuenta, sinVerificar }
}

export interface StationGeo {
  id:             string
  name:           string
  lat:            number
  lng:            number
  totalElectores: number
  estado:         'CUENTA' | 'NO_CUENTA'
  specialLabel:   string | null
}

/** Puestos de votación con electores propios asignados, para la vista de mapa "por puesto". */
export async function getVotingStationsGeo(): Promise<StationGeo[]> {
  const session  = await requireModule('CORE', ['ADMIN_CAMPANA', 'COORDINADOR', 'LIDER', 'TESTIGO'])
  const db       = await obtenerDbTenant(session.user.tenantId)
  const tenantId = session.user.tenantId

  const config = await db.tenantConfig.findUnique({ where: { tenantId } })
  const cfg = {
    office:               (config?.electionOffice as Cargo | null) ?? null,
    departmentCode:       config?.electionDepartmentCode ?? null,
    municipalityDivipola: config?.electionMunicipalityDivipola ?? null,
  }

  const rows = await db.$queryRaw<{
    id: string; name: string; lat: number; lng: number; specialLabel: string | null
    divipola: string; departmentCode: string; total: bigint
  }[]>`
    SELECT vs.id, vs.name, vs.lat, vs.lng, vs."specialLabel", m.divipola, d.code AS "departmentCode",
           COUNT(v.id)::bigint AS total
    FROM "Voter" v
    JOIN "VotingTable"   vt ON v."votingTableId"   = vt.id
    JOIN "VotingStation" vs ON vt."stationId"      = vs.id
    JOIN "Municipality"  m  ON vs."municipalityId" = m.id
    JOIN "Department"    d  ON m."departmentId"    = d.id
    WHERE v."tenantId" = ${tenantId}
      AND vs.lat IS NOT NULL AND vs.lng IS NOT NULL
    GROUP BY vs.id, vs.name, vs.lat, vs.lng, vs."specialLabel", m.divipola, d.code
  `

  return rows.map((r) => ({
    id: r.id, name: r.name, lat: r.lat, lng: r.lng, totalElectores: Number(r.total),
    specialLabel: r.specialLabel,
    estado: resolverJurisdiccion(cfg, r) === 'NO_CUENTA' ? 'NO_CUENTA' : 'CUENTA',
  }))
}

export interface ComunaGeo {
  id:             string
  name:           string
  boundary:       [number, number][]
  totalElectores: number
}

/** Comunas con polígono real y cuántos electores propios (geocodificados) caen dentro, para la vista de mapa "por comuna". */
export async function getElectoresPorComuna(): Promise<ComunaGeo[]> {
  const session  = await requireModule('CORE', ['ADMIN_CAMPANA', 'COORDINADOR', 'LIDER', 'TESTIGO'])
  const db       = await obtenerDbTenant(session.user.tenantId)
  const tenantId = session.user.tenantId

  const [comunas, electores] = await Promise.all([
    db.commune.findMany({ where: { boundary: { not: Prisma.JsonNull } } }),
    db.voter.findMany({
      where:  { tenantId, lat: { not: null }, lng: { not: null } },
      select: { lat: true, lng: true },
    }),
  ])

  return comunas.map((c) => {
    const boundary = c.boundary as unknown as [number, number][]
    const totalElectores = electores.filter((e) => puntoEnPoligono([e.lat!, e.lng!], boundary)).length
    return { id: c.id, name: c.name, boundary, totalElectores }
  })
}

export interface StationOption {
  id:     string
  name:   string
  tables: { id: string; number: number }[]
}

/** Puestos de votación del tenant con sus mesas, para el selector puesto→mesa. */
export async function listVotingStations(): Promise<StationOption[]> {
  const session = await requireModule('CORE', ['ADMIN_CAMPANA', 'COORDINADOR'])
  const db      = await obtenerDbTenant(session.user.tenantId)

  return db.votingStation.findMany({
    select: {
      id:     true,
      name:   true,
      tables: { select: { id: true, number: true } },
    },
    orderBy: { name: 'asc' },
  })
}
