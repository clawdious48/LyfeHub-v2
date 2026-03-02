import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog.js'
import { Button } from '@/components/ui/button.js'
import { Input } from '@/components/ui/input.js'
import { useTaskBase, useTaskListOptions } from '@/api/hooks/useTasksAdapter.js'
import { useUpdateProperty } from '@/api/hooks/useBases.js'
import type { SelectOption } from '@/types/index.js'

const LIST_COLORS = [
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#22c55e', label: 'Green' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
]

interface CreateListModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateListModal({ open, onOpenChange }: CreateListModalProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(LIST_COLORS[5].value) // Default blue
  const { base } = useTaskBase()
  const listOptions = useTaskListOptions()
  const updateProperty = useUpdateProperty(base?.id ?? '')

  function handleSave() {
    if (!name.trim() || !base) return
    const listProp = base.properties?.find((p: any) => p.id === 'list_id')
    if (!listProp) return
    const newOption: SelectOption = {
      label: name.trim(),
      value: name.trim().toLowerCase().replace(/\s+/g, '-'),
      color,
    }
    const currentOptions = Array.isArray(listProp.options) ? listProp.options : []
    updateProperty.mutate({
      propId: 'list_id',
      options: [...currentOptions, newOption],
    }, {
      onSuccess: () => {
        setName('')
        setColor(LIST_COLORS[5].value)
        onOpenChange(false)
      },
    })
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setName('')
      setColor(LIST_COLORS[5].value)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New List</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Input
            placeholder="List name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSave()
              }
            }}
            autoFocus
          />
          <div>
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Color</label>
            <div className="flex gap-2 mt-2">
              {LIST_COLORS.map(({ value: colorVal, label }) => (
                <button
                  key={colorVal}
                  title={label}
                  onClick={() => setColor(colorVal)}
                  className={[
                    'size-7 rounded-full transition-all',
                    color === colorVal ? 'ring-2 ring-offset-2 ring-offset-bg-surface ring-accent scale-110' : 'hover:scale-105',
                  ].join(' ')}
                  style={{ backgroundColor: colorVal }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
