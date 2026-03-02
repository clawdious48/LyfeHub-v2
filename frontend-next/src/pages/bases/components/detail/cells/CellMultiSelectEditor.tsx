import { useState, useRef, useEffect } from 'react'
import type { SelectOption } from '@/types/index.js'
import { getTagColor } from '@/pages/bases/utils/baseConstants.js'
import { Checkbox } from '@/components/ui/checkbox.js'

interface CellMultiSelectEditorProps {
  value: string[]
  options: SelectOption[]
  onSave: (val: string[]) => void
  onCancel: () => void
}

export function CellMultiSelectEditor({ value, options, onSave, onCancel }: CellMultiSelectEditorProps) {
  const [localValue, setLocalValue] = useState<string[]>(value)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onSave(localValue)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [localValue, onSave])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCancel()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  function toggleOption(optionValue: string) {
    setLocalValue((prev) =>
      prev.includes(optionValue)
        ? prev.filter((v) => v !== optionValue)
        : [...prev, optionValue]
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="absolute z-50 bg-bg-elevated border border-border rounded-md shadow-lg mt-1 min-w-[150px] max-h-[200px] overflow-y-auto">
        {options.map((option) => {
          const tagColor = getTagColor(option.color)
          const optionValue = option.value || option.label
          const isChecked = localValue.includes(optionValue)
          return (
            <div
              key={optionValue}
              className="px-3 py-1.5 hover:bg-bg-hover cursor-pointer text-sm flex items-center gap-2"
              onClick={() => toggleOption(optionValue)}
            >
              <Checkbox checked={isChecked} className="pointer-events-none" />
              <span
                className={`w-2.5 h-2.5 rounded-full ${tagColor.bg} ${tagColor.border} border flex-shrink-0`}
              />
              <span className="text-text-primary">{option.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
