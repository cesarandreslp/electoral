import { getAnalysisByTerritory, exportTerritoryCSV } from '../actions'
import { TablaTerritorio } from './_components/tabla-territorio'

export default async function TerritorioPage() {
  const data = await getAnalysisByTerritory()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>Análisis Territorial</h1>
      <TablaTerritorio data={data} onExportCSV={exportTerritoryCSV} />
    </div>
  )
}
