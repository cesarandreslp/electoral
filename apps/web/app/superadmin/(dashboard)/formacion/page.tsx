import {
  listGlobalMaterials,
  createGlobalMaterial,
  toggleMaterialStatus,
  reorderMaterial,
  deleteGlobalMaterial,
} from '../../actions'
import type { GlobalMaterialSummary } from '../../actions'

const TIPOS = ['SLIDES', 'PDF', 'VIDEO', 'INFOGRAFIA'] as const

const TIPO_BADGE: Record<string, { bg: string; text: string }> = {
  SLIDES:      { bg: '#dbeafe', text: '#1e40af' },
  PDF:         { bg: '#fee2e2', text: '#991b1b' },
  VIDEO:       { bg: '#dcfce7', text: '#166534' },
  INFOGRAFIA:  { bg: '#fef9c3', text: '#854d0e' },
}

export default async function FormacionPage() {
  const materiales = await listGlobalMaterials()

  async function handleCreate(formData: FormData) {
    'use server'
    await createGlobalMaterial(formData)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>
        Materiales globales de formación
      </h1>

      {/* Formulario de subida */}
      <form
        action={handleCreate}
        style={{
          background: '#fff', borderRadius: '12px', padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          display: 'flex', flexDirection: 'column', gap: '1rem',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1rem', color: '#334155' }}>Nuevo material</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label htmlFor="title" style={labelStyle}>Título</label>
            <input id="title" name="title" required style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label htmlFor="type" style={labelStyle}>Tipo</label>
            <select id="type" name="type" required style={inputStyle}>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label htmlFor="description" style={labelStyle}>Descripción (opcional)</label>
          <input id="description" name="description" style={inputStyle} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label htmlFor="file" style={labelStyle}>Archivo</label>
          <input id="file" name="file" type="file" required style={inputStyle} />
        </div>

        <button type="submit" style={{
          padding: '0.75rem', fontSize: '0.875rem', borderRadius: '6px',
          border: 'none', background: '#1e40af', color: '#fff', cursor: 'pointer',
          fontWeight: 600, alignSelf: 'flex-start',
        }}>
          Subir material
        </button>
      </form>

      {/* Tabla de materiales */}
      <div style={{
        background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        overflowX: 'auto',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Orden', 'Título', 'Tipo', 'Tamaño', 'Estado', 'Acciones'].map(h => (
                <th key={h} style={headerStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {materiales.map((m, idx) => (
              <MaterialRow key={m.id} material={m} index={idx} total={materiales.length} />
            ))}
            {materiales.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...cellStyle, textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                  No hay materiales cargados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MaterialRow({ material: m, index, total }: {
  material: GlobalMaterialSummary; index: number; total: number
}) {
  const badge = TIPO_BADGE[m.type] ?? TIPO_BADGE.PDF

  async function handleToggle() {
    'use server'
    await toggleMaterialStatus(m.id)
  }

  async function handleMoveUp() {
    'use server'
    if (index > 0) await reorderMaterial(m.id, m.order - 1)
  }

  async function handleMoveDown() {
    'use server'
    if (index < total - 1) await reorderMaterial(m.id, m.order + 1)
  }

  async function handleDelete() {
    'use server'
    await deleteGlobalMaterial(m.id)
  }

  const fileSize = m.fileSize
    ? m.fileSize > 1048576
      ? `${(m.fileSize / 1048576).toFixed(1)} MB`
      : `${Math.round(m.fileSize / 1024)} KB`
    : '—'

  return (
    <tr>
      <td style={cellStyle}>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <form action={handleMoveUp}>
            <button type="submit" disabled={index === 0} style={btnSmall} title="Subir">
              &#9650;
            </button>
          </form>
          <form action={handleMoveDown}>
            <button type="submit" disabled={index === total - 1} style={btnSmall} title="Bajar">
              &#9660;
            </button>
          </form>
          <span style={{ marginLeft: '0.25rem', color: '#94a3b8', fontSize: '0.75rem' }}>{m.order}</span>
        </div>
      </td>
      <td style={cellStyle}>
        <div>
          <a href={m.fileUrl} target="_blank" rel="noopener noreferrer"
            style={{ color: '#1e40af', textDecoration: 'none', fontWeight: 500 }}>
            {m.title}
          </a>
          {m.description && (
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{m.description}</div>
          )}
        </div>
      </td>
      <td style={cellStyle}>
        <span style={{
          padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.7rem',
          fontWeight: 600, background: badge.bg, color: badge.text,
        }}>
          {m.type}
        </span>
      </td>
      <td style={{ ...cellStyle, fontSize: '0.8rem', color: '#64748b' }}>{fileSize}</td>
      <td style={cellStyle}>
        <form action={handleToggle}>
          <button type="submit" style={{
            ...btnSmall,
            background: m.isActive ? '#dcfce7' : '#fee2e2',
            color:      m.isActive ? '#166534' : '#991b1b',
            border:     `1px solid ${m.isActive ? '#22c55e' : '#ef4444'}`,
          }}>
            {m.isActive ? 'Activo' : 'Inactivo'}
          </button>
        </form>
      </td>
      <td style={cellStyle}>
        <form action={handleDelete}>
          <button type="submit" style={{ ...btnSmall, color: '#ef4444', border: '1px solid #fecaca' }}>
            Eliminar
          </button>
        </form>
      </td>
    </tr>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.8rem', color: '#334155', fontWeight: 500,
}
const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem', fontSize: '0.875rem', borderRadius: '6px',
  border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box',
}
const headerStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.75rem',
  color: '#64748b', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap',
}
const cellStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem', fontSize: '0.875rem', borderBottom: '1px solid #f1f5f9',
}
const btnSmall: React.CSSProperties = {
  padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px',
  border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer',
}
