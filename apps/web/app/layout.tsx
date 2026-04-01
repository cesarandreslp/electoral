import type { Metadata, Viewport } from 'next'
import './globals.css'

// Next.js App Router requiere default export en layout.tsx y page.tsx
// En el resto del proyecto usamos named exports (ver CLAUDE.md)

export const metadata: Metadata = {
  title: {
    default: 'CampaignOS',
    template: '%s | CampaignOS',
  },
  description: 'Plataforma de gestión integral de campañas electorales en Colombia',
  manifest: '/manifest.json',
  // Los metadatos específicos de tenant se sobrescriben en layouts anidados
}

export const viewport: Viewport = {
  themeColor: '#1e40af',
  width: 'device-width',
  initialScale: 1,
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
