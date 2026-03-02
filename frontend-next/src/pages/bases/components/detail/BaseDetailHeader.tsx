import { useState, useRef, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button.js'
import { Input } from '@/components/ui/input.js'
import { useUpdateBase } from '@/api/hooks/index.js'
import type { Base } from '@/types/index.js'

interface BaseDetailHeaderProps {
  base: Base
  onBack: () => void
}

export function BaseDetailHeader({ base, onBack }: BaseDetailHeaderProps) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(base.name)
  const inputRef = useRef<HTMLInputElement>(null)
  const updateBase = useUpdateBase()

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function startEditing() {
    setEditName(base.name)
    setEditing(true)
  }

  function saveName() {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== base.name) {
      updateBase.mutate({ id: base.id, name: trimmed })
    }
    setEditing(false)
  }

  function cancelEditing() {
    setEditName(base.name)
    setEditing(false)
  }

  return (
    <div className="flex items-start gap-3 mb-6">
      <Button variant="ghost" size="icon-sm" onClick={onBack} className="mt-1">
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {base.icon && (
            <span className="text-xl">{base.icon}</span>
          )}
          {editing ? (
            <Input
              ref={inputRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveName()
                if (e.key === 'Escape') cancelEditing()
              }}
              className="text-xl font-heading h-auto py-0.5 px-1"
            />
          ) : (
            <h1
              className="text-xl font-heading text-text-primary cursor-pointer hover:text-text-secondary transition-colors"
              onDoubleClick={startEditing}
            >
              {base.name}
            </h1>
          )}
        </div>
        {base.description && (
          <p className="text-sm text-text-secondary mt-1">{base.description}</p>
        )}
      </div>
    </div>
  )
}
