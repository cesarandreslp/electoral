import Link from 'next/link'
import { getCoreStats } from './actions'

export const metadata = { title: 'Dashboard' }

/**
 * Dashboard del módulo CORE. Es el destino post-login de todo rol de tenant
 * (ver app/page.tsx y app/login/page.tsx), así que debe existir y cargar rápido.
 */
export default async function CoreDashboardPage() {
  const stats = await getCoreStats()

  const tarjetas = [
    { label: 'Líderes',   valor: stats.lideres,   href: '/core/lideres' },
    { label: 'Electores', valor: stats.electores, href: '/core/electores' },
    { label: 'Puestos',   valor: stats.puestos,   href: null },
    { label: 'Mesas',     valor: stats.mesas,     href: null },
  ]

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        {tarjetas.map((t) => {
          const cuerpo = (
            <div
              style={{
                background:   '#fff',
                border:       '1px solid #e2e8f0',
                borderRadius: '8px',
                padding:      '1.5rem',
                height:       '100%',
              }}
            >
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a' }}>{t.valor}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>{t.label}</div>
            </div>
          )

          return t.href
            ? <Link key={t.label} href={t.href} style={{ textDecoration: 'none' }}>{cuerpo}</Link>
            : <div key={t.label}>{cuerpo}</div>
        })}
      </div>
    </div>
  )
}
