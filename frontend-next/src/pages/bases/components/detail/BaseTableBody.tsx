import { TableBody, TableRow, TableCell } from '@/components/ui/table.js'
import { Plus } from 'lucide-react'
import { BaseTableRow } from './BaseTableRow.js'
import { useCreateBaseRecord } from '@/api/hooks/index.js'
import type { BaseRecord, BaseProperty } from '@/types/index.js'

interface BaseTableBodyProps {
  records: BaseRecord[]
  properties: BaseProperty[]
  baseId: string
}

export function BaseTableBody({ records, properties, baseId }: BaseTableBodyProps) {
  const createRecord = useCreateBaseRecord(baseId)
  const colSpan = properties.length + 2

  return (
    <TableBody>
      {records.length === 0 ? (
        <TableRow>
          <TableCell colSpan={colSpan} className="text-center py-12">
            <span className="text-sm text-text-muted">No records yet</span>
          </TableCell>
        </TableRow>
      ) : (
        records.map((record, index) => (
          <BaseTableRow
            key={record.id}
            record={record}
            properties={properties}
            index={index}
            baseId={baseId}
          />
        ))
      )}
      <TableRow
        className="border-dashed border-t border-border hover:bg-bg-hover/30 cursor-pointer"
        onClick={() => createRecord.mutate({ values: {} })}
      >
        <TableCell colSpan={colSpan} className="text-center py-2">
          <span className="text-text-muted text-sm flex items-center justify-center gap-1">
            <Plus className="h-3.5 w-3.5" /> New row
          </span>
        </TableCell>
      </TableRow>
    </TableBody>
  )
}
