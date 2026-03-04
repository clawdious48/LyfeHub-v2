import { useState } from 'react'
import { Plus, Filter, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button.js'
import type { BaseProperty } from '@/types/index.js'
import { useBasesUiStore } from '@/stores/basesUiStore.js'
import { AddFilterModal } from '../modals/AddFilterModal.js'
import { ColumnVisibilityModal } from '../modals/ColumnVisibilityModal.js'

interface BaseToolbarProps {
  baseId: string
  properties: BaseProperty[]
  onAddProperty: () => void
}

export function BaseToolbar({ baseId: _baseId, properties, onAddProperty }: BaseToolbarProps) {
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [columnsModalOpen, setColumnsModalOpen] = useState(false)
  const { addFilter, visibleColumns, setVisibleColumns, filters } = useBasesUiStore()

  return (
    <>
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          {/* Left side intentionally empty — filter pills render separately */}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setFilterModalOpen(true)}>
            <Filter className="h-4 w-4 mr-1" />
            Filter
            {filters.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-accent/20 text-accent text-xs">
                {filters.length}
              </span>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setColumnsModalOpen(true)}>
            <Eye className="h-4 w-4 mr-1" />
            Columns
          </Button>
          <Button variant="ghost" size="sm" onClick={onAddProperty}>
            <Plus className="h-4 w-4 mr-1" />
            Property
          </Button>
        </div>
      </div>
      <AddFilterModal
        open={filterModalOpen}
        onOpenChange={setFilterModalOpen}
        properties={properties}
        onAdd={addFilter}
      />
      <ColumnVisibilityModal
        open={columnsModalOpen}
        onOpenChange={setColumnsModalOpen}
        properties={properties}
        visibleColumns={visibleColumns}
        onSave={setVisibleColumns}
      />
    </>
  )
}
