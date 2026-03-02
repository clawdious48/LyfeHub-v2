import { formatRelativeDate } from '@/pages/bases/utils/baseHelpers.js'

interface CellLastEditedTimeProps {
  value: unknown
}

export function CellLastEditedTime({ value }: CellLastEditedTimeProps) {
  if (value == null || value === '') {
    return <span className="text-sm text-text-muted">&mdash;</span>
  }

  const dateStr = String(value)
  const formatted = formatRelativeDate(dateStr)
  const full = new Date(dateStr).toLocaleString()

  return (
    <span className="text-sm text-text-secondary" title={full}>
      {formatted}
    </span>
  )
}
