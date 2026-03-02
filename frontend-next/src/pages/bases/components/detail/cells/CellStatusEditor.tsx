import { useRef, useEffect } from 'react'
import type { StatusOption } from '@/types/index.js'
import { getTagColor, STATUS_GROUPS } from '@/pages/bases/utils/baseConstants.js'
import { cn } from '@/lib/utils.js'

interface CellStatusEditorProps {
  value: string
  options: StatusOption[]
  onSave: (val: string) => void
  onCancel: () => void
}

export function CellStatusEditor({ value, options, onSave, onCancel }: CellStatusEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onCancel()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onCancel])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCancel()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  // Group options by their status group
  const groupedOptions = STATUS_GROUPS.map(group => ({
    ...group,
    options: options.filter(o => o.group === group.value),
  })).filter(g => g.options.length > 0)

  return (
    <div ref={containerRef} className="relative">
      <div className="absolute z-50 bg-bg-elevated border border-border rounded-md shadow-lg mt-1 min-w-[150px] max-h-[250px] overflow-y-auto">
        {groupedOptions.map((group) => (
          <div key={group.value}>
            <div className="px-3 py-1 text-xs text-text-muted font-medium uppercase tracking-wider">
              {group.label}
            </div>
            {group.options.map((option) => {
              const tagColor = getTagColor(option.color)
              const isSelected = option.label === value
              return (
                <div
                  key={option.label}
                  className={cn(
                    'px-3 py-1.5 hover:bg-bg-hover cursor-pointer text-sm flex items-center gap-2',
                    isSelected && 'bg-bg-hover'
                  )}
                  onClick={() => onSave(option.label)}
                >
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      tagColor.dot
                    )}
                  />
                  <span className="text-text-primary">{option.label}</span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
