'use client'

import { useState, useTransition } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface LoginFormProps {
  /** Nombre de la campaña — se muestra como subtítulo */
  tenantName: string
}

export function LoginForm({ tenantName }: LoginFormProps) {
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

      // Redirigir al dashboard del tenant
      router.push('/')
      router.refresh()
    })
  }

  return (
    <div
      style={{
        minHeight:      '100vh',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        background:     '#f1f5f9',
      }}
    >
      <div
        style={{
          width:        '100%',
          maxWidth:     '380px',
          background:   '#fff',
          borderRadius: '12px',
          border:       '1px solid #e2e8f0',
          padding:      '2rem',
          boxShadow:    '0 4px 24px rgba(0,0,0,0.06)',
        }}
      >
        {/* Logo / título */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e40af' }}>
            {tenantName}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
            CampaignOS
          </div>
        </div>

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
              placeholder="tu@correo.com"
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
      </div>
    </div>
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
