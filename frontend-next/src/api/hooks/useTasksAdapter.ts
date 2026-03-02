import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client.js'
import { useDefaultBase, baseKeys } from './useBases.js'
import type { BaseRecord, BaseProperty, SelectOption } from '@/types/index.js'

// ── Constants ────────────────────────────────────────────────

const CORE_BASE_NAME = 'Tasks'
const TASKS_QUERY_KEY = [...baseKeys.all, 'default', CORE_BASE_NAME] as const

// Semantic field name → Base property name
const FIELD_TO_PROP: Record<string, string> = {
  title: 'Name',
  description: 'Description',
  status: 'Status',
  priority: 'Priority',
  due_date: 'Due',
  due_time: 'Due Time',
  due_time_end: 'Due Time End',
  snooze_date: 'Snooze',
  completed_at: 'Completed',
  my_day: 'My Day',
  important: 'Important',
  energy: 'Energy',
  location: 'Location',
  list_id: 'Smart List',
  recurring: 'Recur Unit',
  recurring_interval: 'Recur Interval',
  recurring_days: 'Days',
  project_id: 'Project',
  people_ids: 'People',
  parent_task_id: 'Parent Task',
  subtask_ids: 'Sub-Tasks',
}

// ── Types ────────────────────────────────────────────────────

type PropMap = Map<string, string> // property name → property UUID

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
  recurring_interval: number | null
  recurring_days: string[]
  project_id: string | null
  list_id: string | null
  people_ids: string[]
  parent_task_id: string | null
  subtask_ids: string[]
}

// ── PropMap Builder ─────────────────────────────────────────

function buildPropMap(properties: BaseProperty[]): PropMap {
  const map = new Map<string, string>()
  for (const p of properties) map.set(p.name, p.id)
  return map
}

// Resolve a semantic field name to its property UUID
function propId(pm: PropMap, field: string): string | undefined {
  const propName = FIELD_TO_PROP[field]
  if (!propName) return undefined
  return pm.get(propName)
}

// ── Transformers ─────────────────────────────────────────────

function emptyToNull(val: unknown): string | null {
  if (val === '' || val == null) return null
  return String(val)
}

function toTaskRecord(record: BaseRecord, pm: PropMap): TaskRecord {
  const v = record.values

  // Helper to read a value by semantic field name
  const get = (field: string): unknown => {
    const id = propId(pm, field)
    return id ? v[id] : undefined
  }

  const completedAt = emptyToNull(get('completed_at'))

  return {
    id: record.id,
    baseId: record.base_id,
    globalId: record.global_id,
    position: record.position,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    title: String(get('title') ?? ''),
    description: String(get('description') ?? ''),
    status: String(get('status') ?? 'To Do'),
    my_day: Boolean(get('my_day')),
    due_date: emptyToNull(get('due_date')),
    due_time: emptyToNull(get('due_time')),
    due_time_end: emptyToNull(get('due_time_end')),
    snooze_date: emptyToNull(get('snooze_date')),
    priority: emptyToNull(get('priority')),
    energy: emptyToNull(get('energy')),
    location: emptyToNull(get('location')),
    important: Boolean(get('important')),
    completed: completedAt != null,
    completed_at: completedAt,
    recurring: emptyToNull(get('recurring')),
    recurring_interval: get('recurring_interval') != null ? Number(get('recurring_interval')) : null,
    recurring_days: Array.isArray(get('recurring_days')) ? get('recurring_days') as string[] : [],
    project_id: emptyToNull(get('project_id')),
    list_id: emptyToNull(get('list_id')),
    people_ids: Array.isArray(get('people_ids')) ? get('people_ids') as string[] : [],
    parent_task_id: (() => {
      const raw = get('parent_task_id')
      if (Array.isArray(raw)) return (raw[0] as string) ?? null
      return emptyToNull(raw)
    })(),
    subtask_ids: Array.isArray(get('subtask_ids')) ? get('subtask_ids') as string[] : [],
  }
}

function toBaseValues(updates: Partial<TaskRecord>, pm: PropMap): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  const data = updates as Record<string, unknown>

  for (const [field, propName] of Object.entries(FIELD_TO_PROP)) {
    if (!(field in data)) continue
    const uuid = pm.get(propName)
    if (!uuid) continue
    values[uuid] = data[field]
  }

  return values
}

// ── Smart View Filters ───────────────────────────────────────

// Subtasks (records with parent_task_id) are excluded from all top-level views
const isTopLevel = (r: TaskRecord) => !r.parent_task_id

function filterByView(records: TaskRecord[], view: string): TaskRecord[] {
  if (view.startsWith('list:')) {
    const listValue = view.slice(5)
    return records.filter(r => isTopLevel(r) && !r.completed && r.list_id === listValue)
  }

  switch (view) {
    case 'my-day':
      return records.filter(r => isTopLevel(r) && !r.completed && r.my_day)
    case 'important':
      return records.filter(r => isTopLevel(r) && !r.completed && r.important)
    case 'scheduled':
      return records.filter(r => isTopLevel(r) && !r.completed && r.due_date != null)
    case 'recurring':
      return records.filter(r => isTopLevel(r) && !r.completed && r.recurring != null)
    case 'completed':
      return records.filter(r => isTopLevel(r) && r.completed)
    case 'all':
    default:
      return records.filter(r => isTopLevel(r) && !r.completed)
  }
}

