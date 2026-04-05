import Link from 'next/link'
import { getQuizForUser } from '../../actions'
import { QuizForm } from './_components/quiz-form'

export default async function QuizDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: quizId } = await params
  const quiz = await getQuizForUser(quizId)

  if (!quiz) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
        Evaluación no encontrada.{' '}
        <Link href="/formacion/evaluaciones" style={{ color: '#1e40af' }}>Volver</Link>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '700px' }}>
      <div>
        <Link href="/formacion/evaluaciones" style={{ color: '#64748b', fontSize: '0.8rem', textDecoration: 'none' }}>
          &larr; Volver a evaluaciones
        </Link>
        <h1 style={{ margin: '0.5rem 0 0', fontSize: '1.5rem', color: '#0f172a' }}>
          {quiz.title}
        </h1>
        {quiz.description && (
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#64748b' }}>
            {quiz.description}
          </p>
        )}
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
          {quiz.questions.length} pregunta{quiz.questions.length !== 1 ? 's' : ''} · Mínimo: {quiz.passingScore}%
        </p>
      </div>

      <QuizForm quiz={quiz} />
    </div>
  )
}
