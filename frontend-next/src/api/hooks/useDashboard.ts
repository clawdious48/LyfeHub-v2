import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client.js'

// Types
interface WidgetLayout {
  id: string
  type: string
  x: number
  y: number
  w: number
  h: number
}

interface DashboardLayout {
  widgets: WidgetLayout[]
}

interface DashboardLayoutResponse {
  layout: DashboardLayout
  isDefault: boolean
}

interface InboxItem {
  id: string
  type: 'task' | 'note' | 'person'
  title: string
  created_at: string
  age: string
}

interface InboxResponse {
  items: InboxItem[]
  count: number
  limit: number
}

interface InboxCountResponse {
  count: number
  tasks: number
  notes: number
  people: number
}

// Query keys
export const dashboardKeys = {
  all: ['dashboard'] as const,
  layout: () => [...dashboardKeys.all, 'layout'] as const,
  inbox: (limit?: number) => [...dashboardKeys.all, 'inbox', limit] as const,
  inboxCount: () => [...dashboardKeys.all, 'inbox-count'] as const,
}

// Hooks
export function useDashboardLayout() {
  return useQuery({
    queryKey: dashboardKeys.layout(),
    queryFn: () => apiClient.get<DashboardLayoutResponse>('/dashboard/layout'),
  })
}

export function useSaveDashboardLayout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (layout: DashboardLayout) =>
      apiClient.put<{ success: boolean }>('/dashboard/layout', { layout }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.layout() })
    },
  })
}

export function useInbox(limit = 10) {
  return useQuery({
    queryKey: dashboardKeys.inbox(limit),
    queryFn: () => apiClient.get<InboxResponse>(`/inbox?limit=${limit}`),
  })
}

export function useInboxCount() {
  return useQuery({
    queryKey: dashboardKeys.inboxCount(),
    queryFn: () => apiClient.get<InboxCountResponse>('/inbox/count'),
    refetchInterval: 30_000,
  })
}

export function useArchiveInboxItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, type }: { id: string; type: string }) =>
      apiClient.post<{ success: boolean }>(`/inbox/${id}/archive`, { type }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.inbox() })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.inboxCount() })
    },
  })
}
