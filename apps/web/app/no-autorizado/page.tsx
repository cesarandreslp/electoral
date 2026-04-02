export const metadata = { title: 'Sin autorización — CampaignOS' }

/**
 * Página de acceso denegado.
 * Se muestra cuando el usuario tiene sesión pero no tiene el rol
 * o módulo requerido para acceder a la ruta solicitada.
 */
export default function NoAutorizadoPage() {
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
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚫</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
          Sin autorización
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          No tienes permiso para acceder a esta sección.
          Contacta al administrador de tu campaña si crees que esto es un error.
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
