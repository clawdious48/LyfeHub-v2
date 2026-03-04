import { useState, useEffect, useMemo } from 'react'
import {
  Dialog, DialogContent,
} from '@/components/ui/dialog.js'
import { Button } from '@/components/ui/button.js'
import { Input } from '@/components/ui/input.js'
import { Textarea } from '@/components/ui/textarea.js'
import {
  Star, ChevronDown, ChevronRight, Trash2, Plus, Check,
} from 'lucide-react'
import {
  useTaskRecord,
  useTaskBase,
  useCreateTaskRecord,
  useUpdateTaskRecord,
  useDeleteTaskRecord,
  useToggleTaskComplete,
  useTaskListOptions,
} from '@/api/hooks/useTasksAdapter.js'
import { useTasksUiStore } from '@/stores/tasksUiStore.js'
import { PRIORITY_OPTIONS, ENERGY_OPTIONS, LOCATION_OPTIONS, RECURRING_OPTIONS } from '@/pages/tasks/utils/taskConstants.js'

interface TaskDetailModalProps {
  taskId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TaskDetailModal({ taskId, open, onOpenChange }: TaskDetailModalProps) {
  const isEditing = !!taskId
  const existingTask = useTaskRecord(taskId ?? '')
  const { records: allTasks } = useTaskBase()
  const listOptions = useTaskListOptions()
  const createTask = useCreateTaskRecord()
  const updateTask = useUpdateTaskRecord()
  const deleteTask = useDeleteTaskRecord()
  const toggleTask = useToggleTaskComplete()
  const { moreOptionsExpanded, setMoreOptionsExpanded } = useTasksUiStore()

  // Subtask state
  const [newSubtask, setNewSubtask] = useState('')
  const [pendingSubtasks, setPendingSubtasks] = useState<string[]>([]) // create mode only

  // Resolve subtasks from the parent's subtask_ids (edit mode)
  const subtasks = useMemo(() => {
    if (!existingTask?.subtask_ids?.length || !allTasks.length) return []
    const idSet = new Set(existingTask.subtask_ids)
    return allTasks.filter(t => idSet.has(t.id))
  }, [existingTask?.subtask_ids, allTasks])

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [dueTimeEnd, setDueTimeEnd] = useState('')
  const [priority, setPriority] = useState<string | null>(null)
  const [listId, setListId] = useState<string | null>(null)
  const [myDay, setMyDay] = useState(false)
  const [important, setImportant] = useState(false)
  const [recurring, setRecurring] = useState<string | null>(null)
  const [recurringDays, setRecurringDays] = useState<string[]>([])
  const [energy, setEnergy] = useState<string | null>(null)
  const [location, setLocation] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  // Populate form from existing task
  useEffect(() => {
    if (existingTask && isEditing) {
      setTitle(existingTask.title || '')
      setDescription(existingTask.description || '')
      setDueDate(existingTask.due_date || '')
      setDueTime(existingTask.due_time || '')
      setDueTimeEnd(existingTask.due_time_end || '')
      setPriority(existingTask.priority)
      setListId(existingTask.list_id)
      setMyDay(!!existingTask.my_day)
      setImportant(!!existingTask.important)
      setRecurring(existingTask.recurring)
      setRecurringDays(existingTask.recurring_days || [])
      setEnergy(existingTask.energy)
      setLocation(existingTask.location)
    } else if (!isEditing) {
      // Reset form for create mode
      setTitle('')
      setDescription('')
      setDueDate('')
      setDueTime('')
      setDueTimeEnd('')
      setPriority(null)
      setListId(null)
      setMyDay(false)
      setImportant(false)
      setRecurring(null)
      setRecurringDays([])
      setEnergy(null)
      setLocation(null)
      setDeleteConfirm(false)
      setNewSubtask('')
      setPendingSubtasks([])
    }
  }, [existingTask, isEditing, open])

  function handleSave() {
    if (!title.trim()) return

    const data = {
      title: title.trim(),
      description: description.trim(),
      due_date: dueDate || null,
      due_time: dueTime || null,
      due_time_end: dueTimeEnd || null,
      priority,
      list_id: listId,
      my_day: myDay,
      important: important,
      recurring,
      recurring_days: recurringDays,
      energy,
      location,
    }

    if (isEditing && taskId) {
      updateTask.mutate({ id: taskId, ...data })
    } else {
      createTask.mutate({ ...data, title: title.trim() }, {
        onSuccess: (newRecord) => {
          // Create pending subtasks after parent is saved
          for (const sub of pendingSubtasks) {
            createTask.mutate({
              title: sub,
              parent_task_id: newRecord.id,
            })
          }
        },
      })
    }
    onOpenChange(false)
  }

  function handleDelete() {
    if (!taskId) return
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }
    deleteTask.mutate(taskId)
    onOpenChange(false)
  }

