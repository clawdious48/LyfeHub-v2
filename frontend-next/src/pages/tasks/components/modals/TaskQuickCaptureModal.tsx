import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog.js'
import { Button } from '@/components/ui/button.js'
import { Input } from '@/components/ui/input.js'
import { Textarea } from '@/components/ui/textarea.js'
import { useCreateTaskRecord } from '@/api/hooks/useTasksAdapter.js'

interface TaskQuickCaptureModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TaskQuickCaptureModal({ open, onOpenChange }: TaskQuickCaptureModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const createTask = useCreateTaskRecord()

  function handleSave() {
    if (!title.trim()) return
    createTask.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
    })
    setTitle('')
    setDescription('')
    onOpenChange(false)
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setTitle('')
      setDescription('')
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Add Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input
            placeholder="Task title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSave()
              }
            }}
            autoFocus
          />
          <Textarea
            placeholder="Description (optional)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="resize-none"
          />
          {/* Relation pickers (placeholder) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">People</span>
              <button className="text-xs text-accent hover:text-accent/80">+ Add</button>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Projects</span>
              <button className="text-xs text-accent hover:text-accent/80">+ Add</button>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Notes</span>
              <button className="text-xs text-accent hover:text-accent/80">+ Add</button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={!title.trim()}>
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
