/**
 * Hook de instrumentación de Next.js — se ejecuta UNA vez al iniciar el runtime,
 * antes de procesar la primera request.
 *
 * Doc: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Solo el runtime Node.js evalúa env vars de servidor; el Edge runtime
  // no ve las mismas variables y no es donde corre el provisioner.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { assertEnv } = await import('./lib/assert-env')
  assertEnv()
}
