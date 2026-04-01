import { superadminDb } from '@campaignos/db'

/** Información del tenant que se inyecta en la sesión y los Server Components */
export interface TenantInfo {
  id: string
  slug: string
  name: string
  /**
   * La connectionString llega cifrada de la DB.
   * Debe descifrarse con decrypt() de lib/crypto.ts antes de pasarla a getTenantDb().
   */
  connectionString: string
  /** Claves de los módulos activos para este tenant (ej: ["CORE", "ANALYTICS"]) */
  activeModules: string[]
}

/**
 * Busca un tenant por su slug o por su dominio propio.
 *
 * Usado principalmente en:
 *   - El middleware (para validar que el tenant existe antes de continuar)
 *   - Server Components del nivel raíz (para obtener el nombre y módulos)
 *
 * @param host - Slug del subdominio (ej: "campana-demo") o dominio propio
 *               (ej: "campana2026.com"). Nunca incluye el dominio base.
 * @returns TenantInfo si el tenant existe y está activo, null en caso contrario
 */
export async function getTenant(host: string): Promise<TenantInfo | null> {
  const tenant = await superadminDb.tenant.findFirst({
    where: {
      isActive: true,
      OR: [
        { slug: host },
        { domain: host },
      ],
    },
    include: {
      modules: {
        where:  { isActive: true },
        select: { moduleKey: true },
      },
    },
  })

  if (!tenant) return null

  return {
    id:   tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    // IMPORTANTE: connectionString está cifrada aquí.
    // Descifrar con decrypt() de lib/crypto.ts antes de llamar a getTenantDb()
    connectionString: tenant.connectionString,
    activeModules: tenant.modules.map((m) => m.moduleKey),
  }
}
