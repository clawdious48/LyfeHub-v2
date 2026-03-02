import { X } from 'lucide-react'
import type { BaseProperty } from '@/types/index.js'
import { FILTER_OPERATORS } from '@/pages/bases/utils/baseConstants.js'

interface FilterItem {
  id: string
  propertyId: string
  operator: string
  value: string
}

interface FilterPillsBarProps {
  filters: FilterItem[]
  properties: BaseProperty[]
  onRemoveFilter: (id: string) => void
  onClearAll: () => void
}

function getOperatorLabel(propertyType: string, operator: string): string {
  const ops = FILTER_OPERATORS[propertyType] ?? FILTER_OPERATORS.text
  return ops.find(o => o.value === operator)?.label ?? operator
}

export function FilterPillsBar({
  filters,
  properties,
  onRemoveFilter,
  onClearAll,
}: FilterPillsBarProps) {
  if (filters.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 py-2 px-1">
      {filters.map(filter => {
        const prop = properties.find(p => p.id === filter.propertyId)
        const propName = prop?.name ?? 'Unknown'
        const propType = prop?.type ?? 'text'
        const operatorLabel = getOperatorLabel(propType, filter.operator)
        const needsValue = filter.operator !== 'is_empty' && filter.operator !== 'is_not_empty'

        return (
          <span
            key={filter.id}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent/10 text-accent text-xs border border-accent/20"
          >
            {propName} {operatorLabel}
            {needsValue && ` "${filter.value}"`}
            <button
              onClick={() => onRemoveFilter(filter.id)}
              className="ml-0.5 hover:text-destructive transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )
      })}

      <button
        onClick={onClearAll}
        className="text-xs text-text-muted hover:text-text-primary transition-colors"
      >
        Clear all
      </button>
    </div>
  )
}
