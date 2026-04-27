import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@campaignos/auth'

export const metadata = {
  title: 'CampaignOS — Inteligencia electoral para Colombia',
}

/**
 * Landing pública en `/`. Si hay sesión activa, redirige al panel
 * correspondiente al rol del usuario.
 */
export default async function HomePage() {
  const session = await auth()
  if (session?.user) {
    redirect(session.user.role === 'SUPERADMIN' ? '/superadmin' : '/core')
  }

  return (
    <main className="min-h-[100dvh] bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="px-5 sm:px-10 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="font-bold text-lg tracking-tight">CampaignOS</span>
        </div>
        <Link
          href="/login"
          className="text-sm font-semibold rounded-md px-4 py-2 bg-white/10 hover:bg-white/20 transition border border-white/20"
        >
          Iniciar sesión
        </Link>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="px-5 sm:px-10 pt-10 sm:pt-20 pb-12 sm:pb-24 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="inline-block text-xs sm:text-sm font-semibold uppercase tracking-wider text-amber-300 mb-3">
              Inteligencia electoral · Colombia
            </p>
            <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-5">
              La plataforma para ganar elecciones con datos, no con intuición.
            </h1>
            <p className="text-base sm:text-lg text-slate-300 max-w-xl mb-8">
              Gestione líderes, electores y testigos en una sola plataforma.
              Mapa de calor en tiempo real, transmisión E-14 con visión por
              computadora, y un agente de IA que mide la fidelidad de cada
              líder de su red.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/login"
                className="rounded-lg px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-center transition"
              >
                Acceder a mi campaña
              </Link>
              <a
                href="mailto:contacto@campaignos.co?subject=Demo%20CampaignOS"
                className="rounded-lg px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/20 font-semibold text-center transition"
              >
                Solicitar demo
              </a>
            </div>
          </div>

          {/* Card decorativa */}
          <div className="relative hidden lg:block">
            <div className="absolute inset-0 -translate-x-4 translate-y-4 rounded-2xl bg-amber-400/20 blur-2xl" />
            <div className="relative rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6 shadow-2xl">
              <Stat label="Departamentos cubiertos" value="33" />
              <Stat label="Municipios DIVIPOLA"     value="1.103" />
              <Stat label="Líderes registrados"     value="∞" />
              <Stat label="Tiempo a resultado E-14" value="< 90 s" highlight />
            </div>
          </div>
        </div>
      </section>

      {/* ── Módulos ─────────────────────────────────────────────────────── */}
      <section className="px-5 sm:px-10 py-12 sm:py-20 bg-slate-950/40 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold mb-8 sm:mb-12 text-center">
            Todo lo que su campaña necesita
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Modulo
              titulo="CORE"
              desc="Estructura DIVIPOLA, líderes con jerarquía, electores cifrados, QR de captación."
            />
            <Modulo
              titulo="Analytics"
              desc="KPIs, mapa de calor, proyección de votos y agente IA de fidelidad de líderes."
            />
            <Modulo
              titulo="Día E"
              desc="Transmisión del E-14 con consenso Groq + Zhipu y sala de situación en vivo."
            />
            <Modulo
              titulo="Formación"
              desc="Capacitación de testigos, evaluaciones y certificados PDF en Vercel Blob."
            />
            <Modulo
              titulo="Comunicaciones"
              desc="SMS / WhatsApp / email segmentado y reglas de automatización por evento."
            />
            <Modulo
              titulo="Finanzas"
              desc="Topes legales del CNE, gastos, donaciones e informes financieros para el CNE."
            />
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="px-5 sm:px-10 py-8 border-t border-white/5 text-sm text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between gap-3">
          <span>© {new Date().getFullYear()} CampaignOS</span>
          <span className="text-slate-500">
            Cumplimiento Ley 1581/2012 · Datos cifrados AES-256-GCM
          </span>
        </div>
      </footer>
    </main>
  )
}

function Logo() {
  return (
    <span
      className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-amber-400 text-slate-900 font-extrabold text-base"
      aria-hidden
    >
      C
    </span>
  )
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-3 border-b last:border-b-0 border-white/10">
      <span className="text-sm text-slate-300">{label}</span>
      <span className={`font-bold text-lg ${highlight ? 'text-amber-300' : 'text-white'}`}>{value}</span>
    </div>
  )
}

function Modulo({ titulo, desc }: { titulo: string; desc: string }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5 sm:p-6 hover:bg-white/10 transition">
      <div className="text-amber-300 text-xs font-semibold uppercase tracking-wider mb-2">
        Módulo
      </div>
      <h3 className="font-bold text-lg mb-2">{titulo}</h3>
      <p className="text-sm text-slate-300 leading-relaxed">{desc}</p>
    </div>
  )
}
