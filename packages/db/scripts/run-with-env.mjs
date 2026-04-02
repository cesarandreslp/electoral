/**
 * Carga el .env de la raíz del monorepo y lanza cualquier comando con esas variables.
 * Reemplaza el uso de dotenv-cli en los scripts de package.json para compatibilidad
 * con Windows (dotenv-cli no siempre está disponible en el PATH de Windows).
 *
 * Uso: node scripts/run-with-env.mjs <comando> [args...]
 * Ejemplo: node scripts/run-with-env.mjs prisma migrate dev --schema=./prisma/schema.prisma
 */

import { createRequire } from 'module'
import { spawnSync }      from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath }  from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Cargar dotenv apuntando al .env de la raíz del monorepo (dos niveles arriba de packages/db/)
const require   = createRequire(import.meta.url)
const { config } = require('dotenv')
config({ path: resolve(__dirname, '../../../.env') })

// Lanzar el comando recibido como argumentos con el entorno ya enriquecido
const [, , ...args] = process.argv
const resultado = spawnSync(args[0], args.slice(1), {
  stdio:  'inherit',
  env:    process.env,
  shell:  true, // Necesario en Windows para resolver binarios en PATH
})

process.exit(resultado.status ?? 0)
