import { useMemo } from 'react'
import { CheckSquare, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTasks } from '@/api/hooks'

const MAX_VISIBLE = 5

export default function MyDayWidget({ config: _config }: { config?: Record<string, unknown> }) {
  const { data: tasks, isLoading } = useTasks()

  const todayTasks = useMemo(() => {
    if (!tasks) return []
    const today = new Date().toISOString().split('T')[0]
    return tasks.filter(
      (t) => t.due_date?.startsWith(today) || t.my_day === 1,
    )
  }, [tasks])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-text-muted text-sm">Loading...</p>
      </div>
    )
  }

  if (todayTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <p className="text-text-secondary text-sm">No tasks or events today</p>
        <Button variant="outline" size="sm" className="text-accent border-accent">
          <Plus className="size-3.5" />
          Add Task
        </Button>
      </div>
    )
  }

  const visible = todayTasks.slice(0, MAX_VISIBLE)
  const remaining = todayTasks.length - MAX_VISIBLE

  return (
    <div className="flex flex-col gap-1">
      {visible.map((task) => (
        <div
          key={task.id}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-bg-hover transition-colors"
        >
          <CheckSquare
            className={`size-4 shrink-0 ${
              task.completed ? 'text-success' : 'text-text-muted'
            }`}
          />
          <span
            className={`text-sm truncate ${
              task.completed
                ? 'text-text-muted line-through'
                : 'text-text-primary'
            }`}
          >
            {task.title}
          </span>
          {task.due_time && (
            <span className="text-xs text-text-muted ml-auto shrink-0">
              {task.due_time}
            </span>
          )}
        </div>
      ))}
      {remaining > 0 && (
        <p className="text-xs text-text-muted px-2 pt-1">
          and {remaining} more
        </p>
      )}
    </div>
  )
}
