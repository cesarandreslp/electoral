'use server'

/**
 * Server Actions de la Configuración de la campaña (solo ADMIN_CAMPANA).
 * - Las claves de IA se CIFRAN antes de guardar y NUNCA se devuelven al cliente.
 * - El dominio propio vive en Tenant (DB del superadmin); el resto en TenantConfig.
 */

import { requireAuth }           from '@/lib/auth-helpers'
import { getTenantConnection }   from '@/lib/tenant'
import { getTenantDb, superadminDb, encrypt } from '@campaignos/db'
import { revalidatePath }        from 'next/cache'

export interface ConfiguracionView {
  hasGroqKey:   boolean
  hasZhipuKey:  boolean
  logoUrl:      string | null
  primaryColor: string | null
  domain:       string | null
}

export interface GuardarConfigInput {
  groqApiKey?:   string  // vacío/omitido = no cambiar
  zhipuApiKey?:  string  // vacío/omitido = no cambiar
  primaryColor?: string  // hex, "" = limpiar
  domain?:       string  // "" = limpiar
}

async function dbTenant(tenantId: string) {
  return getTenantDb(await getTenantConnection(tenantId))
}

export async function getConfiguracion(): Promise<ConfiguracionView> {
  const session = await requireAuth(['ADMIN_CAMPANA'])
  const db      = await dbTenant(session.user.tenantId)

  const cfg    = await db.tenantConfig.findUnique({ where: { tenantId: session.user.tenantId } })
  const tenant = await superadminDb.tenant.findUnique({
    where:  { id: session.user.tenantId },
    select: { domain: true },
  })

  return {
    hasGroqKey:   Boolean(cfg?.groqApiKey),
    hasZhipuKey:  Boolean(cfg?.zhipuApiKey),
    logoUrl:      cfg?.logoUrl ?? null,
    primaryColor: cfg?.primaryColor ?? null,
    domain:       tenant?.domain ?? null,
  }
}

export async function guardarConfiguracion(
  input: GuardarConfigInput,
): Promise<{ success: true } | { success: false; error: string }> {
  const session  = await requireAuth(['ADMIN_CAMPANA'])
  const tenantId = session.user.tenantId
  const db       = await dbTenant(tenantId)

  // Validación mínima del color (hex).
  if (input.primaryColor && !/^#[0-9a-fA-F]{6}$/.test(input.primaryColor)) {
    return { success: false, error: 'El color primario debe ser un hex como #7d2839.' }
  }

  // TenantConfig: solo se actualiza lo provisto. Las claves solo se tocan si
  // llegan no vacías (así "guardar" sin re-escribir la clave no la borra).
  const dataConfig: Record<string, unknown> = {}
  if (input.groqApiKey?.trim())  dataConfig.groqApiKey  = encrypt(input.groqApiKey.trim())
  if (input.zhipuApiKey?.trim()) dataConfig.zhipuApiKey = encrypt(input.zhipuApiKey.trim())
  if (input.primaryColor !== undefined) dataConfig.primaryColor = input.primaryColor || null

  await db.tenantConfig.upsert({
    where:  { tenantId },
    update: dataConfig,
    create: { tenantId, ...dataConfig },
  })

  // Dominio propio → Tenant (DB del superadmin). @unique: puede chocar.
  if (input.domain !== undefined) {
    try {
      await superadminDb.tenant.update({
        where: { id: tenantId },
        data:  { domain: input.domain.trim() || null },
      })
    } catch {
      return { success: false, error: 'Ese dominio ya está en uso por otra campaña.' }
    }
  }

  revalidatePath('/core/configuracion')
  return { success: true }
}
