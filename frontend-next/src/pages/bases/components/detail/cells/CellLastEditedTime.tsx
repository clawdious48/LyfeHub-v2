import { formatRelativeDate } from '@/pages/bases/utils/baseHelpers.js'

interface CellLastEditedTimeProps {
  value: unknown
}

export function CellLastEditedTime({ value }: CellLastEditedTimeProps) {
  const str = value != null ? String(value) : ''

  if (!str) {
    return <span className="text-sm text-text-muted">&mdash;</span>
  }

  const date = new Date(str)
  const fullDate = isNaN(date.getTime()) ? str : date.toLocaleString()

  return (
    <span
      className="text-sm text-text-secondary"
      title={fullDate}
    >
      {formatRelativeDate(str)}
    </span>
  )
}
