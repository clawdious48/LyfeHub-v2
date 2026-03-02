import { useState } from 'react'
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
import { GripVertical, Settings } from 'lucide-react'
import { useHeaderStore } from '@/stores/headerStore.js'
import { useDashboardUiStore } from '@/stores/dashboardUiStore.js'
import { TabStylePopover } from '@/layouts/TabStylePopover.js'
import type { HeaderTab, AreaId } from '@/layouts/headerConfig.js'
import type { TabStyleConfig } from '@/hooks/useUserSettings.js'

interface HeaderTabBarProps {
  tabs: HeaderTab[]
  tabDisplayMode: 'icon-label' | 'icon-only' | 'label-only'
  activeAreaId: AreaId
}

/** Build inline styles from a TabStyleConfig, with optional hover/active overrides. */
function buildTabInlineStyle(
  style: TabStyleConfig | undefined,
  isActive: boolean,
  isHovered: boolean,
): React.CSSProperties | undefined {
  if (!style) return undefined

  const result: React.CSSProperties = {}

  // Background: priority is selected > hover > base
  if (isActive && style.selectedBgColor) {
    result.backgroundColor = style.selectedBgColor
  } else if (isHovered && style.hoverBgColor) {
    result.backgroundColor = style.hoverBgColor
  } else if (style.bgColor) {
    result.backgroundColor = style.bgColor
  }

  // Border
  if (style.borderColor) {
    result.borderColor = style.borderColor
  }
  if (style.borderWidth) {
    result.borderWidth = `${style.borderWidth}px`
    result.borderStyle = 'solid'
  }

  // Opacity
  if (style.opacity !== undefined && style.opacity !== 1) {
    result.opacity = style.opacity
  }

  return Object.keys(result).length > 0 ? result : undefined
}

function SortableTab({
  tab,
  tabDisplayMode,
  tabStyle,
  onOpenStyleDialog,
}: {
  tab: HeaderTab
  tabDisplayMode: string
  tabStyle: TabStyleConfig | undefined
  onOpenStyleDialog: (tabId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: tab.id })
  const [isHovered, setIsHovered] = useState(false)

  const dndStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={dndStyle} className="flex items-center group">
      <div {...attributes} {...listeners} className="cursor-grab px-1">
        <GripVertical className="size-3 text-text-muted" />
      </div>
      <NavLink
        to={tab.to}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={({ isActive }) =>
          `flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
            isActive
              ? tabStyle?.selectedBgColor ? 'text-accent' : 'bg-accent-light text-accent'
              : tabStyle?.bgColor || tabStyle?.hoverBgColor
                ? 'text-text-secondary hover:text-text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
          }`
        }
        style={({ isActive }) => buildTabInlineStyle(tabStyle, isActive, isHovered)}
      >
        {tabDisplayMode !== 'label-only' && <tab.icon className="size-4" />}
        {tabDisplayMode !== 'icon-only' && <span>{tab.label}</span>}
      </NavLink>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onOpenStyleDialog(tab.id)
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
        title={`Style ${tab.label} tab`}
      >
        <Settings className="size-3 text-text-muted hover:text-text-primary" />
      </button>
    </div>
  )
}

function StyledTab({
  tab,
  tabDisplayMode,
  tabStyle,
}: {
  tab: HeaderTab
  tabDisplayMode: string
  tabStyle: TabStyleConfig | undefined
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <NavLink
      to={tab.to}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={({ isActive }) =>
        `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          isActive
            ? tabStyle?.selectedBgColor ? 'text-accent' : 'bg-accent-light text-accent'
            : tabStyle?.bgColor || tabStyle?.hoverBgColor
              ? 'text-text-secondary hover:text-text-primary'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
        }`
      }
      style={({ isActive }) => buildTabInlineStyle(tabStyle, isActive, isHovered)}
    >
      {tabDisplayMode !== 'label-only' && <tab.icon className="size-4" />}
      {tabDisplayMode !== 'icon-only' && <span>{tab.label}</span>}
    </NavLink>
  )
}

export function HeaderTabBar({ tabs, tabDisplayMode, activeAreaId }: HeaderTabBarProps) {
  const isEditing = useDashboardUiStore((s) => s.isEditing)
  const setTabOrder = useHeaderStore((s) => s.setTabOrder)
  const tabStyles = useHeaderStore((s) => s.tabStyles)

  const [styleTabId, setStyleTabId] = useState<string | null>(null)

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

  // Find the tab that has the style dialog open
  const styleTab = styleTabId ? tabs.find((t) => t.id === styleTabId) : null

  if (isEditing) {
    return (
      <>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tabs.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
            {tabs.map((tab) => (
              <SortableTab
                key={tab.id}
                tab={tab}
                tabDisplayMode={tabDisplayMode}
                tabStyle={tabStyles[tab.id]}
                onOpenStyleDialog={setStyleTabId}
              />
            ))}
          </SortableContext>
        </DndContext>

        {styleTab && (
          <TabStylePopover
            open={!!styleTabId}
            onOpenChange={(open) => { if (!open) setStyleTabId(null) }}
            tabId={styleTab.id}
            tabLabel={styleTab.label}
          />
        )}
      </>
    )
  }

  // Normal mode -- static tabs with custom styles applied
  return (
    <>
      {tabs.map((tab) => (
        <StyledTab
          key={tab.id}
          tab={tab}
          tabDisplayMode={tabDisplayMode}
          tabStyle={tabStyles[tab.id]}
        />
      ))}
    </>
  )
}
