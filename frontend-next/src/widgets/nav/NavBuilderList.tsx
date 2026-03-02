import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils.js'
import {
  GripVertical, X, Type, ChevronRight,
  StickyNote, CheckSquare, Contact,
} from 'lucide-react'
import { getRouteByPath } from '@/layouts/navRoutes.js'
import type { NavItem } from './navTypes.js'

interface NavBuilderListProps {
  items: NavItem[]
  onReorder: (items: NavItem[]) => void
  onRemoveItem: (id: string) => void
}

/** Flatten items for display: toggle-header children get rendered indented after their parent */
function flattenItems(items: NavItem[]): { item: NavItem; indent: boolean }[] {
  const flat: { item: NavItem; indent: boolean }[] = []
  for (const item of items) {
    flat.push({ item, indent: false })
    if (item.type === 'toggle-header' && item.children) {
      for (const child of item.children) {
        flat.push({ item: child, indent: true })
      }
    }
  }
  return flat
}

function getItemLabel(item: NavItem): string {
  switch (item.type) {
    case 'route': {
      const route = getRouteByPath(item.route)
      return route?.label ?? item.route
    }
    case 'header':
    case 'toggle-header':
      return item.label
    case 'quick-capture':
      return `Quick ${item.captureType.charAt(0).toUpperCase() + item.captureType.slice(1)}`
  }
}

function getItemIcon(item: NavItem) {
  switch (item.type) {
    case 'route': {
      const route = getRouteByPath(item.route)
      if (route) {
        const Icon = route.icon
        return <Icon className="size-3.5 text-text-muted" />
      }
      return null
    }
    case 'header':
      return <Type className="size-3.5 text-text-muted" />
    case 'toggle-header':
      return <ChevronRight className="size-3.5 text-text-muted" />
    case 'quick-capture':
      switch (item.captureType) {
        case 'note': return <StickyNote className="size-3.5 text-text-muted" />
        case 'task': return <CheckSquare className="size-3.5 text-text-muted" />
        case 'contact': return <Contact className="size-3.5 text-text-muted" />
      }
  }
}

interface SortableRowProps {
  item: NavItem
  indent: boolean
  onRemove: (id: string) => void
}

function SortableRow({ item, indent, onRemove }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isStructure = item.type === 'header' || item.type === 'toggle-header'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-1.5 rounded px-1.5 py-1 border',
        indent && 'ml-4',
        isStructure ? 'bg-bg-hover/50 border-border/60' : 'bg-bg-surface border-border/40',
        isDragging && 'opacity-50 z-10',
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-text-muted hover:text-text-secondary"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>
      {getItemIcon(item)}
      <span className="flex-1 text-xs text-text-primary truncate">
        {getItemLabel(item)}
      </span>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="text-text-muted hover:text-red-400 transition-colors"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

export default function NavBuilderList({ items, onReorder, onRemoveItem }: NavBuilderListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  )

  const flatList = flattenItems(items)
  const flatIds = flatList.map((entry) => entry.item.id)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = flatIds.indexOf(active.id as string)
    const newIndex = flatIds.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return

    // Reorder in the flat list then rebuild the top-level items array
    const reordered = arrayMove(flatList, oldIndex, newIndex)
    const rebuilt = rebuildFromFlat(reordered)
    onReorder(rebuilt)
  }

  return (
    <div className="space-y-1">
      {flatList.length === 0 ? (
        <div className="py-6 text-center text-xs text-text-muted">
          Add items from the left panel
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={flatIds} strategy={verticalListSortingStrategy}>
            {flatList.map((entry) => (
              <SortableRow
                key={entry.item.id}
                item={entry.item}
                indent={entry.indent}
                onRemove={onRemoveItem}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

/**
 * Rebuild a structured NavItem[] from a flat list.
 * Items after a toggle-header that were indented stay as children
 * until the next non-indented item.
 */
function rebuildFromFlat(flat: { item: NavItem; indent: boolean }[]): NavItem[] {
  const result: NavItem[] = []
  let currentToggle: NavItem | null = null

  for (const { item, indent } of flat) {
    if (item.type === 'toggle-header') {
      // Start a new toggle group
      currentToggle = { ...item, children: [] }
      result.push(currentToggle)
    } else if (indent && currentToggle && currentToggle.type === 'toggle-header') {
      // Belongs to the current toggle group
      currentToggle.children.push(item)
    } else {
      currentToggle = null
      result.push(item)
    }
  }

  return result
}
