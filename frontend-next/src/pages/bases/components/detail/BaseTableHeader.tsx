import { Plus } from 'lucide-react'
import { TableHeader, TableRow, TableHead } from '@/components/ui/table.js'
import { BaseColumnHeader } from './BaseColumnHeader.js'
import type { BaseProperty } from '@/types/index.js'

interface BaseTableHeaderProps {
  properties: BaseProperty[]
  onPropertyContextMenu?: (property: BaseProperty, position: { x: number; y: number }) => void
}

export function BaseTableHeader({ properties, onPropertyContextMenu }: BaseTableHeaderProps) {
  return (
    <TableHeader>
      <TableRow className="border-b border-border bg-surface-1/50">
        <TableHead className="w-12 text-center text-text-muted text-xs font-medium">
          #
        </TableHead>
        {properties.map(property => (
          <BaseColumnHeader
            key={property.id}
            property={property}
            onContextMenu={onPropertyContextMenu ? (e) => {
              e.preventDefault()
              onPropertyContextMenu(property, { x: e.clientX, y: e.clientY })
            } : undefined}
          />
        ))}
        <TableHead className="w-10">
          <button
            className="w-full flex items-center justify-center text-text-muted hover:text-text-secondary transition-colors"
            title="Add property"
            disabled
          >
            <Plus className="h-4 w-4" />
          </button>
        </TableHead>
      </TableRow>
    </TableHeader>
  )
}
