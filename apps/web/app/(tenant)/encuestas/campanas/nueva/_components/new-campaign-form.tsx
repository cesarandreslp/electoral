'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSurveyCampaign } from '../../../actions'

export function NewCampaignForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Estado simple para la demo (1 cargo con 1 pregunta y 2 candidatos)
  // Para producción esto debe ser un array dinámico
  const [name, setName] = useState('')
  const [electionDate, setElectionDate] = useState('')
  const [cargoName, setCargoName] = useState('Alcaldía')
  const [preguntaText, setPreguntaText] = useState('¿Por quién votarías para la Alcaldía?')
  const [candidatos, setCandidatos] = useState([{ name: 'Candidato 1', code: '' }, { name: 'Candidato 2', code: '' }])

  const handleAddCandidato = () => setCandidatos([...candidatos, { name: '', code: '' }])
  const updateCandidato = (index: number, field: string, value: string) => {
    const newCands = [...candidatos]
    newCands[index] = { ...newCands[index], [field]: value }
    setCandidatos(newCands)
  }

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
          preguntas: [{ text: preguntaText, order: 1, type: 'FREE_TEXT' as const }],
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
        <h3 className="text-lg font-bold mb-2">Configuración del Cargo (Simplificada)</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Nombre del Cargo</label>
            <input value={cargoName} onChange={e => setCargoName(e.target.value)} required className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Pregunta al Elector (Texto Libre)</label>
            <input value={preguntaText} onChange={e => setPreguntaText(e.target.value)} required className="w-full border rounded px-3 py-2" />
            <p className="text-xs text-slate-500 mt-1">Esta pregunta será procesada por IA (Llama 3) para identificar al candidato.</p>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-bold mb-2">Candidatos Oficiales</h4>
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
