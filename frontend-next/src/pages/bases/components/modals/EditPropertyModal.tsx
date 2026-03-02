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
import { useUpdateProperty, useDeleteProperty } from '@/api/hooks/index.js'
import { getPropertyTypeIcon, getPropertyTypeLabel } from '@/pages/bases/utils/baseConstants.js'
import { parsePropertyOptions } from '@/pages/bases/utils/baseHelpers.js'
import { SelectOptionsEditor } from './SelectOptionsEditor.js'
import type { BaseProperty, SelectOption } from '@/types/index.js'

interface EditPropertyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  property: BaseProperty | null
  baseId: string
}

export function EditPropertyModal({ open, onOpenChange, property, baseId }: EditPropertyModalProps) {
  const [name, setName] = useState('')
  const [width, setWidth] = useState(200)
  const [selectOptions, setSelectOptions] = useState<SelectOption[]>([])
  const [confirmDelete, setConfirmDelete] = useState(false)

  const updateProperty = useUpdateProperty(baseId)
  const deleteProperty = useDeleteProperty(baseId)

  useEffect(() => {
    if (property) {
      setName(property.name)
      setWidth(property.width ?? 200)
      if (property.type === 'select' || property.type === 'multi_select' || property.type === 'status') {
        const parsed = parsePropertyOptions(property.options)
        setSelectOptions(Array.isArray(parsed) ? parsed as SelectOption[] : [])
      } else {
        setSelectOptions([])
      }
      setConfirmDelete(false)
    }
  }, [property])

  function handleClose(isOpen: boolean) {
    if (!isOpen) setConfirmDelete(false)
    onOpenChange(isOpen)
  }

  function handleSave() {
    if (!property || !name.trim()) return

    const data: { propId: string; name?: string; width?: number; options?: unknown } = {
      propId: property.id,
      name: name.trim(),
      width,
    }

    if (property.type === 'select' || property.type === 'multi_select' || property.type === 'status') {
      data.options = selectOptions.filter(o => o.label.trim())
    }

    updateProperty.mutate(data, {
      onSuccess: () => onOpenChange(false),
    })
  }

  function handleDelete() {
    if (!property) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    deleteProperty.mutate(property.id, {
      onSuccess: () => onOpenChange(false),
    })
  }

  if (!property) return null

  const Icon = getPropertyTypeIcon(property.type)
  const isValid = name.trim() !== ''

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Property</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="edit-property-name">Name</Label>
            <Input
              id="edit-property-name"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <Label>Type</Label>
            <div className="flex items-center gap-2 px-3 py-2 bg-bg-elevated rounded-md border border-border text-sm text-text-secondary">
              <Icon className="h-4 w-4" />
              {getPropertyTypeLabel(property.type)}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-property-width">Width (px)</Label>
            <Input
              id="edit-property-width"
              type="number"
              value={width}
              onChange={e => setWidth(Number(e.target.value))}
              min={100}
              max={600}
            />
          </div>

          {(property.type === 'select' || property.type === 'multi_select' || property.type === 'status') && (
            <div className="space-y-1">
              <Label>Options</Label>
              <SelectOptionsEditor options={selectOptions} onChange={setSelectOptions} isStatus={property.type === 'status'} />
            </div>
          )}
        </div>

        {(updateProperty.isError || deleteProperty.isError) && (
          <p className="text-sm text-destructive">
            Operation failed. Please try again.
          </p>
        )}

        {!property.is_default && (
          <div className="border-t border-border pt-4">
            <Button
              variant="ghost"
              className={confirmDelete ? 'text-red-400 bg-red-500/10' : 'text-red-400'}
              onClick={handleDelete}
              disabled={deleteProperty.isPending}
            >
              {deleteProperty.isPending
                ? 'Deleting...'
                : confirmDelete
                  ? 'Click again to confirm delete'
                  : 'Delete Property'}
            </Button>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!isValid || updateProperty.isPending}
            onClick={handleSave}
          >
            {updateProperty.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
