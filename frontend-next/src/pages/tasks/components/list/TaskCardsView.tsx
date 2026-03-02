import { useTasksUiStore } from '@/stores/tasksUiStore.js'
import { sortTasks } from '@/pages/tasks/utils/taskHelpers.js'
import { TaskInlineAdd } from './TaskInlineAdd.js'
import { TaskCard } from './TaskCard.js'
import { TaskCompletedSection } from './TaskCompletedSection.js'
import type { TaskRecord } from '@/api/hooks/useTasksAdapter.js'

interface TaskCardsViewProps {
  tasks: TaskRecord[]
  completedTasks: TaskRecord[]
  activeView: string
  activeListId: string | null
  onSelectTask: (id: string) => void
}

const GRID_CLASSES = {
  S: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2',
  M: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3',
  L: 'grid-cols-1 sm:grid-cols-2 gap-4',
} as const

export function TaskCardsView({ tasks, completedTasks, activeView, activeListId, onSelectTask }: TaskCardsViewProps) {
  const { sortBy, cardSize } = useTasksUiStore()
  const sorted = sortTasks(tasks, sortBy)

  return (
    <div className="space-y-4">
      <TaskInlineAdd activeView={activeView} activeListId={activeListId} />

      {sorted.length === 0 && completedTasks.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-text-muted text-sm">No tasks yet. Add one above!</p>
        </div>
      ) : (
        <div className={`grid ${GRID_CLASSES[cardSize]}`}>
          {sorted.map((task) => (
            <TaskCard key={task.id} task={task} size={cardSize} onSelect={onSelectTask} />
          ))}
        </div>
      )}

      <TaskCompletedSection tasks={completedTasks} onSelectTask={onSelectTask} />
    </div>
  )
}
