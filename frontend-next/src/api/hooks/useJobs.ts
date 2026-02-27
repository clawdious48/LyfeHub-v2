import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client.js'
import type { ApexJob, CreateApexJobData, UpdateApexJobData } from '@/types/index.js'

export const jobKeys = {
  all: ['apex-jobs'] as const,
  lists: () => [...jobKeys.all, 'list'] as const,
  list: () => [...jobKeys.lists()] as const,
  details: () => [...jobKeys.all, 'detail'] as const,
  detail: (id: string) => [...jobKeys.details(), id] as const,
}

export function useJobs() {
  return useQuery({
    queryKey: jobKeys.list(),
    queryFn: () => apiClient.get<ApexJob[]>('/apex-jobs'),
  })
}

export function useJob(id: string) {
  return useQuery({
    queryKey: jobKeys.detail(id),
    queryFn: () => apiClient.get<ApexJob>(`/apex-jobs/${id}`),
    enabled: !!id,
  })
}

export function useCreateJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateApexJobData) =>
      apiClient.post<ApexJob>('/apex-jobs', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() })
    },
  })
}

export function useUpdateJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateApexJobData & { id: string }) =>
      apiClient.patch<ApexJob>(`/apex-jobs/${id}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() })
    },
  })
}

export function useUpdateJobStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApexJob['status'] }) =>
      apiClient.patch<ApexJob>(`/apex-jobs/${id}/status`, { status }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() })
    },
  })
}
