import { TableRow, TableCell } from '@/components/ui/table.js'
import { Trash2 } from 'lucide-react'
import { BaseCell } from './BaseCell.js'
import { useDeleteBaseRecord } from '@/api/hooks/index.js'
import type { BaseRecord, BaseProperty } from '@/types/index.js'

interface BaseTableRowProps {
  record: BaseRecord
  properties: BaseProperty[]
  index: number
  baseId: string
}

export function BaseTableRow({ record, properties, index, baseId }: BaseTableRowProps) {
  const deleteRecord = useDeleteBaseRecord(baseId)

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    deleteRecord.mutate(record.id)
  }

  return (
    <TableRow className="group hover:bg-bg-hover/50 transition-colors">
      <TableCell className="w-12 text-center text-text-muted text-xs">
        {index + 1}
      </TableCell>
      {properties.map(property => (
        <BaseCell
          key={property.id}
          record={record}
          property={property}
          baseId={baseId}
        />
      ))}
      <TableCell className="w-10">
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/20 text-text-muted hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </TableCell>
    </TableRow>
  )
}
