import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client.js'
import { useDefaultBase, baseKeys } from './useBases.js'
import type { BaseRecord, BaseProperty, SelectOption } from '@/types/index.js'

// ── Constants ────────────────────────────────────────────────

const CORE_BASE_ID = 'core-tasks'
const CORE_BASE_NAME = 'Tasks'
const TASKS_QUERY_KEY = [...baseKeys.all, 'default', CORE_BASE_NAME] as const

// ── Types ────────────────────────────────────────────────────

export interface Subtask {
  id: string
  text: string
  completed: boolean
}

export interface TaskRecord {
  id: string
  baseId: string
  globalId: number | null
  position: number
  createdAt: string
  updatedAt: string
  // Semantic fields from values
  title: string
  description: string
  status: string
  my_day: boolean
  due_date: string | null
  due_time: string | null
  due_time_end: string | null
  snooze_date: string | null
  priority: string | null
  energy: string | null
  location: string | null
  important: boolean
  completed: boolean
  completed_at: string | null
  recurring: string | null
  recurring_days: string[]
  project_id: string | null
  list_id: string | null
  subtasks: Subtask[]
  people_ids: string[]
  note_ids: string[]
}

// ── Transformers ─────────────────────────────────────────────

function emptyToNull(val: unknown): string | null {
  if (val === '' || val == null) return null
  return String(val)
}

function toTaskRecord(record: BaseRecord): TaskRecord {
  const v = record.values
  return {
    id: record.id,
    baseId: record.base_id,
    globalId: record.global_id,
    position: record.position,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    title: String(v.title ?? ''),
    description: String(v.description ?? ''),
    status: String(v.status ?? 'todo'),
    my_day: Boolean(v.my_day),
    due_date: emptyToNull(v.due_date),
    due_time: emptyToNull(v.due_time),
    due_time_end: emptyToNull(v.due_time_end),
    snooze_date: emptyToNull(v.snooze_date),
    priority: emptyToNull(v.priority),
    energy: emptyToNull(v.energy),
    location: emptyToNull(v.location),
    important: Boolean(v.important),
    completed: Boolean(v.completed),
    completed_at: emptyToNull(v.completed_at),
    recurring: emptyToNull(v.recurring),
    recurring_days: Array.isArray(v.recurring_days) ? v.recurring_days : [],
    project_id: emptyToNull(v.project_id),
    list_id: emptyToNull(v.list_id),
    subtasks: Array.isArray(v.subtasks) ? v.subtasks : [],
    people_ids: Array.isArray(v.people_ids) ? v.people_ids : [],
    note_ids: Array.isArray(v.note_ids) ? v.note_ids : [],
  }
}

function toBaseValues(updates: Partial<TaskRecord>): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  const map: Record<string, string> = {
    title: 'title', description: 'description', status: 'status',
    my_day: 'my_day', due_date: 'due_date', due_time: 'due_time',
    due_time_end: 'due_time_end', snooze_date: 'snooze_date',
    priority: 'priority', energy: 'energy', location: 'location',
    important: 'important', completed: 'completed', completed_at: 'completed_at',
    recurring: 'recurring', recurring_days: 'recurring_days',
    project_id: 'project_id', list_id: 'list_id', subtasks: 'subtasks',
    people_ids: 'people_ids', note_ids: 'note_ids',
  }
  for (const [key, propId] of Object.entries(map)) {
    if (key in updates) {
      values[propId] = (updates as Record<string, unknown>)[key]
    }
  }
  return values
}

// ── Smart View Filters ───────────────────────────────────────

function filterByView(records: TaskRecord[], view: string): TaskRecord[] {
  if (view.startsWith('list:')) {
    const listValue = view.slice(5)
    return records.filter(r => !r.completed && r.list_id === listValue)
  }

  switch (view) {
    case 'my-day':
      return records.filter(r => !r.completed && r.my_day)
    case 'important':
      return records.filter(r => !r.completed && r.important)
    case 'scheduled':
      return records.filter(r => !r.completed && r.due_date != null)
    case 'recurring':
      return records.filter(r => !r.completed && r.recurring != null)
    case 'completed':
      return records.filter(r => r.completed)
    case 'all':
    default:
      return records.filter(r => !r.completed)
  }
}

