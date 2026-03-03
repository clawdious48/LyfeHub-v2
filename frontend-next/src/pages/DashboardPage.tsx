import { useState, useCallback, useMemo } from 'react'
import { ResponsiveGridLayout, useContainerWidth, verticalCompactor } from 'react-grid-layout'
import type { Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import { Pencil, Check, Plus, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDashboardLayout, useSaveDashboardLayout } from '@/api/hooks'
import WidgetWrapper from '@/widgets/WidgetWrapper.js'
import AddWidgetDialog from '@/widgets/AddWidgetDialog.js'
import DashboardSettingsDialog from '@/widgets/DashboardSettingsDialog.js'
import { widgetRegistry } from '@/widgets/registry.js'
import { detectDockEdge } from '@/widgets/nav/NavDockDetector.js'
import { useDashboardUiStore } from '@/stores/dashboardUiStore.js'
import type { WidgetStyle } from '@/widgets/registry.js'
import type { DashboardSettings } from '@/api/hooks/index.js'

interface WidgetItem {
  id: string
  type: string
  x: number
  y: number
  w: number
  h: number
  config?: Record<string, unknown>
  style?: WidgetStyle
}

const DEFAULT_WIDGETS: WidgetItem[] = [
  { id: 'default-my-day',   type: 'my-day',      x: 0,  y: 0,  w: 12, h: 8 },
  { id: 'default-calendar', type: 'week-cal',     x: 12, y: 0,  w: 12, h: 6 },
  { id: 'default-notes',    type: 'quick-notes',  x: 0,  y: 8,  w: 12, h: 6 },
  { id: 'default-inbox',    type: 'inbox',         x: 12, y: 6,  w: 12, h: 8 },
  { id: 'default-areas',    type: 'areas',         x: 0,  y: 14, w: 24, h: 6 },
]

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480 }
const COLS = { lg: 24, md: 24, sm: 12, xs: 2 }
const ROW_HEIGHT = 40

export default function DashboardPage() {
  const { width, containerRef } = useContainerWidth()
  const { data: layoutData } = useDashboardLayout()
  const saveLayout = useSaveDashboardLayout()

  const initialWidgets = layoutData?.layout?.widgets ?? DEFAULT_WIDGETS
  const [widgets, setWidgets] = useState<WidgetItem[]>(initialWidgets)
  const [isEditing, setIsEditing] = useState(false)
  const setGlobalEditing = useDashboardUiStore((s) => s.setEditing)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<DashboardSettings>({
    gap: 16,
    background: 'default',
  })

  // Sync from server when data loads (only if we haven't started editing)
  const [hasLoadedServer, setHasLoadedServer] = useState(false)
  if (layoutData?.layout?.widgets && !hasLoadedServer && !isEditing) {
    setWidgets(layoutData.layout.widgets)
    if (layoutData.layout.settings) {
      setSettings(layoutData.layout.settings)
    }
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
    setGlobalEditing(false)
    saveLayout.mutate({ widgets, settings })
  }, [widgets, settings, saveLayout, setGlobalEditing])

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

  const handleConfigChange = useCallback((id: string, newConfig: Record<string, unknown>) => {
    setWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w
        const updated = { ...w, config: newConfig }

        // Handle Navigation widget collapse/expand
        if (w.type === 'navigation') {
          const collapsed = newConfig.collapsed as boolean
          if (collapsed) {
            const edge = detectDockEdge(w.x, w.y, w.w, w.h, 24, prev.map((p) => ({ y: p.y, h: p.h })))
            if (edge === 'left' || edge === 'right') {
              updated.w = 1
            } else if (edge === 'top' || edge === 'bottom') {
              updated.h = 1
            }
          } else {
            const savedW = newConfig.savedW as number | undefined
            const savedH = newConfig.savedH as number | undefined
            if (savedW) updated.w = savedW
            if (savedH) updated.h = savedH
          }
        }

        return updated
      })
    )
  }, [])

  const handleStyleChange = useCallback((id: string, newStyle: WidgetStyle) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, style: newStyle } : w))
    )
  }, [])

  const existingTypes = useMemo(() => widgets.map((w) => w.type), [widgets])

  const BG_CLASSES: Record<string, string> = {
    'default': '',
    'gradient-purple': 'bg-gradient-to-br from-transparent to-purple-950/20',
    'gradient-space': 'bg-gradient-to-b from-slate-950/50 to-transparent',
    'gradient-warm': 'bg-gradient-to-br from-transparent to-orange-950/10',
  }

  return (
    <div className={`p-6 min-h-full ${BG_CLASSES[settings.background] ?? ''}`} ref={containerRef}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl text-text-primary">Dashboard</h1>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="size-4" />
                Customize
              </Button>
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
            <Button variant="outline" size="sm" onClick={() => { setIsEditing(true); setGlobalEditing(true) }}>
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
          dragConfig={{ enabled: isEditing, bounded: false, threshold: 3 }}
          resizeConfig={{ enabled: isEditing, handles: ['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne'] }}
          onLayoutChange={handleLayoutChange}
          compactor={verticalCompactor}
          margin={[settings.gap, settings.gap] as [number, number]}
        >
          {widgets.map((widget) => (
            <div key={widget.id}>
              <WidgetWrapper
                type={widget.type}
                config={widget.config}
                style={widget.style}
                isEditing={isEditing}
                onRemove={() => handleRemoveWidget(widget.id)}
                onConfigChange={(newConfig) => handleConfigChange(widget.id, newConfig)}
                onStyleChange={(newStyle) => handleStyleChange(widget.id, newStyle)}
                gridPosition={{ x: widget.x, y: widget.y, w: widget.w, h: widget.h }}
                allWidgets={widgets.map((w) => ({ y: w.y, h: w.h }))}
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

      <DashboardSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSettingsChange={setSettings}
      />
    </div>
  )
}
