import { ExternalLink } from 'lucide-react'

interface CellUrlProps {
  value: unknown
}

function truncateUrl(url: string): string {
  const stripped = url.replace(/^https?:\/\//, '')
  if (stripped.length > 30) {
    return stripped.slice(0, 30) + '\u2026'
  }
  return stripped
}

export function CellUrl({ value }: CellUrlProps) {
  if (value == null || value === '') {
    return <span className="text-sm text-text-muted">&mdash;</span>
  }

  const url = String(value)

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-accent hover:underline inline-flex items-center gap-1 max-w-full"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="truncate">{truncateUrl(url)}</span>
      <ExternalLink className="w-3 h-3 shrink-0" />
    </a>
  )
}
