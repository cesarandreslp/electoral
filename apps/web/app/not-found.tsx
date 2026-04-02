export default function NotFound() {
  return (
    <div
      style={{
        minHeight:      '100vh',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        background:     '#f1f5f9',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '400px', padding: '2rem' }}>
        <div style={{ fontSize: '3rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.5rem' }}>
          404
        </div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
          Página no encontrada
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          La dirección que buscas no existe o fue movida.
        </p>
        <a
          href="/"
          style={{
            display:        'inline-block',
            background:     '#1e40af',
            color:          '#fff',
            padding:        '0.5rem 1.25rem',
            borderRadius:   '6px',
            textDecoration: 'none',
            fontSize:       '0.875rem',
            fontWeight:     600,
          }}
        >
          Volver al inicio
        </a>
      </div>
    </div>
  )
}
