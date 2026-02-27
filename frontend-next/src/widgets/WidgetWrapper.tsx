import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GripVertical, X } from 'lucide-react'
import { widgetRegistry } from './registry'

interface WidgetWrapperProps {
  type: string
  isEditing: boolean
  onRemove: () => void
}

export default function WidgetWrapper({ type, isEditing, onRemove }: WidgetWrapperProps) {
  const definition = widgetRegistry[type]

  if (!definition) {
    return (
      <Card className="bg-bg-surface border-border h-full">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-text-secondary text-sm">Unknown widget: {type}</p>
        </CardContent>
      </Card>
    )
  }

  const { component: WidgetComponent, label, icon: Icon } = definition

  return (
    <Card className="bg-bg-surface border-border h-full flex flex-col">
      <CardHeader className="flex flex-row items-center gap-2 py-3 px-4">
        {isEditing && (
          <div className="cursor-grab active:cursor-grabbing widget-drag-handle">
            <GripVertical className="size-4 text-text-secondary" />
          </div>
        )}
        <Icon className="size-4 text-text-secondary" />
        <CardTitle className="text-sm text-text-primary flex-1">{label}</CardTitle>
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
      <CardContent className="flex-1 overflow-auto pt-0">
        <WidgetComponent />
      </CardContent>
    </Card>
  )
}