function computeCounts(records: TaskRecord[]): Record<string, number> {
  return {
    'my-day': records.filter(r => !r.completed && r.my_day).length,
    'important': records.filter(r => !r.completed && r.important).length,
    'scheduled': records.filter(r => !r.completed && r.due_date != null).length,
    'recurring': records.filter(r => !r.completed && r.recurring != null).length,
    'all': records.filter(r => !r.completed).length,
    'completed': records.filter(r => r.completed).length,
  }
}

// ── Query Hooks ──────────────────────────────────────────────

export function useTaskBase() {
  const { data, isLoading, error } = useDefaultBase(CORE_BASE_NAME)
  const records = useMemo(
    () => (data?.records ?? []).map(toTaskRecord),
    [data?.records],
  )
  const properties = data?.properties ?? []
  return { base: data, records, properties, isLoading, error }
}

export function useTaskRecords(view: string) {
  const { records, isLoading, error } = useTaskBase()
  const filtered = useMemo(
    () => filterByView(records, view),
    [records, view],
  )
  return { data: filtered, isLoading, error }
}

export function useTaskRecord(id: string) {
  const { records } = useTaskBase()
  return useMemo(
    () => records.find(r => r.id === id),
    [records, id],
  )
}

export function useTaskCounts() {
  const { records, isLoading } = useTaskBase()
  const counts = useMemo(
    () => computeCounts(records),
    [records],
  )
  return { data: counts, isLoading }
}

// ── Mutation Hooks ───────────────────────────────────────────

export function useCreateTaskRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<TaskRecord> & { title: string }) =>
      apiClient.post<BaseRecord>(`/bases/core/${CORE_BASE_ID}/records`, {
        values: toBaseValues(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY })
    },
  })
}

export function useUpdateTaskRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<TaskRecord> & { id: string }) =>
      apiClient.put<BaseRecord>(`/bases/core/${CORE_BASE_ID}/records/${id}`, {
        values: toBaseValues(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY })
    },
  })
}

export function useDeleteTaskRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<void>(`/bases/core/${CORE_BASE_ID}/records/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY })
    },
  })
}

// ── Optimistic Toggle Hooks ──────────────────────────────────

function useOptimisticToggle(field: 'completed' | 'my_day' | 'important') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, currentValue }: { id: string; currentValue: boolean }) =>
      apiClient.put<BaseRecord>(`/bases/core/${CORE_BASE_ID}/records/${id}`, {
        values: {
          [field]: !currentValue,
          ...(field === 'completed' && !currentValue ? { completed_at: new Date().toISOString().split('T')[0] } : {}),
          ...(field === 'completed' && currentValue ? { completed_at: '' } : {}),
        },
      }),
    onMutate: async ({ id, currentValue }) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY })
      const previous = queryClient.getQueryData(TASKS_QUERY_KEY)
      queryClient.setQueryData(TASKS_QUERY_KEY, (old: any) => {
        if (!old?.records) return old
        return {
          ...old,
          records: old.records.map((r: BaseRecord) =>
            r.id === id
              ? { ...r, values: { ...r.values, [field]: !currentValue } }
              : r,
          ),
        }
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(TASKS_QUERY_KEY, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY })
    },
  })
}

export function useToggleTaskComplete() {
  return useOptimisticToggle('completed')
}

export function useToggleTaskMyDay() {
  return useOptimisticToggle('my_day')
}

export function useToggleTaskImportant() {
  return useOptimisticToggle('important')
}

// ── Task List Options (from list_id property) ────────────────

export function useTaskListOptions() {
  const { properties } = useTaskBase()
  return useMemo(() => {
    const listProp = properties.find(p => p.id === 'list_id')
    if (!listProp || !Array.isArray(listProp.options)) return []
    return listProp.options as SelectOption[]
  }, [properties])
}
