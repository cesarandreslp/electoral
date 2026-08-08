'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import 'leaflet/dist/leaflet.css'
import { geocodificarPendientes, type VoterGeo, type GeoStats, type StationGeo, type ComunaGeo } from '../actions'

const COLOR_ESTADO: Record<string, string> = {
  SIN_CONTACTAR: '#94a3b8',
  CONTACTADO:    '#3b82f6',
  SIMPATIZANTE:  '#eab308',
  COMPROMETIDO:  '#22c55e',
  VOTO_SEGURO:   '#15803d',
}

const COLOR_JURISDICCION: Record<StationGeo['estado'], string> = {
  CUENTA:    '#22c55e',
  NO_CUENTA: '#ef4444',
}

type Vista = 'residencia' | 'puesto' | 'comuna'

const ETIQUETA_VISTA: Record<Vista, string> = {
  residencia: 'Por residencia',
  puesto:     'Por puesto de votación',
  comuna:     'Por comuna',
}

function dibujarCapaResidencia(L: typeof import('leaflet'), capa: import('leaflet').FeatureGroup, puntos: VoterGeo[]) {
  for (const p of puntos) {
    L.circleMarker([p.lat, p.lng], {
      radius: 6, weight: 1, fillOpacity: 0.85,
      color: COLOR_ESTADO[p.commitmentStatus] ?? '#94a3b8',
      fillColor: COLOR_ESTADO[p.commitmentStatus] ?? '#94a3b8',
    })
      .bindPopup(`<b>${p.name}</b><br>${p.commitmentStatus.replace(/_/g, ' ')}`)
      .addTo(capa)
  }
}

function dibujarCapaComunas(L: typeof import('leaflet'), capa: import('leaflet').FeatureGroup, comunas: ComunaGeo[]) {
  const maxElectores = Math.max(1, ...comunas.map((c) => c.totalElectores))
  for (const c of comunas) {
    L.polygon(c.boundary, {
      color: '#1e40af', weight: 2,
      fillColor: '#3b82f6', fillOpacity: 0.15 + 0.5 * (c.totalElectores / maxElectores),
    })
      .bindPopup(`<b>${c.name}</b><br>${c.totalElectores} elector(es)`)
      .addTo(capa)
  }
}

function dibujarCapaPuestos(L: typeof import('leaflet'), capa: import('leaflet').FeatureGroup, puestos: StationGeo[]) {
  for (const s of puestos) {
    L.circleMarker([s.lat, s.lng], {
      radius: 8,
      weight: s.specialLabel ? 3 : 1,
      color: s.specialLabel ? '#0f172a' : COLOR_JURISDICCION[s.estado],
      fillOpacity: 0.85,
      fillColor: COLOR_JURISDICCION[s.estado],
    })
      .bindPopup(
        `${s.specialLabel ? `⚑ ${s.specialLabel}<br>` : ''}<b>${s.name}</b><br>${s.totalElectores} elector(es) · ${s.estado === 'CUENTA' ? 'dentro de jurisdicción' : 'fuera de jurisdicción'}`,
      )
      .addTo(capa)
  }
}

export function MapaElectores({ puntos, geoStats, puestos, comunas }: {
  puntos: VoterGeo[]; geoStats: GeoStats; puestos: StationGeo[]; comunas: ComunaGeo[]
}) {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapaRef    = useRef<import('leaflet').Map | null>(null)
  const capaRef    = useRef<import('leaflet').FeatureGroup | null>(null)
  const [vista, setVista] = useState<Vista>('residencia')
  const [msg, setMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    let cancelado = false
    void (async () => {
      const L = (await import('leaflet')).default
      if (cancelado || !contenedor.current) return

      if (!mapaRef.current) {
        mapaRef.current = L.map(contenedor.current).setView([4.6, -74.08], 5) // centro Colombia
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 19,
        }).addTo(mapaRef.current)
      }
      const mapa = mapaRef.current

      capaRef.current?.remove() // saca la capa de la vista anterior antes de dibujar la nueva

      const capa = L.featureGroup()
      if (vista === 'residencia')    dibujarCapaResidencia(L, capa, puntos)
      else if (vista === 'puesto')   dibujarCapaPuestos(L, capa, puestos)
      else                           dibujarCapaComunas(L, capa, comunas)
      capa.addTo(mapa)
      capaRef.current = capa

      if (capa.getLayers().length > 0) mapa.fitBounds(capa.getBounds().pad(0.2))
    })()

    return () => {
      cancelado = true
    }
  }, [vista, puntos, puestos, comunas])

  useEffect(() => () => {
    if (mapaRef.current) { mapaRef.current.remove(); mapaRef.current = null }
  }, [])

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        {(['residencia', 'puesto', 'comuna'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setVista(v)}
            style={{
              background: vista === v ? '#0f172a' : '#f1f5f9',
              color:      vista === v ? '#fff' : '#475569',
              border: 'none', borderRadius: 999, padding: '0.35rem 0.9rem',
              fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {ETIQUETA_VISTA[v]}
          </button>
        ))}
      </div>

      {vista === 'residencia' && <ControlesResidencia puntos={puntos} geoStats={geoStats} msg={msg} isPending={isPending} onUbicar={ubicar} />}
      {vista === 'puesto'     && <ControlesPuesto puestos={puestos} />}
      {vista === 'comuna'     && <ControlesComuna comunas={comunas} />}

      <div
        ref={contenedor}
        style={{ height: 420, width: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0', zIndex: 0 }}
      />

      {vista === 'residencia' && puntos.length === 0 && geoStats.pendientes === 0 && (
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.5rem' }}>
          Aún no hay electores con dirección para ubicar. Agrega direcciones al registrar electores.
        </p>
      )}
      {vista === 'puesto' && puestos.length === 0 && (
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.5rem' }}>
          Aún no hay electores con mesa de votación asignada.
        </p>
      )}
      {vista === 'comuna' && comunas.length === 0 && (
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.5rem' }}>
          Todavía no hay comunas con límites cargados para este municipio.
        </p>
      )}
    </div>
  )
}

function ControlesResidencia({ puntos, geoStats, msg, isPending, onUbicar }: {
  puntos: VoterGeo[]; geoStats: GeoStats; msg: string | null; isPending: boolean; onUbicar: () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
        {puntos.length} ubicados · {geoStats.pendientes} pendientes
      </span>
      {geoStats.pendientes > 0 && (
        <button
          onClick={onUbicar}
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
  )
}

function ControlesPuesto({ puestos }: { puestos: StationGeo[] }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
        {puestos.length} puesto(s) con electores propios — verde: dentro de jurisdicción, rojo: fuera
      </span>
    </div>
  )
}

function ControlesComuna({ comunas }: { comunas: ComunaGeo[] }) {
  const ordenadas = [...comunas].sort((a, b) => b.totalElectores - a.totalElectores)
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {ordenadas.map((c) => (
          <span
            key={c.id}
            style={{
              background: '#eff6ff', color: '#1e40af', padding: '0.2rem 0.6rem',
              borderRadius: 999, fontSize: '0.78rem', fontWeight: 600,
            }}
          >
            {c.name}: {c.totalElectores}
          </span>
        ))}
      </div>
      <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.4rem' }}>
        Solo cuenta electores ya ubicados en el mapa (vista "por residencia").
      </p>
    </div>
  )
}
