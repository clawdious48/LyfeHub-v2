import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog.js'
import { Button } from '@/components/ui/button.js'
import { SelectOptionsEditor } from './SelectOptionsEditor.js'
import type { SelectOption } from '@/types/index.js'

interface EditOptionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  options: SelectOption[]
  onSave: (options: SelectOption[]) => void
  isStatus?: boolean
}

export function EditOptionsModal({ open, onOpenChange, options, onSave, isStatus }: EditOptionsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Options</DialogTitle>
        </DialogHeader>

        <SelectOptionsEditor options={options} onChange={(updated) => onSave(updated)} isStatus={isStatus} />

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
