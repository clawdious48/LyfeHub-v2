import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input.js'

interface CellNumberEditorProps {
  value: number | null
  onSave: (val: number | null) => void
  onCancel: () => void
}

export function CellNumberEditor({ value, onSave, onCancel }: CellNumberEditorProps) {
  const [editValue, setEditValue] = useState(value != null ? String(value) : '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  function handleSave() {
    onSave(editValue === '' ? null : Number(editValue))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  return (
    <Input
      ref={inputRef}
      type="number"
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleSave}
      className="w-full border-accent h-8 text-sm"
    />
  )
}
