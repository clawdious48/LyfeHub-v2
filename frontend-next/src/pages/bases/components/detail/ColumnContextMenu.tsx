import { useEffect, useRef } from 'react'
import { ArrowUp, ArrowDown, Pencil, EyeOff, Trash2 } from 'lucide-react'
import { useDeleteProperty } from '@/api/hooks/index.js'
import { useBasesUiStore } from '@/stores/basesUiStore.js'
import type { BaseProperty } from '@/types/index.js'

interface ColumnContextMenuProps {
  property: BaseProperty
  properties: BaseProperty[]
  baseId: string
  position: { x: number; y: number }
  onClose: () => void
  onEdit?: (property: BaseProperty) => void
}

export function ColumnContextMenu({ property, properties, baseId, position, onClose, onEdit }: ColumnContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const deleteProperty = useDeleteProperty(baseId)
  const { setSortColumn, setSortDirection, setVisibleColumns, visibleColumns } = useBasesUiStore()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  function handleSortAsc() {
    setSortColumn(property.id)
    setSortDirection('asc')
    onClose()
  }

  function handleSortDesc() {
    setSortColumn(property.id)
    setSortDirection('desc')
    onClose()
  }

  function handleHide() {
    const allPropertyIds = properties.map(p => p.id)
    const currentVisible = visibleColumns ?? allPropertyIds
    setVisibleColumns(currentVisible.filter(id => id !== property.id))
    onClose()
  }

  function handleEdit() {
    onEdit?.(property)
    onClose()
  }

  function handleDelete() {
    if (confirm(`Delete property "${property.name}"? This cannot be undone.`)) {
      deleteProperty.mutate(property.id)
      onClose()
    }
  }

  const itemClass = 'flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-bg-hover transition-colors'

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-bg-elevated border border-border rounded-md shadow-lg py-1 min-w-[180px]"
      style={{ left: position.x, top: position.y }}
    >
      <button className={itemClass} onClick={handleEdit}>
        <Pencil className="h-3.5 w-3.5" />
        Edit Property
      </button>
      <button className={itemClass} onClick={handleSortAsc}>
        <ArrowUp className="h-3.5 w-3.5" />
        Sort Ascending
      </button>
      <button className={itemClass} onClick={handleSortDesc}>
        <ArrowDown className="h-3.5 w-3.5" />
        Sort Descending
      </button>
      <button className={itemClass} onClick={handleHide}>
        <EyeOff className="h-3.5 w-3.5" />
        Hide Column
      </button>
      <div className="my-1 border-t border-border" />
      <button className={`${itemClass} text-red-400 hover:text-red-300`} onClick={handleDelete}>
        <Trash2 className="h-3.5 w-3.5" />
        Delete Property
      </button>
    </div>
  )
}
