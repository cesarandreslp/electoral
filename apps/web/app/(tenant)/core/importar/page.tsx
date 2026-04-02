'use client'

/**
 * Página de importación masiva de electores desde CSV.
 * Flujo:
 *   1. El usuario sube un archivo CSV
 *   2. Se parsea el CSV en el browser y se muestra preview de las primeras 5 filas
 *   3. Al confirmar, se envía al Server Action importVoters()
 *   4. Se muestra el resultado: creados, omitidos, errores
 */

import { useState, useRef, useTransition } from 'react'
import { importVoters, type ImportVoterRow, type ImportResult } from '../actions'

// Columnas esperadas en el CSV
const COLUMNAS = ['cedula', 'name', 'phone', 'leaderName', 'commitmentStatus']

export default function ImportarPage() {
  const [filas,       setFilas]       = useState<ImportVoterRow[]>([])
  const [preview,     setPreview]     = useState<string[][]>([])
  const [archivoNom,  setArchivoNom]  = useState('')
  const [resultado,   setResultado]   = useState<ImportResult | null>(null)
  const [error,       setError]       = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()

  function parsearCSV(texto: string): string[][] {
    return texto
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, '')))
  }

  function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return

    setArchivoNom(archivo.name)
    setResultado(null)
    setError(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const texto = ev.target?.result as string
      const tabla = parsearCSV(texto)

      if (tabla.length < 2) {
        setError('El archivo parece estar vacío o sin datos.')
        return
      }

      // Verificar encabezados
      const encabezados = tabla[0].map(h => h.toLowerCase())
      const cedulaIdx   = encabezados.indexOf('cedula')
      const nameIdx     = encabezados.indexOf('name') !== -1 ? encabezados.indexOf('name') : encabezados.indexOf('nombre')

      if (cedulaIdx === -1 || nameIdx === -1) {
        setError('El archivo debe tener columnas "cedula" y "name" (o "nombre").')
        return
      }

      const filasDatos = tabla.slice(1)
      const rows: ImportVoterRow[] = filasDatos.map(fila => ({
        cedula:     fila[cedulaIdx]  ?? '',
        name:       fila[nameIdx]    ?? '',
        phone:      fila[encabezados.indexOf('phone')]        || undefined,
        leaderName: fila[encabezados.indexOf('leadername')]   || undefined,
        commitmentStatus: (fila[encabezados.indexOf('commitmentstatus')] as any) || undefined,
      }))

      setFilas(rows)
      setPreview(tabla.slice(0, 6)) // Encabezado + 5 filas
    }
    reader.readAsText(archivo, 'UTF-8')
  }

  function handleImportar() {
    if (filas.length === 0) return
    startTransition(async () => {
      const res = await importVoters(filas)
      setResultado(res)
      setFilas([])
      setPreview([])
      setArchivoNom('')
      if (inputRef.current) inputRef.current.value = ''
    })
  }

  // Generar y descargar template CSV
  function descargarTemplate() {
    const contenido = [
      'cedula,name,phone,leaderName,commitmentStatus',
      '12345678,María García,3001234567,Juan Pérez,SIN_CONTACTAR',
      '87654321,Carlos López,,Ana Martínez,CONTACTADO',
    ].join('\n')

    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'plantilla-electores.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Importar electores</h1>
      <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        Sube un archivo CSV con los electores. La cédula se cifrará automáticamente.
        Los electores con cédula duplicada se omitirán.
      </p>

      {/* Botón de template */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={descargarTemplate}
          style={{
            background: '#f1f5f9', color: '#475569', padding: '0.5rem 1rem',
            borderRadius: '6px', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.875rem',
          }}
        >
          Descargar plantilla CSV
        </button>
      </div>

      {/* Columnas esperadas */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem 1rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Columnas del CSV:</div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {COLUMNAS.map((c) => (
            <code key={c} style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.8rem' }}>
              {c}
            </code>
          ))}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
          Solo cedula y name son obligatorios. commitmentStatus: SIN_CONTACTAR | CONTACTADO | SIMPATIZANTE | COMPROMETIDO | VOTO_SEGURO
        </div>
      </div>

      {/* Upload */}
      <div
        style={{
          border:       '2px dashed #cbd5e1', borderRadius: '8px', padding: '2rem',
          textAlign:    'center', marginBottom: '1.5rem', background: '#fafafa',
        }}
      >
        <input
          ref={inputRef} type="file" accept=".csv,.txt"
          onChange={handleArchivo}
          style={{ display: 'none' }} id="csv-input"
        />
        <label htmlFor="csv-input" style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📂</div>
          <div style={{ fontSize: '0.875rem', color: '#475569' }}>
            {archivoNom || 'Haz clic para seleccionar un archivo CSV'}
          </div>
        </label>
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            Vista previa ({filas.length} registros a importar)
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {preview[0].map((col, i) => (
                    <th key={i} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(1).map((fila, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {fila.map((cel, j) => (
                      <td key={j} style={{ padding: '0.5rem 0.75rem' }}>{cel}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              onClick={handleImportar} disabled={isPending}
              style={{
                background: isPending ? '#94a3b8' : '#0f172a', color: '#fff',
                padding: '0.625rem 1.25rem', borderRadius: '6px', border: 'none',
                cursor: isPending ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 600,
              }}
            >
              {isPending ? 'Importando...' : `Importar ${filas.length} registros`}
            </button>
            <button
              onClick={() => { setFilas([]); setPreview([]); setArchivoNom(''); if (inputRef.current) inputRef.current.value = '' }}
              style={{
                background: 'transparent', color: '#64748b', padding: '0.625rem 1.25rem',
                borderRadius: '6px', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.875rem',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '1rem' }}>Resultado de la importación</div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <Stat label="Creados"  valor={resultado.created} color="#166534" />
            <Stat label="Omitidos" valor={resultado.skipped} color="#854d0e" />
            <Stat label="Errores"  valor={resultado.errors.length} color="#991b1b" />
          </div>
          {resultado.errors.length > 0 && (
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#991b1b', marginBottom: '0.5rem' }}>Errores:</div>
              <ul style={{ fontSize: '0.8rem', color: '#991b1b', paddingLeft: '1.25rem' }}>
                {resultado.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
                {resultado.errors.length > 20 && <li>...y {resultado.errors.length - 20} errores más.</li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ label, valor, color }: { label: string; valor: number; color: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '6px', minWidth: '100px' }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color }}>{valor}</div>
      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{label}</div>
    </div>
  )
}
