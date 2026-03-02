interface CellNumberProps {
  value: unknown
}

export function CellNumber({ value }: CellNumberProps) {
  if (value == null || value === '') {
    return <span className="text-sm text-text-muted">&mdash;</span>
  }

  const num = Number(value)

  if (isNaN(num)) {
    return <span className="text-sm text-text-muted">&mdash;</span>
  }

  return (
    <span className="text-sm text-text-primary text-right block">
      {num.toLocaleString()}
    </span>
  )
}
