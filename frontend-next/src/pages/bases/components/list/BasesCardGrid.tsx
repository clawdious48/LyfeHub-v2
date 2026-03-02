import type { Base } from '@/types/index.js'
import { BaseCard } from '@/pages/bases/components/list/BaseCard.js'

interface BasesCardGridProps {
  bases: Base[]
  cardSize: 'small' | 'medium' | 'large'
  onSelect: (id: string) => void
  onEdit: (base: Base) => void
}

const gridStyles = {
  small: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3',
  medium: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
  large: 'grid-cols-1 md:grid-cols-2 gap-4',
} as const

export function BasesCardGrid({ bases, cardSize, onSelect, onEdit }: BasesCardGridProps) {
  return (
    <div className={`grid ${gridStyles[cardSize]}`}>
      {bases.map((base) => (
        <BaseCard
          key={base.id}
          base={base}
          size={cardSize}
          onClick={() => onSelect(base.id)}
          onEdit={() => onEdit(base)}
        />
      ))}
    </div>
  )
}
