import { useState, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog.js'
import { Button } from '@/components/ui/button.js'
import { Input } from '@/components/ui/input.js'
import { Checkbox } from '@/components/ui/checkbox.js'
import { useRelationOptions } from '@/api/hooks/index.js'
import type { BaseProperty, RelationOptions } from '@/types/index.js'

interface RelationPickerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  baseId: string
  property: BaseProperty
  currentValue: string[]
  onSave: (ids: string[]) => void
}

export function RelationPickerModal({
  open,
  onOpenChange,
  property,
  currentValue,
  onSave,
}: RelationPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>(currentValue)

  const opts = property.options as RelationOptions
  const relatedBaseId = opts?.relatedBaseId ?? ''

  const { data: options = [] } = useRelationOptions(relatedBaseId)

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return options
    const q = searchQuery.toLowerCase()
    return options.filter(
      (opt) =>
        opt.displayValue.toLowerCase().includes(q) ||
        String(opt.global_id).includes(q),
    )
  }, [options, searchQuery])

  function handleToggle(id: string, checked: boolean) {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id),
    )
  }

  function handleSave() {
    onSave(selectedIds)
    onOpenChange(false)
  }

  function handleClear() {
    setSelectedIds([])
  }

  // Reset state when modal opens
  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setSelectedIds(currentValue)
      setSearchQuery('')
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link Records &mdash; {property.name}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-muted" />
          <Input
            placeholder="Search records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-text-muted hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1 border border-border rounded-md p-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-text-muted py-4 text-center">
              {options.length === 0 ? 'No records in related base' : 'No matches'}
            </p>
          ) : (
            filtered.map((opt) => {
              const checked = selectedIds.includes(opt.id)
              return (
                <label
                  key={opt.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-2 cursor-pointer"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(c) => handleToggle(opt.id, !!c)}
                  />
                  <span className="text-sm text-text-primary truncate flex-1">
                    {opt.displayValue || 'Untitled'}
                  </span>
                  <span className="text-[10px] text-text-muted font-mono">
                    #{opt.global_id}
                  </span>
                </label>
              )
            })
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <span className="text-xs text-text-muted">
            {selectedIds.length} selected
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleClear}>
              Clear
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
