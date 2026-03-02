import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client.js'
import type { Task, CreateTaskData, UpdateTaskData, ScheduleTaskData } from '@/types/index.js'

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (status?: string) => [...taskKeys.lists(), { status }] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  calendarRange: (start: string, end: string) => [...taskKeys.all, 'calendar', { start, end }] as const,
  scheduled: () => [...taskKeys.all, 'scheduled'] as const,
  unscheduled: () => [...taskKeys.all, 'unscheduled'] as const,
}

export function useTasks(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return useQuery({
    queryKey: taskKeys.list(status),
    queryFn: async () => {
      const res = await apiClient.get<Task[] | { items: Task[] }>(`/tasks${query}`)
      return Array.isArray(res) ? res : res.items
    },
  })
}

export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => apiClient.get<Task>(`/tasks/${id}`),
    enabled: !!id,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTaskData) =>
      apiClient.post<Task>('/tasks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
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
    },
  })
}

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
