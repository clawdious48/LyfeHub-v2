import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client.js'
import type {
  Base,
  BaseRecord,
  BaseProperty,
  BaseView,
  BaseGroup,
  CreateBaseData,
  UpdateBaseData,
  CreateBaseRecordData,
  UpdateBaseRecordData,
  CreatePropertyData,
  UpdatePropertyData,
  CreateViewData,
  UpdateViewData,
  CreateGroupData,
  UpdateGroupData,
  AssignBaseGroupData,
  ReorderItem,
} from '@/types/index.js'

export const baseKeys = {
  all: ['bases'] as const,
  lists: () => [...baseKeys.all, 'list'] as const,
  list: () => [...baseKeys.lists()] as const,
  details: () => [...baseKeys.all, 'detail'] as const,
  detail: (id: string) => [...baseKeys.details(), id] as const,
  views: (baseId: string) => [...baseKeys.all, 'views', baseId] as const,
  groups: () => [...baseKeys.all, 'groups'] as const,
  relationOptions: (baseId: string) => [...baseKeys.all, 'relation-options', baseId] as const,
}

// ── Core Base CRUD ────────────────────────────────────────────

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
      apiClient.put<Base>(`/bases/${id}`, data),
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

// ── Records ───────────────────────────────────────────────────
// Records come embedded in useBase(id) response — no separate GET endpoint.

export function useCreateBaseRecord(baseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateBaseRecordData) =>
      apiClient.post<BaseRecord>(`/bases/${baseId}/records`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: baseKeys.detail(baseId) })
    },
  })
}

export function useUpdateBaseRecord(baseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateBaseRecordData & { id: string }) =>
      apiClient.put<BaseRecord>(`/bases/${baseId}/records/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: baseKeys.detail(baseId) })
    },
  })
}

export function useDeleteBaseRecord(baseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<void>(`/bases/${baseId}/records/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: baseKeys.detail(baseId) })
    },
  })
}

// ── Properties ────────────────────────────────────────────────

export function useCreateProperty(baseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePropertyData) =>
      apiClient.post<BaseProperty>(`/bases/${baseId}/properties`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: baseKeys.detail(baseId) })
    },
  })
}

export function useUpdateProperty(baseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ propId, ...data }: UpdatePropertyData & { propId: string }) =>
      apiClient.put<BaseProperty>(`/bases/${baseId}/properties/${propId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: baseKeys.detail(baseId) })
    },
  })
}

export function useDeleteProperty(baseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (propId: string) =>
      apiClient.delete<void>(`/bases/${baseId}/properties/${propId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: baseKeys.detail(baseId) })
    },
  })
}

export function useReorderProperties(baseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (items: ReorderItem[]) =>
      apiClient.post<void>(`/bases/${baseId}/properties/reorder`, { order: items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: baseKeys.detail(baseId) })
    },
  })
}

// ── Views ─────────────────────────────────────────────────────

export function useBaseViews(baseId: string) {
  return useQuery({
    queryKey: baseKeys.views(baseId),
    queryFn: () => apiClient.get<BaseView[]>(`/bases/${baseId}/views`),
    enabled: !!baseId,
  })
}

export function useCreateView(baseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateViewData) =>
      apiClient.post<BaseView>(`/bases/${baseId}/views`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: baseKeys.views(baseId) })
    },
  })
}

export function useUpdateView(baseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ viewId, ...data }: UpdateViewData & { viewId: string }) =>
      apiClient.put<BaseView>(`/bases/${baseId}/views/${viewId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: baseKeys.views(baseId) })
    },
  })
}

export function useDeleteView(baseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (viewId: string) =>
      apiClient.delete<void>(`/bases/${baseId}/views/${viewId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: baseKeys.views(baseId) })
    },
  })
}

// ── Groups ────────────────────────────────────────────────────

export function useBaseGroups() {
  return useQuery({
    queryKey: baseKeys.groups(),
    queryFn: () => apiClient.get<BaseGroup[]>('/bases/groups/list'),
  })
}

export function useCreateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateGroupData) =>
      apiClient.post<BaseGroup>('/bases/groups', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: baseKeys.groups() })
    },
  })
}

export function useUpdateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, ...data }: UpdateGroupData & { groupId: string }) =>
      apiClient.put<BaseGroup>(`/bases/groups/${groupId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: baseKeys.groups() })
    },
  })
}

export function useToggleGroupCollapse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (groupId: string) =>
      apiClient.put<BaseGroup>(`/bases/groups/${groupId}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: baseKeys.groups() })
    },
  })
}

export function useCollapseAllGroups() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiClient.post<BaseGroup[]>('/bases/groups/collapse-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: baseKeys.groups() })
    },
  })
}

export function useExpandAllGroups() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiClient.post<BaseGroup[]>('/bases/groups/expand-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: baseKeys.groups() })
    },
  })
}

export function useReorderGroups() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (items: ReorderItem[]) =>
      apiClient.post<BaseGroup[]>('/bases/groups/reorder', { order: items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: baseKeys.groups() })
    },
  })
}

export function useDeleteGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (groupId: string) =>
      apiClient.delete<void>(`/bases/groups/${groupId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: baseKeys.groups() })
    },
  })
}

export function useAssignBaseGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ baseId, ...data }: AssignBaseGroupData & { baseId: string }) =>
      apiClient.put<Base>(`/bases/${baseId}/group`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: baseKeys.lists() })
      queryClient.invalidateQueries({ queryKey: baseKeys.groups() })
    },
  })
}

// ── Relations ─────────────────────────────────────────────────

export function useRelationOptions(baseId: string) {
  return useQuery({
    queryKey: baseKeys.relationOptions(baseId),
    queryFn: () => apiClient.get<Array<{ id: string; displayValue: string; global_id: number }>>(`/bases/${baseId}/relation-options`),
    enabled: !!baseId,
  })
}
