import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input.js'

interface CellTextEditorProps {
  value: string
  onSave: (val: string) => void
  onCancel: () => void
}

export function CellTextEditor({ value, onSave, onCancel }: CellTextEditorProps) {
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
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onSave(editValue)}
      className="w-full border-accent h-8 text-sm"
    />
  )
}
