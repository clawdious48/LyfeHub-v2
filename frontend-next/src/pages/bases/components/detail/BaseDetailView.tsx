import { useState } from 'react'
import { useBase, useBaseViews } from '@/api/hooks/index.js'
import { useBasesUiStore } from '@/stores/basesUiStore.js'
import { applyFilters, getSortedRecords } from '@/pages/bases/utils/baseHelpers.js'
import { BaseDetailHeader } from './BaseDetailHeader.js'
import { BaseToolbar } from './BaseToolbar.js'
import { BaseTable } from './BaseTable.js'
import { ViewTabBar } from './ViewTabBar.js'
import { FilterPillsBar } from './FilterPillsBar.js'
import { ColumnContextMenu } from './ColumnContextMenu.js'
import { AddPropertyModal } from '../modals/AddPropertyModal.js'
import { EditPropertyModal } from '../modals/EditPropertyModal.js'
import { ViewConfigModal } from '../modals/ViewConfigModal.js'
import type { BaseProperty, BaseView } from '@/types/index.js'

interface BaseDetailViewProps {
  baseId: string
  onBack: () => void
}

export function BaseDetailView({ baseId, onBack }: BaseDetailViewProps) {
  const { data: base, isLoading, error } = useBase(baseId)
  const { data: views = [] } = useBaseViews(baseId)
  const { sortColumn, sortDirection, filters, currentViewId, setCurrentViewId, applyViewConfig, removeFilter, clearFilters, resetToDefaults } = useBasesUiStore()

  const [addPropertyOpen, setAddPropertyOpen] = useState(false)
  const [editProperty, setEditProperty] = useState<BaseProperty | null>(null)
  const [contextMenu, setContextMenu] = useState<{ property: BaseProperty; position: { x: number; y: number } } | null>(null)
  const [viewConfigOpen, setViewConfigOpen] = useState(false)
  const [editView, setEditView] = useState<BaseView | null>(null)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-text-secondary text-sm">Loading base...</p>
      </div>
    )
  }

  if (error || !base) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-red-400 text-sm">
          {error ? 'Failed to load base.' : 'Base not found.'}
        </p>
      </div>
    )
  }

  const properties = base.properties ?? []
  const records = base.records ?? []

  const filteredRecords = applyFilters(records, filters, properties)
  const sortedRecords = getSortedRecords(filteredRecords, sortColumn, sortDirection, properties)

  function handleContextMenu(property: BaseProperty, position: { x: number; y: number }) {
    setContextMenu({ property, position })
  }

  function handleSelectView(viewId: string | null) {
    setCurrentViewId(viewId)
    if (viewId) {
      const view = views.find(v => v.id === viewId)
      if (view?.config) {
        applyViewConfig(view.config as Record<string, unknown>)
      }
    } else {
      resetToDefaults()
    }
  }

  return (
    <div>
      <BaseDetailHeader base={base} onBack={onBack} />
      <ViewTabBar
        baseId={baseId}
        views={views}
        currentViewId={currentViewId}
        onSelectView={handleSelectView}
        onCreateView={() => { setEditView(null); setViewConfigOpen(true) }}
        onEditView={(view) => { setEditView(view); setViewConfigOpen(true) }}
        onDeleteView={() => {}}
      />
      <BaseToolbar baseId={baseId} properties={properties} onAddProperty={() => setAddPropertyOpen(true)} />
      {filters.length > 0 && (
        <FilterPillsBar
          filters={filters}
          properties={properties}
          onRemoveFilter={removeFilter}
          onClearAll={clearFilters}
        />
      )}
      <BaseTable base={{ ...base, properties }} records={sortedRecords} onPropertyContextMenu={handleContextMenu} />
      {contextMenu && (
        <ColumnContextMenu
          property={contextMenu.property}
          properties={properties}
          baseId={baseId}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onEdit={(property) => setEditProperty(property)}
        />
      )}
      <AddPropertyModal open={addPropertyOpen} onOpenChange={setAddPropertyOpen} baseId={baseId} />
      <EditPropertyModal open={!!editProperty} onOpenChange={(open) => { if (!open) setEditProperty(null) }} property={editProperty} baseId={baseId} />
      <ViewConfigModal
        open={viewConfigOpen}
        onOpenChange={setViewConfigOpen}
        baseId={baseId}
        view={editView}
        properties={properties}
      />
    </div>
  )
}
