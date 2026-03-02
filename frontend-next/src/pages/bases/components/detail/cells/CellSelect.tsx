import type { SelectOption } from '@/types/index.js'
import { getTagColor } from '@/pages/bases/utils/baseConstants.js'
import { cn } from '@/lib/utils.js'

interface CellSelectProps {
  value: unknown
  options: SelectOption[]
}

export function CellSelect({ value, options }: CellSelectProps) {
  if (value == null || value === '') {
    return <span className="text-sm text-text-muted">&mdash;</span>
  }

  const strValue = String(value)
  const option = options.find(o => o.value === strValue || o.label === strValue)

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
        'px-2 py-0.5 rounded-md text-xs border inline-block'
      )}
    >
      {option.label}
    </span>
  )
}
