import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog.js'
import { Button } from '@/components/ui/button.js'
import { Checkbox } from '@/components/ui/checkbox.js'
import type { BaseProperty } from '@/types/index.js'
import { getPropertyTypeLabel, getPropertyTypeIcon } from '@/pages/bases/utils/baseConstants.js'

interface ColumnVisibilityModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  properties: BaseProperty[]
  visibleColumns: string[] | null
  onSave: (cols: string[] | null) => void
}

export function ColumnVisibilityModal({
  open,
  onOpenChange,
  properties,
  visibleColumns,
  onSave,
}: ColumnVisibilityModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open) {
      if (visibleColumns === null) {
        setSelected(new Set(properties.map(p => p.id)))
      } else {
        setSelected(new Set(visibleColumns))
      }
    }
  }, [open, visibleColumns, properties])

  function toggle(propertyId: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(propertyId)) {
        next.delete(propertyId)
      } else {
        next.add(propertyId)
      }
      return next
    })
  }

  function showAll() {
    setSelected(new Set(properties.map(p => p.id)))
  }

  function hideAll() {
    setSelected(new Set())
  }

  function handleSave() {
    if (selected.size === properties.length) {
      onSave(null)
    } else {
      onSave(Array.from(selected))
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Column Visibility</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-2">
          <Button variant="outline" size="sm" onClick={showAll}>
            Show All
          </Button>
          <Button variant="outline" size="sm" onClick={hideAll}>
            Hide All
          </Button>
        </div>

        <div className="space-y-1 max-h-64 overflow-y-auto">
          {properties.map(prop => {
            const Icon = getPropertyTypeIcon(prop.type)
            return (
              <label
                key={prop.id}
                className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-accent/5 cursor-pointer"
              >
                <Checkbox
                  checked={selected.has(prop.id)}
                  onCheckedChange={() => toggle(prop.id)}
                />
                <Icon className="h-3.5 w-3.5 text-text-muted shrink-0" />
                <span className="text-sm truncate">{prop.name}</span>
                <span className="text-xs text-text-muted ml-auto shrink-0">
                  {getPropertyTypeLabel(prop.type)}
                </span>
              </label>
            )
          })}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
