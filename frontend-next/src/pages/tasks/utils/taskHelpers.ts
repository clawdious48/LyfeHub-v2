import type { Task, TaskList } from '@/types/index.js'

export function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

export function sortTasks(tasks: Task[], sortBy: 'due' | 'created' | 'custom'): Task[] {
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
      return sorted.sort((a, b) => b.created_at.localeCompare(a.created_at))
    case 'custom':
    default:
      return sorted
  }
}

export function groupTasksBy(
  tasks: Task[],
  groupBy: 'priority' | 'energy' | 'list' | 'location',
  lists: TaskList[] = [],
): { key: string; label: string; tasks: Task[] }[] {
  const groups = new Map<string, Task[]>()

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
    const listMap = Object.fromEntries(lists.map(l => [l.id, l.name]))
    const result: { key: string; label: string; tasks: Task[] }[] = []
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

export function isOverdue(task: Task): boolean {
  if (!task.due_date || task.completed) return false
  return task.due_date < getToday()
}

export function getSubtaskProgress(task: Task): { done: number; total: number } | null {
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
