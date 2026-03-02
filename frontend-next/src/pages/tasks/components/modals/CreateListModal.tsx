import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog.js'
import { Button } from '@/components/ui/button.js'
import { Input } from '@/components/ui/input.js'
import { useCreateTaskList } from '@/api/hooks/useTaskLists.js'

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
  const createList = useCreateTaskList()

  function handleSave() {
    if (!name.trim()) return
    createList.mutate({ name: name.trim(), color })
    setName('')
    setColor(LIST_COLORS[5].value)
    onOpenChange(false)
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
