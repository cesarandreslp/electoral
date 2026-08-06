/**
 * Helpers de lectura por consola para los scripts CLI de administración.
 * Extraídos de create-superadmin.ts para reutilizarlos sin duplicar.
 */

import { createInterface } from 'readline'

/** Lee una línea de texto desde stdin con un prompt visible. */
export function readLine(prompt: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(prompt, (respuesta) => {
      rl.close()
      resolve(respuesta.trim())
    })
  })
}

/**
 * Lee una contraseña desde stdin sin mostrar los caracteres.
 * Muestra '*' por cada carácter escrito. Soporta backspace.
 */
export function readPassword(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(prompt)

    const stdin = process.stdin

    // Activar modo raw para capturar tecla a tecla
    if (stdin.isTTY) stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')

    let password = ''

    function handler(caracter: string) {
      caracter = String(caracter)

      switch (caracter) {
        case '\n':
        case '\r':
        case '': // Ctrl+D — EOF
          if (stdin.isTTY) stdin.setRawMode(false)
          stdin.pause()
          stdin.removeListener('data', handler)
          process.stdout.write('\n')
          resolve(password)
          break

        case '': // Ctrl+C — cancelar
          process.stdout.write('\n')
          console.log('Cancelado.')
          process.exit(0)
          break

        case '': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1)
            process.stdout.write('\b \b')
          }
          break

        default:
          // Solo agregar caracteres imprimibles
          if (caracter >= ' ') {
            password += caracter
            process.stdout.write('*')
          }
          break
      }
    }

    stdin.on('data', handler)
  })
}
