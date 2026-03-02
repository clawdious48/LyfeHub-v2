import { useRef, useEffect } from 'react'

interface CellDateEditorProps {
  value: string
  onSave: (val: string) => void
  onCancel: () => void
}

export function CellDateEditor({ value, onSave, onCancel }: CellDateEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  return (
    <input
      ref={inputRef}
      type="date"
      value={value}
      onChange={(e) => onSave(e.target.value)}
      onKeyDown={handleKeyDown}
      className="w-full h-8 px-2 text-sm rounded-md border border-accent bg-bg-elevated text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
    />
  )
}
