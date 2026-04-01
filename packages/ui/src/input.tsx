import type { InputHTMLAttributes } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

// TODO: implementar estilos con Tailwind cuando se construya el primer formulario
export function Input({ label, error, hint, id, ...props }: InputProps) {
  return (
    <div>
      {label && <label htmlFor={id}>{label}</label>}
      <input id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...props} />
      {hint && !error && <span>{hint}</span>}
      {error && <span id={`${id}-error`} role="alert">{error}</span>}
    </div>
  )
}
