import type { MaterialView } from '../actions'

const TIPO_BADGE: Record<string, { bg: string; text: string }> = {
  SLIDES:     { bg: '#dbeafe', text: '#1e40af' },
  PDF:        { bg: '#fee2e2', text: '#991b1b' },
  VIDEO:      { bg: '#dcfce7', text: '#166534' },
  INFOGRAFIA: { bg: '#fef9c3', text: '#854d0e' },
}

export function MaterialCard({ material }: { material: MaterialView }) {
  const badge = TIPO_BADGE[material.type] ?? TIPO_BADGE.PDF

  const fileSize = material.fileSize
    ? material.fileSize > 1048576
      ? `${(material.fileSize / 1048576).toFixed(1)} MB`
      : `${Math.round(material.fileSize / 1024)} KB`
    : null

  return (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{
          padding: '0.15rem 0.5rem',
          borderRadius: '9999px',
          fontSize: '0.7rem',
          fontWeight: 600,
          background: badge.bg,
          color: badge.text,
        }}>
          {material.type}
        </span>
        {material.source === 'global' && (
          <span style={{
            fontSize: '0.65rem',
            color: '#94a3b8',
            background: '#f1f5f9',
            padding: '0.1rem 0.4rem',
            borderRadius: '4px',
          }}>
            OFICIAL
          </span>
        )}
      </div>

      <div>
        <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a', fontWeight: 600 }}>
          {material.title}
        </h3>
        {material.description && (
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            {material.description}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        {fileSize && (
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{fileSize}</span>
        )}
        <a
          href={material.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '0.4rem 0.9rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            borderRadius: '6px',
            background: '#1e40af',
            color: '#fff',
            textDecoration: 'none',
            marginLeft: 'auto',
          }}
        >
          Ver
        </a>
      </div>
    </div>
  )
}
