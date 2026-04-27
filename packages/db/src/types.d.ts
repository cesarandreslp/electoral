// dotenv@7 no incluye tipos propios y no existe @types/dotenv para esa versión.
// Solo se usa en scripts de CLI (`create-superadmin.ts`) — declaración mínima
// para que TypeScript no se queje del import.
declare module 'dotenv' {
  interface DotenvConfigOptions {
    path?:     string
    encoding?: string
    debug?:    boolean
  }
  interface DotenvConfigOutput {
    parsed?: Record<string, string>
    error?:  Error
  }
  export function config(options?: DotenvConfigOptions): DotenvConfigOutput
}
