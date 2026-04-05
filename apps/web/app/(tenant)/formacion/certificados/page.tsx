import { listMyCertificates } from '../actions'

export default async function CertificadosPage() {
  const certificados = await listMyCertificates()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>
        Mis certificados
      </h1>

      {certificados.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
        }}>
          {certificados.map(cert => (
            <div
              key={cert.id}
              style={{
                background: '#fff', borderRadius: '12px', padding: '1.25rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                display: 'flex', flexDirection: 'column', gap: '0.75rem',
              }}
            >
              <div style={{
                background: '#dcfce7', color: '#166534',
                padding: '0.15rem 0.5rem', borderRadius: '9999px',
                fontSize: '0.7rem', fontWeight: 600, alignSelf: 'flex-start',
              }}>
                CERTIFICADO
              </div>

              <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a', fontWeight: 600 }}>
                {cert.quizTitle}
              </h3>

              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Emitido: {new Date(cert.issuedAt).toLocaleDateString('es-CO', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </div>

              <a
                href={cert.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '0.4rem 0.9rem', fontSize: '0.8rem', fontWeight: 600,
                  borderRadius: '6px', background: '#1e40af', color: '#fff',
                  textDecoration: 'none', marginTop: 'auto', textAlign: 'center',
                }}
              >
                Descargar PDF
              </a>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          background: '#fff', borderRadius: '12px', padding: '3rem',
          textAlign: 'center', color: '#94a3b8',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}>
          No tienes certificados aún. Aprueba una evaluación para obtener tu certificado.
        </div>
      )}
    </div>
  )
}
