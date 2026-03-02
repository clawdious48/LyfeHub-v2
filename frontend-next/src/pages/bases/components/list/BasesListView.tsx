import type { Base } from '@/types/index.js'
import { useBasesUiStore } from '@/stores/basesUiStore.js'
import { BasesToolbar } from '@/pages/bases/components/list/BasesToolbar.js'
import { BasesCardGrid } from '@/pages/bases/components/list/BasesCardGrid.js'
import { BasesListTable } from '@/pages/bases/components/list/BasesListTable.js'
import { BasesEmptyState } from '@/pages/bases/components/list/BasesEmptyState.js'

interface BasesListViewProps {
  bases: Base[]
  onSelectBase: (id: string) => void
  onCreateBase: () => void
  onEditBase: (base: Base) => void
}

export function BasesListView({ bases, onSelectBase, onCreateBase, onEditBase }: BasesListViewProps) {
  const { displayMode, cardSize } = useBasesUiStore()

  if (bases.length === 0) {
    return <BasesEmptyState onCreateBase={onCreateBase} />
  }

  return (
    <div className="space-y-4">
      <BasesToolbar baseCount={bases.length} onCreateBase={onCreateBase} />

      {displayMode === 'card' && (
        <BasesCardGrid
          bases={bases}
          cardSize={cardSize}
          onSelect={onSelectBase}
          onEdit={onEditBase}
        />
      )}
      {displayMode === 'list' && (
        <BasesListTable
          bases={bases}
          onSelect={onSelectBase}
          onEdit={onEditBase}
        />
      )}
    </div>
  )
}
