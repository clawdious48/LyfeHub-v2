import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client.js'
import type {
  Base,
  BaseRecord,
  CreateBaseData,
  UpdateBaseData,
  CreateBaseRecordData,
  UpdateBaseRecordData,
} from '@/types/index.js'

export const baseKeys = {
  all: ['bases'] as const,
  lists: () => [...baseKeys.all, 'list'] as const,
  list: () => [...baseKeys.lists()] as const,
  details: () => [...baseKeys.all, 'detail'] as const,
  detail: (id: string) => [...baseKeys.details(), id] as const,
  records: (baseId: string) => [...baseKeys.all, 'records', baseId] as const,
}

export function useBases() {
  return useQuery({
    queryKey: baseKeys.list(),
    queryFn: () => apiClient.get<Base[]>('/bases'),
  })
}

export function useBase(id: string) {
  return useQuery({
    queryKey: baseKeys.detail(id),
    queryFn: () => apiClient.get<Base>(`/bases/${id}`),
    enabled: !!id,
  })
}

export function useCreateBase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateBaseData) =>
      apiClient.post<Base>('/bases', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: baseKeys.lists() })
    },
  })
}

export function useUpdateBase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateBaseData & { id: string }) =>
      apiClient.patch<Base>(`/bases/${id}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: baseKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: baseKeys.lists() })
    },
  })
}

export function useDeleteBase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<void>(`/bases/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: baseKeys.lists() })
    },
  })
}

export function useBaseRecords(baseId: string) {
  return useQuery({
    queryKey: baseKeys.records(baseId),
    queryFn: () => apiClient.get<BaseRecord[]>(`/bases/${baseId}/records`),
    enabled: !!baseId,
  })
}

export function useCreateBaseRecord(baseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateBaseRecordData) =>
      apiClient.post<BaseRecord>(`/bases/${baseId}/records`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: baseKeys.records(baseId) })
    },
  })
}

export function useUpdateBaseRecord(baseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateBaseRecordData & { id: string }) =>
      apiClient.patch<BaseRecord>(`/bases/${baseId}/records/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: baseKeys.records(baseId) })
    },
  })
}

export function useDeleteBaseRecord(baseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<void>(`/bases/${baseId}/records/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: baseKeys.records(baseId) })
    },
  })
}
