/// <reference lib="webworker" />
/// <reference types="@serwist/next/typings" />

import { defaultCache }  from '@serwist/next/worker'
import { Serwist, NetworkFirst } from 'serwist'

/**
 * Service worker de CampaignOS.
 * Configura las estrategias de caché para las rutas de la PWA.
 *
 * Estrategias usadas:
 *   - NetworkFirst: intenta red primero; si falla, sirve desde caché.
 *     Usada en las rutas de la API del Core para soporte offline.
 *   - Las rutas estáticas y assets usan el caché predeterminado de Serwist.
 */

import type { PrecacheEntry } from 'serwist'
declare const self: ServiceWorkerGlobalScope & { __SW_MANIFEST: (PrecacheEntry | string)[] }

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting:     true,   // Activar el nuevo SW sin esperar a que el tab se cierre
  clientsClaim:    true,   // Tomar control inmediato de todos los tabs abiertos

  runtimeCaching: [
    // ── API Core — NetworkFirst para soporte offline ───────────────────────
    {
      matcher: /^\/api\/core\//,
      handler: new NetworkFirst({
        cacheName:             'api-core-cache',
        networkTimeoutSeconds: 5,   // Si la red tarda más de 5s, usar caché
        plugins: [
          { cacheWillUpdate: async ({ response }) =>
            response?.status === 200 ? response : null },
        ],
      }),
    },

    // ── Páginas de la PWA (/pwa/) — NetworkFirst ──────────────────────────
    {
      matcher: /^\/pwa\//,
      handler: new NetworkFirst({
        cacheName:             'pwa-pages-cache',
        networkTimeoutSeconds: 3,
        plugins: [
          { cacheWillUpdate: async ({ response }) =>
            response?.status === 200 ? response : null },
        ],
      }),
    },

    // ── Assets estáticos de Next.js — CacheFirst (cambian con hash) ───────
    ...defaultCache,
  ],
})

serwist.addEventListeners()
