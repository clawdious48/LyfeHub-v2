import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { useTasksUiStore } from '@/stores/tasksUiStore.js'
import { useUpdateTask } from '@/api/hooks/index.js'
import { groupTasksBy } from '@/pages/tasks/utils/taskHelpers.js'
import { TaskBoardColumn } from './TaskBoardColumn.js'
import type { Task, TaskList } from '@/types/index.js'

interface TaskBoardViewProps {
  tasks: Task[]
  lists: TaskList[]
  onSelectTask: (id: string) => void
}

export function TaskBoardView({ tasks, lists, onSelectTask }: TaskBoardViewProps) {
  const { boardGroupBy } = useTasksUiStore()
  const updateTask = useUpdateTask()
  const groups = groupTasksBy(tasks, boardGroupBy, lists)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || !active) return

    const taskId = String(active.id)
    const targetColumnKey = String(over.id)

    // Find which column the task is currently in
    const currentGroup = groups.find((g) => g.tasks.some((t) => t.id === taskId))
    if (!currentGroup || currentGroup.key === targetColumnKey) return

    // Map the column key to the appropriate field update
    const fieldKey = boardGroupBy === 'list' ? 'list_id' : boardGroupBy
    const newValue = targetColumnKey === 'none' ? null : targetColumnKey

    updateTask.mutate({ id: taskId, [fieldKey]: newValue })
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {groups.map((group) => (
          <TaskBoardColumn
            key={group.key}
            groupKey={group.key}
            label={group.label}
            tasks={group.tasks}
            onSelectTask={onSelectTask}
          />
        ))}
      </div>
    </DndContext>
  )
}
