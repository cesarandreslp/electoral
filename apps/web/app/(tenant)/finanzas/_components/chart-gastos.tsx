'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORES: Record<string, string> = {
  PUBLICIDAD:  '#3b82f6',
  TRANSPORTE:  '#f59e0b',
  LOGISTICA:   '#8b5cf6',
  PERSONAL:    '#ef4444',
  TECNOLOGIA:  '#06b6d4',
  EVENTOS:     '#22c55e',
  JURIDICO:    '#f97316',
  OTRO:        '#94a3b8',
}

const ETIQUETAS: Record<string, string> = {
  PUBLICIDAD:  'Publicidad',
  TRANSPORTE:  'Transporte',
  LOGISTICA:   'Logística',
  PERSONAL:    'Personal',
  TECNOLOGIA:  'Tecnología',
  EVENTOS:     'Eventos',
  JURIDICO:    'Jurídico',
  OTRO:        'Otro',
}

interface ChartGastosProps {
  data: { category: string; total: number; count: number }[]
}

export function ChartGastos({ data }: ChartGastosProps) {
  const chartData = data.map(d => ({
    ...d,
    etiqueta: ETIQUETAS[d.category] ?? d.category,
  }))

  return (
    <div style={{
      background: '#fff', borderRadius: '12px', padding: '1.25rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    }}>
      <h3 style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#334155' }}>
        Gastos por categoría
      </h3>
      {chartData.length === 0 ? (
        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Sin datos de gastos</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="etiqueta"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value) => [`$${Number(value).toLocaleString('es-CO')}`, 'Monto']}
              contentStyle={{ fontSize: '0.8rem', borderRadius: '8px' }}
            />
            <Bar dataKey="total" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.category} fill={COLORES[entry.category] ?? '#94a3b8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
