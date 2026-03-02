import { Pencil } from 'lucide-react'
import type { Base } from '@/types/index.js'
import { Button } from '@/components/ui/button.js'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.js'
import { formatRelativeDate } from '@/pages/bases/utils/baseHelpers.js'

interface BasesListTableProps {
  bases: Base[]
  onSelect: (id: string) => void
  onEdit: (base: Base) => void
}

export function BasesListTable({ bases, onSelect, onEdit }: BasesListTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          <TableHead className="text-text-secondary">Name</TableHead>
          <TableHead className="text-text-secondary">Description</TableHead>
          <TableHead className="text-text-secondary">Properties</TableHead>
          <TableHead className="text-text-secondary">Records</TableHead>
          <TableHead className="text-text-secondary">Updated</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {bases.map((base) => (
          <TableRow
            key={base.id}
            className="group cursor-pointer border-border hover:bg-bg-surface/50"
            onClick={() => onSelect(base.id)}
          >
            <TableCell className="font-medium text-text-primary">
              <span className="mr-1.5">{base.icon || '📊'}</span>
              {base.name}
            </TableCell>
            <TableCell className="text-text-secondary max-w-[300px] truncate">
              {base.description || '\u2014'}
            </TableCell>
            <TableCell className="text-text-secondary">
              {base.properties?.length ?? 0}
            </TableCell>
            <TableCell className="text-text-secondary">
              {base.records !== undefined ? base.records.length : '\u2014'}
            </TableCell>
            <TableCell className="text-text-secondary">
              {formatRelativeDate(base.updated_at)}
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon-xs"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(base)
                }}
                title="Edit base"
              >
                <Pencil />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
