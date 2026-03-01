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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js'
import type { BaseProperty, SelectOption } from '@/types/index.js'
import { FILTER_OPERATORS, getPropertyTypeLabel, getPropertyTypeIcon } from '@/pages/bases/utils/baseConstants.js'

interface AddFilterModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  properties: BaseProperty[]
  onAdd: (filter: { propertyId: string; operator: string; value: string }) => void
}

export function AddFilterModal({ open, onOpenChange, properties, onAdd }: AddFilterModalProps) {
  const [propertyId, setPropertyId] = useState('')
  const [operator, setOperator] = useState('')
  const [value, setValue] = useState('')

  const selectedProperty = properties.find(p => p.id === propertyId)
  const propertyType = selectedProperty?.type ?? 'text'
  const operators = FILTER_OPERATORS[propertyType] ?? FILTER_OPERATORS.text

  const needsValue = operator !== 'is_empty' && operator !== 'is_not_empty'

  function reset() {
    setPropertyId('')
    setOperator('')
    setValue('')
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) reset()
    onOpenChange(isOpen)
  }

  function handlePropertyChange(id: string) {
    setPropertyId(id)
    setOperator('')
    setValue('')
  }

  function handleSubmit() {
    if (!propertyId || !operator) return
    if (needsValue && !value.trim()) return

    onAdd({ propertyId, operator, value: needsValue ? value.trim() : '' })
    reset()
    onOpenChange(false)
  }

  function renderValueInput() {
    if (!needsValue) return null

    if (!selectedProperty) {
      return <Input value={value} onChange={e => setValue(e.target.value)} placeholder="Value" />
    }

    switch (selectedProperty.type) {
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="0"
          />
        )

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={e => setValue(e.target.value)}
          />
        )

      case 'checkbox':
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Checked</SelectItem>
              <SelectItem value="false">Unchecked</SelectItem>
            </SelectContent>
          </Select>
        )

      case 'select':
      case 'multi_select': {
        const options = (Array.isArray(selectedProperty.options)
          ? selectedProperty.options
          : []) as SelectOption[]

        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger>
              <SelectValue placeholder="Select option..." />
            </SelectTrigger>
            <SelectContent>
              {options.map(opt => (
                <SelectItem key={opt.label} value={opt.label}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      }

      default:
        return (
          <Input
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Value"
          />
        )
    }
  }

  const isValid = propertyId && operator && (!needsValue || value.trim())

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Filter</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Property</Label>
            <Select value={propertyId} onValueChange={handlePropertyChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select property..." />
              </SelectTrigger>
              <SelectContent>
                {properties.map(prop => {
                  const Icon = getPropertyTypeIcon(prop.type)
                  return (
                    <SelectItem key={prop.id} value={prop.id}>
                      <span className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-text-muted" />
                        {prop.name}
                        <span className="text-text-muted text-xs">
                          ({getPropertyTypeLabel(prop.type)})
                        </span>
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {propertyId && (
            <div className="space-y-1">
              <Label>Operator</Label>
              <Select value={operator} onValueChange={setOperator}>
                <SelectTrigger>
                  <SelectValue placeholder="Select operator..." />
                </SelectTrigger>
                <SelectContent>
                  {operators.map(op => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {operator && (
            <div className="space-y-1">
              <Label>Value</Label>
              {renderValueInput()}
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button disabled={!isValid} onClick={handleSubmit}>
            Add Filter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
