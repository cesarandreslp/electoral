/**
 * Registro de pantallas asignables a un CustomRole — usado tanto por la UI de
 * armado de roles (matriz de checkboxes en Configuración) como por cada
 * `requireScreen()` en el código. CORE está a granularidad de sub-pantalla
 * (mismo nivel que el menú lateral); el resto de módulos, por ahora, a
 * granularidad de módulo completo (ver plan — Fase 2 los desglosa).
 */

export interface ScreenDef {
  label:  string
  modulo: string // moduleKey tal cual vive en activeModules — para agrupar en la UI
  path:   string // a dónde mandar a un rol personalizado cuyo primer permiso sea este
}

export const SCREENS: Record<string, ScreenDef> = {
  CORE_DASHBOARD:     { label: 'Dashboard',        modulo: 'CORE', path: '/core' },
  CORE_LIDERES:       { label: 'Líderes',           modulo: 'CORE', path: '/core/lideres' },
  CORE_ELECTORES:     { label: 'Electores',         modulo: 'CORE', path: '/core/electores' },
  CORE_IMPORTAR:      { label: 'Importar',          modulo: 'CORE', path: '/core/importar' },
  CORE_QR:            { label: 'QR de captación',   modulo: 'CORE', path: '/core/qr' },
  CORE_TERRITORIO:    { label: 'Territorio',        modulo: 'CORE', path: '/core/territorio' },
  CORE_AGENDA:        { label: 'Agenda',            modulo: 'CORE', path: '/core/agenda' },
  CORE_LOGISTICA:     { label: 'Logística',         modulo: 'CORE', path: '/core/logistica' },
  CORE_RUTAS:         { label: 'Rutas',             modulo: 'CORE', path: '/core/rutas' },
  CORE_ALERTAS:       { label: 'Alertas',           modulo: 'CORE', path: '/core/alertas' },
  CORE_CONFIGURACION: { label: 'Configuración',     modulo: 'CORE', path: '/core/configuracion' },

  // Resto de módulos — granularidad de módulo completo por ahora (Fase 2 los desglosa).
  ANALYTICS:      { label: 'Analytics',      modulo: 'ANALYTICS',      path: '/analytics' },
  FORMACION:      { label: 'Formación',      modulo: 'FORMACION',      path: '/formacion' },
  DIA_E:          { label: 'Día E',          modulo: 'DIA_E',          path: '/dia-e/sala' },
  COMUNICACIONES: { label: 'Comunicaciones', modulo: 'COMUNICACIONES', path: '/comunicaciones' },
  FINANZAS:       { label: 'Finanzas',       modulo: 'FINANZAS',       path: '/finanzas' },
  ENCUESTAS:      { label: 'Encuestas',      modulo: 'ENCUESTAS',      path: '/encuestas' },
}

export type ScreenKey = keyof typeof SCREENS

/** Screens agrupados por módulo, en el orden de declaración — para pintar la matriz. */
export function screensPorModulo(): Record<string, { key: string; label: string }[]> {
  const agrupado: Record<string, { key: string; label: string }[]> = {}
  for (const [key, def] of Object.entries(SCREENS)) {
    const lista = agrupado[def.modulo] ?? []
    lista.push({ key, label: def.label })
    agrupado[def.modulo] = lista
  }
  return agrupado
}

/**
 * A dónde mandar a un usuario recién logueado. Los roles fijos siempre
 * tienen algo que ver en /core; un rol PERSONALIZADO puede no tenerlo —
 * lo mandamos a la primera pantalla con canView en su CustomRole.
 */
export function destinoPostLogin(role: string, customPermissions: Record<string, { canView: boolean; canEdit: boolean }>): string {
  if (role === 'SUPERADMIN') return '/superadmin'
  if (role !== 'PERSONALIZADO') return '/core'

  const primeraPermitida = Object.entries(SCREENS).find(([key]) => customPermissions[key]?.canView)
  return primeraPermitida ? primeraPermitida[1].path : '/no-autorizado'
}
