import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client.js'
import type { Task, CreateTaskData, UpdateTaskData, ScheduleTaskData } from '@/types/index.js'

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (view: string) => [...taskKeys.lists(), { view }] as const,
  counts: () => [...taskKeys.all, 'counts'] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  calendarRange: (start: string, end: string) => [...taskKeys.all, 'calendar', { start, end }] as const,
  scheduled: () => [...taskKeys.all, 'scheduled'] as const,
  unscheduled: () => [...taskKeys.all, 'unscheduled'] as const,
}

// ── Core Task Queries ─────────────────────────────────────────

export function useTasks(view: string) {
  return useQuery({
    queryKey: taskKeys.list(view),
    queryFn: async () => {
      const today = getToday()
      const res = await apiClient.get<Task[] | { items: Task[] }>(
        `/tasks?view=${encodeURIComponent(view)}&today=${today}`,
      )
      return Array.isArray(res) ? res : res.items
    },
  })
}

export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: async () => {
      const res = await apiClient.get<{ item: Task }>(`/tasks/${id}`)
      return res.item
    },
    enabled: !!id,
  })
}

export function useTaskCounts() {
  return useQuery({
    queryKey: taskKeys.counts(),
    queryFn: async () => {
      const today = getToday()
      const res = await apiClient.get<{ counts: Record<string, number> }>(`/tasks/counts?today=${today}`)
      return res.counts
    },
  })
}

// ── Task Mutations ────────────────────────────────────────────

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTaskData) =>
      apiClient.post<Task>('/tasks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.counts() })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateTaskData & { id: string }) =>
      apiClient.patch<Task>(`/tasks/${id}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.counts() })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<void>(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.counts() })
    },
  })
}

// ── Toggle Mutations (Optimistic) ─────────────────────────────

export function useToggleTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<Task>(`/tasks/${id}/toggle`),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() })
      const previousLists = queryClient.getQueriesData<Task[]>({ queryKey: taskKeys.lists() })
      queryClient.setQueriesData<Task[]>(
        { queryKey: taskKeys.lists() },
        (old) => old?.map(t => t.id === id ? { ...t, completed: t.completed ? 0 : 1 } : t),
      )
      return { previousLists }
    },
    onError: (_err, _id, context) => {
      context?.previousLists?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.counts() })
    },
  })
}

export function useToggleMyDay() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<Task>(`/tasks/${id}/toggle-my-day`),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() })
      const previousLists = queryClient.getQueriesData<Task[]>({ queryKey: taskKeys.lists() })
      queryClient.setQueriesData<Task[]>(
        { queryKey: taskKeys.lists() },
        (old) => old?.map(t => t.id === id ? { ...t, my_day: t.my_day ? 0 : 1 } : t),
      )
      return { previousLists }
    },
    onError: (_err, _id, context) => {
      context?.previousLists?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.counts() })
    },
  })
}

export function useToggleImportant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, currentValue }: { id: string; currentValue: number }) =>
      apiClient.patch<Task>(`/tasks/${id}`, { important: currentValue ? 0 : 1 }),
    onMutate: async ({ id, currentValue }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() })
      const previousLists = queryClient.getQueriesData<Task[]>({ queryKey: taskKeys.lists() })
      queryClient.setQueriesData<Task[]>(
        { queryKey: taskKeys.lists() },
        (old) => old?.map(t => t.id === id ? { ...t, important: currentValue ? 0 : 1 } : t),
      )
      return { previousLists }
    },
    onError: (_err, _vars, context) => {
      context?.previousLists?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.counts() })
    },
  })
}

// ── Calendar Hooks ────────────────────────────────────────────

export function useCalendarTasks(start: string, end: string) {
  return useQuery({
    queryKey: taskKeys.calendarRange(start, end),
    queryFn: async () => {
      const res = await apiClient.get<{ items: Task[] }>(
        `/tasks/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      )
      return res.items
    },
    enabled: !!start && !!end,
  })
}

export function useUnscheduledTasks() {
  return useQuery({
    queryKey: taskKeys.unscheduled(),
    queryFn: async () => {
      const res = await apiClient.get<{ items: Task[] }>('/tasks/calendar/unscheduled')
      return res.items
    },
  })
}

export function useScheduleTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: ScheduleTaskData & { id: string }) =>
      apiClient.patch<{ item: Task }>(`/tasks/${id}/schedule`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}

export function useUnscheduleTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<{ item: Task }>(`/tasks/${id}/unschedule`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}
