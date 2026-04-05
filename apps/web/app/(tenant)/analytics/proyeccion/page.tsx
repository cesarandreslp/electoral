import { getProjectionData }      from '../actions'
import { SimuladorProyeccion }   from './_components/simulador-proyeccion'

export default async function ProyeccionPage() {
  const data = await getProjectionData()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>Proyección de Votos</h1>
      <SimuladorProyeccion data={data} />
    </div>
  )
}
