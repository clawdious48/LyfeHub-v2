import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.js'
import { Button } from '@/components/ui/button.js'
import { X, Settings } from 'lucide-react'
import { cn } from '@/lib/utils.js'
import { widgetRegistry } from './registry.js'
import WidgetConfigDialog from './WidgetConfigDialog.js'
import type { WidgetStyle } from './registry.js'

interface WidgetWrapperProps {
  type: string
  config?: Record<string, unknown>
  style?: WidgetStyle
  isEditing: boolean
  onRemove: () => void
  onConfigChange?: (config: Record<string, unknown>) => void
  onStyleChange?: (style: WidgetStyle) => void
  gridPosition?: { x: number; y: number; w: number; h: number }
  allWidgets?: Array<{ y: number; h: number }>
}

const DEFAULT_STYLE: WidgetStyle = {
  preset: 'default',
  accent: null,
  headerVisible: true,
  headerSize: 'md',
  headerDensity: 'normal',
  headerIconVisible: true,
}

const PRESET_CLASSES: Record<WidgetStyle['preset'], string> = {
  default: 'bg-bg-surface border-border',
  borderless: 'bg-bg-surface border-transparent shadow-md',
  transparent: 'bg-transparent border-transparent',
}

const ACCENT_BORDER_CLASSES: Record<string, string> = {
  purple: 'border-t-2 border-t-purple-500',
  blue: 'border-t-2 border-t-blue-500',
  cyan: 'border-t-2 border-t-cyan-500',
  pink: 'border-t-2 border-t-pink-500',
  orange: 'border-t-2 border-t-orange-500',
  green: 'border-t-2 border-t-green-500',
}

export default function WidgetWrapper({
  type,
  config,
  style,
  isEditing,
  onRemove,
  onConfigChange,
  onStyleChange,
  gridPosition,
  allWidgets,
}: WidgetWrapperProps) {
  const [configOpen, setConfigOpen] = useState(false)
  const definition = widgetRegistry[type]
  const resolvedStyle = style ?? DEFAULT_STYLE

  if (!definition) {
    return (
      <Card className="bg-bg-surface border-border h-full">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-text-secondary text-sm">Unknown widget: {type}</p>
        </CardContent>
      </Card>
    )
  }

  const { component: WidgetComponent, label, icon: Icon, configurable, configSchema } = definition
  const presetClass = PRESET_CLASSES[resolvedStyle.preset]
  const accentClass = resolvedStyle.accent ? ACCENT_BORDER_CLASSES[resolvedStyle.accent] ?? '' : ''
  const showHeader = resolvedStyle.headerVisible

  const handleSaveConfig = (newConfig: Record<string, unknown>, newStyle: WidgetStyle) => {
    onConfigChange?.(newConfig)
    onStyleChange?.(newStyle)
  }

  return (
    <>
      <Card className={cn('h-full flex flex-col', presetClass, accentClass)}>
        {showHeader ? (
          <CardHeader className="flex flex-row items-center gap-2 py-3 px-4">
            <Icon className="size-4 text-text-secondary" />
            <CardTitle className="text-sm text-text-primary flex-1">{label}</CardTitle>
            {isEditing && configurable && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setConfigOpen(true)}
                className="text-text-secondary hover:text-text-primary"
              >
                <Settings className="size-3" />
              </Button>
            )}
            {isEditing && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onRemove}
                className="text-text-secondary hover:text-red-400"
              >
                <X className="size-3" />
              </Button>
            )}
          </CardHeader>
        ) : isEditing ? (
          <div className="absolute top-1 right-1 z-10 flex items-center gap-0.5 rounded-md bg-bg-surface/80 backdrop-blur-sm border border-border px-1 py-0.5">
            {configurable && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setConfigOpen(true)}
                className="text-text-secondary hover:text-text-primary"
              >
                <Settings className="size-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onRemove}
              className="text-text-secondary hover:text-red-400"
            >
              <X className="size-3" />
            </Button>
          </div>
        ) : null}
        <CardContent className={cn('flex-1 overflow-y-auto overflow-x-hidden', showHeader ? 'pt-0' : 'pt-4')}>
          <WidgetComponent
            config={config}
            {...(onConfigChange ? { onConfigChange } : {})}
            {...(gridPosition ? { gridPosition } : {})}
            {...(allWidgets ? { allWidgets } : {})}
          />
        </CardContent>
      </Card>

      {configurable && configSchema && (
        <WidgetConfigDialog
          open={configOpen}
          onOpenChange={setConfigOpen}
          title={label}
          configSchema={configSchema}
          config={config ?? {}}
          style={resolvedStyle}
          onSave={handleSaveConfig}
        />
      )}
    </>
  )
}
