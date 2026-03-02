import { useState } from 'react'
import { ChevronDown, ChevronRight, Check } from 'lucide-react'
import { useToggleTask } from '@/api/hooks/index.js'
import type { Task } from '@/types/index.js'

interface TaskCompletedSectionProps {
  tasks: Task[]
  onSelectTask: (id: string) => void
}

export function TaskCompletedSection({ tasks, onSelectTask }: TaskCompletedSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const toggleTask = useToggleTask()

  if (tasks.length === 0) return null

  return (
    <div className="mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text-secondary transition-colors w-full"
      >
        {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        <span>Completed ({tasks.length})</span>
      </button>

      {expanded && (
        <div className="space-y-0.5 mt-1">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-bg-hover cursor-pointer group"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleTask.mutate(task.id)
                }}
                className="size-5 rounded-full border-2 border-accent bg-accent flex items-center justify-center shrink-0"
              >
                <Check className="size-3 text-white" />
              </button>
              <span
                onClick={() => onSelectTask(task.id)}
                className="flex-1 text-sm text-text-muted line-through cursor-pointer"
              >
                {task.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
