'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import 'leaflet/dist/leaflet.css'
import { geocodificarPendientes, type VoterGeo, type GeoStats } from '../actions'

const COLOR_ESTADO: Record<string, string> = {
  SIN_CONTACTAR: '#94a3b8',
  CONTACTADO:    '#3b82f6',
  SIMPATIZANTE:  '#eab308',
  COMPROMETIDO:  '#22c55e',
  VOTO_SEGURO:   '#15803d',
}

export function MapaElectores({ puntos, geoStats }: { puntos: VoterGeo[]; geoStats: GeoStats }) {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapaRef    = useRef<import('leaflet').Map | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    let cancelado = false
    void (async () => {
      const L = (await import('leaflet')).default
      if (cancelado || !contenedor.current || mapaRef.current) return

      const mapa = L.map(contenedor.current).setView([4.6, -74.08], 5) // centro Colombia
      mapaRef.current = mapa
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(mapa)

      const capa = L.featureGroup()
      for (const p of puntos) {
        L.circleMarker([p.lat, p.lng], {
          radius: 6, weight: 1, fillOpacity: 0.85,
          color: COLOR_ESTADO[p.commitmentStatus] ?? '#94a3b8',
          fillColor: COLOR_ESTADO[p.commitmentStatus] ?? '#94a3b8',
        })
          .bindPopup(`<b>${p.name}</b><br>${p.commitmentStatus.replace(/_/g, ' ')}`)
          .addTo(capa)
      }
      capa.addTo(mapa)
      if (puntos.length > 0) mapa.fitBounds(capa.getBounds().pad(0.2))
    })()

    return () => {
      cancelado = true
      if (mapaRef.current) { mapaRef.current.remove(); mapaRef.current = null }
    }
  }, [puntos])

  function ubicar() {
    setMsg(null)
    startTransition(async () => {
      const res = await geocodificarPendientes()
      setMsg(`Ubicados ${res.geocodificados}. Quedan ${res.restantes} pendientes.`)
      router.refresh() // recarga los puntos del server component
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
          {puntos.length} ubicados · {geoStats.pendientes} pendientes
        </span>
        {geoStats.pendientes > 0 && (
          <button
            onClick={ubicar}
            disabled={isPending}
            style={{
              background: isPending ? '#94a3b8' : '#0f172a', color: '#fff', border: 'none',
              padding: '0.4rem 0.9rem', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600,
              cursor: isPending ? 'wait' : 'pointer',
            }}
          >
            {isPending ? 'Ubicando…' : `Ubicar ${Math.min(5, geoStats.pendientes)} pendientes`}
          </button>
        )}
        {msg && <span style={{ fontSize: '0.8rem', color: '#166534' }}>{msg}</span>}
      </div>

      <div
        ref={contenedor}
        style={{ height: 420, width: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0', zIndex: 0 }}
      />

      {puntos.length === 0 && geoStats.pendientes === 0 && (
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.5rem' }}>
          Aún no hay electores con dirección para ubicar. Agrega direcciones al registrar electores.
        </p>
      )}
    </div>
  )
}
