import type { SelectOption } from '@/types/index.js'
import { getTagColor } from '@/pages/bases/utils/baseConstants.js'
import { cn } from '@/lib/utils.js'

interface CellMultiSelectProps {
  value: unknown
  options: SelectOption[]
}

export function CellMultiSelect({ value, options }: CellMultiSelectProps) {
  const values = Array.isArray(value) ? value.map(String) : []

  if (values.length === 0) {
    return <span className="text-sm text-text-muted">&mdash;</span>
  }

  return (
    <div className="flex flex-row flex-wrap gap-1">
      {values.map((val) => {
        const option = options.find(o => o.value === val || o.label === val)
        const label = option?.label ?? val
        const tagColor = getTagColor(option?.color ?? 'gray')

        return (
          <span
            key={val}
            className={cn(
              tagColor.bg,
              tagColor.text,
              tagColor.border,
              'px-2 py-0.5 rounded-md text-xs border'
            )}
          >
            {label}
          </span>
        )
      })}
    </div>
  )
}
