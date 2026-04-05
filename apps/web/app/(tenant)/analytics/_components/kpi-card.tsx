/** Tarjeta de métrica individual para el dashboard de Analytics */
export function KpiCard({
  titulo,
  valor,
  subtitulo,
  color = '#0f172a',
}: {
  titulo:     string
  valor:      string | number
  subtitulo?: string
  color?:     string
}) {
  return (
    <div
      style={{
        background:    '#fff',
        borderRadius:  '12px',
        padding:       '1.25rem',
        boxShadow:     '0 1px 3px rgba(0,0,0,0.08)',
        display:       'flex',
        flexDirection: 'column',
        gap:           '0.25rem',
      }}
    >
      <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {titulo}
      </span>
      <span style={{ fontSize: '1.75rem', fontWeight: 700, color }}>
        {valor}
      </span>
      {subtitulo && (
        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
          {subtitulo}
        </span>
      )}
    </div>
  )
}
