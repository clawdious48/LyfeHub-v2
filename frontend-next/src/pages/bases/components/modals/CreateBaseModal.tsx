import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog.js'
import { Button } from '@/components/ui/button.js'
import { Input } from '@/components/ui/input.js'
import { Label } from '@/components/ui/label.js'
import { Textarea } from '@/components/ui/textarea.js'
import { useCreateBase } from '@/api/hooks/index.js'

interface CreateBaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const INITIAL_FORM = { name: '', description: '', icon: '\uD83D\uDCCA' }

export function CreateBaseModal({ open, onOpenChange, onSuccess }: CreateBaseModalProps) {
  const [form, setForm] = useState(INITIAL_FORM)
  const createBase = useCreateBase()

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function resetForm() {
    setForm(INITIAL_FORM)
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) resetForm()
    onOpenChange(isOpen)
  }

  function handleSubmit() {
    if (!form.name.trim()) return

    createBase.mutate(
      { name: form.name.trim(), description: form.description, icon: form.icon },
      {
        onSuccess: () => {
          resetForm()
          onOpenChange(false)
          onSuccess?.()
        },
      },
    )
  }

  const isValid = form.name.trim() !== ''

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Base</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="base-icon">Icon</Label>
              <Input
                id="base-icon"
                className="w-16 text-center text-lg"
                value={form.icon}
                onChange={e => updateField('icon', e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="base-name">Name *</Label>
              <Input
                id="base-name"
                value={form.name}
                onChange={e => updateField('name', e.target.value)}
                placeholder="Base name"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="base-description">Description</Label>
            <Textarea
              id="base-description"
              rows={3}
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
              placeholder="What is this base for?"
            />
          </div>
        </div>

        {createBase.isError && (
          <p className="text-sm text-destructive">
            Failed to create base. Please try again.
          </p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!isValid || createBase.isPending}
            onClick={handleSubmit}
          >
            {createBase.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
