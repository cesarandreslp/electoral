import Link from 'next/link'
import { listCandidates, createCandidate, deleteCandidate } from '../../actions'
import { requireModule } from '@/lib/auth-helpers'

export default async function ConfiguracionDiaEPage() {
  await requireModule('DIA_E', ['ADMIN_CAMPANA'])

  const candidates = await listCandidates()
  const propio     = candidates.find(c => c.isOwn)
  const rivales    = candidates.filter(c => !c.isOwn)

  async function handleCreate(formData: FormData) {
    'use server'
    const name  = formData.get('name') as string
    const party = (formData.get('party') as string) || undefined
    const order = parseInt(formData.get('order') as string) || 0
    await createCandidate({ name, party, order })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '700px' }}>
      <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>
        Configuración — Día E
      </h1>

      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
        Registra a los candidatos rivales antes del día de la elección. El tuyo
        se toma automáticamente de CORE. El orden determina cómo aparecen en el
        formulario E-14 del testigo.
      </p>

      {/* Nuestro candidato — viene de CORE, no se captura acá */}
      <div style={{
        background: propio ? '#eff6ff' : '#fffbeb',
        border: `1px solid ${propio ? '#bfdbfe' : '#fde68a'}`,
        borderRadius: '12px', padding: '1.25rem',
      }}>
        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, letterSpacing: '1px' }}>
          NUESTRO CANDIDATO
        </div>
        {propio ? (
          <>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0.25rem 0' }}>
              {propio.name}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Se toma de CORE — para cambiarlo, marca otro elector como candidato en{' '}
              <Link href="/core/lideres" style={{ color: '#1e40af' }}>su ficha</Link>.
            </div>
          </>
        ) : (
          <div style={{ fontSize: '0.85rem', color: '#92400e', marginTop: '0.35rem' }}>
            Todavía no has marcado a nadie como candidato de la campaña. Hazlo en{' '}
            <Link href="/core/lideres" style={{ color: '#92400e', fontWeight: 600 }}>CORE → ficha del elector</Link>{' '}
            y aparecerá aquí y en el formulario E-14 del testigo.
          </div>
        )}
      </div>

      {/* Formulario nuevo rival */}
      <form
        action={handleCreate}
        style={{
          background: '#fff', borderRadius: '12px', padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          display: 'flex', flexDirection: 'column', gap: '1rem',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1rem', color: '#334155' }}>Agregar candidato rival</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label htmlFor="name" style={labelStyle}>Nombre</label>
            <input id="name" name="name" required style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label htmlFor="party" style={labelStyle}>Partido (opcional)</label>
            <input id="party" name="party" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label htmlFor="order" style={labelStyle}>Orden</label>
            <input id="order" name="order" type="number" min="0" defaultValue="0" style={inputStyle} />
          </div>
        </div>

        <button type="submit" style={{
          padding: '0.75rem', fontSize: '0.875rem', borderRadius: '6px',
          border: 'none', background: '#1e40af', color: '#fff', cursor: 'pointer',
          fontWeight: 600, alignSelf: 'flex-start',
        }}>
          Agregar rival
        </button>
      </form>

      {/* Tarjetón completo — como lo verá el testigo */}
      {candidates.length > 0 && (
        <div style={{
          background: '#fff', borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflowX: 'auto',
        }}>
          <div style={{ padding: '1rem 1rem 0', fontSize: '0.8rem', color: '#64748b' }}>
            Así aparecerá el tarjetón en el E-14 del testigo ({candidates.length} candidato(s)):
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Orden', 'Nombre', 'Partido', 'Acciones'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {propio && <CandidateRow key={propio.id} candidate={propio} />}
              {rivales.map(c => (
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

  return (
    <tr style={{ background: c.isOwn ? '#eff6ff' : undefined }}>
      <td style={tdStyle}>{c.order}</td>
      <td style={{ ...tdStyle, fontWeight: c.isOwn ? 600 : 400 }}>
        {c.name}
        {c.isOwn && (
          <span style={{
            marginLeft: '0.5rem', background: '#1e40af', color: '#fff',
            padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 700,
          }}>
            NUESTRO
          </span>
        )}
      </td>
      <td style={{ ...tdStyle, fontSize: '0.8rem', color: '#64748b' }}>{c.party ?? '—'}</td>
      <td style={tdStyle}>
        {c.isOwn ? (
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Se gestiona en CORE</span>
        ) : (
          <form action={handleDelete} style={{ display: 'inline' }}>
            <button type="submit" style={{
              padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px',
              border: '1px solid #fecaca', background: '#fff', color: '#ef4444', cursor: 'pointer',
            }}>
              Eliminar
            </button>
          </form>
        )}
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
