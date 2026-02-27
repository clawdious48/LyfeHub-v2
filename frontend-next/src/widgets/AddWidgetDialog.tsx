import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { widgetRegistry } from './registry'

interface AddWidgetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingTypes: string[]
  onAdd: (type: string) => void
}

export default function AddWidgetDialog({
  open,
  onOpenChange,
  existingTypes,
  onAdd,
}: AddWidgetDialogProps) {
  const availableWidgets = Object.entries(widgetRegistry).filter(
    ([type]) => !existingTypes.includes(type)
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
        </DialogHeader>
        {availableWidgets.length === 0 ? (
          <p className="text-text-secondary text-sm py-4 text-center">
            All available widgets are already on your dashboard.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 py-2">
            {availableWidgets.map(([type, definition]) => {
              const Icon = definition.icon
              return (
                <Button
                  key={type}
                  variant="outline"
                  className="flex flex-col items-center gap-2 h-auto py-4 px-3"
                  onClick={() => {
                    onAdd(type)
                    onOpenChange(false)
                  }}
                >
                  <Icon className="size-6 text-text-secondary" />
                  <span className="text-sm text-text-primary">{definition.label}</span>
                </Button>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
