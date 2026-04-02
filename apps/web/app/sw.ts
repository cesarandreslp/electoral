import { defaultCache } from '@serwist/next/worker'
import { Serwist }      from 'serwist'

/**
 * Service worker de CampaignOS.
 * Configura las estrategias de caché para las rutas de la PWA.
 *
 * Estrategias usadas:
 *   - NetworkFirst: intenta red primero; si falla, sirve desde caché.
 *     Usada en las rutas de la API del Core para soporte offline.
 *   - Las rutas estáticas y assets usan el caché predeterminado de Serwist.
 */

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting:     true,   // Activar el nuevo SW sin esperar a que el tab se cierre
  clientsClaim:    true,   // Tomar control inmediato de todos los tabs abiertos

  runtimeCaching: [
    // ── API Core — NetworkFirst para soporte offline ───────────────────────
    {
      matcher:  /^\/api\/core\//,
      handler:  'NetworkFirst',
      options: {
        cacheName:        'api-core-cache',
        networkTimeoutSeconds: 5,   // Si la red tarda más de 5s, usar caché
        expiration: {
          maxEntries:       200,
          maxAgeSeconds:    24 * 60 * 60, // 1 día
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },

    // ── Páginas de la PWA (/pwa/) — NetworkFirst ──────────────────────────
    {
      matcher:  /^\/pwa\//,
      handler:  'NetworkFirst',
      options: {
        cacheName:        'pwa-pages-cache',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries:       50,
          maxAgeSeconds:    7 * 24 * 60 * 60, // 7 días
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },

    // ── Assets estáticos de Next.js — CacheFirst (cambian con hash) ───────
    ...defaultCache,
  ],
})

serwist.addEventListeners()
