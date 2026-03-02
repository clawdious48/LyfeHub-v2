import { Phone } from 'lucide-react'

interface CellPhoneProps {
  value: unknown
}

export function CellPhone({ value }: CellPhoneProps) {
  if (value == null || value === '') {
    return <span className="text-sm text-text-muted">&mdash;</span>
  }

  const phone = String(value)

  return (
    <a
      href={`tel:${phone}`}
      className="text-sm text-accent hover:underline inline-flex items-center gap-1 max-w-full"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="truncate">{phone}</span>
      <Phone className="w-3 h-3 shrink-0" />
    </a>
  )
}
