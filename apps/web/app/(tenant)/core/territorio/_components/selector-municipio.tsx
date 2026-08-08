'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { listarMunicipios, type Opcion } from '../../configuracion/actions'

export function SelectorMunicipio({ departamentos, departmentCodeSeleccionado, divipolaSeleccionado }: {
  departamentos: Opcion[]
  departmentCodeSeleccionado: string
  divipolaSeleccionado: string
}) {
  const [deptoCode, setDeptoCode] = useState(departmentCodeSeleccionado)
  const [municipios, setMunicipios] = useState<Opcion[]>([])
  const router = useRouter()

  useEffect(() => {
    if (!deptoCode) { setMunicipios([]); return }
    listarMunicipios(deptoCode).then(setMunicipios)
  }, [deptoCode])

  return (
    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
      <select
        value={deptoCode}
        onChange={(e) => setDeptoCode(e.target.value)}
        style={estiloInput}
      >
        <option value="">Selecciona un departamento…</option>
        {departamentos.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
      </select>

      <select
        value={divipolaSeleccionado}
        onChange={(e) => router.push(`?municipio=${e.target.value}`)}
        disabled={!deptoCode}
        style={{ ...estiloInput, ...(!deptoCode ? { background: '#f1f5f9', color: '#94a3b8' } : {}) }}
      >
        <option value="">{deptoCode ? 'Selecciona un municipio…' : 'Primero elige un departamento'}</option>
        {municipios.map((m) => <option key={m.code} value={m.code}>{m.name}</option>)}
      </select>
    </div>
  )
}

const estiloInput: React.CSSProperties = {
  padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1',
  borderRadius: '6px', fontSize: '0.875rem', outline: 'none', background: '#fff',
}
