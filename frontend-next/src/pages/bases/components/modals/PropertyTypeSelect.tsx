import { PROPERTY_TYPES } from '@/pages/bases/utils/baseConstants.js'
import type { BasePropertyType } from '@/types/index.js'

interface PropertyTypeSelectProps {
  selectedType: BasePropertyType | null
  onSelect: (type: BasePropertyType) => void
}

export function PropertyTypeSelect({ selectedType, onSelect }: PropertyTypeSelectProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {PROPERTY_TYPES.map(pt => {
        const Icon = pt.icon
        const isSelected = selectedType === pt.value
        return (
          <button
            key={pt.value}
            type="button"
            className={`p-3 rounded-md border cursor-pointer text-center transition-colors ${
              isSelected
                ? 'border-accent bg-accent/10'
                : 'border-border hover:border-accent/40'
            }`}
            onClick={() => onSelect(pt.value)}
          >
            <Icon className="h-5 w-5 mx-auto mb-1 text-text-secondary" />
            <span className="text-xs text-text-secondary">{pt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
