'use client'

/**
 * Componente cliente que genera y muestra la imagen del QR.
 * Usa la librería qrcode para renderizar el QR como Data URL PNG.
 */

import { useEffect, useState } from 'react'
import QRCode                  from 'qrcode'

interface QrImageProps {
  url:     string   // URL completa a la que apunta el QR
  size?:   number   // Tamaño en píxeles (default 256)
  label?:  string   // Texto descriptivo debajo del QR
}

export function QrImage({ url, size = 256, label }: QrImageProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error,   setError]   = useState(false)

  useEffect(() => {
    QRCode.toDataURL(url, {
      width:  size,
      margin: 2,
      color:  { dark: '#0f172a', light: '#ffffff' },
    })
      .then(setDataUrl)
      .catch(() => setError(true))
  }, [url, size])

  if (error) {
    return <div style={{ color: '#991b1b', fontSize: '0.8rem' }}>Error al generar QR</div>
  }

  if (!dataUrl) {
    return (
      <div
        style={{
          width:        size,
          height:       size,
          background:   '#f1f5f9',
          borderRadius: '8px',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          color:        '#94a3b8',
          fontSize:     '0.8rem',
        }}
      >
        Generando...
      </div>
    )
  }

  function descargar() {
    const a    = document.createElement('a')
    a.href     = dataUrl!
    a.download = `qr-${label ?? 'campana'}.png`
    a.click()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
      <img
        src={dataUrl}
        alt={`QR de captación${label ? ` — ${label}` : ''}`}
        style={{ width: size, height: size, borderRadius: '8px', border: '1px solid #e2e8f0' }}
      />
      {label && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{label}</div>}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={descargar}
          style={{
            background: '#f1f5f9', color: '#475569', padding: '0.4rem 0.75rem',
            borderRadius: '6px', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.8rem',
          }}
        >
          Descargar PNG
        </button>
        <button
          onClick={() => window.print()}
          style={{
            background: '#f1f5f9', color: '#475569', padding: '0.4rem 0.75rem',
            borderRadius: '6px', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.8rem',
          }}
        >
          Imprimir
        </button>
      </div>
    </div>
  )
}
