'use client'

import { useEffect, useState } from 'react'

interface DemoButtonProps {
  /** 'solid' = granate lleno; 'outline' = borde; 'light' = claro sobre fondo oscuro */
  variant?: 'solid' | 'outline' | 'light'
  className?: string
  children?: React.ReactNode
}

// Dirección a la que llega la solicitud de demo.
// ponytail: mailto sin backend — reemplazar por un Server Action / endpoint
// que persista el lead cuando exista el módulo de captación de demos.
const DEMO_EMAIL = 'direccion.comercial@ossinnovation.com'

const estilos: Record<NonNullable<DemoButtonProps['variant']>, string> = {
  solid:   'bg-granate hover:bg-granate-dark text-white',
  outline: 'border border-granate text-granate hover:bg-granate hover:text-white',
  light:   'bg-white text-granate hover:bg-plata-light',
}

export function DemoButton({ variant = 'solid', className = '', children }: DemoButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-lg px-6 py-3 font-semibold transition ${estilos[variant]} ${className}`}
      >
        {children ?? 'Solicitar demo'}
      </button>
      {open && <DemoModal onClose={() => setOpen(false)} />}
    </>
  )
}

function DemoModal({ onClose }: { onClose: () => void }) {
  const [enviado, setEnviado] = useState(false)

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = ''
    }
  }, [onClose])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const cuerpo =
      `Nombre: ${f.get('nombre')}\n` +
      `Campaña / organización: ${f.get('campana')}\n` +
      `Email: ${f.get('email')}\n` +
      `Teléfono (WhatsApp): ${f.get('telefono')}\n\n` +
      `Mensaje:\n${f.get('mensaje') || '(sin mensaje)'}`
    window.location.href =
      `mailto:${DEMO_EMAIL}?subject=${encodeURIComponent('Solicitud de demo — Vectra')}` +
      `&body=${encodeURIComponent(cuerpo)}`
    setEnviado(true)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Solicitar una demo"
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 sm:p-8 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 text-xl leading-none"
        >
          ×
        </button>

        {enviado ? (
          <div className="text-center py-6">
            <div className="text-oliva text-3xl mb-3">✓</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">¡Gracias!</h2>
            <p className="text-slate-600 text-sm">
              Se abrió tu correo con la solicitud. Nuestro equipo te contactará
              en menos de 24 horas.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 rounded-lg px-5 py-2 bg-granate hover:bg-granate-dark text-white font-semibold"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <img src="/logo.png" alt="Vectra" className="h-9 w-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-1">Solicitar una demo</h2>
            <p className="text-sm text-slate-500 mb-5">
              Cuéntanos sobre tu campaña y te mostramos Vectra en vivo.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <Campo name="nombre"   label="Nombre completo"        type="text"  required />
              <Campo name="campana"  label="Campaña / organización" type="text"  required />
              <Campo name="email"    label="Correo electrónico"     type="email" required />
              <Campo name="telefono" label="Teléfono (WhatsApp)"    type="tel"   required />
              <div>
                <label htmlFor="mensaje" className="block text-sm font-medium text-slate-700 mb-1">
                  Mensaje <span className="text-slate-400">(opcional)</span>
                </label>
                <textarea
                  id="mensaje" name="mensaje" rows={3}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-granate"
                />
              </div>
              <button
                type="submit"
                className="mt-1 rounded-lg px-5 py-2.5 bg-granate hover:bg-granate-dark text-white font-semibold transition"
              >
                Enviar solicitud
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

function Campo({ name, label, type, required }: { name: string; label: string; type: string; required?: boolean }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        id={name} name={name} type={type} required={required}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-granate"
      />
    </div>
  )
}
