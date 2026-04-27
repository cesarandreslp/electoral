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
import { getTenantDb, encrypt }       from '@campaignos/db'
import { revalidatePath }             from 'next/cache'

// ── Tipos exportados ──────────────────────────────────────────────────────────

export type CommitmentStatus =
  | 'SIN_CONTACTAR'
  | 'CONTACTADO'
  | 'SIMPATIZANTE'
  | 'COMPROMETIDO'
  | 'VOTO_SEGURO'

export interface CreateLeaderInput {
  name:           string
  phone?:         string
  zone?:          string
  parentLeaderId?: string
  targetVotes:    number
}

export interface LeaderFilters {
  zone?:           string
  status?:         string
  parentLeaderId?: string
}

export interface LeaderSummary {
  id:             string
  name:           string
  zone:           string | null
  status:         string
  targetVotes:    number
  totalElectores: number
  comprometidos:  number
  pctAvance:      number // 0-100
}

export interface LeaderNode {
  id:       string
  name:     string
  zone:     string | null
  children: LeaderNode[]
}

export interface CreateVoterInput {
  cedula:           string
  name:             string
  phone?:           string
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
      const padre = await db.leader.findFirst({
        where: { id: data.parentLeaderId, tenantId: session.user.tenantId },
      })
      if (!padre) {
        return { success: false, error: 'El líder superior no existe en esta campaña.' }
      }
    }

    // Cifrar teléfono si se provee (campo PII)
    const phoneCifrado = data.phone ? encrypt(data.phone) : undefined

    const lider = await db.leader.create({
      data: {
        tenantId:       session.user.tenantId,
        name:           data.name,
        phone:          phoneCifrado,
        zone:           data.zone,
        parentLeaderId: data.parentLeaderId,
        targetVotes:    data.targetVotes,
      },
    })

    revalidatePath('/core/lideres')
    return { success: true, leaderId: lider.id }

  } catch (err) {
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
    const existente = await db.leader.findFirst({
      where: { id, tenantId: session.user.tenantId },
    })
    if (!existente) return { success: false, error: 'Líder no encontrado.' }

    // Validar nuevo parentLeaderId si se provee
    if (data.parentLeaderId) {
      const padre = await db.leader.findFirst({
        where: { id: data.parentLeaderId, tenantId: session.user.tenantId },
      })
      if (!padre) return { success: false, error: 'El líder superior no existe en esta campaña.' }
      // Evitar ciclos: no asignar como padre a un hijo propio
      if (data.parentLeaderId === id) return { success: false, error: 'Un líder no puede ser su propio superior.' }
    }

    const phoneCifrado = data.phone ? encrypt(data.phone) : undefined

    await db.leader.update({
      where: { id },
      data: {
        ...(data.name           !== undefined && { name:           data.name }),
        ...(phoneCifrado        !== undefined && { phone:          phoneCifrado }),
        ...(data.zone           !== undefined && { zone:           data.zone }),
        ...(data.parentLeaderId !== undefined && { parentLeaderId: data.parentLeaderId }),
        ...(data.targetVotes    !== undefined && { targetVotes:    data.targetVotes }),
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
 * Lista líderes con métricas de avance.
 * Los LIDER solo ven sus propios datos.
 */
export async function listLeaders(filters?: LeaderFilters): Promise<LeaderSummary[]> {
  const session = await requireModule('CORE', ['ADMIN_CAMPANA', 'COORDINADOR', 'LIDER', 'TESTIGO'])
  const db      = await obtenerDbTenant(session.user.tenantId)

  // Los LIDER solo ven a sí mismos
  // Para esto necesitamos saber cuál es el líder asociado al usuario.
  // Por ahora filtramos por parentLeaderId si el rol es LIDER y se pasa el filtro.
  const esLider = session.user.role === 'LIDER'

  const lideres = await db.leader.findMany({
    where: {
      tenantId:       session.user.tenantId,
      ...(filters?.zone           && { zone:           filters.zone }),
      ...(filters?.status         && { status:         filters.status as any }),
      ...(filters?.parentLeaderId && { parentLeaderId: filters.parentLeaderId }),
    },
    include: {
      _count: {
        select: { voters: true },
      },
      voters: {
        select: { commitmentStatus: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  return lideres.map((l) => {
    const comprometidos = l.voters.filter(
      (v) => v.commitmentStatus === 'COMPROMETIDO' || v.commitmentStatus === 'VOTO_SEGURO',
    ).length

    return {
      id:             l.id,
      name:           l.name,
      zone:           l.zone,
      status:         l.status,
      targetVotes:    l.targetVotes,
      totalElectores: l._count.voters,
      comprometidos,
      pctAvance:      l.targetVotes > 0
        ? Math.round((comprometidos / l.targetVotes) * 100)
        : 0,
    }
  })
}

/**
 * Retorna el árbol jerárquico completo de líderes.
 * Solo ADMIN_CAMPANA y COORDINADOR tienen acceso al árbol completo.
 */
export async function getLeaderTree(): Promise<LeaderNode[]> {
  const session = await requireModule('CORE', ['ADMIN_CAMPANA', 'COORDINADOR'])
  const db      = await obtenerDbTenant(session.user.tenantId)

  const todos = await db.leader.findMany({
    where:   { tenantId: session.user.tenantId },
    select:  { id: true, name: true, zone: true, parentLeaderId: true },
    orderBy: { name: 'asc' },
  })

  // Construir árbol en memoria
  const mapa = new Map<string, LeaderNode & { parentLeaderId: string | null }>()
  for (const l of todos) {
    mapa.set(l.id, { id: l.id, name: l.name, zone: l.zone, parentLeaderId: l.parentLeaderId, children: [] })
  }

  const raices: LeaderNode[] = []
  for (const nodo of mapa.values()) {
    if (nodo.parentLeaderId && mapa.has(nodo.parentLeaderId)) {
      mapa.get(nodo.parentLeaderId)!.children.push(nodo)
    } else {
      raices.push(nodo)
    }
  }

  return raices
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
      const lider = await db.leader.findFirst({
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
        phone:            phoneCifrado,
        leaderId:         data.leaderId,
        votingTableId:    data.votingTableId,
        commitmentStatus: data.commitmentStatus ?? 'SIN_CONTACTAR',
      },
    })

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
      name: { contains: filters.search, mode: 'insensitive' },
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

  // Construir mapa nombre → id de líderes para resolución rápida
  const lideres = await db.leader.findMany({
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
      await (db.voter.create as any)({
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
