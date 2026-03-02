import { Check, Star } from 'lucide-react'
import { useToggleTask, useToggleImportant } from '@/api/hooks/index.js'
import { formatDueDate, isOverdue, getPriorityColor } from '@/pages/tasks/utils/taskHelpers.js'
import type { Task } from '@/types/index.js'

interface TaskRowProps {
  task: Task
  onSelect: (id: string) => void
}

export function TaskRow({ task, onSelect }: TaskRowProps) {
  const toggleTask = useToggleTask()
  const toggleImportant = useToggleImportant()

  const dueDateText = formatDueDate(task.due_date)
  const overdue = isOverdue(task)
  const priorityColor = getPriorityColor(task.priority)

  return (
    <div
      className="flex items-center gap-3 px-3 py-2 hover:bg-bg-hover rounded-lg cursor-pointer group"
      onClick={() => onSelect(task.id)}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          toggleTask.mutate(task.id)
        }}
        className={[
          'size-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
          task.completed ? 'border-accent bg-accent' : 'border-border hover:border-accent',
        ].join(' ')}
      >
        {task.completed ? <Check className="size-3 text-white" /> : null}
      </button>

      {/* Title */}
      <span className={[
        'flex-1 text-sm truncate',
        task.completed ? 'text-text-muted line-through' : 'text-text-primary',
      ].join(' ')}>
        {task.title}
      </span>

      {/* Due date badge */}
      {dueDateText && (
        <span className={[
          'text-xs shrink-0',
          overdue ? 'text-amber-400' : 'text-text-muted',
        ].join(' ')}>
          {dueDateText}
        </span>
      )}

      {/* Priority dot */}
      {task.priority && (
        <span className={`size-2 rounded-full shrink-0 ${priorityColor.replace('text-', 'bg-')}`} />
      )}

      {/* Star toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          toggleImportant.mutate({ id: task.id, currentValue: task.important })
        }}
        className={[
          'shrink-0 transition-colors',
          task.important ? 'text-accent' : 'text-text-muted opacity-0 group-hover:opacity-100 hover:text-accent',
        ].join(' ')}
      >
        <Star className="size-4" fill={task.important ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
}
