import {
  listGlobalMaterials,
  createGlobalMaterial,
  toggleMaterialStatus,
  reorderMaterial,
  deleteGlobalMaterial,
} from '../../actions'
import type { GlobalMaterialSummary } from '../../actions'

const TIPOS = ['SLIDES', 'PDF', 'VIDEO', 'INFOGRAFIA'] as const

const TIPO_BADGE: Record<string, string> = {
  SLIDES:     'bg-slate-100 text-slate-700 border-slate-200',
  PDF:        'bg-red-50 text-red-700 border-red-200',
  VIDEO:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  INFOGRAFIA: 'bg-amber-50 text-amber-700 border-amber-200',
}

export default async function FormacionPage() {
  const materiales = await listGlobalMaterials()

  async function handleCreate(formData: FormData) {
    'use server'
    await createGlobalMaterial(formData)
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Materiales globales de formación</h1>
        <p className="text-sm text-slate-500 mt-1">
          Disponibles para todas las campañas con el módulo Formación activo.
        </p>
      </header>

      {/* Formulario de subida */}
      <form
        action={handleCreate}
        className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col gap-4"
      >
        <h2 className="text-base font-semibold text-slate-900">Nuevo material</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="title" className={CLASE_LABEL}>Título</label>
            <input id="title" name="title" required className={CLASE_INPUT} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="type" className={CLASE_LABEL}>Tipo</label>
            <select id="type" name="type" required className={CLASE_INPUT}>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className={CLASE_LABEL}>Descripción (opcional)</label>
          <input id="description" name="description" className={CLASE_INPUT} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="file" className={CLASE_LABEL}>Archivo</label>
          <input
            id="file" name="file" type="file" required
            className="text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-oliva/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-oliva-dark hover:file:bg-oliva/20"
          />
        </div>

        <button
          type="submit"
          className="self-start bg-oliva text-white px-5 py-2.5 rounded-md text-sm font-semibold hover:bg-oliva-dark transition"
        >
          Subir material
        </button>
      </form>

      {/* Tabla de materiales */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {['Orden', 'Título', 'Tipo', 'Tamaño', 'Estado', 'Acciones'].map(h => (
                <th key={h} className={CLASE_TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {materiales.map((m, idx) => (
              <MaterialRow key={m.id} material={m} index={idx} total={materiales.length} />
            ))}
            {materiales.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  No hay materiales cargados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MaterialRow({ material: m, index, total }: {
  material: GlobalMaterialSummary; index: number; total: number
}) {
  const badge = TIPO_BADGE[m.type] ?? TIPO_BADGE.PDF

  async function handleToggle() {
    'use server'
    await toggleMaterialStatus(m.id)
  }

  async function handleMoveUp() {
    'use server'
    if (index > 0) await reorderMaterial(m.id, m.order - 1)
  }

  async function handleMoveDown() {
    'use server'
    if (index < total - 1) await reorderMaterial(m.id, m.order + 1)
  }

  async function handleDelete() {
    'use server'
    await deleteGlobalMaterial(m.id)
  }

  const fileSize = m.fileSize
    ? m.fileSize > 1048576
      ? `${(m.fileSize / 1048576).toFixed(1)} MB`
      : `${Math.round(m.fileSize / 1024)} KB`
    : '—'

  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition">
      <td className={CLASE_TD}>
        <div className="flex items-center gap-1">
          <form action={handleMoveUp}>
            <button type="submit" disabled={index === 0} className={CLASE_BTN_MINI} title="Subir">
              &#9650;
            </button>
          </form>
          <form action={handleMoveDown}>
            <button type="submit" disabled={index === total - 1} className={CLASE_BTN_MINI} title="Bajar">
              &#9660;
            </button>
          </form>
          <span className="ml-1 text-xs text-slate-400">{m.order}</span>
        </div>
      </td>
      <td className={CLASE_TD}>
        <a
          href={m.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-granate hover:underline"
        >
          {m.title}
        </a>
        {m.description && <div className="text-xs text-slate-400">{m.description}</div>}
      </td>
      <td className={CLASE_TD}>
        <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-semibold ${badge}`}>
          {m.type}
        </span>
      </td>
      <td className={`${CLASE_TD} text-slate-500 whitespace-nowrap`}>{fileSize}</td>
      <td className={CLASE_TD}>
        <form action={handleToggle}>
          <button
            type="submit"
            className={`px-2.5 py-1 rounded border text-xs font-semibold transition ${
              m.isActive
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            {m.isActive ? 'Activo' : 'Inactivo'}
          </button>
        </form>
      </td>
      <td className={CLASE_TD}>
        <form action={handleDelete}>
          <button
            type="submit"
            className="px-2.5 py-1 rounded border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition"
          >
            Eliminar
          </button>
        </form>
      </td>
    </tr>
  )
}

const CLASE_LABEL = 'text-sm font-medium text-slate-700'
const CLASE_INPUT =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 ' +
  'placeholder:text-slate-400 outline-none transition ' +
  'focus:border-granate focus:ring-2 focus:ring-granate/20'
const CLASE_TH =
  'text-left font-semibold text-xs uppercase tracking-wider text-slate-500 px-4 py-3 whitespace-nowrap'
const CLASE_TD = 'px-4 py-3 align-middle text-slate-700'
const CLASE_BTN_MINI =
  'px-1.5 py-0.5 rounded border border-slate-200 bg-white text-xs text-slate-600 ' +
  'hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition'
