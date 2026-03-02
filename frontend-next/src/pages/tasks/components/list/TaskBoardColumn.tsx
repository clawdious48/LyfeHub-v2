import { useDroppable, useDraggable } from '@dnd-kit/core'
import { formatDueDate, getPriorityColor } from '@/pages/tasks/utils/taskHelpers.js'
import type { Task } from '@/types/index.js'

interface TaskBoardColumnProps {
  groupKey: string
  label: string
  tasks: Task[]
  onSelectTask: (id: string) => void
}

function DraggableCard({
  task,
  onSelect,
}: {
  task: Task
  onSelect: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  })
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  const dueDateText = formatDueDate(task.due_date)
  const priorityColor = getPriorityColor(task.priority)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onSelect(task.id)}
      className={[
        'bg-bg-surface border border-border rounded-md p-2 cursor-pointer hover:border-text-muted transition-colors',
        isDragging ? 'opacity-50' : '',
      ].join(' ')}
    >
      <div className="flex items-start gap-2">
        <span
          className={[
            'text-sm leading-tight flex-1',
            task.completed ? 'text-text-muted line-through' : 'text-text-primary',
          ].join(' ')}
        >
          {task.title}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        {dueDateText && <span className="text-xs text-text-muted">{dueDateText}</span>}
        {task.priority && (
          <span
            className={`size-2 rounded-full ${priorityColor.replace('text-', 'bg-')}`}
          />
        )}
      </div>
    </div>
  )
}

export function TaskBoardColumn({
  groupKey,
  label,
  tasks,
  onSelectTask,
}: TaskBoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: groupKey })

  return (
    <div
      ref={setNodeRef}
      className={[
        'w-64 shrink-0 flex flex-col bg-bg-surface/50 rounded-lg border transition-colors',
        isOver ? 'border-accent' : 'border-border',
      ].join(' ')}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        <span className="text-xs text-text-muted">{tasks.length}</span>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[100px]">
        {tasks.map((task) => (
          <DraggableCard key={task.id} task={task} onSelect={onSelectTask} />
        ))}
        {tasks.length === 0 && (
          <div className="py-4 text-center text-xs text-text-muted">No tasks</div>
        )}
      </div>
    </div>
  )
}
