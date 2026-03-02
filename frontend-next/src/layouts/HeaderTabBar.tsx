import { NavLink } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { useHeaderStore } from '@/stores/headerStore.js'
import { useDashboardUiStore } from '@/stores/dashboardUiStore.js'
import type { HeaderTab, AreaId } from '@/layouts/headerConfig.js'

interface HeaderTabBarProps {
  tabs: HeaderTab[]
  tabDisplayMode: 'icon-label' | 'icon-only' | 'label-only'
  activeAreaId: AreaId
}

function SortableTab({ tab, tabDisplayMode }: { tab: HeaderTab; tabDisplayMode: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: tab.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center">
      <div {...attributes} {...listeners} className="cursor-grab px-1">
        <GripVertical className="size-3 text-text-muted" />
      </div>
      <NavLink
        to={tab.to}
        className={({ isActive }) =>
          `flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
            isActive
              ? 'bg-accent-light text-accent'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
          }`
        }
      >
        {tabDisplayMode !== 'label-only' && <tab.icon className="size-4" />}
        {tabDisplayMode !== 'icon-only' && <span>{tab.label}</span>}
      </NavLink>
    </div>
  )
}

export function HeaderTabBar({ tabs, tabDisplayMode, activeAreaId }: HeaderTabBarProps) {
  const isEditing = useDashboardUiStore((s) => s.isEditing)
  const setTabOrder = useHeaderStore((s) => s.setTabOrder)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = tabs.findIndex((t) => t.id === active.id)
    const newIndex = tabs.findIndex((t) => t.id === over.id)
    const newOrder = arrayMove(
      tabs.map((t) => t.id),
      oldIndex,
      newIndex
    )
    setTabOrder(activeAreaId, newOrder)
  }

  if (isEditing) {
    return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tabs.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
          {tabs.map((tab) => (
            <SortableTab key={tab.id} tab={tab} tabDisplayMode={tabDisplayMode} />
          ))}
        </SortableContext>
      </DndContext>
    )
  }

  // Normal mode -- static tabs
  return (
    <>
      {tabs.map((tab) => (
        <NavLink
          key={tab.id}
          to={tab.to}
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? 'bg-accent-light text-accent'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`
          }
        >
          {tabDisplayMode !== 'label-only' && <tab.icon className="size-4" />}
          {tabDisplayMode !== 'icon-only' && <span>{tab.label}</span>}
        </NavLink>
      ))}
    </>
  )
}
