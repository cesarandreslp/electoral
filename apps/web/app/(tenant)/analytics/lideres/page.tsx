import { getLeaderAnalytics } from '../actions'
import { TablaLideres }      from './_components/tabla-lideres'

export default async function LideresAnalyticsPage() {
  const data = await getLeaderAnalytics()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>Ranking de Líderes</h1>
      <TablaLideres initialData={data} />
    </div>
  )
}
