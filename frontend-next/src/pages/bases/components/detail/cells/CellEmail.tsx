import { Mail } from 'lucide-react'

interface CellEmailProps {
  value: unknown
}

export function CellEmail({ value }: CellEmailProps) {
  if (value == null || value === '') {
    return <span className="text-sm text-text-muted">&mdash;</span>
  }

  const email = String(value)

  return (
    <a
      href={`mailto:${email}`}
      className="text-sm text-accent hover:underline inline-flex items-center gap-1 max-w-full"
      onClick={(e) => e.stopPropagation()}
    >
      <Mail className="w-3 h-3 shrink-0" />
      <span className="truncate">{email}</span>
    </a>
  )
}
