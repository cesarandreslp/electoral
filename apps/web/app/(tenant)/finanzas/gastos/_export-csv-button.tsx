'use client'

import { useState } from 'react'

interface ExportCsvButtonProps {
  exportAction: () => Promise<string>
  fileName:     string
}

export function ExportCsvButton({ exportAction, fileName }: ExportCsvButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const csv = await exportAction()
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      style={{
        padding: '0.6rem 1.25rem', fontSize: '0.85rem', borderRadius: '6px',
        border: '1px solid #cbd5e1', background: '#fff', color: '#334155',
        cursor: loading ? 'wait' : 'pointer', fontWeight: 500,
      }}
    >
      {loading ? 'Exportando...' : 'Exportar CSV'}
    </button>
  )
}
