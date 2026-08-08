import Link             from 'next/link'
import { notFound }    from 'next/navigation'
import { auth }        from '@campaignos/auth'
import { listLeaders, listVoters } from '../../actions'
import { BarraProgreso } from '../_components/barra-progreso'
import { BotonCandidato } from '../_components/boton-candidato'

export const metadata = { title: 'Ficha de líder' }

interface Props {
  params: Promise<{ id: string }>
}

interface NodoArbol {
  id:             string
  name:           string
  zone:           string | null
  totalElectores: number
  children:       NodoArbol[]
}

export default async function FichaLiderPage({ params }: Props) {
  const { id }  = await params
  const session = await auth()
  const esAdmin = ['ADMIN_CAMPANA', 'COORDINADOR'].includes(session?.user?.role ?? '')
  const esAdminCampana = session?.user?.role === 'ADMIN_CAMPANA'

  // Obtener datos del líder y sus electores en paralelo.
  // `misDatos` busca puntualmente por id (funciona aunque el líder sea recién
  // creado y todavía no tenga followers); `todosLideres` solo trae a quienes
  // YA actúan como líder, para construir el árbol de sub-líderes.
  const [todosLideres, misDatos, datosElectores] = await Promise.all([
    listLeaders(),
    listLeaders({ id }),
    listVoters({ leaderId: id }),
  ])

  const lider = misDatos[0] ?? todosLideres.find((l) => l.id === id)
  if (!lider) notFound()

  // Árbol multinivel de sub-líderes (jerarquía parentLeaderId), construido en memoria.
  const construirSubarbol = (padreId: string): NodoArbol[] =>
    todosLideres
      .filter((l) => l.parentLeaderId === padreId)
      .map((l) => ({
        id:             l.id,
        name:           l.name,
        zone:           l.zone,
        totalElectores: l.totalElectores,
        children:       construirSubarbol(l.id),
      }))
  const subLideres = construirSubarbol(id)

  const { voters, total } = datosElectores

  // Conteo por estado de compromiso
  const conteoEstados = voters.reduce<Record<string, number>>((acc, v) => {
    acc[v.commitmentStatus] = (acc[v.commitmentStatus] ?? 0) + 1
    return acc
  }, {})

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <Link href="/core/lideres" style={{ color: '#64748b', fontSize: '0.875rem', textDecoration: 'none' }}>
            ← Líderes
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.5rem' }}>
            {lider.name}
            {lider.isCandidate && (
              <span style={{
                marginLeft: '0.6rem', verticalAlign: 'middle', background: '#fef2f2', color: '#991b1b',
                padding: '0.15rem 0.5rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600,
              }}>
                CANDIDATO
              </span>
            )}
          </h1>
          {lider.zone && <div style={{ color: '#64748b', fontSize: '0.875rem' }}>{lider.zone}</div>}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {esAdminCampana && <BotonCandidato id={id} esCandidato={lider.isCandidate} />}
          <Link
            href={`/core/lideres/${id}/arbol`}
            style={{
              background: '#f1f5f9', color: '#475569', padding: '0.5rem 1rem',
              borderRadius: '6px', textDecoration: 'none', fontSize: '0.875rem',
              border: '1px solid #e2e8f0',
            }}
          >
            Árbol de captación →
          </Link>
          {esAdmin && (
            <Link
              href={`/core/lideres/nuevo?parent=${id}`}
              style={{
                background: '#e2e8f0', color: '#0f172a', padding: '0.5rem 1rem',
                borderRadius: '6px', textDecoration: 'none', fontSize: '0.875rem',
              }}
            >
              + Sub-líder
            </Link>
          )}
          {esAdmin && (
            <Link
              href={`/core/lideres/${id}/editar`}
              style={{
                background: '#0f172a', color: '#fff', padding: '0.5rem 1rem',
                borderRadius: '6px', textDecoration: 'none', fontSize: '0.875rem',
              }}
            >
              Editar
            </Link>
          )}
        </div>
      </div>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <Metrica titulo="Total electores" valor={String(lider.totalElectores)} />
        <Metrica titulo="Comprometidos"   valor={String(lider.comprometidos)} />
        <Metrica titulo="Meta de votos"   valor={String(lider.targetVotes)} />
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>Avance</div>
          <BarraProgreso valor={lider.comprometidos} meta={lider.targetVotes} pct={lider.pctAvance} />
        </div>
      </div>

      {/* Árbol multinivel de sub-líderes */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Sub-líderes</h2>
        {subLideres.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Este líder no tiene sub-líderes.</div>
        ) : (
          <ArbolLideres nodos={subLideres} nivel={0} />
        )}
      </div>

      {/* Distribución por estado */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Distribución por estado</h2>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {Object.entries(conteoEstados).map(([estado, cnt]) => (
            <div
              key={estado}
              style={{
                background: COLORES_ESTADO[estado]?.bg ?? '#f1f5f9',
                color:      COLORES_ESTADO[estado]?.text ?? '#475569',
                padding:    '0.4rem 0.75rem',
                borderRadius: '6px',
                fontSize:   '0.8rem',
                fontWeight: 600,
              }}
            >
              {estado}: {cnt}
            </div>
          ))}
        </div>
      </div>

      {/* Lista de electores */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Electores ({total})</h2>
          {esAdmin && (
            <Link href="/core/electores/nuevo" style={{ color: '#1e40af', fontSize: '0.875rem' }}>
              + Agregar elector
            </Link>
          )}
        </div>
        {voters.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
            No hay electores asignados a este líder.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <Th>Nombre</Th>
                <Th>Estado</Th>
                <Th>Último contacto</Th>
              </tr>
            </thead>
            <tbody>
              {voters.map((v) => (
                <tr key={v.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <Td>{v.name}</Td>
                  <Td>
                    <EstadoBadge status={v.commitmentStatus} />
                  </Td>
                  <Td>
                    {v.lastContact
                      ? new Date(v.lastContact).toLocaleDateString('es-CO')
                      : <span style={{ color: '#94a3b8' }}>Sin contacto</span>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const COLORES_ESTADO: Record<string, { bg: string; text: string }> = {
  SIN_CONTACTAR: { bg: '#f1f5f9', text: '#475569' },
  CONTACTADO:    { bg: '#dbeafe', text: '#1e40af' },
  SIMPATIZANTE:  { bg: '#fef9c3', text: '#854d0e' },
  COMPROMETIDO:  { bg: '#dcfce7', text: '#166534' },
  VOTO_SEGURO:   { bg: '#bbf7d0', text: '#14532d' },
}

/** Render recursivo del árbol de sub-líderes con sangría por nivel. */
function ArbolLideres({ nodos, nivel }: { nodos: NodoArbol[]; nivel: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {nodos.map((n) => (
        <div key={n.id}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: `${nivel * 1.25}rem` }}>
            {nivel > 0 && <span style={{ color: '#cbd5e1' }}>└</span>}
            <Link
              href={`/core/lideres/${n.id}`}
              style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', textDecoration: 'none' }}
            >
              {n.name}
            </Link>
            {n.zone && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>· {n.zone}</span>}
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>· {n.totalElectores} electores</span>
          </div>
          {n.children.length > 0 && <ArbolLideres nodos={n.children} nivel={nivel + 1} />}
        </div>
      ))}
    </div>
  )
}

function Metrica({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem' }}>
      <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>{titulo}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{valor}</div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: '0.75rem 1.25rem', textAlign: 'left', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{children}</th>
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '0.75rem 1.25rem', fontSize: '0.875rem' }}>{children}</td>
}

function EstadoBadge({ status }: { status: string }) {
  const c = COLORES_ESTADO[status] ?? { bg: '#f1f5f9', text: '#475569' }
  return (
    <span style={{ background: c.bg, color: c.text, padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>
      {status.replace('_', ' ')}
    </span>
  )
}
