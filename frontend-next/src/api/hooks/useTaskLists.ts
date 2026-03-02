import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client.js'
import type { TaskList } from '@/types/index.js'
import { taskKeys } from './useTasks.js'

export const taskListKeys = {
  all: ['task-lists'] as const,
  list: () => [...taskListKeys.all, 'list'] as const,
  detail: (id: string) => [...taskListKeys.all, 'detail', id] as const,
}

export function useTaskLists() {
  return useQuery({
    queryKey: taskListKeys.list(),
    queryFn: async () => {
      const res = await apiClient.get<{ lists: TaskList[] }>('/task-lists')
      return res.lists
    },
  })
}

export function useCreateTaskList() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; color?: string; icon?: string }) =>
      apiClient.post<TaskList>('/task-lists', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskListKeys.list() })
    },
  })
}

export function useUpdateTaskList() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; color?: string; icon?: string }) =>
      apiClient.patch<TaskList>(`/task-lists/${id}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: taskListKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: taskListKeys.list() })
    },
  })
}

export function useDeleteTaskList() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<void>(`/task-lists/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskListKeys.list() })
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
  })
}