function computeCounts(records: TaskRecord[]): Record<string, number> {
  return {
    'my-day': records.filter(r => isTopLevel(r) && !r.completed && r.my_day).length,
    'important': records.filter(r => isTopLevel(r) && !r.completed && r.important).length,
    'scheduled': records.filter(r => isTopLevel(r) && !r.completed && r.due_date != null).length,
    'recurring': records.filter(r => isTopLevel(r) && !r.completed && r.recurring != null).length,
    'all': records.filter(r => isTopLevel(r) && !r.completed).length,
    'completed': records.filter(r => isTopLevel(r) && r.completed).length,
  }
}

// ── Query Hooks ──────────────────────────────────────────────

export function useTaskBase() {
  const { data, isLoading, error } = useDefaultBase(CORE_BASE_NAME)

  const propMap = useMemo(
    () => buildPropMap(data?.properties ?? []),
    [data?.properties],
  )

  const records = useMemo(
    () => (data?.records ?? []).map(r => toTaskRecord(r, propMap)),
    [data?.records, propMap],
  )

  const properties = data?.properties ?? []
  return { base: data, records, properties, propMap, isLoading, error }
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

// ── Helpers ──────────────────────────────────────────────────

function getBaseId(queryClient: ReturnType<typeof useQueryClient>): string {
  const cached = queryClient.getQueryData<{ id: string }>(TASKS_QUERY_KEY)
  if (!cached?.id) throw new Error('Tasks base not loaded yet')
  return cached.id
}

function getCachedPropMap(queryClient: ReturnType<typeof useQueryClient>): PropMap {
  const cached = queryClient.getQueryData<{ properties?: BaseProperty[] }>(TASKS_QUERY_KEY)
  return buildPropMap(cached?.properties ?? [])
}

// ── Mutation Hooks ───────────────────────────────────────────

export function useCreateTaskRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<TaskRecord> & { title: string }) => {
      const pm = getCachedPropMap(queryClient)
      return apiClient.post<BaseRecord>(`/bases/${getBaseId(queryClient)}/records`, {
        values: toBaseValues(data, pm),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY })
    },
  })
}

export function useUpdateTaskRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<TaskRecord> & { id: string }) => {
      const pm = getCachedPropMap(queryClient)
      return apiClient.put<BaseRecord>(`/bases/${getBaseId(queryClient)}/records/${id}`, {
        values: toBaseValues(data, pm),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY })
    },
  })
}

export function useDeleteTaskRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<void>(`/bases/${getBaseId(queryClient)}/records/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY })
    },
  })
}

// ── Optimistic Toggle Hooks ──────────────────────────────────

function useOptimisticToggle(field: 'completed' | 'my_day' | 'important') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, currentValue }: { id: string; currentValue: boolean }) => {
      const pm = getCachedPropMap(queryClient)
      const values: Record<string, unknown> = {}

      if (field === 'completed') {
        // Completed is a date field: set date when completing, clear when uncompleting
        const completedUuid = pm.get('Completed')
        if (completedUuid) {
          values[completedUuid] = !currentValue ? new Date().toISOString().split('T')[0] : ''
        }
      } else {
        const propName = FIELD_TO_PROP[field]
        if (propName) {
          const uuid = pm.get(propName)
          if (uuid) values[uuid] = !currentValue
        }
      }

      return apiClient.put<BaseRecord>(`/bases/${getBaseId(queryClient)}/records/${id}`, { values })
    },
    onMutate: async ({ id, currentValue }) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY })
      const previous = queryClient.getQueryData(TASKS_QUERY_KEY)
      const pm = getCachedPropMap(queryClient)

      queryClient.setQueryData(TASKS_QUERY_KEY, (old: any) => {
        if (!old?.records) return old
        return {
          ...old,
          records: old.records.map((r: BaseRecord) => {
            if (r.id !== id) return r
            const newValues = { ...r.values }
            if (field === 'completed') {
              const completedUuid = pm.get('Completed')
              if (completedUuid) {
                newValues[completedUuid] = !currentValue ? new Date().toISOString().split('T')[0] : ''
              }
            } else {
              const propName = FIELD_TO_PROP[field]
              if (propName) {
                const uuid = pm.get(propName)
                if (uuid) newValues[uuid] = !currentValue
              }
            }
            return { ...r, values: newValues }
          }),
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

// ── Task List Options (from Smart List property) ────────────

export function useTaskListOptions() {
  const { properties } = useTaskBase()
  return useMemo(() => {
    const listProp = properties.find(p => p.name === 'Smart List')
    if (!listProp || !Array.isArray(listProp.options)) return []
    return listProp.options as SelectOption[]
  }, [properties])
}
