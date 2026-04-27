import path from 'node:path'
import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'

// TODO: Crear app/sw.ts con la configuración del service worker de Serwist
// antes de habilitar PWA en producción. Ver documentación: https://serwist.pages.dev/
const withSerwist = withSerwistInit({
  // Archivo fuente del service worker (en el directorio app/)
  swSrc: 'app/sw.ts',
  // Destino del service worker compilado (debe ser accesible en la raíz)
  swDest: 'public/sw.js',
  // Deshabilitar PWA en desarrollo para facilitar el hot reload
  disable: process.env.NODE_ENV === 'development',
  // Rutas a pre-cachear al instalar el service worker
  additionalPrecacheEntries: [
    { url: '/pwa', revision: null },
    { url: '/login', revision: null },
  ],
})

const nextConfig: NextConfig = {
  // Activar React Strict Mode para detectar efectos secundarios en desarrollo
  reactStrictMode: true,

  // El runtime Node.js del middleware se declara directamente en middleware.ts
  // mediante `export const runtime = 'nodejs'` (estable desde Next 15.5).

  // Monorepo: trazar dependencias desde la raíz del repo, no desde apps/web.
  // Sin esto, Next.js no encuentra los archivos de Prisma generados en
  // `<root>/node_modules/.pnpm/@prisma+client@*/...` y deja el binario fuera
  // del bundle del lambda.
  outputFileTracingRoot: path.join(__dirname, '../..'),

  // Forzar la inclusión del query engine de Prisma en TODAS las rutas server.
  // Sin este include, Vercel reporta "Could not locate the Query Engine for
  // runtime rhel-openssl-3.0.x" en runtime.
  outputFileTracingIncludes: {
    '/**/*': [
      '../../node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**/*',
      '../../node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client/**/*',
      '../../node_modules/.prisma/client/**/*',
      '../../node_modules/@prisma/client/**/*',
    ],
  },

  // Configuración de headers de seguridad
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'X-Frame-Options',            value: 'DENY' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default withSerwist(nextConfig)
