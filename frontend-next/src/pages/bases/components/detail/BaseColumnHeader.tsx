import { ChevronUp, ChevronDown } from 'lucide-react'
import { TableHead } from '@/components/ui/table.js'
import { useBasesUiStore } from '@/stores/basesUiStore.js'
import { getPropertyTypeIcon } from '@/pages/bases/utils/baseConstants.js'
import { DEFAULT_COLUMN_WIDTH } from '@/pages/bases/utils/baseConstants.js'
import type { BaseProperty } from '@/types/index.js'

interface BaseColumnHeaderProps {
  property: BaseProperty
  onContextMenu?: (e: React.MouseEvent) => void
}

export function BaseColumnHeader({ property, onContextMenu }: BaseColumnHeaderProps) {
  const { sortColumn, sortDirection, columnWidths, toggleSort } = useBasesUiStore()
  const Icon = getPropertyTypeIcon(property.type)
  const isSorted = sortColumn === property.id
  const width = columnWidths[property.id] ?? DEFAULT_COLUMN_WIDTH

  return (
    <TableHead
      className="text-text-secondary text-xs font-medium uppercase tracking-wider cursor-pointer select-none hover:bg-bg-hover/50 transition-colors"
      style={{ minWidth: `${width}px` }}
      onClick={() => toggleSort(property.id)}
      onContextMenu={onContextMenu}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0 text-text-muted" />
        <span className="truncate">{property.name}</span>
        {isSorted && (
          sortDirection === 'asc'
            ? <ChevronUp className="h-3.5 w-3.5 shrink-0" />
            : <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        )}
      </div>
    </TableHead>
  )
}
