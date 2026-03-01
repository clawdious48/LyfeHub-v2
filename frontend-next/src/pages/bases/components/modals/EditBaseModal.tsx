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
import { Input } from '@/components/ui/input.js'
import { Label } from '@/components/ui/label.js'
import { Textarea } from '@/components/ui/textarea.js'
import { useUpdateBase, useDeleteBase } from '@/api/hooks/index.js'
import type { Base } from '@/types/index.js'

interface EditBaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  base: Base | null
  onSuccess?: () => void
}

const INITIAL_FORM = { name: '', description: '', icon: '\uD83D\uDCCA' }

export function EditBaseModal({ open, onOpenChange, base, onSuccess }: EditBaseModalProps) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const updateBase = useUpdateBase()
  const deleteBase = useDeleteBase()

  useEffect(() => {
    if (base) {
      setForm({
        name: base.name,
        description: base.description || '',
        icon: base.icon || '\uD83D\uDCCA',
      })
    }
  }, [base])

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) setShowDeleteConfirm(false)
    onOpenChange(isOpen)
  }

  function handleSubmit() {
    if (!base || !form.name.trim()) return

    updateBase.mutate(
      { id: base.id, name: form.name.trim(), description: form.description, icon: form.icon },
      {
        onSuccess: () => {
          onOpenChange(false)
          onSuccess?.()
        },
      },
    )
  }

  function handleDelete() {
    if (!base) return

    deleteBase.mutate(base.id, {
      onSuccess: () => {
        setShowDeleteConfirm(false)
        onOpenChange(false)
        onSuccess?.()
      },
    })
  }

  const isValid = form.name.trim() !== ''

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Base</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="edit-base-icon">Icon</Label>
              <Input
                id="edit-base-icon"
                className="w-16 text-center text-lg"
                value={form.icon}
                onChange={e => updateField('icon', e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="edit-base-name">Name *</Label>
              <Input
                id="edit-base-name"
                value={form.name}
                onChange={e => updateField('name', e.target.value)}
                placeholder="Base name"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-base-description">Description</Label>
            <Textarea
              id="edit-base-description"
              rows={3}
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
              placeholder="What is this base for?"
            />
          </div>
        </div>

        {updateBase.isError && (
          <p className="text-sm text-destructive">
            Failed to update base. Please try again.
          </p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!isValid || updateBase.isPending}
            onClick={handleSubmit}
          >
            {updateBase.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>

        {/* Delete section */}
        <div className="border-t border-border pt-4 mt-2">
          {!showDeleteConfirm ? (
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Archive Base
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-destructive">
                This will archive this base and its records. Are you sure?
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={deleteBase.isPending}
                  onClick={handleDelete}
                >
                  {deleteBase.isPending ? 'Archiving...' : 'Confirm Archive'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
