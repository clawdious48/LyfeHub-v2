import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input.js'

interface CellPhoneEditorProps {
  value: string
  onSave: (val: string) => void
  onCancel: () => void
}

export function CellPhoneEditor({ value, onSave, onCancel }: CellPhoneEditorProps) {
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
      type="tel"
      placeholder="(555) 123-4567"
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onSave(editValue)}
      className="w-full border-accent h-8 text-sm"
    />
  )
}
