'use client'

import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts'
import type { RadarDimension } from '../../../../actions'

/** Gráfico de radar con las 6 dimensiones del análisis de fidelidad */
export function ChartRadar({ dimensiones }: { dimensiones: RadarDimension[] }) {
  return (
    <div style={{ background: '#fff', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: '#334155' }}>
        Perfil de fidelidad
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={dimensiones}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: '#64748b' }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <Radar
            name="Fidelidad"
            dataKey="valor"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.25}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
