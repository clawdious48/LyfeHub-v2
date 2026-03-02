import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent,
} from '@/components/ui/dialog.js'
import { Button } from '@/components/ui/button.js'
import { Input } from '@/components/ui/input.js'
import { Textarea } from '@/components/ui/textarea.js'
import {
  Star, ChevronDown, ChevronRight, Plus, Trash2,
} from 'lucide-react'
import { useTask, useCreateTask, useUpdateTask, useDeleteTask, useToggleTask } from '@/api/hooks/index.js'
import { useTaskLists } from '@/api/hooks/useTaskLists.js'
import { useTasksUiStore } from '@/stores/tasksUiStore.js'
import { PRIORITY_OPTIONS, ENERGY_OPTIONS, LOCATION_OPTIONS, RECURRING_OPTIONS } from '@/pages/tasks/utils/taskConstants.js'
import type { Subtask, CreateTaskData, UpdateTaskData } from '@/types/index.js'

interface TaskDetailModalProps {
  taskId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TaskDetailModal({ taskId, open, onOpenChange }: TaskDetailModalProps) {
  const isEditing = !!taskId
  const { data: existingTask } = useTask(taskId ?? '')
  const { data: lists = [] } = useTaskLists()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const toggleTask = useToggleTask()
  const { moreOptionsExpanded, setMoreOptionsExpanded } = useTasksUiStore()

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
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [newSubtaskText, setNewSubtaskText] = useState('')
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
      setSubtasks(existingTask.subtasks || [])
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
      setSubtasks([])
      setNewSubtaskText('')
      setDeleteConfirm(false)
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
      my_day: myDay ? 1 : 0,
      important: important ? 1 : 0,
      recurring,
      recurring_days: recurringDays,
      energy,
      location,
      subtasks,
    }

    if (isEditing && taskId) {
      updateTask.mutate({ id: taskId, ...data } as UpdateTaskData & { id: string })
    } else {
      createTask.mutate(data as CreateTaskData)
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

  function addSubtask() {
    const text = newSubtaskText.trim()
    if (!text) return
    setSubtasks(prev => [...prev, { id: crypto.randomUUID(), text, completed: false }])
    setNewSubtaskText('')
  }

  function toggleSubtask(id: string) {
    setSubtasks(prev => prev.map(s => s.id === id ? { ...s, completed: !s.completed } : s))
  }

  function removeSubtask(id: string) {
    setSubtasks(prev => prev.filter(s => s.id !== id))
  }

  function updateSubtaskText(id: string, text: string) {
    setSubtasks(prev => prev.map(s => s.id === id ? { ...s, text } : s))
  }

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-3">
          {isEditing && (
            <button
              onClick={() => toggleTask.mutate(taskId!)}
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

            {/* Subtasks */}
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Subtasks</label>
              <div className="mt-1 space-y-1">
                {subtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => toggleSubtask(subtask.id)}
                      className={[
                        'size-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                        subtask.completed ? 'border-accent bg-accent' : 'border-border hover:border-accent',
                      ].join(' ')}
                    >
                      {subtask.completed && <span className="text-white text-[10px]">&#10003;</span>}
                    </button>
                    <input
                      value={subtask.text}
                      onChange={(e) => updateSubtaskText(subtask.id, e.target.value)}
                      className={[
                        'flex-1 text-sm bg-transparent border-none outline-none',
                        subtask.completed ? 'text-text-muted line-through' : 'text-text-primary',
                      ].join(' ')}
                    />
                    <button
                      onClick={() => removeSubtask(subtask.id)}
                      className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-opacity"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Plus className="size-4 text-text-muted shrink-0" />
                  <input
                    value={newSubtaskText}
                    onChange={(e) => setNewSubtaskText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addSubtask()
                      }
                    }}
                    placeholder="Add subtask..."
                    className="flex-1 text-sm bg-transparent border-none outline-none text-text-primary placeholder:text-text-muted"
                  />
                </div>
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
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>{list.name}</option>
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
                Created {new Date(existingTask.created_at).toLocaleDateString()}
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
