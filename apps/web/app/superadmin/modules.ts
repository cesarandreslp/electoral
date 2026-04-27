import type { ModuleKey } from './actions'

/**
 * Catálogo de módulos disponibles en CampaignOS.
 * Vive aquí (y no en `actions.ts`) porque Next.js exige que un archivo
 * `'use server'` exporte SOLO funciones async — un array no califica.
 */
export const ALL_MODULES: { key: ModuleKey; label: string; descripcion: string }[] = [
  { key: 'CORE',           label: 'CORE',           descripcion: 'Obligatorio — territorios, líderes, electores' },
  { key: 'ANALYTICS',      label: 'Analytics',      descripcion: 'KPIs, ranking de líderes, proyección de votos, agente IA' },
  { key: 'FORMACION',      label: 'Formación',      descripcion: 'Capacitación testigos, evaluaciones, simulacros' },
  { key: 'DIA_E',          label: 'Día E',          descripcion: 'Transmisión E-14, sala de situación, reclamaciones' },
  { key: 'COMUNICACIONES', label: 'Comunicaciones', descripcion: 'SMS/WhatsApp/email segmentado' },
  { key: 'FINANZAS',       label: 'Finanzas',       descripcion: 'Control de gastos, donaciones, límites legales' },
]
