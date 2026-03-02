import { useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { useCreateTaskRecord } from '@/api/hooks/useTasksAdapter.js'

interface TaskInlineAddProps {
  activeView: string
  activeListId: string | null
}

export function TaskInlineAdd({ activeView, activeListId }: TaskInlineAddProps) {
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const createTask = useCreateTaskRecord()

  function handleSubmit() {
    const trimmed = title.trim()
    if (!trimmed) return

    // Context-aware defaults
    const defaults: Record<string, unknown> = {}
    if (activeView === 'my-day') defaults.my_day = 1
    if (activeView === 'important') defaults.important = 1
    if (activeListId) defaults.list_id = activeListId

    createTask.mutate({ title: trimmed, ...defaults })
    setTitle('')
    inputRef.current?.focus()
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-bg-surface border border-border rounded-lg">
      <Plus className="size-4 text-text-muted shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleSubmit()
          }
        }}
        placeholder="Add a task..."
        className="flex-1 bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-muted"
      />
    </div>
  )
}
