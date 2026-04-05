'use client'

import { useState } from 'react'
import type { ProjectionData } from '../../actions'

/** Simulador de proyección de votos con slider interactivo */
export function SimuladorProyeccion({ data }: { data: ProjectionData }) {
  const [factorSimpatizante, setFactorSimpatizante] = useState(40) // % por defecto

  const votosSeguro     = data.votoSeguro
  const votosProbables  = Math.round(data.comprometido * 0.85)
  const votosPosibles   = Math.round(data.simpatizante * (factorSimpatizante / 100))
  const totalProyectado = votosSeguro + votosProbables + votosPosibles

  // Escenarios
  const minimo    = Math.round(votosSeguro + data.comprometido * 0.70 + data.simpatizante * (factorSimpatizante / 100) * 0.70)
  const esperado  = totalProyectado
  const optimista = Math.round(votosSeguro + data.comprometido * Math.min(1, 0.85 * 1.15) + data.simpatizante * Math.min(1, (factorSimpatizante / 100) * 1.15))

  const cardStyle: React.CSSProperties = {
    background: '#fff', borderRadius: '12px', padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  }

  const metricStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0',
    borderBottom: '1px solid #f1f5f9', fontSize: '0.875rem',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Desglose de proyección */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#334155' }}>
          Desglose de proyección
        </h3>
        <div style={metricStyle}>
          <span style={{ color: '#64748b' }}>Votos seguros (VOTO_SEGURO x 1.0)</span>
          <span style={{ fontWeight: 600, color: '#22c55e' }}>{votosSeguro}</span>
        </div>
        <div style={metricStyle}>
          <span style={{ color: '#64748b' }}>Votos probables (COMPROMETIDO x 0.85)</span>
          <span style={{ fontWeight: 600, color: '#34d399' }}>{votosProbables}</span>
        </div>
        <div style={metricStyle}>
          <span style={{ color: '#64748b' }}>Votos posibles (SIMPATIZANTE x {factorSimpatizante}%)</span>
          <span style={{ fontWeight: 600, color: '#fbbf24' }}>{votosPosibles}</span>
        </div>
        <div style={{ ...metricStyle, borderBottom: 'none', fontSize: '1rem' }}>
          <span style={{ fontWeight: 700, color: '#0f172a' }}>Total proyectado</span>
          <span style={{ fontWeight: 700, color: '#3b82f6', fontSize: '1.25rem' }}>{totalProyectado}</span>
        </div>
      </div>

      {/* Slider de simulación */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: '#334155' }}>
          Simulación: conversión de simpatizantes
        </h3>
        <p style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: '#94a3b8' }}>
          ¿Qué pasa si la tasa de conversión de SIMPATIZANTE cambia?
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <input
            type="range"
            min={0}
            max={100}
            value={factorSimpatizante}
            onChange={e => setFactorSimpatizante(Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ fontWeight: 700, fontSize: '1.25rem', color: '#3b82f6', minWidth: '4rem', textAlign: 'right' }}>
            {factorSimpatizante}%
          </span>
        </div>
      </div>

      {/* Escenarios */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        <div style={{ ...cardStyle, borderLeft: '4px solid #94a3b8' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Mínimo</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#64748b' }}>{minimo}</div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Factores x 0.70</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '0.75rem', color: '#3b82f6', textTransform: 'uppercase' }}>Esperado</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>{esperado}</div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Factores base</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: '4px solid #22c55e' }}>
          <div style={{ fontSize: '0.75rem', color: '#22c55e', textTransform: 'uppercase' }}>Optimista</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e' }}>{optimista}</div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Factores x 1.15</div>
        </div>
      </div>

      {/* Comparación con elección anterior y meta */}
      {(data.metaVotos || data.votosAnterior) && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: '#334155' }}>
            Comparación
          </h3>
          {data.metaVotos && (
            <div style={metricStyle}>
              <span style={{ color: '#64748b' }}>Meta de votos</span>
              <span style={{ fontWeight: 600 }}>{data.metaVotos}</span>
            </div>
          )}
          {data.votosAnterior && (
            <div style={metricStyle}>
              <span style={{ color: '#64748b' }}>Elección anterior</span>
              <span style={{ fontWeight: 600 }}>{data.votosAnterior}</span>
            </div>
          )}
          <div style={{ ...metricStyle, borderBottom: 'none' }}>
            <span style={{ color: '#64748b' }}>Proyección actual</span>
            <span style={{ fontWeight: 700, color: '#3b82f6' }}>{totalProyectado}</span>
          </div>
          {data.metaVotos && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
              <span style={{ color: totalProyectado >= data.metaVotos ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                {totalProyectado >= data.metaVotos
                  ? `+${totalProyectado - data.metaVotos} sobre la meta`
                  : `${data.metaVotos - totalProyectado} por debajo de la meta`
                }
              </span>
            </div>
          )}
        </div>
      )}

      {/* Info de base */}
      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
        Base de cálculo: {data.votoSeguro} voto seguro · {data.comprometido} comprometido ·
        {' '}{data.simpatizante} simpatizante · {data.contactado} contactado · {data.sinContactar} sin contactar
      </div>
    </div>
  )
}
