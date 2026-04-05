'use client'

import { useState } from 'react'
import { submitQuizAttempt } from '../../../actions'
import type { QuizForUser, QuizAttemptResult } from '../../../actions'

export function QuizForm({ quiz }: { quiz: QuizForUser }) {
  const [answers, setAnswers]   = useState<(number | null)[]>(new Array(quiz.questions.length).fill(null))
  const [result, setResult]     = useState<QuizAttemptResult | null>(null)
  const [loading, setLoading]   = useState(false)
  const [certLoading, setCertLoading] = useState(false)
  const [certUrl, setCertUrl]   = useState<string | null>(null)

  function selectOption(questionIdx: number, optionIdx: number) {
    if (result) return // No changes after submission
    setAnswers(prev => {
      const next = [...prev]
      next[questionIdx] = optionIdx
      return next
    })
  }

  async function handleSubmit() {
    if (answers.some(a => a === null)) return
    setLoading(true)
    try {
      const res = await submitQuizAttempt(quiz.id, answers as number[])
      setResult(res)
    } catch {
      alert('Error al enviar las respuestas.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateCertificate() {
    setCertLoading(true)
    try {
      const res = await fetch('/api/formacion/certificado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId: quiz.id }),
      })
      const data = await res.json()
      if (data.success && data.pdfUrl) {
        setCertUrl(data.pdfUrl)
      } else {
        alert(data.error ?? 'Error al generar el certificado.')
      }
    } catch {
      alert('Error al generar el certificado.')
    } finally {
      setCertLoading(false)
    }
  }

  const allAnswered = answers.every(a => a !== null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {quiz.questions.map((q, qi) => (
        <div
          key={q.id}
          style={{
            background: '#fff', borderRadius: '12px', padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.75rem' }}>
            {qi + 1}. {q.text}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {q.options.map((opt, oi) => {
              const selected = answers[qi] === oi
              return (
                <button
                  key={oi}
                  type="button"
                  onClick={() => selectOption(qi, oi)}
                  disabled={!!result}
                  style={{
                    padding: '0.6rem 1rem',
                    fontSize: '0.875rem',
                    borderRadius: '8px',
                    border: `2px solid ${selected ? '#1e40af' : '#e2e8f0'}`,
                    background: selected ? '#dbeafe' : '#fff',
                    color: '#0f172a',
                    cursor: result ? 'default' : 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Submit button */}
      {!result && (
        <button
          onClick={handleSubmit}
          disabled={!allAnswered || loading}
          style={{
            padding: '0.75rem 1.5rem', fontSize: '0.875rem', borderRadius: '6px',
            border: 'none',
            background: allAnswered ? '#1e40af' : '#94a3b8',
            color: '#fff', cursor: allAnswered && !loading ? 'pointer' : 'not-allowed',
            fontWeight: 600, alignSelf: 'flex-start',
          }}
        >
          {loading ? 'Enviando...' : 'Enviar respuestas'}
        </button>
      )}

      {/* Result card */}
      {result && (
        <div style={{
          background: result.passed ? '#dcfce7' : '#fee2e2',
          border: `2px solid ${result.passed ? '#22c55e' : '#ef4444'}`,
          borderRadius: '12px', padding: '1.5rem',
        }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: result.passed ? '#166534' : '#991b1b' }}>
            {result.passed ? 'Aprobado' : 'No aprobado'}
          </h2>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.95rem', color: result.passed ? '#166534' : '#991b1b' }}>
            Puntaje: {result.score}% ({result.correct} de {result.total} correctas)
          </p>

          {result.passed && !certUrl && (
            <button
              onClick={handleGenerateCertificate}
              disabled={certLoading}
              style={{
                marginTop: '1rem',
                padding: '0.6rem 1.2rem', fontSize: '0.875rem', borderRadius: '6px',
                border: 'none', background: '#166534', color: '#fff',
                cursor: certLoading ? 'not-allowed' : 'pointer', fontWeight: 600,
              }}
            >
              {certLoading ? 'Generando certificado...' : 'Generar certificado'}
            </button>
          )}

          {certUrl && (
            <a
              href={certUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block', marginTop: '1rem',
                padding: '0.6rem 1.2rem', fontSize: '0.875rem', borderRadius: '6px',
                background: '#1e40af', color: '#fff', textDecoration: 'none', fontWeight: 600,
              }}
            >
              Descargar certificado
            </a>
          )}

          {!result.passed && (
            <p style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', color: '#991b1b', opacity: 0.8 }}>
              Puedes intentarlo de nuevo. El mínimo para aprobar es {quiz.passingScore}%.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
