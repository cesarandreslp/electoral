'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

/** Gráfico de línea — evolución de registros por día (últimos 30 días) */
export function ChartRegistros({ data }: { data: { dia: string; total: number }[] }) {
  if (data.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
        Sin datos de registros en los últimos 30 días
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <h3 style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#334155' }}>
        Registros por día — últimos 30 días
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="dia"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickFormatter={(v: string) => v.slice(5)} // MM-DD
          />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
          <Tooltip
            labelFormatter={(v) => `Fecha: ${v}`}
            formatter={(v) => [v, 'Registros']}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
