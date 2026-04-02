import { LoginForm } from './_components/login-form'

export const metadata = { title: 'Iniciar sesión — CampaignOS Admin' }

export default function SuperadminLoginPage() {
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
            CampaignOS
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
            Panel de administración
          </div>
        </div>

        <LoginForm />
      </div>
    </div>
  )
}
