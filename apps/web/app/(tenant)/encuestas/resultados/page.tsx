import { requireModule } from '@/lib/auth-helpers'
import { getSurveyStats } from '../actions'

export default async function ResultadosEncuestasPage() {
  await requireModule('ENCUESTAS', ['ADMIN_CAMPANA', 'COORDINADOR'])

  const stats = await getSurveyStats()
  const { rawResponsesGrouped, metadata } = stats

  // Procesar respuestas agrupadas
  const resultsByPregunta: Record<string, {
    pregunta: any,
    candidatos: { id: string, name: string, count: number }[],
    total: number
  }> = {}

  metadata.preguntas.forEach(p => {
    resultsByPregunta[p.id] = {
      pregunta: p,
      candidatos: metadata.candidatos
        .filter(c => c.surveyCargoId === p.surveyCargoId)
        .map(c => ({ id: c.id, name: c.name, count: 0 })),
      total: 0
    }
    // Añadir "Blanco/Nulo"
    resultsByPregunta[p.id].candidatos.push({ id: 'null', name: 'Blanco / No identificado', count: 0 })
  })

  rawResponsesGrouped.forEach(group => {
    const rbp = resultsByPregunta[group.surveyPreguntaId]
    if (rbp) {
      const cId = group.surveyCandidatoId || 'null'
      const cand = rbp.candidatos.find(c => c.id === cId)
      if (cand) {
        cand.count += group._count.id
        rbp.total += group._count.id
      }
    }
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Resultados de las Encuestas</h1>
        <p className="text-slate-500 text-sm mt-1">
          Las respuestas de los electores han sido procesadas e interpretadas usando Inteligencia Artificial para identificar la intención de voto real.
        </p>
      </div>

      {Object.values(resultsByPregunta).length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center text-slate-500 italic">
          No hay preguntas ni resultados registrados aún.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.values(resultsByPregunta).map(resultado => (
            <div key={resultado.pregunta.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-2">{resultado.pregunta.text}</h2>
              <div className="text-xs text-slate-500 mb-6 uppercase tracking-wider font-semibold">Total respuestas: {resultado.total}</div>

              <div className="space-y-4">
                {resultado.candidatos.sort((a,b) => b.count - a.count).map(c => {
                  const percent = resultado.total > 0 ? Math.round((c.count / resultado.total) * 100) : 0
                  return (
                    <div key={c.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700">{c.name}</span>
                        <span className="font-bold text-slate-900">{c.count} ({percent}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5">
                        <div className={`h-2.5 rounded-full ${c.id === 'null' ? 'bg-slate-400' : 'bg-granate'}`} style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