  function handleAddSubtask() {
    if (!newSubtask.trim()) return
    if (isEditing && taskId) {
      // Edit mode: create subtask record immediately
      createTask.mutate({
        title: newSubtask.trim(),
        parent_task_id: taskId,
      })
    } else {
      // Create mode: queue subtask for after parent is saved
      setPendingSubtasks(prev => [...prev, newSubtask.trim()])
    }
    setNewSubtask('')
  }

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-3">
          {isEditing && (
            <button
              onClick={() => toggleTask.mutate({ id: taskId!, currentValue: !!existingTask?.completed })}
              className={[
                'size-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                existingTask?.completed ? 'border-accent bg-accent' : 'border-border hover:border-accent',
              ].join(' ')}
            >
              {existingTask?.completed ? <span className="text-white text-xs">&#10003;</span> : null}
            </button>
          )}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title..."
            autoFocus
            className="flex-1 text-lg font-medium bg-transparent border-none outline-none text-text-primary placeholder:text-text-muted"
          />
          <button
            onClick={() => setImportant(!important)}
            className={`p-1 transition-colors ${important ? 'text-accent' : 'text-text-muted hover:text-accent'}`}
          >
            <Star className="size-5" fill={important ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Body: Two columns */}
        <div className="flex flex-col sm:flex-row gap-6 px-6 pb-4">
          {/* Left Column — Content (55%) */}
          <div className="sm:w-[55%] space-y-4">
            {/* Description */}
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add description..."
                rows={4}
                className="mt-1 bg-bg-surface border-border text-sm resize-none"
              />
            </div>

            {/* Subtasks — works in both create and edit modes */}
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Sub-tasks{isEditing && subtasks.length > 0 && ` (${subtasks.filter(s => s.completed).length}/${subtasks.length})`}
                {!isEditing && pendingSubtasks.length > 0 && ` (${pendingSubtasks.length})`}
              </label>

              {/* Subtask progress bar (edit mode only) */}
              {isEditing && subtasks.length > 0 && (
                <div className="h-1 bg-bg-hover rounded-full overflow-hidden mt-2 mb-1">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${(subtasks.filter(s => s.completed).length / subtasks.length) * 100}%` }}
                  />
                </div>
              )}

              {/* Subtask list (edit mode — saved subtasks from DB) */}
              {isEditing && subtasks.length > 0 && (
                <div className="space-y-0.5 mt-1">
                  {subtasks.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-bg-hover transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => toggleTask.mutate({ id: sub.id, currentValue: sub.completed })}
                        className={[
                          'size-4 shrink-0 rounded border flex items-center justify-center transition-colors',
                          sub.completed
                            ? 'bg-accent border-accent text-white'
                            : 'border-text-muted hover:border-accent',
                        ].join(' ')}
                      >
                        {sub.completed && <Check className="size-2.5" />}
                      </button>
                      <span
                        className={[
                          'text-sm truncate flex-1',
                          sub.completed ? 'text-text-muted line-through' : 'text-text-primary',
                        ].join(' ')}
                      >
                        {sub.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending subtask list (create mode — queued, not yet saved) */}
              {!isEditing && pendingSubtasks.length > 0 && (
                <div className="space-y-0.5 mt-1">
                  {pendingSubtasks.map((sub, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-bg-hover transition-colors"
                    >
                      <div className="size-4 shrink-0 rounded border border-text-muted" />
                      <span className="text-sm truncate flex-1 text-text-primary">{sub}</span>
                      <button
                        type="button"
                        onClick={() => setPendingSubtasks(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-text-muted hover:text-red-400 text-xs"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Rapid-entry subtask input — always visible */}
              <div className="flex items-center gap-2 px-2 py-1.5 mt-0.5">
                <Plus className="size-4 shrink-0 text-text-muted" />
                <input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask() }
                  }}
                  placeholder="Add a subtask..."
                  className="flex-1 text-sm bg-transparent border-none outline-none text-text-primary placeholder:text-text-muted"
                />
              </div>
            </div>

          </div>

          {/* Right Column — Metadata (45%) */}
          <div className="sm:w-[45%] space-y-4">
            {/* When */}
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider">When</label>
              <div className="mt-1 space-y-2">
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="text-sm" />
                <div className="flex gap-2">
                  <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className="text-sm flex-1" placeholder="Start" />
                  <Input type="time" value={dueTimeEnd} onChange={(e) => setDueTimeEnd(e.target.value)} className="text-sm flex-1" placeholder="End" />
                </div>
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Priority</label>
              <div className="flex gap-1 mt-1">
                {PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setPriority(opt.value)}
                    className={[
                      'px-3 py-1 text-xs rounded-full border transition-colors',
                      priority === opt.value
                        ? 'border-accent bg-accent-light text-accent'
                        : 'border-border text-text-secondary hover:border-text-muted',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider">List</label>
              <select
                value={listId ?? ''}
                onChange={(e) => setListId(e.target.value || null)}
                className="mt-1 w-full text-sm bg-bg-surface border border-border rounded-md px-2 py-1.5 text-text-primary"
              >
                <option value="">None</option>
                {listOptions.map((opt) => (
                  <option key={opt.value || opt.label} value={opt.value || opt.label}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* My Day */}
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider">My Day</label>
              <button
                onClick={() => setMyDay(!myDay)}
                className={[
                  'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                  myDay ? 'bg-accent' : 'bg-bg-hover',
                ].join(' ')}
              >
                <span className={[
                  'inline-block size-3.5 rounded-full bg-white transition-transform',
                  myDay ? 'translate-x-4.5' : 'translate-x-0.5',
                ].join(' ')} />
              </button>
            </div>

            {/* More Options */}
            <button
              onClick={() => setMoreOptionsExpanded(!moreOptionsExpanded)}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              {moreOptionsExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
              More Options
            </button>

            {moreOptionsExpanded && (
              <div className="space-y-4">
                {/* Recurring */}
                <div>
                  <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Recurring</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {RECURRING_OPTIONS.map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => setRecurring(opt.value)}
                        className={[
                          'px-2 py-0.5 text-xs rounded-full border transition-colors',
                          recurring === opt.value
                            ? 'border-accent bg-accent-light text-accent'
                            : 'border-border text-text-secondary hover:border-text-muted',
                        ].join(' ')}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {(recurring === 'weekly' || recurring === 'biweekly') && (
                    <div className="flex gap-1 mt-2">
                      {DAYS.map((day) => (
                        <button
                          key={day}
                          onClick={() => {
                            setRecurringDays(prev =>
                              prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
                            )
                          }}
                          className={[
                            'size-7 rounded-full text-xs font-medium flex items-center justify-center transition-colors',
                            recurringDays.includes(day)
                              ? 'bg-accent text-white'
                              : 'border border-border text-text-muted hover:border-accent',
                          ].join(' ')}
                        >
                          {day.charAt(0)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Energy */}
                <div>
                  <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Energy</label>
                  <div className="flex gap-1 mt-1">
                    {ENERGY_OPTIONS.map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => setEnergy(opt.value)}
                        className={[
                          'px-3 py-1 text-xs rounded-full border transition-colors',
                          energy === opt.value
                            ? 'border-accent bg-accent-light text-accent'
                            : 'border-border text-text-secondary hover:border-text-muted',
                        ].join(' ')}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Location</label>
                  <div className="flex gap-1 mt-1">
                    {LOCATION_OPTIONS.map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => setLocation(opt.value)}
                        className={[
                          'px-3 py-1 text-xs rounded-full border transition-colors',
                          location === opt.value
                            ? 'border-accent bg-accent-light text-accent'
                            : 'border-border text-text-secondary hover:border-text-muted',
                        ].join(' ')}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Relations (placeholder) */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-text-muted uppercase tracking-wider">People</label>
                  <button className="text-xs text-accent hover:text-accent/80">+ Add</button>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Projects</label>
                  <button className="text-xs text-accent hover:text-accent/80">+ Add</button>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Notes</label>
                  <button className="text-xs text-accent hover:text-accent/80">+ Add</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border">
          <div>
            {isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className={deleteConfirm ? 'text-red-500 hover:text-red-400' : 'text-text-muted hover:text-red-400'}
              >
                <Trash2 className="size-4 mr-1" />
                {deleteConfirm ? 'Click again to confirm' : 'Delete'}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isEditing && existingTask && (
              <span className="text-xs text-text-muted">
                Created {new Date(existingTask.createdAt).toLocaleDateString()}
              </span>
            )}
            <Button onClick={handleSave} disabled={!title.trim()} size="sm">
              {isEditing ? 'Save' : 'Create Task'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
