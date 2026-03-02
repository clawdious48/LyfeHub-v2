import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Check, SkipForward, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button.js'
import { Input } from '@/components/ui/input.js'
import { useToggleTaskComplete, useUpdateTaskRecord, useTaskListOptions } from '@/api/hooks/useTasksAdapter.js'
import { formatDueDate, getPriorityColor } from '@/pages/tasks/utils/taskHelpers.js'
import type { TaskRecord } from '@/api/hooks/useTasksAdapter.js'

interface TaskFocusViewProps {
  tasks: TaskRecord[]
  onSelectTask: (id: string) => void
}

export function TaskFocusView({ tasks, onSelectTask }: TaskFocusViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showReschedule, setShowReschedule] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const toggleTask = useToggleTaskComplete()
  const updateTask = useUpdateTaskRecord()
  const listOptions = useTaskListOptions()

  // Keep index in bounds
  useEffect(() => {
    if (currentIndex >= tasks.length && tasks.length > 0) {
      setCurrentIndex(tasks.length - 1)
    }
  }, [tasks.length, currentIndex])

  const goNext = useCallback(() => {
    if (tasks.length === 0) return
    setCurrentIndex(prev => (prev + 1) % tasks.length)
    setShowReschedule(false)
  }, [tasks.length])

  const goPrev = useCallback(() => {
    if (tasks.length === 0) return
    setCurrentIndex(prev => (prev - 1 + tasks.length) % tasks.length)
    setShowReschedule(false)
  }, [tasks.length])

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext, goPrev])

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-lg text-text-muted">All clear! Nothing to focus on.</p>
      </div>
    )
  }

  const task = tasks[currentIndex]
  if (!task) return null

  const dueDateText = formatDueDate(task.due_date)
  const priorityColor = getPriorityColor(task.priority)
  const listName = task.list_id ? listOptions.find(o => (o.value || o.label) === task.list_id)?.label : null

  function handleDone() {
    toggleTask.mutate({ id: task.id, currentValue: task.completed })
    goNext()
  }

  function handleReschedule() {
    if (!rescheduleDate) return
    updateTask.mutate({ id: task.id, due_date: rescheduleDate })
    setShowReschedule(false)
    setRescheduleDate('')
    goNext()
  }

  return (
    <div className="flex flex-col items-center py-8">
      {/* Navigation arrows + card */}
      <div className="flex items-center gap-6 w-full max-w-lg">
        <button
          onClick={goPrev}
          className="text-text-muted hover:text-text-primary transition-colors shrink-0"
        >
          <ChevronLeft className="size-8" />
        </button>

        {/* Main card */}
        <div
          className="flex-1 bg-bg-surface border border-border rounded-xl p-6 space-y-4 cursor-pointer"
          onClick={() => onSelectTask(task.id)}
        >
          {/* Title */}
          <h2 className="text-xl font-semibold text-text-primary">{task.title}</h2>

          {/* Metadata */}
          <div className="flex items-center gap-3 flex-wrap">
            {dueDateText && (
              <span className="text-sm text-text-muted">{dueDateText}</span>
            )}
            {task.priority && (
              <span className={[
                'text-xs px-2 py-0.5 rounded-full border border-current',
                priorityColor,
              ].join(' ')}>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </span>
            )}
            {listName && (
              <span className="text-xs text-text-muted bg-bg-hover rounded px-2 py-0.5">
                {listName}
              </span>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-sm text-text-secondary">{task.description}</p>
          )}

        </div>

        <button
          onClick={goNext}
          className="text-text-muted hover:text-text-primary transition-colors shrink-0"
        >
          <ChevronRight className="size-8" />
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 mt-6">
        <Button onClick={handleDone} className="bg-green-600 hover:bg-green-700 text-white">
          <Check className="size-4 mr-1.5" />
          Done
        </Button>
        <Button variant="outline" onClick={goNext}>
          <SkipForward className="size-4 mr-1.5" />
          Skip
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowReschedule(!showReschedule)}
          className="text-blue-400 border-blue-400/30 hover:bg-blue-400/10"
        >
          <CalendarDays className="size-4 mr-1.5" />
          Reschedule
        </Button>
      </div>

      {/* Reschedule popover */}
      {showReschedule && (
        <div className="flex items-center gap-2 mt-3 bg-bg-surface border border-border rounded-lg p-2">
          <Input
            type="date"
            value={rescheduleDate}
            onChange={(e) => setRescheduleDate(e.target.value)}
            className="text-sm"
          />
          <Button size="sm" onClick={handleReschedule} disabled={!rescheduleDate}>
            Save
          </Button>
        </div>
      )}

      {/* Counter */}
      <div className="mt-4 text-sm text-text-muted">
        {currentIndex + 1} of {tasks.length} tasks
      </div>
    </div>
  )
}
