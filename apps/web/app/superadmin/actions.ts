'use server'

/**
 * Server Actions del superadmin.
 * Toda acción verifica rol SUPERADMIN antes de operar.
 * La connectionString NUNCA aparece en ningún valor de retorno.
 */

import {
  superadminDb,
  getTenantDb,
  provisionTenantDatabase,
  mockProvisionTenantDatabase,
  SlugTakenError,
} from '@campaignos/db'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-helpers'

// ── Tipos exportados ──────────────────────────────────────────────────────────

export type ModuleKey =
  | 'CORE'
  | 'ANALYTICS'
  | 'FORMACION'
  | 'DIA_E'
  | 'COMUNICACIONES'
  | 'FINANZAS'

export interface CreateTenantInput {
  name:          string
  slug:          string
  adminEmail:    string
  adminPassword: string
  modules:       ModuleKey[]
}

export interface TenantSummary {
  id:            string
  name:          string
  slug:          string
  domain:        string | null
  isActive:      boolean
  activeModules: string[]
  createdAt:     Date
}

// ── Server Actions ────────────────────────────────────────────────────────────

/**
 * Crea un nuevo tenant: provisiona la DB en Neon, crea el usuario administrador
 * y activa los módulos seleccionados. CORE siempre se activa.
 *
 * @returns { success: true, tenantId } o { success: false, error: string }
 */
export async function createTenant(
  data: CreateTenantInput
): Promise<{ success: true; tenantId: string } | { success: false; error: string }> {
  try {
    await requireAuth(['SUPERADMIN'])

    // Validar slug: solo minúsculas, números y guiones, mínimo 3 caracteres
    const regexSlug = /^[a-z0-9-]{3,}$/
    if (!regexSlug.test(data.slug)) {
      return {
        success: false,
        error: 'El slug solo puede contener minúsculas, números y guiones (mínimo 3 caracteres).',
      }
    }

    // Provisionar la DB del tenant — real si hay NEON_API_KEY, mock si no
    const connectionStringPlana = process.env.NEON_API_KEY
      ? await provisionTenantDatabase(data.slug)
      : await mockProvisionTenantDatabase(data.slug)

    // Actualizar el nombre del tenant (el provisioner usa el slug como nombre temporal)
    const tenant = await superadminDb.tenant.update({
      where: { slug: data.slug },
      data:  { name: data.name },
    })

    // Activar módulos — CORE siempre incluido
    const modulos: ModuleKey[] = Array.from(new Set(['CORE' as ModuleKey, ...data.modules]))
    await superadminDb.tenantModule.createMany({
      data:           modulos.map(moduleKey => ({ tenantId: tenant.id, moduleKey, isActive: true })),
      skipDuplicates: true,
    })

    // Crear usuario administrador en la DB del TENANT (no del superadmin)
    const tenantDb      = getTenantDb(connectionStringPlana)
    const passwordHash  = await bcrypt.hash(data.adminPassword, 12)
    await tenantDb.user.create({
      data: {
        tenantId:     tenant.id,
        email:        data.adminEmail,
        passwordHash,
        role:         'ADMIN_CAMPANA',
        isActive:     true,
      },
    })

    revalidatePath('/superadmin/clientes')
    return { success: true, tenantId: tenant.id }

  } catch (err) {
    if (err instanceof SlugTakenError) {
      return { success: false, error: `El slug "${data.slug}" ya está en uso.` }
    }
    // Log del error real en servidor, mensaje genérico al cliente
    console.error('[createTenant]', err instanceof Error ? err.message : err)
    return { success: false, error: 'Error interno al crear el tenant. Revisar logs del servidor.' }
  }
}

/**
 * Lista todos los tenants con sus módulos activos.
 * NUNCA incluye connectionString en el retorno.
 */
export async function listTenants(): Promise<TenantSummary[]> {
  await requireAuth(['SUPERADMIN'])

  const tenants = await superadminDb.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      modules: {
        where:  { isActive: true },
        select: { moduleKey: true },
      },
    },
  })

  // Mapeo explícito — garantiza que connectionString nunca se filtre
  return tenants.map(t => ({
    id:            t.id,
    name:          t.name,
    slug:          t.slug,
    domain:        t.domain,
    isActive:      t.isActive,
    activeModules: t.modules.map(m => m.moduleKey),
    createdAt:     t.createdAt,
  }))
}

/**
 * Alterna el estado activo/inactivo de un tenant.
 * Un tenant inactivo no puede autenticarse ni acceder a sus rutas.
 *
 * @returns { success: boolean, isActive: boolean }
 */
export async function toggleTenantStatus(
  tenantId: string
): Promise<{ success: boolean; isActive: boolean }> {
  try {
    await requireAuth(['SUPERADMIN'])

    const actual = await superadminDb.tenant.findUnique({
      where:  { id: tenantId },
      select: { isActive: true },
    })

    if (!actual) return { success: false, isActive: false }

    const actualizado = await superadminDb.tenant.update({
      where:  { id: tenantId },
      data:   { isActive: !actual.isActive },
      select: { isActive: true },
    })

    revalidatePath('/superadmin/clientes')
    return { success: true, isActive: actualizado.isActive }

  } catch (err) {
    console.error('[toggleTenantStatus]', err instanceof Error ? err.message : err)
    return { success: false, isActive: false }
  }
}
