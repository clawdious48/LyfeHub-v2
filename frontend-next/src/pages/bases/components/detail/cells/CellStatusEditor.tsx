import { useRef, useEffect } from 'react'
import type { StatusOption } from '@/types/index.js'
import { getTagColor, STATUS_GROUPS } from '@/pages/bases/utils/baseConstants.js'

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

  return (
    <div ref={containerRef} className="relative">
      <div className="absolute z-50 bg-bg-elevated border border-border rounded-md shadow-lg mt-1 min-w-[150px] max-h-[200px] overflow-y-auto">
        {STATUS_GROUPS.map((group) => {
          const groupOptions = options.filter(o => o.group === group.value)
          if (groupOptions.length === 0) return null

          return (
            <div key={group.value}>
              <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-text-muted">
                {group.label}
              </div>
              {groupOptions.map((option) => {
                const tagColor = getTagColor(option.color)
                const isSelected = option.label === value
                return (
                  <div
                    key={option.label}
                    className={`px-3 py-1.5 hover:bg-bg-hover cursor-pointer text-sm flex items-center gap-2 ${isSelected ? 'bg-bg-hover' : ''}`}
                    onClick={() => onSave(option.label)}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${tagColor.dot} flex-shrink-0`}
                    />
                    <span className="text-text-primary">{option.label}</span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
