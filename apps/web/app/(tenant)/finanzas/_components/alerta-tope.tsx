interface AlertaTopeProps {
  alertas: { tipo: string; mensaje: string }[]
}

function getAlertStyle(tipo: string): { bg: string; color: string; border: string } {
  if (tipo === 'TOPE_SUPERADO') return { bg: '#fee2e2', color: '#991b1b', border: '#fecaca' }
  if (tipo === 'ALERTA_TOPE')  return { bg: '#fff7ed', color: '#9a3412', border: '#fed7aa' }
  if (tipo === 'DEFICIT')      return { bg: '#fefce8', color: '#854d0e', border: '#fef08a' }
  return { bg: '#f1f5f9', color: '#334155', border: '#e2e8f0' }
}

export function AlertaTope({ alertas }: AlertaTopeProps) {
  if (alertas.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {alertas.map((a, i) => {
        const style = getAlertStyle(a.tipo)
        return (
          <div
            key={i}
            style={{
              padding: '0.75rem 1rem',
              background: style.bg,
              color: style.color,
              border: `1px solid ${style.border}`,
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 500,
            }}
          >
            {a.tipo === 'TOPE_SUPERADO' && '⚠ '}
            {a.tipo === 'ALERTA_TOPE' && '⚡ '}
            {a.mensaje}
          </div>
        )
      })}
    </div>
  )
}
