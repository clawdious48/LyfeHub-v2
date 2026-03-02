import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input.js'
import { Button } from '@/components/ui/button.js'
import { TAG_COLORS, getTagColor, STATUS_GROUPS } from '@/pages/bases/utils/baseConstants.js'
import { getNextAvailableColor } from '@/pages/bases/utils/baseHelpers.js'
import type { SelectOption, StatusOption } from '@/types/index.js'

interface SelectOptionsEditorProps {
  options: SelectOption[]
  onChange: (options: SelectOption[]) => void
  isStatus?: boolean
}

export function SelectOptionsEditor({ options, onChange, isStatus }: SelectOptionsEditorProps) {
  const [colorPickerIndex, setColorPickerIndex] = useState<number | null>(null)

  function handleLabelChange(index: number, label: string) {
    const updated = [...options]
    updated[index] = { ...updated[index], label, value: label }
    onChange(updated)
  }

  function handleColorChange(index: number, colorName: string) {
    const updated = [...options]
    updated[index] = { ...updated[index], color: colorName }
    onChange(updated)
    setColorPickerIndex(null)
  }

  function handleGroupChange(index: number, group: string) {
    const updated = [...options]
    updated[index] = { ...updated[index], group } as StatusOption
    onChange(updated)
  }

  function handleRemove(index: number) {
    onChange(options.filter((_, i) => i !== index))
    if (colorPickerIndex === index) setColorPickerIndex(null)
  }

  function handleAdd() {
    const usedColors = options.map(o => o.color)
    const nextColor = getNextAvailableColor(usedColors)
    const newOption: SelectOption = { label: '', color: nextColor.name, value: '' }
    if (isStatus) {
      (newOption as StatusOption).group = 'todo'
    }
    onChange([...options, newOption])
  }

  return (
    <div className="space-y-2">
      {options.map((option, index) => {
        const tagColor = getTagColor(option.color)
        const statusOption = option as StatusOption
        return (
          <div key={index} className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  className={`w-6 h-6 rounded-full ${tagColor.dot} shrink-0 cursor-pointer border-2 border-transparent hover:border-text-muted transition-colors`}
                  onClick={() => setColorPickerIndex(colorPickerIndex === index ? null : index)}
                  title="Change color"
                />
                {colorPickerIndex === index && (
                  <div className="absolute left-0 top-8 z-50 bg-bg-elevated border border-border rounded-md shadow-lg p-2 grid grid-cols-3 gap-1.5">
                    {TAG_COLORS.map(c => (
                      <button
                        key={c.name}
                        type="button"
                        className={`w-6 h-6 rounded-full ${c.dot} cursor-pointer border-2 transition-colors ${
                          option.color === c.name ? 'border-white' : 'border-transparent hover:border-text-muted'
                        }`}
                        onClick={() => handleColorChange(index, c.name)}
                        title={c.name}
                      />
                    ))}
                  </div>
                )}
              </div>
              <Input
                className="flex-1 h-8 text-sm"
                value={option.label}
                onChange={e => handleLabelChange(index, e.target.value)}
                placeholder="Option label"
              />
              {isStatus && (
                <select
                  className="h-8 text-xs bg-bg-surface border border-border rounded px-1.5 text-text-secondary"
                  value={statusOption.group || 'todo'}
                  onChange={e => handleGroupChange(index, e.target.value)}
                >
                  {STATUS_GROUPS.map(g => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              )}
              <button
                type="button"
                className="text-text-muted hover:text-red-400 transition-colors shrink-0"
                onClick={() => handleRemove(index)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      })}
      <Button type="button" variant="ghost" size="sm" onClick={handleAdd} className="w-full">
        <Plus className="h-4 w-4 mr-1" />
        Add option
      </Button>
    </div>
  )
}
