/**
 * Validación de variables de entorno críticas al levantar el server.
 *
 * Se invoca desde `instrumentation.ts`, que Next.js ejecuta UNA sola vez
 * al iniciar el runtime (Node y Edge). Si algo falla en producción, lanza
 * un error que aborta el boot — preferimos que el deploy falle visiblemente
 * antes que arrancar un server malconfigurado capaz de provisionar tenants
 * en modo mock o corromper datos cifrados.
 */

interface VarRequerida {
  nombre:        string
  descripcion:   string
  /** Si está definido, el valor NO puede coincidir con este placeholder. */
  placeholder?:  string
  /** Longitud mínima del valor (después de trim). */
  minLength?:    number
}

const VARS_PRODUCCION: VarRequerida[] = [
  {
    nombre:      'DATABASE_URL_SUPERADMIN',
    descripcion: 'Connection string de la DB del superadmin (Neon)',
    minLength:   20,
  },
  {
    nombre:      'NEXTAUTH_SECRET',
    descripcion: 'Secreto de NextAuth para firmar JWTs',
    placeholder: 'cambiar-por-secret-seguro-en-produccion',
    minLength:   16,
  },
  {
    nombre:      'ENCRYPTION_KEY',
    descripcion: 'Llave AES-256-GCM para cifrar PII y connection strings de tenants',
    minLength:   32,
  },
  {
    nombre:      'NEON_API_KEY',
    descripcion: 'API key de Neon — sin esto el provisioner cae al mock y NO crea DBs reales',
    minLength:   10,
  },
  {
    nombre:      'BLOB_READ_WRITE_TOKEN',
    descripcion: 'Token de Vercel Blob para actas E-14, certificados y comprobantes',
    minLength:   10,
  },
  // TENANT_BASE_DOMAIN es OPCIONAL: si no está, el middleware opera en
  // single-host (un solo hostname). Si está, habilita subdominios decorativos.
  {
    nombre:      'NEXTAUTH_URL',
    descripcion: 'URL canónica de la app (ej: "https://tu-dominio.co"). Requerida por NextAuth en producción',
    minLength:   10,
  },
]

/**
 * Valida las variables críticas. Lanza Error si falta alguna o usa placeholder.
 * En desarrollo (NODE_ENV !== 'production') solo emite warnings.
 */
export function assertEnv(): void {
  const enProduccion = process.env.NODE_ENV === 'production'
  const fallas: string[] = []

  for (const v of VARS_PRODUCCION) {
    const valor = (process.env[v.nombre] ?? '').trim()

    if (!valor) {
      fallas.push(`  · ${v.nombre} no definida — ${v.descripcion}`)
      continue
    }

    if (v.placeholder && valor === v.placeholder) {
      fallas.push(`  · ${v.nombre} sigue con valor placeholder — rotarla antes del deploy`)
      continue
    }

    if (v.minLength && valor.length < v.minLength) {
      fallas.push(`  · ${v.nombre} demasiado corta (${valor.length} < ${v.minLength} chars)`)
      continue
    }
  }

  if (fallas.length === 0) return

  const mensaje =
    `[assertEnv] Variables de entorno críticas mal configuradas:\n` +
    fallas.join('\n')

  if (enProduccion) {
    // En producción: abortar el boot. Un deploy roto es preferible a uno
    // que cree tenants en mock o corrompa datos cifrados con una llave inválida.
    throw new Error(mensaje)
  }

  // En desarrollo: warning. Permite seguir trabajando con .env incompleto.
  console.warn(`${mensaje}\n  (warning porque NODE_ENV !== 'production')`)
}
