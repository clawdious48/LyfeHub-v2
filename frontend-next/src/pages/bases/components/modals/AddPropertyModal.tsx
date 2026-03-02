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
import { useCreateProperty } from '@/api/hooks/index.js'
import { getPropertyTypeLabel } from '@/pages/bases/utils/baseConstants.js'
import { PropertyTypeSelect } from './PropertyTypeSelect.js'
import { SelectOptionsEditor } from './SelectOptionsEditor.js'
import { RelationConfig } from './RelationConfig.js'
import type { BasePropertyType, SelectOption } from '@/types/index.js'

interface AddPropertyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  baseId: string
}

type Step = 'type' | 'config'

const INITIAL_RELATION_CONFIG = { relatedBaseId: '', createReverse: false, reverseName: '' }

export function AddPropertyModal({ open, onOpenChange, baseId }: AddPropertyModalProps) {
  const [step, setStep] = useState<Step>('type')
  const [selectedType, setSelectedType] = useState<BasePropertyType | null>(null)
  const [name, setName] = useState('')
  const [selectOptions, setSelectOptions] = useState<SelectOption[]>([])
  const [relationConfig, setRelationConfig] = useState(INITIAL_RELATION_CONFIG)

  const createProperty = useCreateProperty(baseId)

  function reset() {
    setStep('type')
    setSelectedType(null)
    setName('')
    setSelectOptions([])
    setRelationConfig(INITIAL_RELATION_CONFIG)
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) reset()
    onOpenChange(isOpen)
  }

  function handleTypeSelect(type: BasePropertyType) {
    setSelectedType(type)
    setStep('config')
  }

  function handleBack() {
    setStep('type')
  }

  function handleSubmit() {
    if (!selectedType || !name.trim()) return

    const data: { name: string; type: BasePropertyType; options?: unknown; createReverse?: boolean; reverseName?: string } = {
      name: name.trim(),
      type: selectedType,
    }

    if (selectedType === 'select' || selectedType === 'multi_select' || selectedType === 'status') {
      data.options = selectOptions.filter(o => o.label.trim())
    }

    if (selectedType === 'relation') {
      data.options = { relatedBaseId: relationConfig.relatedBaseId }
      data.createReverse = relationConfig.createReverse
      data.reverseName = relationConfig.reverseName
    }

    createProperty.mutate(data, {
      onSuccess: () => {
        reset()
        onOpenChange(false)
      },
    })
  }

  const isValid = selectedType !== null && name.trim() !== '' &&
    (selectedType !== 'relation' || relationConfig.relatedBaseId !== '')

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'type' ? 'Add Property' : `New ${selectedType ? getPropertyTypeLabel(selectedType) : ''} Property`}
          </DialogTitle>
        </DialogHeader>

        {step === 'type' && (
          <PropertyTypeSelect selectedType={selectedType} onSelect={handleTypeSelect} />
        )}

        {step === 'config' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="property-name">Name *</Label>
              <Input
                id="property-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Property name"
                autoFocus
              />
            </div>

            {(selectedType === 'select' || selectedType === 'multi_select' || selectedType === 'status') && (
              <div className="space-y-1">
                <Label>Options</Label>
                <SelectOptionsEditor options={selectOptions} onChange={setSelectOptions} isStatus={selectedType === 'status'} />
              </div>
            )}

            {selectedType === 'relation' && (
              <RelationConfig
                config={relationConfig}
                onChange={setRelationConfig}
                currentBaseId={baseId}
              />
            )}
          </div>
        )}

        {createProperty.isError && (
          <p className="text-sm text-destructive">
            Failed to create property. Please try again.
          </p>
        )}

        <DialogFooter>
          {step === 'config' && (
            <Button variant="outline" onClick={handleBack} className="mr-auto">
              Back
            </Button>
          )}
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          {step === 'config' && (
            <Button
              disabled={!isValid || createProperty.isPending}
              onClick={handleSubmit}
            >
              {createProperty.isPending ? 'Creating...' : 'Create'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
