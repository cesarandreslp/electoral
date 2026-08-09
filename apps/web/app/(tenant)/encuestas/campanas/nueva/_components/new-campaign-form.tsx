'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSurveyCampaign } from '../../../actions'

type TipoPregunta = 'FREE_TEXT' | 'BOOLEAN' | 'SINGLE_CHOICE'

interface PreguntaForm {
  text: string
  type: TipoPregunta
  opciones: string[]
}

const PREGUNTA_VACIA: PreguntaForm = { text: '', type: 'FREE_TEXT', opciones: ['', ''] }

export function NewCampaignForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Estado simple para la demo (1 cargo con varias preguntas y candidatos)
  // Para producción esto debe soportar múltiples cargos
  const [name, setName] = useState('')
  const [electionDate, setElectionDate] = useState('')
  const [cargoName, setCargoName] = useState('Alcaldía')
  const [preguntas, setPreguntas] = useState<PreguntaForm[]>([{ ...PREGUNTA_VACIA, text: '¿Por quién votarías para la Alcaldía?' }])
  const [candidatos, setCandidatos] = useState([{ name: 'Candidato 1', code: '' }, { name: 'Candidato 2', code: '' }])

  const handleAddCandidato = () => setCandidatos([...candidatos, { name: '', code: '' }])
  const updateCandidato = (index: number, field: string, value: string) => {
    const newCands = [...candidatos]
    newCands[index] = { ...newCands[index], [field]: value }
    setCandidatos(newCands)
  }

  const handleAddPregunta = () => setPreguntas([...preguntas, { ...PREGUNTA_VACIA }])
  const handleRemovePregunta = (i: number) => setPreguntas(preguntas.filter((_, idx) => idx !== i))
  const updatePregunta = (i: number, campo: Partial<PreguntaForm>) => {
    const nuevas = [...preguntas]
    nuevas[i] = { ...nuevas[i], ...campo }
    setPreguntas(nuevas)
  }
  const updateOpcion = (i: number, oi: number, value: string) => {
    const nuevas = [...preguntas]
    const opciones = [...nuevas[i].opciones]
    opciones[oi] = value
    nuevas[i] = { ...nuevas[i], opciones }
    setPreguntas(nuevas)
  }
  const addOpcion = (i: number) => updatePregunta(i, { opciones: [...preguntas[i].opciones, ''] })
  const removeOpcion = (i: number, oi: number) => updatePregunta(i, { opciones: preguntas[i].opciones.filter((_, idx) => idx !== oi) })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const payload = {
      name,
      electionDate: new Date(electionDate),
      cargos: [
        {
          name: cargoName,
          order: 1,
          preguntas: preguntas
            .filter(p => p.text.trim() !== '')
            .map((p, i) => ({
              text: p.text,
              order: i + 1,
              type: p.type,
              opciones: p.type === 'SINGLE_CHOICE' ? p.opciones.filter(o => o.trim() !== '') : undefined,
            })),
          candidatos: candidatos.filter(c => c.name.trim() !== '')
        }
      ]
    }

    const res = await createSurveyCampaign(payload)
    if (res.success) {
      router.push('/encuestas/campanas')
    } else {
      setError(res.error || 'Error al guardar')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Nombre de la Campaña</label>
          <input value={name} onChange={e => setName(e.target.value)} required className="w-full border rounded px-3 py-2" placeholder="Ej. Encuesta Regional 2026" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Fecha de Elección</label>
          <input type="date" value={electionDate} onChange={e => setElectionDate(e.target.value)} required className="w-full border rounded px-3 py-2" />
        </div>
      </div>

      <hr />

      <div>
        <label className="block text-sm font-semibold mb-1">Nombre del Cargo</label>
        <input value={cargoName} onChange={e => setCargoName(e.target.value)} required className="w-full border rounded px-3 py-2" />
      </div>

      <div>
        <h3 className="text-lg font-bold mb-2">Preguntas</h3>
        <div className="space-y-4">
          {preguntas.map((p, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2">
              <div className="flex gap-2">
                <input
                  value={p.text}
                  onChange={e => updatePregunta(i, { text: e.target.value })}
                  placeholder="Texto de la pregunta"
                  required
                  className="flex-1 border rounded px-3 py-2 text-sm"
                />
                <select
                  value={p.type}
                  onChange={e => updatePregunta(i, { type: e.target.value as TipoPregunta })}
                  className="border rounded px-2 py-2 text-sm"
                >
                  <option value="FREE_TEXT">Abierta (IA)</option>
                  <option value="BOOLEAN">Sí / No</option>
                  <option value="SINGLE_CHOICE">Opción múltiple</option>
                </select>
                {preguntas.length > 1 && (
                  <button type="button" onClick={() => handleRemovePregunta(i)} className="text-red-500 text-sm px-2">✕</button>
                )}
              </div>

              {p.type === 'FREE_TEXT' && (
                <p className="text-xs text-slate-500">Se procesa con IA (Llama 3) para identificar al candidato entre los de abajo, incluso por apodo o número de tarjetón.</p>
              )}

              {p.type === 'SINGLE_CHOICE' && (
                <div className="space-y-1 pl-1">
                  {p.opciones.map((o, oi) => (
                    <div key={oi} className="flex gap-2">
                      <input
                        value={o}
                        onChange={e => updateOpcion(i, oi, e.target.value)}
                        placeholder={`Opción ${oi + 1}`}
                        className="flex-1 border rounded px-3 py-1.5 text-sm"
                      />
                      {p.opciones.length > 2 && (
                        <button type="button" onClick={() => removeOpcion(i, oi)} className="text-red-500 text-sm px-2">✕</button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => addOpcion(i)} className="text-granate text-xs font-semibold hover:underline">+ Añadir opción</button>
                </div>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={handleAddPregunta} className="mt-2 text-granate text-sm font-semibold hover:underline">+ Añadir pregunta</button>
      </div>

      <div>
        <h4 className="font-bold mb-2">Candidatos Oficiales</h4>
        <p className="text-xs text-slate-500 mb-2">Usados para identificar respuestas a preguntas abiertas de este cargo.</p>
        {candidatos.map((c, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input value={c.name} onChange={e => updateCandidato(i, 'name', e.target.value)} placeholder="Nombre del candidato" required className="flex-1 border rounded px-3 py-2 text-sm" />
            <input value={c.code} onChange={e => updateCandidato(i, 'code', e.target.value)} placeholder="Código (ej. U10)" className="w-32 border rounded px-3 py-2 text-sm" />
          </div>
        ))}
        <button type="button" onClick={handleAddCandidato} className="text-granate text-sm font-semibold hover:underline">+ Añadir candidato</button>
      </div>

      {error && <div className="text-red-600 text-sm font-semibold bg-red-50 p-3 rounded">{error}</div>}

      <div className="pt-4 flex justify-end">
        <button type="submit" disabled={loading} className="bg-slate-900 text-white px-6 py-2 rounded-md font-semibold hover:bg-slate-800 disabled:opacity-50">
          {loading ? 'Guardando...' : 'Crear Campaña'}
        </button>
      </div>
    </form>
  )
}
