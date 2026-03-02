interface CellRichTextProps {
  value: unknown
}

export function CellRichText({ value }: CellRichTextProps) {
  const str = value != null ? String(value) : ''

  if (!str) {
    return <span className="text-sm text-text-muted">&mdash;</span>
  }

  return (
    <span className="text-sm text-text-primary truncate max-w-full block" title={str}>
      {str.length > 80 ? str.slice(0, 80) + '\u2026' : str}
    </span>
  )
}
