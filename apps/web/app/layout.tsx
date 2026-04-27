import type { Metadata, Viewport } from 'next'
import './globals.css'

// Next.js App Router requiere default export en layout.tsx y page.tsx
// En el resto del proyecto usamos named exports (ver CLAUDE.md)

export const metadata: Metadata = {
  title: {
    default: 'CampaignOS — Inteligencia electoral para Colombia',
    template: '%s | CampaignOS',
  },
  description: 'Plataforma SaaS multi-tenant para la gestión integral de campañas electorales en Colombia. Líderes, electores, mapa de calor, transmisión E-14 y agentes de IA.',
  manifest: '/manifest.json',
  applicationName: 'CampaignOS',
  appleWebApp: {
    capable:         true,
    statusBarStyle:  'default',
    title:           'CampaignOS',
  },
  icons: {
    icon:     [{ url: '/icons/icon.svg', type: 'image/svg+xml' }],
    apple:    [{ url: '/icons/icon.svg', type: 'image/svg+xml' }],
    shortcut: ['/icons/icon.svg'],
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor:   '#1e40af',
  width:        'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit:  'cover',
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
