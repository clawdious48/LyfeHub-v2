import { Check, Star } from 'lucide-react'
import { useToggleTaskComplete, useToggleTaskImportant, useTaskListOptions } from '@/api/hooks/useTasksAdapter.js'
import { formatDueDate, isOverdue, getPriorityColor, getSubtaskProgress } from '@/pages/tasks/utils/taskHelpers.js'
import type { TaskRecord } from '@/api/hooks/useTasksAdapter.js'

interface TaskCardProps {
  task: TaskRecord
  size: 'S' | 'M' | 'L'
  onSelect: (id: string) => void
}

export function TaskCard({ task, size, onSelect }: TaskCardProps) {
  const toggleTask = useToggleTaskComplete()
  const toggleImportant = useToggleTaskImportant()
  const listOptions = useTaskListOptions()

  const dueDateText = formatDueDate(task.due_date)
  const overdue = isOverdue(task)
  const priorityColor = getPriorityColor(task.priority)
  const subtaskProgress = getSubtaskProgress(task)
  const listName = task.list_id ? listOptions.find(o => (o.value || o.label) === task.list_id)?.label : null

  return (
    <div
      onClick={() => onSelect(task.id)}
      className={[
        'bg-bg-surface border border-border rounded-lg cursor-pointer hover:border-text-muted transition-colors relative group',
        size === 'S' ? 'p-2' : 'p-3',
      ].join(' ')}
    >
      {/* Star in top-right */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          toggleImportant.mutate({ id: task.id, currentValue: !!task.important })
        }}
        className={[
          'absolute top-2 right-2 transition-colors',
          task.important ? 'text-accent' : 'text-text-muted opacity-0 group-hover:opacity-100 hover:text-accent',
        ].join(' ')}
      >
        <Star className="size-3.5" fill={task.important ? 'currentColor' : 'none'} />
      </button>

      {/* Checkbox + title row */}
      <div className="flex items-start gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleTask.mutate({ id: task.id, currentValue: task.completed })
          }}
          className={[
            'size-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors',
            task.completed ? 'border-accent bg-accent' : 'border-border hover:border-accent',
          ].join(' ')}
        >
          {task.completed ? <Check className="size-2.5 text-white" /> : null}
        </button>
        <span className={[
          'text-sm font-medium leading-tight pr-5',
          task.completed ? 'text-text-muted line-through' : 'text-text-primary',
        ].join(' ')}>
          {task.title}
        </span>
      </div>

      {/* Medium: due date, priority badge, subtask progress */}
      {(size === 'M' || size === 'L') && (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {dueDateText && (
            <span className={['text-xs', overdue ? 'text-amber-400' : 'text-text-muted'].join(' ')}>
              {dueDateText}
            </span>
          )}
          {task.priority && (
            <span className={[
              'text-xs px-1.5 py-0.5 rounded-full border border-current',
              priorityColor,
            ].join(' ')}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </span>
          )}
          {subtaskProgress && (
            <span className="text-xs text-text-muted">
              {subtaskProgress.done}/{subtaskProgress.total}
            </span>
          )}
        </div>
      )}

      {/* Large: description preview + list badge */}
      {size === 'L' && (
        <>
          {task.description && (
            <p className="text-xs text-text-muted mt-2 line-clamp-2">
              {task.description}
            </p>
          )}
          {listName && (
            <span className="inline-block text-xs text-text-muted bg-bg-hover rounded px-1.5 py-0.5 mt-2">
              {listName}
            </span>
          )}
        </>
      )}
    </div>
  )
}
