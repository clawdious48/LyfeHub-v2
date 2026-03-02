import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input.js'

interface CellEmailEditorProps {
  value: string
  onSave: (val: string) => void
  onCancel: () => void
}

export function CellEmailEditor({ value, onSave, onCancel }: CellEmailEditorProps) {
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      onSave(editValue)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  return (
    <Input
      ref={inputRef}
      type="email"
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onSave(editValue)}
      placeholder="email@example.com"
      className="w-full border-accent h-8 text-sm"
    />
  )
}
