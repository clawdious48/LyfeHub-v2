import { useBasesUiStore } from '@/stores/basesUiStore.js'
import { Table } from '@/components/ui/table.js'
import { BaseTableHeader } from './BaseTableHeader.js'
import { BaseTableBody } from './BaseTableBody.js'
import type { Base, BaseProperty, BaseRecord } from '@/types/index.js'

interface BaseTableProps {
  base: Base & { properties: BaseProperty[] }
  records: BaseRecord[]
  onPropertyContextMenu?: (property: BaseProperty, position: { x: number; y: number }) => void
}

export function BaseTable({ base, records, onPropertyContextMenu }: BaseTableProps) {
  const { visibleColumns, columnOrder } = useBasesUiStore()

  const properties = base.properties ?? []

  // Filter by visible columns if set
  const filteredProperties = visibleColumns
    ? properties.filter(p => visibleColumns.includes(p.id))
    : properties

  // Order by columnOrder if set, otherwise by position
  const orderedProperties = columnOrder
    ? [...filteredProperties].sort((a, b) => {
        const aIdx = columnOrder.indexOf(a.id)
        const bIdx = columnOrder.indexOf(b.id)
        if (aIdx === -1 && bIdx === -1) return a.position - b.position
        if (aIdx === -1) return 1
        if (bIdx === -1) return -1
        return aIdx - bIdx
      })
    : [...filteredProperties].sort((a, b) => a.position - b.position)

  return (
    <div className="overflow-x-auto border border-border rounded-lg">
      <Table>
        <BaseTableHeader properties={orderedProperties} onPropertyContextMenu={onPropertyContextMenu} />
        <BaseTableBody records={records} properties={orderedProperties} baseId={base.id} />
      </Table>
    </div>
  )
}
