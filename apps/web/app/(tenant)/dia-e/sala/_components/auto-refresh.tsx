'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Wrapper que refresca la página automáticamente cada `interval` ms.
 * Usa router.refresh() para re-renderizar server components sin navegación.
 */
export function AutoRefresh({
  interval,
  children,
}: {
  interval: number
  children: React.ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh()
    }, interval)
    return () => clearInterval(id)
  }, [interval, router])

  return <>{children}</>
}
