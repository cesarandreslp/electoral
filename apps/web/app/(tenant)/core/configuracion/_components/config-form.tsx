'use client'

import { useState, useTransition } from 'react'
import { guardarConfiguracion, type ConfiguracionView } from '../actions'

export function ConfigForm({ inicial }: { inicial: ConfiguracionView }) {
  const [groqKey,   setGroqKey]   = useState('')
  const [zhipuKey,  setZhipuKey]  = useState('')
  const [color,     setColor]     = useState(inicial.primaryColor ?? '#7d2839')
  const [domain,    setDomain]    = useState(inicial.domain ?? '')
  const [logoUrl,   setLogoUrl]   = useState(inicial.logoUrl)
  const [msg,       setMsg]       = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [subiendo,  setSubiendo]  = useState(false)
  const [isPending, startTransition] = useTransition()

  async function subirLogo(file: File) {
    setSubiendo(true)
    setMsg(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res  = await fetch('/api/core/upload-logo', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) {
        setLogoUrl(data.url)
        setMsg({ tipo: 'ok', texto: 'Logo actualizado.' })
      } else {
        setMsg({ tipo: 'error', texto: data.error ?? 'No se pudo subir el logo.' })
      }
    } catch {
      setMsg({ tipo: 'error', texto: 'No se pudo subir el logo.' })
    } finally {
      setSubiendo(false)
    }
  }

  function guardar() {
    setMsg(null)
    startTransition(async () => {
      const res = await guardarConfiguracion({
        groqApiKey:   groqKey || undefined,
        zhipuApiKey:  zhipuKey || undefined,
        primaryColor: color,
        domain,
      })
      if (res.success) {
        setGroqKey('')
        setZhipuKey('')
        setMsg({ tipo: 'ok', texto: 'Configuración guardada.' })
      } else {
        setMsg({ tipo: 'error', texto: res.error })
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* ── Branding ─────────────────────────────────────────────────────── */}
      <Seccion titulo="Branding">
        <Campo label="Logo de la campaña">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={logoUrl} alt="Logo" style={{ height: 40, width: 'auto', maxWidth: 160, objectFit: 'contain', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', padding: 4 }} />
              : <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Sin logo</span>}
            <label style={{ ...estiloBoton, background: subiendo ? '#94a3b8' : '#e2e8f0', color: '#0f172a', cursor: subiendo ? 'wait' : 'pointer' }}>
              {subiendo ? 'Subiendo…' : 'Subir logo'}
              <input
                type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp"
                style={{ display: 'none' }} disabled={subiendo}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) subirLogo(f) }}
              />
            </label>
          </div>
          <p style={estiloHint}>PNG, JPG, SVG o WEBP. Máximo 2MB.</p>
        </Campo>

        <Campo label="Color primario">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 44, height: 36, border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff' }} />
            <input type="text" value={color} onChange={(e) => setColor(e.target.value)} placeholder="#7d2839" style={{ ...estiloInput, maxWidth: 140, fontFamily: 'monospace' }} />
          </div>
        </Campo>
      </Seccion>

      {/* ── Dominio ──────────────────────────────────────────────────────── */}
      <Seccion titulo="Dominio propio">
        <Campo label="Dominio de la campaña">
          <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="micampana.com.co" style={estiloInput} />
          <p style={estiloHint}>Apuntar el DNS al sistema es un paso aparte; aquí solo se registra el dominio.</p>
        </Campo>
      </Seccion>

      {/* ── IA ───────────────────────────────────────────────────────────── */}
      <Seccion titulo="Inteligencia artificial (claves propias)">
        <Campo label="Groq API key">
          <input
            type="password" value={groqKey} onChange={(e) => setGroqKey(e.target.value)}
            placeholder={inicial.hasGroqKey ? '•••••••• (ya configurada)' : 'gsk_…'}
            autoComplete="off" style={estiloInput}
          />
        </Campo>
        <Campo label="Zhipu API key">
          <input
            type="password" value={zhipuKey} onChange={(e) => setZhipuKey(e.target.value)}
            placeholder={inicial.hasZhipuKey ? '•••••••• (ya configurada)' : '…'}
            autoComplete="off" style={estiloInput}
          />
        </Campo>
        <p style={estiloHint}>
          Se guardan cifradas. Déjalas en blanco para no cambiarlas. Si no configuras
          ninguna, la campaña usa las claves globales del sistema.
        </p>
      </Seccion>

      {msg && (
        <div style={{
          padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.875rem',
          background: msg.tipo === 'ok' ? '#dcfce7' : '#fee2e2',
          color:      msg.tipo === 'ok' ? '#166534' : '#991b1b',
        }}>
          {msg.texto}
        </div>
      )}

      <div>
        <button onClick={guardar} disabled={isPending} style={{ ...estiloBoton, background: isPending ? '#94a3b8' : '#0f172a', color: '#fff', cursor: isPending ? 'not-allowed' : 'pointer' }}>
          {isPending ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1.25rem' }}>
      <h2 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' }}>{titulo}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>{children}</div>
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#374151', marginBottom: '0.35rem' }}>{label}</label>
      {children}
    </div>
  )
}

const estiloInput: React.CSSProperties = {
  width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #cbd5e1',
  borderRadius: 6, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
}

const estiloBoton: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', border: 'none',
  padding: '0.6rem 1.25rem', borderRadius: 6, fontSize: '0.875rem', fontWeight: 600,
}

const estiloHint: React.CSSProperties = {
  fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.4rem',
}
