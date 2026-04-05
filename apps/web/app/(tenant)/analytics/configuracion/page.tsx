import { getAnalyticsConfig, updateAnalyticsConfig } from '../actions'
import { revalidatePath } from 'next/cache'

export default async function ConfiguracionPage() {
  const config = await getAnalyticsConfig()

  async function handleSubmit(formData: FormData) {
    'use server'
    const fechaEleccion         = formData.get('fechaEleccion') as string || null
    const metaVotosRaw          = formData.get('metaVotos') as string
    const votosAnteriorRaw      = formData.get('votosEleccionAnterior') as string

    await updateAnalyticsConfig({
      fechaEleccion:         fechaEleccion || null,
      metaVotos:             metaVotosRaw ? parseInt(metaVotosRaw, 10) : null,
      votosEleccionAnterior: votosAnteriorRaw ? parseInt(votosAnteriorRaw, 10) : null,
    })

    revalidatePath('/analytics/configuracion')
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '0.875rem', color: '#334155', fontWeight: 500, marginBottom: '0.25rem',
  }
  const inputStyle: React.CSSProperties = {
    padding: '0.5rem 0.75rem', fontSize: '0.875rem', borderRadius: '6px',
    border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box',
  }
  const helpStyle: React.CSSProperties = {
    fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '480px' }}>
      <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>Configuración de Analytics</h1>

      <form action={handleSubmit} style={{
        display: 'flex', flexDirection: 'column', gap: '1.25rem',
        background: '#fff', borderRadius: '12px', padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label htmlFor="fechaEleccion" style={labelStyle}>Fecha de la elección</label>
          <input
            type="date"
            id="fechaEleccion"
            name="fechaEleccion"
            defaultValue={config.fechaEleccion ?? ''}
            style={inputStyle}
          />
          <span style={helpStyle}>Se usa para calcular los días restantes en el dashboard</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label htmlFor="metaVotos" style={labelStyle}>Meta total de votos</label>
          <input
            type="number"
            id="metaVotos"
            name="metaVotos"
            defaultValue={config.metaVotos ?? ''}
            min={0}
            style={inputStyle}
          />
          <span style={helpStyle}>Meta del candidato para calcular el % de avance global</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label htmlFor="votosEleccionAnterior" style={labelStyle}>Votos elección anterior</label>
          <input
            type="number"
            id="votosEleccionAnterior"
            name="votosEleccionAnterior"
            defaultValue={config.votosEleccionAnterior ?? ''}
            min={0}
            style={inputStyle}
          />
          <span style={helpStyle}>Resultado de la elección pasada para comparativos en la proyección</span>
        </div>

        <button type="submit" style={{
          padding: '0.75rem', fontSize: '0.875rem', borderRadius: '6px',
          border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer',
          fontWeight: 600,
        }}>
          Guardar configuración
        </button>
      </form>
    </div>
  )
}
