/**
 * Helpers de autorización para Server Actions y Server Components.
 *
 * Uso típico en una Server Action:
 *   const session = await requireAuth(['ADMIN_CAMPANA', 'COORDINADOR'])
 *   // Si llega aquí, session.user.role es uno de los roles permitidos
 */

import { auth } from '@campaignos/auth'
import { type UserRole } from '@campaignos/auth'
import { redirect } from 'next/navigation'

// ── Errores tipados ───────────────────────────────────────────────────────────

/** Lanzado cuando el usuario no tiene sesión activa */
export class NoAutenticadoError extends Error {
  constructor() {
    super('No autenticado. Inicia sesión para continuar.')
    this.name = 'NoAutenticadoError'
  }
}

/** Lanzado cuando el usuario no tiene el rol requerido */
export class NoAutorizadoError extends Error {
  constructor(rolesRequeridos: UserRole[]) {
    super(`Acceso denegado. Roles requeridos: ${rolesRequeridos.join(', ')}.`)
    this.name = 'NoAutorizadoError'
  }
}

/** Lanzado cuando el módulo requerido no está activo para el tenant */
export class ModuloInactivoError extends Error {
  constructor(moduleKey: string) {
    super(`El módulo "${moduleKey}" no está activo para este tenant.`)
    this.name = 'ModuloInactivoError'
  }
}

// ── Tipo de sesión verificada ─────────────────────────────────────────────────

type SessionVerificada = Awaited<ReturnType<typeof auth>> & object

// ── requireAuth ───────────────────────────────────────────────────────────────

/**
 * Verifica que el caller tiene sesión activa y uno de los roles permitidos.
 *
 * Uso en Server Actions: lanza NoAutenticadoError / NoAutorizadoError.
 * Uso en Server Components: usar requireAuthOrRedirect() en su lugar.
 *
 * @param rolesPermitidos - Lista de roles que pueden ejecutar la acción.
 *                          Si está vacía, acepta cualquier rol autenticado.
 * @returns La sesión verificada (nunca null)
 * @throws NoAutenticadoError si no hay sesión
 * @throws NoAutorizadoError si el rol no está en la lista
 */
export async function requireAuth(rolesPermitidos: UserRole[] = []): Promise<SessionVerificada> {
  const session = await auth()

  if (!session?.user) {
    throw new NoAutenticadoError()
  }

  if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(session.user.role)) {
    throw new NoAutorizadoError(rolesPermitidos)
  }

  return session as SessionVerificada
}

// ── requireModule ─────────────────────────────────────────────────────────────

/**
 * Verifica que el tenant del caller tiene el módulo requerido activo.
 * Llama a requireAuth() internamente — no necesitas llamarlo antes.
 *
 * @param moduleKey   - Clave del módulo requerido (ej: 'ANALYTICS')
 * @param rolesPermitidos - Roles adicionales requeridos (opcional)
 * @throws ModuloInactivoError si el módulo no está activo
 */
export async function requireModule(
  moduleKey: string,
  rolesPermitidos: UserRole[] = [],
): Promise<SessionVerificada> {
  const session = await requireAuth(rolesPermitidos)

  if (!session.user.activeModules.includes(moduleKey)) {
    throw new ModuloInactivoError(moduleKey)
  }

  return session
}

// ── requireAuthOrRedirect ─────────────────────────────────────────────────────

/**
 * Versión para Server Components: redirige en lugar de lanzar.
 * Útil en layouts y páginas protegidas.
 *
 * @param rolesPermitidos - Lista de roles permitidos
 * @param rutaLogin       - Ruta de login a la que redirigir si no hay sesión
 */
export async function requireAuthOrRedirect(
  rolesPermitidos: UserRole[] = [],
  rutaLogin: string = '/login',
): Promise<SessionVerificada> {
  const session = await auth()

  if (!session?.user) {
    redirect(rutaLogin)
  }

  if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(session.user.role)) {
    redirect('/no-autorizado')
  }

  return session as SessionVerificada
}
