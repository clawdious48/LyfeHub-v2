import { formatSystemDate } from '@/pages/bases/utils/baseHelpers.js'

interface CellDateProps {
  value: unknown
}

export function CellDate({ value }: CellDateProps) {
  if (value == null || value === '') {
    return <span className="text-sm text-text-muted">&mdash;</span>
  }

  const formatted = formatSystemDate(String(value))

  return (
    <span className="text-sm text-text-primary">
      {formatted}
    </span>
  )
}
