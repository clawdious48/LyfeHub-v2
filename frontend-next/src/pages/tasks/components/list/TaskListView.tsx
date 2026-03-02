import { useTasksUiStore } from '@/stores/tasksUiStore.js'
import { sortTasks } from '@/pages/tasks/utils/taskHelpers.js'
import { TaskInlineAdd } from './TaskInlineAdd.js'
import { TaskRow } from './TaskRow.js'
import { TaskCompletedSection } from './TaskCompletedSection.js'
import type { TaskRecord } from '@/api/hooks/useTasksAdapter.js'

interface TaskListViewProps {
  tasks: TaskRecord[]
  completedTasks: TaskRecord[]
  activeView: string
  activeListId: string | null
  onSelectTask: (id: string) => void
}

export function TaskListView({ tasks, completedTasks, activeView, activeListId, onSelectTask }: TaskListViewProps) {
  const { sortBy } = useTasksUiStore()
  const sorted = sortTasks(tasks, sortBy)

  return (
    <div className="space-y-2">
      <TaskInlineAdd activeView={activeView} activeListId={activeListId} />

      {sorted.length === 0 && completedTasks.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-text-muted text-sm">No tasks yet. Add one above!</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {sorted.map((task) => (
            <TaskRow key={task.id} task={task} onSelect={onSelectTask} />
          ))}
        </div>
      )}

      <TaskCompletedSection tasks={completedTasks} onSelectTask={onSelectTask} />
    </div>
  )
}
