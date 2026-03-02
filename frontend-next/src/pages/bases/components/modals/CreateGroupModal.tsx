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
import { useCreateGroup } from '@/api/hooks/index.js'

interface CreateGroupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateGroupModal({ open, onOpenChange }: CreateGroupModalProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📁')
  const createGroup = useCreateGroup()

  function reset() {
    setName('')
    setIcon('📁')
  }

  function handleSubmit() {
    if (!name.trim()) return

    createGroup.mutate(
      { name: name.trim(), icon },
      {
        onSuccess: () => {
          reset()
          onOpenChange(false)
        },
      }
    )
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Group</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="group-name">Name</Label>
            <Input
              id="group-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Group name"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && name.trim()) handleSubmit() }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="group-icon">Icon</Label>
            <Input
              id="group-icon"
              value={icon}
              onChange={e => setIcon(e.target.value)}
              placeholder="📁"
              className="w-20"
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!name.trim() || createGroup.isPending}
            onClick={handleSubmit}
          >
            {createGroup.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
