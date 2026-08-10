/**
 * Un elector se considera "líder" solo con 10 o más electores DIRECTOS
 * debajo de él — las líneas indirectas (los electores de sus electores)
 * cuentan para el tamaño de su organización, pero no para este umbral.
 *
 * Vive fuera de core/actions.ts porque un archivo 'use server' solo puede
 * exportar funciones async, no constantes.
 */
export const UMBRAL_LIDER_DIRECTOS = 10
