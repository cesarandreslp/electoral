import type { HTMLAttributes } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {}

// TODO: implementar estilos con Tailwind cuando se construyan los dashboards
export function Card({ children, ...props }: CardProps) {
  return <div {...props}>{children}</div>
}

export function CardHeader({ children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props}>{children}</div>
}

export function CardContent({ children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props}>{children}</div>
}

export function CardFooter({ children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props}>{children}</div>
}
