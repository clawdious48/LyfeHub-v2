interface CellTextProps {
  value: unknown
}

export function CellText({ value }: CellTextProps) {
  const str = value != null ? String(value) : ''

  if (!str) {
    return <span className="text-sm text-text-muted">&mdash;</span>
  }

  return (
    <span className="text-sm text-text-primary truncate max-w-full block">
      {str}
    </span>
  )
}
