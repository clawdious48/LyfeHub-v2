import type { StatusOption } from '@/types/index.js'
import { getTagColor } from '@/pages/bases/utils/baseConstants.js'
import { cn } from '@/lib/utils.js'

interface CellStatusProps {
  value: unknown
  options: StatusOption[]
}

export function CellStatus({ value, options }: CellStatusProps) {
  if (value == null || value === '') {
    return <span className="text-sm text-text-muted">&mdash;</span>
  }

  const strValue = String(value)
  const option = options.find(o => o.label === strValue)

  if (!option) {
    return <span className="text-sm text-text-muted">&mdash;</span>
  }

  const tagColor = getTagColor(option.color)

  return (
    <span
      className={cn(
        tagColor.bg,
        tagColor.text,
        tagColor.border,
        'px-2 py-0.5 rounded-md text-xs border inline-flex items-center gap-1.5'
      )}
    >
      <span
        className={cn(tagColor.dot, 'w-1.5 h-1.5 rounded-full shrink-0')}
      />
      {option.label}
    </span>
  )
}
