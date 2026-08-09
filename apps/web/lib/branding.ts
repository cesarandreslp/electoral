import { auth } from '@campaignos/auth'
import { getTenantDb, superadminDb } from '@campaignos/db'
import { getTenantConnection } from '@/lib/tenant'

const SUPERADMIN_TENANT_ID = '__superadmin__'

export interface Branding {
  logoUrl:      string | null
  primaryColor: string | null
}

/** Branding del tenant de la sesión activa (logo + color). Null/vacío = branding Vectra por defecto. */
export async function getBranding(): Promise<Branding> {
  const session  = await auth()
  const tenantId = session?.user?.tenantId
  if (!tenantId || tenantId === SUPERADMIN_TENANT_ID) {
    return { logoUrl: null, primaryColor: null }
  }
  return getBrandingByTenantId(tenantId)
}

/** Branding de un tenant conocido por id — para páginas públicas sin sesión (ej: /electores/login). */
export async function getBrandingByTenantId(tenantId: string): Promise<Branding> {
  try {
    const db  = getTenantDb(await getTenantConnection(tenantId))
    const cfg = await db.tenantConfig.findUnique({
      where:  { tenantId },
      select: { logoUrl: true, primaryColor: true },
    })
    return { logoUrl: cfg?.logoUrl ?? null, primaryColor: cfg?.primaryColor ?? null }
  } catch {
    return { logoUrl: null, primaryColor: null }
  }
}

/** Branding de un tenant conocido por slug — para páginas públicas resueltas por ?c= (ej: /registro, /electores/login). */
export async function getBrandingBySlug(slug: string): Promise<Branding & { tenantId: string | null; tenantName: string | null }> {
  const tenant = await superadminDb.tenant.findUnique({ where: { slug }, select: { id: true, name: true, isActive: true } })
  if (!tenant || !tenant.isActive) return { logoUrl: null, primaryColor: null, tenantId: null, tenantName: null }
  const branding = await getBrandingByTenantId(tenant.id)
  return { ...branding, tenantId: tenant.id, tenantName: tenant.name }
}
