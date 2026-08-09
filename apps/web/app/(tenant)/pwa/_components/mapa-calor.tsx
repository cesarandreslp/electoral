'use client'

/**
 * Mapa de calor de "mi gente" en la PWA — versión simplificada del mapa del
 * dashboard (core/_components/mapa-electores.tsx), solo con los electores del
 * sub-árbol de quien inició sesión, coloreados por temperatura en vez de por
 * los 5 estados de compromiso uno a uno (más legible en un mapa chico: 3
 * zonas — fría/tibia/caliente — en vez de 5 colores).
 */

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

export interface PuntoCalor {
  id:               string
  name:             string
  lat:              number
  lng:              number
  commitmentStatus: string
}

type Temperatura = 'frio' | 'tibio' | 'caliente'

const TEMPERATURA_POR_ESTADO: Record<string, Temperatura> = {
  SIN_CONTACTAR: 'frio',
  CONTACTADO:    'frio',
  SIMPATIZANTE:  'tibio',
  COMPROMETIDO:  'caliente',
  VOTO_SEGURO:   'caliente',
}

const COLOR_TEMPERATURA: Record<Temperatura, string> = {
  frio:     '#3b82f6',
  tibio:    '#f59e0b',
  caliente: '#ef4444',
}

const ETIQUETA_TEMPERATURA: Record<Temperatura, string> = {
  frio:     'Fría',
  tibio:    'Tibia',
  caliente: 'Caliente',
}

export function MapaCalor({ puntos }: { puntos: PuntoCalor[] }) {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapaRef    = useRef<import('leaflet').Map | null>(null)

  useEffect(() => {
    let cancelado = false
    void (async () => {
      const L = (await import('leaflet')).default
      if (cancelado || !contenedor.current) return

      if (!mapaRef.current) {
        mapaRef.current = L.map(contenedor.current).setView([4.6, -74.08], 5)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 19,
        }).addTo(mapaRef.current)
      }
      const mapa = mapaRef.current

      const capa = L.featureGroup()
      for (const p of puntos) {
        const temp  = TEMPERATURA_POR_ESTADO[p.commitmentStatus] ?? 'frio'
        const color = COLOR_TEMPERATURA[temp]
        L.circleMarker([p.lat, p.lng], {
          radius: 9, weight: 2, color: '#fff', fillOpacity: 1, fillColor: color,
        })
          .bindPopup(`<b>${p.name}</b><br>Zona ${ETIQUETA_TEMPERATURA[temp].toLowerCase()}`)
          .addTo(capa)
      }
      capa.addTo(mapa)

      if (capa.getLayers().length > 0) mapa.fitBounds(capa.getBounds().pad(0.3))
    })()

    return () => { cancelado = true }
  }, [puntos])

  useEffect(() => () => {
    if (mapaRef.current) { mapaRef.current.remove(); mapaRef.current = null }
  }, [])

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
        {(['frio', 'tibio', 'caliente'] as const).map((t) => (
          <span key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLOR_TEMPERATURA[t], display: 'inline-block' }} />
            {ETIQUETA_TEMPERATURA[t]}
          </span>
        ))}
      </div>
      <div
        ref={contenedor}
        style={{ height: 220, width: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0', zIndex: 0 }}
      />
    </div>
  )
}
