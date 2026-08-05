import { getSurveyCampaigns, toggleSurveyEnabled } from '../actions'
import { requireModule } from '@/lib/auth-helpers'
import Link from 'next/link'
import { ToggleSurveyButton } from './_components/toggle-survey-button'

export default async function CampanasEncuestasPage() {
  await requireModule('ENCUESTAS', ['ADMIN_CAMPANA', 'COORDINADOR'])

  const campaigns = await getSurveyCampaigns()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campañas de Encuesta</h1>
          <p className="text-slate-500 text-sm mt-1">
            Administra las encuestas activas. Activar una encuesta permitirá al bot interactuar con los electores.
          </p>
        </div>
        <Link href="/encuestas/campanas/nueva" className="bg-blue-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-blue-700 transition">
          + Nueva Campaña
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha Elección</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cargos</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Encuesta Activa</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500 italic">No hay campañas configuradas.</td>
              </tr>
            ) : (
              campaigns.map((camp) => (
                <tr key={camp.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{camp.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {new Date(camp.electionDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {camp.cargos.length} cargo(s)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <ToggleSurveyButton campaignId={camp.id} isEnabled={camp.isSurveyEnabled} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
