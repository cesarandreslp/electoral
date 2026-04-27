import { createHash } from 'crypto'

/**
 * Calcula el SHA-256 de una cédula normalizada.
 * Solo debe llamarse desde server-side: el resultado nunca debe salir hacia el cliente.
 *
 * Vive aquí (y no en `core/actions.ts`) porque Next.js 15 exige que un archivo
 * `'use server'` exporte SOLO funciones async; un helper síncrono lo rompe.
 */
export function calcularCedulaHash(cedula: string): string {
  return createHash('sha256').update(cedula.trim()).digest('hex')
}
