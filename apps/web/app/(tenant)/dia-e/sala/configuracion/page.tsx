import { listCandidates, createCandidate, deleteCandidate, updateCandidate } from '../../actions'
import { requireModule } from '@/lib/auth-helpers'

export default async function ConfiguracionDiaEPage() {
  await requireModule('DIA_E', ['ADMIN_CAMPANA'])

  const candidates = await listCandidates()

  async function handleCreate(formData: FormData) {
    'use server'
    const name  = formData.get('name') as string
    const party = (formData.get('party') as string) || undefined
    const isOwn = formData.get('isOwn') === 'on'
    const order = parseInt(formData.get('order') as string) || 0
    await createCandidate({ name, party, isOwn, order })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '700px' }}>
      <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>
        Configuración — Día E
      </h1>

      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
        Configura los candidatos antes del día de la elección.
        El orden determina cómo aparecen en el formulario E-14 del testigo.
      </p>

      {/* Formulario nuevo candidato */}
      <form
        action={handleCreate}
        style={{
          background: '#fff', borderRadius: '12px', padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          display: 'flex', flexDirection: 'column', gap: '1rem',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1rem', color: '#334155' }}>Nuevo candidato</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label htmlFor="name" style={labelStyle}>Nombre</label>
            <input id="name" name="name" required style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label htmlFor="party" style={labelStyle}>Partido (opcional)</label>
            <input id="party" name="party" style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label htmlFor="order" style={labelStyle}>Orden</label>
            <input id="order" name="order" type="number" min="0" defaultValue="0" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.25rem' }}>
            <input id="isOwn" name="isOwn" type="checkbox" />
            <label htmlFor="isOwn" style={{ fontSize: '0.85rem', color: '#334155' }}>
              Es nuestro candidato
            </label>
          </div>
        </div>

        <button type="submit" style={{
          padding: '0.75rem', fontSize: '0.875rem', borderRadius: '6px',
          border: 'none', background: '#1e40af', color: '#fff', cursor: 'pointer',
          fontWeight: 600, alignSelf: 'flex-start',
        }}>
          Agregar candidato
        </button>
      </form>

      {/* Lista de candidatos existentes */}
      {candidates.length > 0 && (
        <div style={{
          background: '#fff', borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflowX: 'auto',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Orden', 'Nombre', 'Partido', 'Propio', 'Acciones'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {candidates.map(c => (
                <CandidateRow key={c.id} candidate={c} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CandidateRow({ candidate: c }: {
  candidate: { id: string; name: string; party: string | null; isOwn: boolean; order: number }
}) {
  async function handleDelete() {
    'use server'
    await deleteCandidate(c.id)
  }

  async function handleToggleOwn() {
    'use server'
    await updateCandidate(c.id, { isOwn: !c.isOwn })
  }

  return (
    <tr style={{ background: c.isOwn ? '#eff6ff' : undefined }}>
      <td style={tdStyle}>{c.order}</td>
      <td style={{ ...tdStyle, fontWeight: c.isOwn ? 600 : 400 }}>{c.name}</td>
      <td style={{ ...tdStyle, fontSize: '0.8rem', color: '#64748b' }}>{c.party ?? '—'}</td>
      <td style={tdStyle}>
        <form action={handleToggleOwn} style={{ display: 'inline' }}>
          <button type="submit" style={{
            padding: '0.15rem 0.5rem', borderRadius: '9999px',
            fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
            background: c.isOwn ? '#1e40af' : '#f1f5f9',
            color: c.isOwn ? '#fff' : '#94a3b8',
            border: 'none',
          }}>
            {c.isOwn ? 'NUESTRO' : 'No'}
          </button>
        </form>
      </td>
      <td style={tdStyle}>
        <form action={handleDelete} style={{ display: 'inline' }}>
          <button type="submit" style={{
            padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px',
            border: '1px solid #fecaca', background: '#fff', color: '#ef4444', cursor: 'pointer',
          }}>
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
const thStyle: React.CSSProperties = {
  padding: '0.5rem 1rem', textAlign: 'left', fontSize: '0.75rem',
  color: '#64748b', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap',
}
const tdStyle: React.CSSProperties = {
  padding: '0.5rem 1rem', fontSize: '0.85rem', borderBottom: '1px solid #f1f5f9',
}
