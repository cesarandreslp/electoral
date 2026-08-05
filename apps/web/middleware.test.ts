/**
 * Chequeo del bucle de redirecciones entre /superadmin y /login.
 *
 * En producción NextAuth guarda la sesión en `__Secure-authjs.session-token`.
 * getToken() de @auth/core asume `secureCookie: false` y tampoco lee el secreto
 * del entorno, así que sin ambos parámetros devuelve null y el middleware cree
 * que nadie tiene sesión.
 *
 * Correr con: npx tsx middleware.test.ts    (desde apps/web)
 */
import assert from 'node:assert/strict'
import { encode, getToken } from 'next-auth/jwt'

const SECRET = 'secreto-de-prueba-no-usado-en-produccion'
const COOKIE_HTTPS = '__Secure-authjs.session-token'

/** Request mínimo con la cookie que NextAuth pondría sobre HTTPS */
function requestConSesion(cookieName: string, jwt: string) {
  return {
    headers: new Headers({ cookie: `${cookieName}=${jwt}` }),
  } as unknown as Request
}

async function main() {
  // El salt de cifrado es el propio nombre de la cookie
  const jwt = await encode({
    token:  { email: 'alguien@vectra.test', role: 'SUPERADMIN' },
    secret: SECRET,
    salt:   COOKIE_HTTPS,
  })
  const req = requestConSesion(COOKIE_HTTPS, jwt)

  // Como lo llama el middleware corregido
  const conFix = await getToken({
    req,
    secret:       SECRET,
    secureCookie: true,
  })
  assert.equal(conFix?.role, 'SUPERADMIN', 'con secret + secureCookie debe leer la sesión')

  // Como lo llamaba antes: sin secret y sin secureCookie
  const sinFix = await getToken({ req } as Parameters<typeof getToken>[0])
  assert.equal(sinFix, null, 'sin los parámetros debe fallar — esto causaba el bucle')

  console.log('OK: getToken lee la cookie __Secure- solo con secret + secureCookie')
}

main().catch((e) => {
  console.error('FALLÓ:', e.message)
  process.exit(1)
})
