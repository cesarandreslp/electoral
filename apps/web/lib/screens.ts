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
}

export const SCREENS: Record<string, ScreenDef> = {
  CORE_DASHBOARD:     { label: 'Dashboard',        modulo: 'CORE' },
  CORE_LIDERES:       { label: 'Líderes',           modulo: 'CORE' },
  CORE_ELECTORES:     { label: 'Electores',         modulo: 'CORE' },
  CORE_IMPORTAR:      { label: 'Importar',          modulo: 'CORE' },
  CORE_QR:            { label: 'QR de captación',   modulo: 'CORE' },
  CORE_TERRITORIO:    { label: 'Territorio',        modulo: 'CORE' },
  CORE_AGENDA:        { label: 'Agenda',            modulo: 'CORE' },
  CORE_LOGISTICA:     { label: 'Logística',         modulo: 'CORE' },
  CORE_RUTAS:         { label: 'Rutas',             modulo: 'CORE' },
  CORE_ALERTAS:       { label: 'Alertas',           modulo: 'CORE' },
  CORE_CONFIGURACION: { label: 'Configuración',     modulo: 'CORE' },

  // Resto de módulos — granularidad de módulo completo por ahora (Fase 2 los desglosa).
  ANALYTICS:      { label: 'Analytics',      modulo: 'ANALYTICS' },
  FORMACION:      { label: 'Formación',      modulo: 'FORMACION' },
  DIA_E:          { label: 'Día E',          modulo: 'DIA_E' },
  COMUNICACIONES: { label: 'Comunicaciones', modulo: 'COMUNICACIONES' },
  FINANZAS:       { label: 'Finanzas',       modulo: 'FINANZAS' },
  ENCUESTAS:      { label: 'Encuestas',      modulo: 'ENCUESTAS' },
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
