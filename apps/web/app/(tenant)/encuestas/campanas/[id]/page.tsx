import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireModule } from '@/lib/auth-helpers'
import { getSurveyStatsByCampaign } from '../../actions'
import { ResultadosPorPregunta } from '../../_components/resultados-por-pregunta'
import { ToggleSurveyButton } from '../_components/toggle-survey-button'

export default async function CampanaResultadosPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModule('ENCUESTAS', ['ADMIN_CAMPANA', 'COORDINADOR'])
  const { id } = await params

  const stats = await getSurveyStatsByCampaign(id)
  if (!stats) notFound()

  const { campania } = stats

  return (
    <div className="space-y-6">
      <div>
        <Link href="/encuestas/campanas" className="text-sm text-blue-700 hover:underline">← Campañas</Link>
      </div>

      <div className="flex justify-between items-start bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{campania.name}</h1>
          <p className="text-slate-500 text-sm mt-1">
            Elección: {new Date(campania.electionDate).toLocaleDateString('es-CO')}
          </p>
        </div>
        <ToggleSurveyButton campaignId={campania.id} isEnabled={campania.isSurveyEnabled} />
      </div>

      <ResultadosPorPregunta {...stats} vacio="Todavía no hay respuestas para esta campaña." />
    </div>
  )
}
