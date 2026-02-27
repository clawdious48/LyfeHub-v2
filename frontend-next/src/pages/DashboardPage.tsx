import { useState, useCallback, useMemo } from 'react'
import { ResponsiveGridLayout, useContainerWidth, verticalCompactor } from 'react-grid-layout'
import type { Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import { Pencil, Check, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDashboardLayout, useSaveDashboardLayout } from '@/api/hooks'
import WidgetWrapper from '@/widgets/WidgetWrapper.js'
import AddWidgetDialog from '@/widgets/AddWidgetDialog.js'
import { widgetRegistry } from '@/widgets/registry.js'

interface WidgetItem {
  id: string
  type: string
  x: number
  y: number
  w: number
  h: number
}

const DEFAULT_WIDGETS: WidgetItem[] = [
  { id: 'default-my-day',   type: 'my-day',      x: 0, y: 0, w: 6, h: 4 },
  { id: 'default-calendar', type: 'week-cal',     x: 6, y: 0, w: 6, h: 3 },
  { id: 'default-notes',    type: 'quick-notes',  x: 0, y: 4, w: 6, h: 3 },
  { id: 'default-inbox',    type: 'inbox',         x: 6, y: 3, w: 6, h: 4 },
  { id: 'default-areas',    type: 'areas',         x: 0, y: 7, w: 12, h: 3 },
]

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480 }
const COLS = { lg: 12, md: 12, sm: 6, xs: 1 }
const ROW_HEIGHT = 80

export default function DashboardPage() {
  const { width, containerRef } = useContainerWidth()
  const { data: layoutData } = useDashboardLayout()
  const saveLayout = useSaveDashboardLayout()

  const initialWidgets = layoutData?.layout?.widgets ?? DEFAULT_WIDGETS
  const [widgets, setWidgets] = useState<WidgetItem[]>(initialWidgets)
  const [isEditing, setIsEditing] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  // Sync from server when data loads (only if we haven't started editing)
  const [hasLoadedServer, setHasLoadedServer] = useState(false)
  if (layoutData?.layout?.widgets && !hasLoadedServer && !isEditing) {
    setWidgets(layoutData.layout.widgets)
    setHasLoadedServer(true)
  }

  const layouts = useMemo(() => {
    const lgLayout = widgets.map((w) => {
      const def = widgetRegistry[w.type]
      return {
        i: w.id,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        minW: def?.minW ?? 2,
        minH: def?.minH ?? 2,
      }
    })
    return { lg: lgLayout }
  }, [widgets])

  const handleLayoutChange = useCallback(
    (layout: Layout) => {
      if (!isEditing) return
      setWidgets((prev) =>
        prev.map((widget) => {
          const item = layout.find((l) => l.i === widget.id)
          if (!item) return widget
          return { ...widget, x: item.x, y: item.y, w: item.w, h: item.h }
        })
      )
    },
    [isEditing]
  )

  const handleDone = useCallback(() => {
    setIsEditing(false)
    saveLayout.mutate({ widgets })
  }, [widgets, saveLayout])

  const handleRemoveWidget = useCallback((id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id))
  }, [])

  const handleAddWidget = useCallback((type: string) => {
    const def = widgetRegistry[type]
    if (!def) return
    const newWidget: WidgetItem = {
      id: crypto.randomUUID(),
      type,
      x: 0,
      y: Infinity,
      w: def.defaultW,
      h: def.defaultH,
    }
    setWidgets((prev) => [...prev, newWidget])
  }, [])

  const existingTypes = useMemo(() => widgets.map((w) => w.type), [widgets])

  return (
    <div className="p-6" ref={containerRef}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl text-text-primary">Dashboard</h1>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus className="size-4" />
                Add Widget
              </Button>
              <Button size="sm" onClick={handleDone}>
                <Check className="size-4" />
                Done
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="size-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {width > 0 && (
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={BREAKPOINTS}
          cols={COLS}
          rowHeight={ROW_HEIGHT}
          width={width}
          dragConfig={{ enabled: isEditing, bounded: false, handle: '.widget-drag-handle', threshold: 3 }}
          resizeConfig={{ enabled: isEditing, handles: ['se'] }}
          onLayoutChange={handleLayoutChange}
          compactor={verticalCompactor}
          margin={[16, 16] as [number, number]}
        >
          {widgets.map((widget) => (
            <div key={widget.id}>
              <WidgetWrapper
                type={widget.type}
                isEditing={isEditing}
                onRemove={() => handleRemoveWidget(widget.id)}
              />
            </div>
          ))}
        </ResponsiveGridLayout>
      )}

      <AddWidgetDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        existingTypes={existingTypes}
        onAdd={handleAddWidget}
      />
    </div>
  )
}
