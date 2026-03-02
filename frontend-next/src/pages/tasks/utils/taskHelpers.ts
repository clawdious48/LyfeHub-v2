import type { TaskRecord } from '@/api/hooks/useTasksAdapter.js'
import type { SelectOption } from '@/types/index.js'

export function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

export function sortTasks(tasks: TaskRecord[], sortBy: 'due' | 'created' | 'custom'): TaskRecord[] {
  const sorted = [...tasks]
  switch (sortBy) {
    case 'due':
      return sorted.sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date.localeCompare(b.due_date)
      })
    case 'created':
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    case 'custom':
    default:
      return sorted
  }
}

export function groupTasksBy(
  tasks: TaskRecord[],
  groupBy: 'priority' | 'energy' | 'list' | 'location',
  listOptions: SelectOption[] = [],
): { key: string; label: string; tasks: TaskRecord[] }[] {
  const groups = new Map<string, TaskRecord[]>()

  for (const task of tasks) {
    let value: string | null
    if (groupBy === 'list') {
      value = task.list_id
    } else {
      value = task[groupBy]
    }
    const key = value ?? 'none'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(task)
  }

  const labelMap: Record<string, Record<string, string>> = {
    priority: { none: 'None', low: 'Low', medium: 'Medium', high: 'High' },
    energy: { none: 'None', low: 'Low', high: 'High' },
    location: { none: 'None', home: 'Home', office: 'Office', errand: 'Errand' },
  }

  if (groupBy === 'list') {
    const listMap = Object.fromEntries(listOptions.map(o => [o.value || o.label, o.label]))
    const result: { key: string; label: string; tasks: TaskRecord[] }[] = []
    for (const [key, groupTasks] of groups) {
      result.push({
        key,
        label: key === 'none' ? 'No List' : (listMap[key] ?? 'Unknown'),
        tasks: groupTasks,
      })
    }
    return result
  }

  const order = groupBy === 'priority'
    ? ['none', 'low', 'medium', 'high']
    : groupBy === 'energy'
      ? ['none', 'low', 'high']
      : ['none', 'home', 'office', 'errand']

  return order
    .filter(key => groups.has(key))
    .map(key => ({
      key,
      label: labelMap[groupBy]?.[key] ?? key,
      tasks: groups.get(key)!,
    }))
}

export function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const today = getToday()
  if (dateStr === today) return 'Today'
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow'
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function isOverdue(task: TaskRecord): boolean {
  if (!task.due_date || task.completed) return false
  return task.due_date < getToday()
}

export function getSubtaskProgress(task: TaskRecord): { done: number; total: number } | null {
  if (!task.subtasks || task.subtasks.length === 0) return null
  const done = task.subtasks.filter(s => s.completed).length
  return { done, total: task.subtasks.length }
}

export function getPriorityColor(priority: string | null): string {
  switch (priority) {
    case 'low': return 'text-blue-400'
    case 'medium': return 'text-amber-400'
    case 'high': return 'text-red-400'
    default: return ''
  }
}
