import { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.js'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs.js'
import { widgetRegistry, type WidgetCategory, type WidgetDefinition } from './registry.js'

interface AddWidgetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingTypes: string[]
  onAdd: (type: string) => void
}

const CATEGORY_LABELS: Record<WidgetCategory, string> = {
  productivity: 'Productivity',
  external: 'External',
  data: 'Data',
  utility: 'Utility',
}

const CATEGORY_ORDER: WidgetCategory[] = ['productivity', 'external', 'data', 'utility']

export default function AddWidgetDialog({
  open,
  onOpenChange,
  existingTypes,
  onAdd,
}: AddWidgetDialogProps) {
  const widgetsByCategory = useMemo(() => {
    const grouped: Record<WidgetCategory, { type: string; definition: WidgetDefinition }[]> = {
      productivity: [],
      external: [],
      data: [],
      utility: [],
    }
    for (const [type, definition] of Object.entries(widgetRegistry)) {
      grouped[definition.category].push({ type, definition })
    }
    return grouped
  }, [])

  // Find the first category that has widgets, default to 'productivity'
  const defaultTab = CATEGORY_ORDER.find(cat => widgetsByCategory[cat].length > 0) ?? 'productivity'

  function countInstances(type: string): number {
    return existingTypes.filter(t => t === type).length
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue={defaultTab}>
          <TabsList className="w-full justify-start">
            {CATEGORY_ORDER.map(cat => {
              const count = widgetsByCategory[cat].length
              if (count === 0) return null
              return (
                <TabsTrigger key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </TabsTrigger>
              )
            })}
          </TabsList>
          {CATEGORY_ORDER.map(cat => {
            const widgets = widgetsByCategory[cat]
            if (widgets.length === 0) return null
            return (
              <TabsContent key={cat} value={cat}>
                <div className="grid grid-cols-2 gap-3 py-2">
                  {widgets.map(({ type, definition }) => {
                    const Icon = definition.icon
                    const instances = countInstances(type)
                    const isSingletonOnDashboard = definition.singleton && instances > 0
                    const disabled = isSingletonOnDashboard

                    return (
                      <button
                        key={type}
                        disabled={disabled}
                        onClick={() => {
                          onAdd(type)
                          onOpenChange(false)
                        }}
                        className={`relative flex flex-col items-center gap-2 rounded-lg border p-4 text-left transition-colors ${
                          disabled
                            ? 'cursor-not-allowed border-border/50 opacity-50'
                            : 'cursor-pointer border-border hover:border-accent hover:bg-bg-hover'
                        }`}
                      >
                        <Icon className="size-6 text-text-secondary" />
                        <span className="text-sm font-medium text-text-primary">{definition.label}</span>
                        <span className="text-xs text-text-muted text-center leading-tight">
                          {definition.description}
                        </span>
                        {isSingletonOnDashboard && (
                          <span className="text-[10px] text-text-muted mt-1">(Already added)</span>
                        )}
                        {!definition.singleton && instances > 0 && (
                          <span className="text-[10px] text-text-muted mt-1">
                            {instances} on dashboard
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </TabsContent>
            )
          })}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
