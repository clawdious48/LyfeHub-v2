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
    // Move cursor to end
    const len = textareaRef.current?.value.length ?? 0
    textareaRef.current?.setSelectionRange(len, len)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
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
      className="w-full border-accent text-sm min-h-[80px] resize-y"
      placeholder="Enter text..."
    />
  )
}
