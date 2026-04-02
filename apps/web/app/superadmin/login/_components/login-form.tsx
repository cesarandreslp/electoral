'use client'

import { useState, useTransition } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export function LoginForm() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const resultado = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (resultado?.error) {
        setError('Credenciales incorrectas. Verifica tu email y contraseña.')
        return
      }

      // Redirigir al dashboard del superadmin
      router.push('/')
      router.refresh()
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
    >
      <div>
        <label
          htmlFor="email"
          style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}
        >
          Correo electrónico
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="admin@campaignos.co"
          style={estiloInput}
        />
      </div>

      <div>
        <label
          htmlFor="password"
          style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}
        >
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          style={estiloInput}
        />
      </div>

      {error && (
        <div
          style={{
            padding:      '0.625rem 0.75rem',
            borderRadius: '6px',
            background:   '#fee2e2',
            color:        '#991b1b',
            fontSize:     '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        style={{
          background:   isPending ? '#94a3b8' : '#1e40af',
          color:        '#fff',
          padding:      '0.625rem 1rem',
          borderRadius: '6px',
          border:       'none',
          cursor:       isPending ? 'not-allowed' : 'pointer',
          fontSize:     '0.875rem',
          fontWeight:   600,
          marginTop:    '0.25rem',
        }}
      >
        {isPending ? 'Iniciando sesión...' : 'Iniciar sesión'}
      </button>
    </form>
  )
}

const estiloInput: React.CSSProperties = {
  width:        '100%',
  padding:      '0.5rem 0.75rem',
  border:       '1px solid #cbd5e1',
  borderRadius: '6px',
  fontSize:     '0.875rem',
  outline:      'none',
  boxSizing:    'border-box',
}
