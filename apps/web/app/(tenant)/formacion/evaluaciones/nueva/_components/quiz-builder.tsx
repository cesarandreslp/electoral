'use client'

import { useState } from 'react'
import { createQuiz } from '../../../actions'

interface QuestionDraft {
  text: string
  options: string[]
  correctIndex: number
}

export function QuizBuilder() {
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [passingScore, setPassingScore] = useState(60)
  const [questions, setQuestions]      = useState<QuestionDraft[]>([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)

  function addQuestion() {
    setQuestions(prev => [...prev, { text: '', options: ['', '', '', ''], correctIndex: 0 }])
  }

  function removeQuestion(idx: number) {
    setQuestions(prev => prev.filter((_, i) => i !== idx))
  }

  function updateQuestionText(idx: number, text: string) {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, text } : q))
  }

  function updateOption(qIdx: number, oIdx: number, value: string) {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q
      const options = [...q.options]
      options[oIdx] = value
      return { ...q, options }
    }))
  }

  function setCorrect(qIdx: number, oIdx: number) {
    setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, correctIndex: oIdx } : q))
  }

  async function handleSubmit() {
    if (!title.trim()) { setError('Título obligatorio.'); return }
    if (questions.length === 0) { setError('Agrega al menos una pregunta.'); return }
    if (questions.some(q => !q.text.trim() || q.options.some(o => !o.trim()))) {
      setError('Completa todas las preguntas y opciones.')
      return
    }

    setLoading(true)
    setError(null)

    const result = await createQuiz({
      title: title.trim(),
      description: description.trim() || undefined,
      passingScore,
      questions,
    })

    setLoading(false)

    if (!result.success) {
      setError(result.error)
    } else {
      window.location.href = '/formacion/evaluaciones'
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Datos generales */}
      <div style={{
        background: '#fff', borderRadius: '12px', padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column', gap: '1rem',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={labelStyle}>Título</label>
          <input value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={labelStyle}>Descripción (opcional)</label>
          <input value={description} onChange={e => setDescription(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={labelStyle}>Puntaje mínimo para aprobar (%)</label>
          <input
            type="number" min={0} max={100}
            value={passingScore} onChange={e => setPassingScore(Number(e.target.value))}
            style={{ ...inputStyle, maxWidth: '120px' }}
          />
        </div>
      </div>

      {/* Preguntas */}
      {questions.map((q, qi) => (
        <div
          key={qi}
          style={{
            background: '#fff', borderRadius: '12px', padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            display: 'flex', flexDirection: 'column', gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>
              Pregunta {qi + 1}
            </span>
            <button
              type="button"
              onClick={() => removeQuestion(qi)}
              style={{
                padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px',
                border: '1px solid #fecaca', background: '#fff', color: '#ef4444', cursor: 'pointer',
              }}
            >
              Eliminar
            </button>
          </div>

          <input
            placeholder="Enunciado de la pregunta"
            value={q.text}
            onChange={e => updateQuestionText(qi, e.target.value)}
            style={inputStyle}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {q.options.map((opt, oi) => (
              <div key={oi} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setCorrect(qi, oi)}
                  title={q.correctIndex === oi ? 'Respuesta correcta' : 'Marcar como correcta'}
                  style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    border: `2px solid ${q.correctIndex === oi ? '#22c55e' : '#cbd5e1'}`,
                    background: q.correctIndex === oi ? '#dcfce7' : '#fff',
                    cursor: 'pointer', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', color: q.correctIndex === oi ? '#166534' : '#94a3b8',
                  }}
                >
                  {q.correctIndex === oi ? '\u2713' : ''}
                </button>
                <input
                  placeholder={`Opción ${oi + 1}`}
                  value={opt}
                  onChange={e => updateOption(qi, oi, e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addQuestion}
        style={{
          padding: '0.6rem', fontSize: '0.875rem', borderRadius: '6px',
          border: '2px dashed #cbd5e1', background: '#fff', color: '#64748b',
          cursor: 'pointer', fontWeight: 500,
        }}
      >
        + Agregar pregunta
      </button>

      {error && (
        <div style={{
          background: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem',
          borderRadius: '8px', fontSize: '0.875rem',
        }}>
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          padding: '0.75rem 1.5rem', fontSize: '0.875rem', borderRadius: '6px',
          border: 'none', background: '#1e40af', color: '#fff',
          cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600,
          alignSelf: 'flex-start',
        }}
      >
        {loading ? 'Creando...' : 'Crear evaluación'}
      </button>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.8rem', color: '#334155', fontWeight: 500,
}
const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem', fontSize: '0.875rem', borderRadius: '6px',
  border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box',
}
