'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORES: Record<string, string> = {
  SIN_CONTACTAR: '#94a3b8',
  CONTACTADO:    '#60a5fa',
  SIMPATIZANTE:  '#fbbf24',
  COMPROMETIDO:  '#34d399',
  VOTO_SEGURO:   '#22c55e',
}

const ETIQUETAS: Record<string, string> = {
  SIN_CONTACTAR: 'Sin contactar',
  CONTACTADO:    'Contactado',
  SIMPATIZANTE:  'Simpatizante',
  COMPROMETIDO:  'Comprometido',
  VOTO_SEGURO:   'Voto seguro',
}

/** Gráfico de barras — distribución de estados de compromiso */
export function ChartCompromiso({ data }: { data: { estado: string; cantidad: number }[] }) {
  const chartData = data.map(d => ({
    ...d,
    etiqueta: ETIQUETAS[d.estado] ?? d.estado,
  }))

  return (
    <div style={{ background: '#fff', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <h3 style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#334155' }}>
        Distribución de compromiso
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="etiqueta"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
          />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
          <Tooltip formatter={(v) => [v, 'Electores']} />
          <Bar dataKey="cantidad" radius={[6, 6, 0, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.estado} fill={COLORES[entry.estado] ?? '#94a3b8'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
