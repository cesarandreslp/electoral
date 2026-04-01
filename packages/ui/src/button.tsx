import type { ButtonHTMLAttributes } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

// TODO: implementar estilos con Tailwind cuando se construya el primer formulario
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled ?? loading}
      aria-busy={loading}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {loading ? 'Cargando...' : children}
    </button>
  )
}
