import type { HTMLAttributes } from 'react'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

// TODO: implementar estilos con Tailwind cuando se construyan las tablas de líderes y electores
export function Badge({ children, variant = 'default', ...props }: BadgeProps) {
  return (
    <span data-variant={variant} {...props}>
      {children}
    </span>
  )
}
