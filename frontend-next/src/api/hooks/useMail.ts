import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { apiClient } from '../client.js'
import type {
  MailStatus,
  MailMessageFull,
  MailThread,
  MailMessagesResponse,
  MailLabel,
  MailContact,
  MailDraft,
  MailFilter,
  SendMailData,
  CreateFilterData,
} from '@/types/index.js'

export const mailKeys = {
  all: ['mail'] as const,
  status: () => [...mailKeys.all, 'status'] as const,
  messages: () => [...mailKeys.all, 'messages'] as const,
  messageList: (label: string, q: string) => [...mailKeys.messages(), label, q] as const,
  messageDetail: (id: string) => [...mailKeys.all, 'message', id] as const,
  thread: (id: string) => [...mailKeys.all, 'thread', id] as const,
  labels: () => [...mailKeys.all, 'labels'] as const,
  contacts: (q: string) => [...mailKeys.all, 'contacts', q] as const,
  drafts: () => [...mailKeys.all, 'drafts'] as const,
  filters: () => [...mailKeys.all, 'filters'] as const,
}

// ── Status ──

export function useMailStatus() {
  return useQuery({
    queryKey: mailKeys.status(),
    queryFn: () => apiClient.get<MailStatus>('/mail/status'),
  })
}

// ── Messages ──

export function useMailMessages(label: string, q: string) {
  return useInfiniteQuery({
    queryKey: mailKeys.messageList(label, q),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams()
      if (label) params.set('label', label)
      if (q) params.set('q', q)
      params.set('maxResults', '25')
      if (pageParam) params.set('pageToken', pageParam)
      return apiClient.get<MailMessagesResponse>(`/mail/messages?${params.toString()}`)
    },
    initialPageParam: '' as string,
    getNextPageParam: (lastPage) => lastPage.nextPageToken || undefined,
    enabled: true,
    refetchInterval: 60000,
  })
}

export function useMailMessage(id: string) {
  return useQuery({
    queryKey: mailKeys.messageDetail(id),
    queryFn: () => apiClient.get<MailMessageFull>(`/mail/messages/${id}`),
    enabled: !!id,
  })
}

// ── Threads ──

export function useMailThread(threadId: string) {
  return useQuery({
    queryKey: mailKeys.thread(threadId),
    queryFn: () => apiClient.get<MailThread>(`/mail/threads/${threadId}`),
    enabled: !!threadId,
  })
}

// ── Labels ──

export function useMailLabels() {
  return useQuery({
    queryKey: mailKeys.labels(),
    queryFn: () => apiClient.get<MailLabel[]>('/mail/labels'),
  })
}

// ── Contacts ──

export function useMailContacts(q: string) {
  return useQuery({
    queryKey: mailKeys.contacts(q),
    queryFn: () => apiClient.get<MailContact[]>(`/mail/contacts/suggest?q=${encodeURIComponent(q)}`),
    enabled: q.length >= 2,
  })
}

// ── Drafts ──

export function useMailDrafts() {
  return useQuery({
    queryKey: mailKeys.drafts(),
    queryFn: () => apiClient.get<MailDraft[]>('/mail/drafts'),
  })
}

// ── Filters ──

export function useMailFilters() {
  return useQuery({
    queryKey: mailKeys.filters(),
    queryFn: () => apiClient.get<MailFilter[]>('/mail/filters'),
  })
}

// ── Mutations ──

export function useSendMail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SendMailData | FormData) => {
      if (data instanceof FormData) {
        return apiClient.upload<{ success: boolean }>('/mail/messages/send', data)
      }
      return apiClient.post<{ success: boolean }>('/mail/messages/send', data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mailKeys.messages() })
    },
  })
}

export function useArchiveMail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (messageId: string) =>
      apiClient.put<{ success: boolean }>(`/mail/messages/${messageId}/archive`),
    onMutate: async (messageId) => {
      await qc.cancelQueries({ queryKey: mailKeys.messages() })
      return { messageId }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: mailKeys.messages() })
    },
  })
}

export function useTrashMail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (messageId: string) =>
      apiClient.put<{ success: boolean }>(`/mail/messages/${messageId}/trash`),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: mailKeys.messages() })
    },
  })
}

export function useToggleStar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (messageId: string) =>
      apiClient.put<{ success: boolean; starred: boolean }>(`/mail/messages/${messageId}/star`),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: mailKeys.messages() })
    },
  })
}

export function useToggleRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ messageId, markAs }: { messageId: string; markAs: 'read' | 'unread' }) =>
      apiClient.put<{ success: boolean }>(`/mail/messages/${messageId}/${markAs}`),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: mailKeys.messages() })
      qc.invalidateQueries({ queryKey: mailKeys.labels() })
    },
  })
}

export function useUpdateMessageLabels() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ messageId, add, remove }: { messageId: string; add: string[]; remove: string[] }) =>
      apiClient.put<{ success: boolean }>(`/mail/messages/${messageId}/labels`, { add, remove }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: mailKeys.messages() })
      qc.invalidateQueries({ queryKey: mailKeys.labels() })
    },
  })
}

export function useSaveDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { to: string; cc?: string; bcc?: string; subject: string; body: string; threadId?: string }) =>
      apiClient.post<{ id: string }>('/mail/drafts', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mailKeys.drafts() })
    },
  })
}

export function useDeleteDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (draftId: string) =>
      apiClient.delete<{ success: boolean }>(`/mail/drafts/${draftId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mailKeys.drafts() })
    },
  })
}

export function useCreateLabel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; color?: { textColor: string; backgroundColor: string } }) =>
      apiClient.post<{ id: string; name: string }>('/mail/labels', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mailKeys.labels() })
    },
  })
}

export function useUpdateLabel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name: string; color?: { textColor: string; backgroundColor: string } }) =>
      apiClient.put<{ success: boolean }>(`/mail/labels/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mailKeys.labels() })
    },
  })
}

export function useDeleteLabel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (labelId: string) =>
      apiClient.delete<{ success: boolean }>(`/mail/labels/${labelId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mailKeys.labels() })
    },
  })
}

export function useCreateFilter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateFilterData) =>
      apiClient.post<{ id: string }>('/mail/filters', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mailKeys.filters() })
    },
  })
}

export function useDeleteFilter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (filterId: string) =>
      apiClient.delete<{ success: boolean }>(`/mail/filters/${filterId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mailKeys.filters() })
    },
  })
}

export function useSaveHotkeys() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (hotkeys: Record<string, string>) =>
      apiClient.put<{ success: boolean }>('/mail/hotkeys', { hotkeys }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mailKeys.status() })
    },
  })
}
