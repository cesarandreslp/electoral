'use client'

import { useState } from 'react'
import { crearRol, actualizarPermisosRol, eliminarRol, type CustomRoleView, type PermisoInput } from '../actions-roles'
import { screensPorModulo } from '@/lib/screens'

const MODULOS = screensPorModulo()

type Matriz = Record<string, { canView: boolean; canEdit: boolean }>

function MatrizPermisos({ matriz, onChange }: { matriz: Matriz; onChange: (m: Matriz) => void }) {
  function toggle(screenKey: string, campo: 'canView' | 'canEdit') {
    const actual = matriz[screenKey] ?? { canView: false, canEdit: false }
    const siguiente = { ...actual, [campo]: !actual[campo] }
    if (campo === 'canEdit' && siguiente.canEdit) siguiente.canView = true // editar implica ver
    onChange({ ...matriz, [screenKey]: siguiente })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {Object.entries(MODULOS).map(([modulo, screens]) => (
        <div key={modulo}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{modulo}</div>
          {screens.map((s) => {
            const p = matriz[s.key] ?? { canView: false, canEdit: false }
            return (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.25rem 0', fontSize: '0.85rem' }}>
                <span style={{ flex: 1 }}>{s.label}</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <input type="checkbox" checked={p.canView} onChange={() => toggle(s.key, 'canView')} /> Ver
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <input type="checkbox" checked={p.canEdit} onChange={() => toggle(s.key, 'canEdit')} /> Editar
                </label>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export function RolesPanel({ roles: rolesIniciales }: { roles: CustomRoleView[] }) {
  const [roles, setRoles] = useState(rolesIniciales)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [matrizEdicion, setMatrizEdicion] = useState<Matriz>({})
  const [guardando, setGuardando] = useState(false)

  const [creando, setCreando] = useState(false)
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [matrizNueva, setMatrizNueva] = useState<Matriz>({})

  function abrirEdicion(rol: CustomRoleView) {
    setExpandido(expandido === rol.id ? null : rol.id)
    setMatrizEdicion(rol.permissions)
  }

  function permisosDeMatriz(m: Matriz): PermisoInput[] {
    return Object.entries(m).map(([screenKey, p]) => ({ screenKey, ...p }))
  }

  async function onGuardar(roleId: string) {
    setGuardando(true)
    const res = await actualizarPermisosRol(roleId, permisosDeMatriz(matrizEdicion))
    if (!res.success) alert(res.error)
    else setRoles((prev) => prev.map((r) => (r.id === roleId ? { ...r, permissions: matrizEdicion } : r)))
    setGuardando(false)
  }

  async function onEliminar(roleId: string) {
    if (!confirm('¿Eliminar este rol?')) return
    const res = await eliminarRol(roleId)
    if (!res.success) alert(res.error)
    else setRoles((prev) => prev.filter((r) => r.id !== roleId))
  }

  async function onCrear(e: React.FormEvent) {
    e.preventDefault()
    if (!nombreNuevo.trim()) return
    setGuardando(true)
    const res = await crearRol(nombreNuevo, permisosDeMatriz(matrizNueva))
    if (!res.success) { alert(res.error); setGuardando(false); return }
    setNombreNuevo(''); setMatrizNueva({}); setCreando(false); setGuardando(false)
    location.reload() // más simple que re-derivar el id nuevo — esta pantalla no es de alto tráfico
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {roles.map((rol) => (
        <div key={rol.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.9rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => abrirEdicion(rol)}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{rol.name}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{rol.totalUsuarios} usuario(s)</div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onEliminar(rol.id) }} style={{ border: 'none', background: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer' }}>Eliminar</button>
          </div>
          {expandido === rol.id && (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
              <MatrizPermisos matriz={matrizEdicion} onChange={setMatrizEdicion} />
              <button
                onClick={() => onGuardar(rol.id)} disabled={guardando}
                style={{ marginTop: '0.75rem', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.4rem 0.9rem', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                {guardando ? 'Guardando...' : 'Guardar permisos'}
              </button>
            </div>
          )}
        </div>
      ))}

      {!creando ? (
        <button
          onClick={() => setCreando(true)}
          style={{ alignSelf: 'flex-start', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.4rem 0.9rem', fontSize: '0.8rem', cursor: 'pointer' }}
        >
          + Nuevo rol
        </button>
      ) : (
        <form onSubmit={onCrear} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.9rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)}
            placeholder="Nombre del rol (ej. Logística)" required
            style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
          />
          <MatrizPermisos matriz={matrizNueva} onChange={setMatrizNueva} />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" disabled={guardando} style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.4rem 0.9rem', fontSize: '0.8rem', cursor: 'pointer' }}>
              {guardando ? 'Creando...' : 'Crear rol'}
            </button>
            <button type="button" onClick={() => setCreando(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer' }}>Cancelar</button>
          </div>
        </form>
      )}
    </div>
  )
}
