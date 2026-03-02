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
import { Separator } from '@/components/ui/separator.js'
import { useUpdateGroup, useDeleteGroup } from '@/api/hooks/index.js'
import type { BaseGroup } from '@/types/index.js'

interface EditGroupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: BaseGroup | null
}

export function EditGroupModal({ open, onOpenChange, group }: EditGroupModalProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const updateGroup = useUpdateGroup()
  const deleteGroup = useDeleteGroup()

  useEffect(() => {
    if (group) {
      setName(group.name)
      setIcon(group.icon || '📁')
    }
  }, [group])

  function handleSave() {
    if (!group || !name.trim()) return

    updateGroup.mutate(
      { groupId: group.id, name: name.trim(), icon },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      }
    )
  }

  function handleDelete() {
    if (!group) return

    deleteGroup.mutate(group.id, {
      onSuccess: () => {
        onOpenChange(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Group</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="edit-group-name">Name</Label>
            <Input
              id="edit-group-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Group name"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && name.trim()) handleSave() }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-group-icon">Icon</Label>
            <Input
              id="edit-group-icon"
              value={icon}
              onChange={e => setIcon(e.target.value)}
              placeholder="📁"
              className="w-20"
            />
          </div>

          <Separator />

          <div>
            <p className="text-xs text-text-muted mb-2">
              Bases in this group will become ungrouped.
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteGroup.isPending}
            >
              {deleteGroup.isPending ? 'Deleting...' : 'Delete Group'}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!name.trim() || updateGroup.isPending}
            onClick={handleSave}
          >
            {updateGroup.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
