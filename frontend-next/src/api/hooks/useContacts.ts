import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client.js'
import type { CrmContact, CreateCrmContactData, UpdateCrmContactData } from '@/types/index.js'

export const contactKeys = {
  all: ['crm-contacts'] as const,
  lists: () => [...contactKeys.all, 'list'] as const,
  list: () => [...contactKeys.lists()] as const,
  details: () => [...contactKeys.all, 'detail'] as const,
  detail: (id: string) => [...contactKeys.details(), id] as const,
}

export function useCrmContacts() {
  return useQuery({
    queryKey: contactKeys.list(),
    queryFn: () => apiClient.get<CrmContact[]>('/apex-crm/contacts'),
  })
}

export function useCrmContact(id: string) {
  return useQuery({
    queryKey: contactKeys.detail(id),
    queryFn: () => apiClient.get<CrmContact>(`/apex-crm/contacts/${id}`),
    enabled: !!id,
  })
}

export function useCreateCrmContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCrmContactData) =>
      apiClient.post<CrmContact>('/apex-crm/contacts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() })
    },
  })
}

export function useUpdateCrmContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateCrmContactData & { id: string }) =>
      apiClient.patch<CrmContact>(`/apex-crm/contacts/${id}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: contactKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() })
    },
  })
}

export function useDeleteCrmContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<void>(`/apex-crm/contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() })
    },
  })
}

export function useSearchCrmContacts(search: string) {
  return useQuery({
    queryKey: [...contactKeys.all, 'search', search] as const,
    queryFn: () => apiClient.get<{ id: string; first_name: string; last_name: string; phone: string; email: string; org_name: string | null }[]>(`/apex-crm/contacts?search=${encodeURIComponent(search)}&limit=10`),
    enabled: search.length >= 2,
  })
}

export function useLinkJobContact() {
  return useMutation({
    mutationFn: ({ jobId, contactId, jobRole }: { jobId: string; contactId: string; jobRole: string }) =>
      apiClient.post(`/apex-crm/jobs/${jobId}/contacts`, { contact_id: contactId, job_role: jobRole }),
  })
}
