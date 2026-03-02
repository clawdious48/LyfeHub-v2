import { useState, useRef, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea.js'

interface CellRichTextEditorProps {
  value: string
  onSave: (val: string) => void
  onCancel: () => void
}

export function CellRichTextEditor({ value, onSave, onCancel }: CellRichTextEditorProps) {
  const [editValue, setEditValue] = useState(value)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
    textareaRef.current?.select()
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      onSave(editValue)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  return (
    <Textarea
      ref={textareaRef}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onSave(editValue)}
      placeholder="Enter text... (Ctrl+Enter to save)"
      className="w-full border-accent min-h-[80px] resize-y text-sm"
    />
  )
}
