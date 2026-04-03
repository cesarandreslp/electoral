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

  experimental: {
    // Habilitar runtime Node.js en el middleware.
    // Necesario porque middleware.ts importa @campaignos/db → ws (módulo Node.js puro).
    // Sin esto, Next.js intenta correr el middleware en Edge Runtime y falla.
    // @ts-expect-error — nodeMiddleware existe en Next 15.x pero aún no está en los tipos publicados
    nodeMiddleware: true,
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
