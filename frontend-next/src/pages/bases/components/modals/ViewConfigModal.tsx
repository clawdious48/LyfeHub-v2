import { useState, useEffect } from 'react'
import { Plus, Trash2, X, ArrowUp, ArrowDown } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox.js'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js'
import { Separator } from '@/components/ui/separator.js'
import type { BaseView, BaseProperty, FilterConfig, SortConfig, SelectOption } from '@/types/index.js'
import { useCreateView, useUpdateView, useDeleteView } from '@/api/hooks/index.js'
import {
  FILTER_OPERATORS,
  getPropertyTypeIcon,
} from '@/pages/bases/utils/baseConstants.js'

interface ViewConfigModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  baseId: string
  view?: BaseView | null
  properties: BaseProperty[]
  onSuccess?: () => void
}

interface LocalFilter {
  id: string
  propertyId: string
  operator: string
  value: string
}

interface LocalSort {
  column: string
  direction: 'asc' | 'desc'
}

function generateId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString() + Math.random().toString(36).slice(2)
}

export function ViewConfigModal({
  open,
  onOpenChange,
  baseId,
  view,
  properties,
  onSuccess,
}: ViewConfigModalProps) {
  const isEditing = !!view

  const [name, setName] = useState('')
  const [filters, setFilters] = useState<LocalFilter[]>([])
  const [sorts, setSorts] = useState<LocalSort[]>([])
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set())

  const createView = useCreateView(baseId)
  const updateView = useUpdateView(baseId)
  const deleteView = useDeleteView(baseId)

  useEffect(() => {
    if (!open) return

    if (view) {
      setName(view.name)
      setFilters(
        (view.config.filters ?? []).map(f => ({
          id: generateId(),
          propertyId: f.propertyId,
          operator: f.operator,
          value: f.value,
        })),
      )
      setSorts(
        (view.config.sorts ?? []).map(s => ({
          column: s.propertyId,
          direction: s.direction,
        })),
      )
      if (view.config.visibleColumns) {
        setVisibleColumns(new Set(view.config.visibleColumns))
      } else {
        setVisibleColumns(new Set(properties.map(p => p.id)))
      }
    } else {
      setName('')
      setFilters([])
      setSorts([])
      setVisibleColumns(new Set(properties.map(p => p.id)))
    }
  }, [open, view, properties])

  function addFilter() {
    setFilters(prev => [
      ...prev,
      { id: generateId(), propertyId: '', operator: '', value: '' },
    ])
  }

  function updateFilter(id: string, updates: Partial<LocalFilter>) {
    setFilters(prev =>
      prev.map(f => {
        if (f.id !== id) return f
        const updated = { ...f, ...updates }
        if (updates.propertyId && updates.propertyId !== f.propertyId) {
          updated.operator = ''
          updated.value = ''
        }
        return updated
      }),
    )
  }

  function removeFilter(id: string) {
    setFilters(prev => prev.filter(f => f.id !== id))
  }

  function addSort() {
    if (sorts.length > 0) return
    setSorts([{ column: '', direction: 'asc' }])
  }

  function updateSort(index: number, updates: Partial<LocalSort>) {
    setSorts(prev => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)))
  }

  function removeSort(index: number) {
    setSorts(prev => prev.filter((_, i) => i !== index))
  }

  function toggleColumn(propId: string) {
    setVisibleColumns(prev => {
      const next = new Set(prev)
      if (next.has(propId)) {
        next.delete(propId)
      } else {
        next.add(propId)
      }
      return next
    })
  }

  function handleSave() {
    if (!name.trim()) return

    const validFilters: FilterConfig[] = filters
      .filter(f => f.propertyId && f.operator)
      .map(f => ({
        propertyId: f.propertyId,
        operator: f.operator,
        value: f.value,
      }))

    const validSorts: SortConfig[] = sorts
      .filter(s => s.column)
      .map(s => ({
        propertyId: s.column,
        direction: s.direction,
      }))

    const cols = visibleColumns.size === properties.length
      ? undefined
      : Array.from(visibleColumns)

    const config = {
      filters: validFilters.length > 0 ? validFilters : undefined,
      sorts: validSorts.length > 0 ? validSorts : undefined,
      visibleColumns: cols,
    }

    if (isEditing && view) {
      updateView.mutate(
        { viewId: view.id, name: name.trim(), config },
        {
          onSuccess: () => {
            onOpenChange(false)
            onSuccess?.()
          },
        },
      )
    } else {
      createView.mutate(
        { name: name.trim(), config },
        {
          onSuccess: () => {
            onOpenChange(false)
            onSuccess?.()
          },
        },
      )
    }
  }

  function handleDelete() {
    if (!view) return
    deleteView.mutate(view.id, {
      onSuccess: () => {
        onOpenChange(false)
        onSuccess?.()
      },
    })
  }

  const isPending = createView.isPending || updateView.isPending || deleteView.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit View' : 'Create View'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Name */}
          <div className="space-y-1">
            <Label htmlFor="view-name">Name *</Label>
            <Input
              id="view-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="View name"
              autoFocus
            />
          </div>

          <Separator />

          {/* Filters Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Filters</Label>
              <Button variant="ghost" size="sm" onClick={addFilter}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            </div>

            {filters.length === 0 && (
              <p className="text-xs text-text-muted">No filters configured.</p>
            )}

            {filters.map(filter => {
              const prop = properties.find(p => p.id === filter.propertyId)
              const propType = prop?.type ?? 'text'
              const operators = FILTER_OPERATORS[propType] ?? FILTER_OPERATORS.text
              const needsValue =
                filter.operator !== 'is_empty' && filter.operator !== 'is_not_empty'

              return (
                <div key={filter.id} className="flex items-start gap-2">
                  {/* Property */}
                  <Select
                    value={filter.propertyId}
                    onValueChange={v => updateFilter(filter.id, { propertyId: v })}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Property" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Operator */}
                  {filter.propertyId && (
                    <Select
                      value={filter.operator}
                      onValueChange={v => updateFilter(filter.id, { operator: v })}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Operator" />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map(op => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Value */}
                  {filter.operator && needsValue && (
                    <FilterValueInput
                      property={prop ?? null}
                      value={filter.value}
                      onChange={v => updateFilter(filter.id, { value: v })}
                    />
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 px-1.5"
                    onClick={() => removeFilter(filter.id)}
                  >
                    <X className="h-3.5 w-3.5 text-text-muted" />
                  </Button>
                </div>
              )
            })}
          </div>

          <Separator />

          {/* Sort Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Sorting</Label>
              {sorts.length === 0 && (
                <Button variant="ghost" size="sm" onClick={addSort}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add
                </Button>
              )}
            </div>

            {sorts.length === 0 && (
              <p className="text-xs text-text-muted">No sorting configured.</p>
            )}

            {sorts.map((sort, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Select
                  value={sort.column}
                  onValueChange={v => updateSort(idx, { column: v })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 px-2"
                  onClick={() =>
                    updateSort(idx, {
                      direction: sort.direction === 'asc' ? 'desc' : 'asc',
                    })
                  }
                >
                  {sort.direction === 'asc' ? (
                    <ArrowUp className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5" />
                  )}
                  <span className="ml-1 text-xs">{sort.direction.toUpperCase()}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 px-1.5"
                  onClick={() => removeSort(idx)}
                >
                  <X className="h-3.5 w-3.5 text-text-muted" />
                </Button>
              </div>
            ))}
          </div>

          <Separator />

          {/* Visible Columns Section */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Visible Columns</Label>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {properties.map(prop => {
                const Icon = getPropertyTypeIcon(prop.type)
                return (
                  <label
                    key={prop.id}
                    className="flex items-center gap-3 px-2 py-1 rounded hover:bg-accent/5 cursor-pointer"
                  >
                    <Checkbox
                      checked={visibleColumns.has(prop.id)}
                      onCheckedChange={() => toggleColumn(prop.id)}
                    />
                    <Icon className="h-3.5 w-3.5 text-text-muted shrink-0" />
                    <span className="text-sm truncate">{prop.name}</span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>

        {(createView.isError || updateView.isError || deleteView.isError) && (
          <p className="text-sm text-destructive">
            An error occurred. Please try again.
          </p>
        )}

        <DialogFooter className="flex items-center">
          {isEditing && (
            <Button
              variant="destructive"
              size="sm"
              className="mr-auto"
              disabled={isPending}
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete
            </Button>
          )}
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!name.trim() || isPending}
            onClick={handleSave}
          >
            {isPending
              ? 'Saving...'
              : isEditing
                ? 'Save Changes'
                : 'Create View'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Internal component for filter value input based on property type
function FilterValueInput({
  property,
  value,
  onChange,
}: {
  property: BaseProperty | null
  value: string
  onChange: (value: string) => void
}) {
  if (!property) {
    return (
      <Input
        className="flex-1"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Value"
      />
    )
  }

  switch (property.type) {
    case 'number':
      return (
        <Input
          className="flex-1"
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="0"
        />
      )

    case 'date':
      return (
        <Input
          className="flex-1"
          type="date"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      )

    case 'checkbox':
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="flex-1">
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
      const options = (Array.isArray(property.options)
        ? property.options
        : []) as SelectOption[]

      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="flex-1">
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
          className="flex-1"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Value"
        />
      )
  }
}
