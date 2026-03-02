import { useSearchParams } from 'react-router-dom'
import { useTasks } from '@/api/hooks/index.js'
import { useTaskLists } from '@/api/hooks/useTaskLists.js'
import { useTasksUiStore } from '@/stores/tasksUiStore.js'
import { TaskToolbar } from './tasks/components/list/TaskToolbar.js'
import { TaskListView } from './tasks/components/list/TaskListView.js'
import { TaskCardsView } from './tasks/components/list/TaskCardsView.js'
import { TaskBoardView } from './tasks/components/list/TaskBoardView.js'
import { TaskFocusView } from './tasks/components/list/TaskFocusView.js'
import { TaskDetailModal } from './tasks/components/modals/TaskDetailModal.js'

export default function TasksPage() {
  const [searchParams] = useSearchParams()
  const view = searchParams.get('view') ?? 'my-day'
  const listId = view.startsWith('list:') ? view.slice(5) : null

  const { data: tasks = [], isLoading } = useTasks(view)
  const { data: lists = [] } = useTaskLists()
  const {
    displayMode,
    selectedTaskId, setSelectedTaskId,
    createModalOpen, setCreateModalOpen,
  } = useTasksUiStore()

  const activeTasks = tasks.filter(t => !t.completed)
  const completedTasks = tasks.filter(t => !!t.completed)

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-text-secondary text-sm">Loading tasks...</p>
      </div>
    )
  }

  const viewProps = {
    tasks: activeTasks,
    completedTasks,
    activeView: view,
    activeListId: listId,
    onSelectTask: setSelectedTaskId,
  }

  return (
    <div className="p-6 space-y-4">
      <TaskToolbar
        activeView={view}
        onCreateTask={() => setCreateModalOpen(true)}
      />

      {displayMode === 'list' && <TaskListView {...viewProps} />}
      {displayMode === 'cards' && <TaskCardsView {...viewProps} />}
      {displayMode === 'board' && (
        <TaskBoardView
          tasks={activeTasks}
          lists={lists}
          onSelectTask={setSelectedTaskId}
        />
      )}
      {displayMode === 'focus' && (
        <TaskFocusView
          tasks={activeTasks}
          onSelectTask={setSelectedTaskId}
        />
      )}

      <TaskDetailModal
        taskId={selectedTaskId ?? undefined}
        open={!!selectedTaskId || createModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTaskId(null)
            setCreateModalOpen(false)
          }
        }}
      />
    </div>
  )
}
