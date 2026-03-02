import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client.js'
import type {
  ApexJob,
  ApexJobNote,
  ApexJobEstimate,
  ApexJobPayment,
  ApexJobLabor,
  ApexJobReceipt,
  ApexJobWorkOrder,
  JobAccountingData,
  JobActivityEvent,
  JobContactWithDetails,
  ApexDocument,
  JobsListResponse,
  CreateApexJobData,
  UpdateApexJobData,
} from '@/types/index.js'

export const jobKeys = {
  all: ['apex-jobs'] as const,
  lists: () => [...jobKeys.all, 'list'] as const,
  list: () => [...jobKeys.lists()] as const,
  details: () => [...jobKeys.all, 'detail'] as const,
  detail: (id: string) => [...jobKeys.details(), id] as const,
  notes: (id: string) => [...jobKeys.all, 'notes', id] as const,
  estimates: (id: string) => [...jobKeys.all, 'estimates', id] as const,
  payments: (id: string) => [...jobKeys.all, 'payments', id] as const,
  labor: (id: string) => [...jobKeys.all, 'labor', id] as const,
  receipts: (id: string) => [...jobKeys.all, 'receipts', id] as const,
  workOrders: (id: string) => [...jobKeys.all, 'work-orders', id] as const,
  accounting: (id: string) => [...jobKeys.all, 'accounting', id] as const,
  activity: (id: string) => [...jobKeys.all, 'activity', id] as const,
  contacts: (id: string) => [...jobKeys.all, 'contacts', id] as const,
  documents: (id: string) => [...jobKeys.all, 'documents', id] as const,
}

// ── Core Job CRUD ──────────────────────────────────────────────

export function useJobs() {
  return useQuery({
    queryKey: jobKeys.list(),
    queryFn: () => apiClient.get<JobsListResponse>('/apex-jobs'),
    select: (data) => data.projects,
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

// ── Dates ──────────────────────────────────────────────────────

export function useUpdateJobDates() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dates }: { id: string } & Record<string, string | null>) =>
      apiClient.patch(`/apex-jobs/${id}/dates`, dates),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(variables.id) })
    },
  })
}

// ── Ready to Invoice ───────────────────────────────────────────

export function useToggleJobInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ready_to_invoice }: { id: string; ready_to_invoice: boolean }) =>
      apiClient.patch(`/apex-jobs/${id}/ready-to-invoice`, { ready_to_invoice }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: jobKeys.accounting(variables.id) })
    },
  })
}

// ── Notes ──────────────────────────────────────────────────────

export function useJobNotes(jobId: string) {
  return useQuery({
    queryKey: jobKeys.notes(jobId),
    queryFn: () => apiClient.get<ApexJobNote[]>(`/apex-jobs/${jobId}/notes`),
    enabled: !!jobId,
  })
}

export function useCreateJobNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, ...data }: { jobId: string; subject: string; note_type: string; content: string; phase_id?: string | null }) =>
      apiClient.post<ApexJobNote>(`/apex-jobs/${jobId}/notes`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.notes(variables.jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.activity(variables.jobId) })
    },
  })
}

export function useDeleteJobNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, noteId }: { jobId: string; noteId: string }) =>
      apiClient.delete(`/apex-jobs/${jobId}/notes/${noteId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.notes(variables.jobId) })
    },
  })
}

// ── Estimates ──────────────────────────────────────────────────

export function useJobEstimates(jobId: string) {
  return useQuery({
    queryKey: jobKeys.estimates(jobId),
    queryFn: () => apiClient.get<ApexJobEstimate[]>(`/apex-jobs/${jobId}/estimates`),
    enabled: !!jobId,
  })
}

export function useCreateJobEstimate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, ...data }: { jobId: string; estimate_type: string; amount: number; version?: number; notes?: string; phase_id?: string | null }) =>
      apiClient.post<ApexJobEstimate>(`/apex-jobs/${jobId}/estimates`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.estimates(variables.jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.accounting(variables.jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.activity(variables.jobId) })
    },
  })
}

// ── Payments ───────────────────────────────────────────────────

export function useJobPayments(jobId: string) {
  return useQuery({
    queryKey: jobKeys.payments(jobId),
    queryFn: () => apiClient.get<ApexJobPayment[]>(`/apex-jobs/${jobId}/payments`),
    enabled: !!jobId,
  })
}

export function useCreateJobPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, ...data }: { jobId: string; amount: number; payment_method: string; payment_type: string; check_number?: string; received_date?: string | null; deposited_date?: string | null; invoice_number?: string; estimate_id?: string | null; notes?: string; phase_id?: string | null }) =>
      apiClient.post<ApexJobPayment>(`/apex-jobs/${jobId}/payments`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.payments(variables.jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.accounting(variables.jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.activity(variables.jobId) })
    },
  })
}

// ── Labor ──────────────────────────────────────────────────────

export function useJobLabor(jobId: string) {
  return useQuery({
    queryKey: jobKeys.labor(jobId),
    queryFn: () => apiClient.get<ApexJobLabor[]>(`/apex-jobs/${jobId}/labor`),
    enabled: !!jobId,
  })
}

export function useCreateJobLabor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, ...data }: { jobId: string; employee_name: string; work_date?: string | null; hours: number; hourly_rate: number; work_category: string; description?: string; billable?: number; phase_id?: string | null }) =>
      apiClient.post<ApexJobLabor>(`/apex-jobs/${jobId}/labor`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.labor(variables.jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.accounting(variables.jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.activity(variables.jobId) })
    },
  })
}

export function useUpdateJobLabor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, entryId, ...data }: { jobId: string; entryId: string } & Partial<Omit<ApexJobLabor, 'id' | 'job_id' | 'created_at' | 'author_id'>>) =>
      apiClient.patch<ApexJobLabor>(`/apex-jobs/${jobId}/labor/${entryId}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.labor(variables.jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.accounting(variables.jobId) })
    },
  })
}

export function useDeleteJobLabor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, entryId }: { jobId: string; entryId: string }) =>
      apiClient.delete(`/apex-jobs/${jobId}/labor/${entryId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.labor(variables.jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.accounting(variables.jobId) })
    },
  })
}

// ── Receipts ───────────────────────────────────────────────────

export function useJobReceipts(jobId: string) {
  return useQuery({
    queryKey: jobKeys.receipts(jobId),
    queryFn: () => apiClient.get<ApexJobReceipt[]>(`/apex-jobs/${jobId}/receipts`),
    enabled: !!jobId,
  })
}

export function useCreateJobReceipt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, ...data }: { jobId: string; amount: number; expense_category: string; description?: string; vendor?: string; paid_by: string; reimbursable?: number; expense_date?: string | null; phase_id?: string | null }) =>
      apiClient.post<ApexJobReceipt>(`/apex-jobs/${jobId}/receipts`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.receipts(variables.jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.accounting(variables.jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.activity(variables.jobId) })
    },
  })
}

export function useUpdateJobReceipt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, receiptId, ...data }: { jobId: string; receiptId: string } & Partial<Omit<ApexJobReceipt, 'id' | 'job_id' | 'created_at' | 'author_id' | 'document_id'>>) =>
      apiClient.patch<ApexJobReceipt>(`/apex-jobs/${jobId}/receipts/${receiptId}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.receipts(variables.jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.accounting(variables.jobId) })
    },
  })
}

export function useDeleteJobReceipt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, receiptId }: { jobId: string; receiptId: string }) =>
      apiClient.delete(`/apex-jobs/${jobId}/receipts/${receiptId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.receipts(variables.jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.accounting(variables.jobId) })
    },
  })
}

// ── Work Orders ────────────────────────────────────────────────

export function useJobWorkOrders(jobId: string) {
  return useQuery({
    queryKey: jobKeys.workOrders(jobId),
    queryFn: () => apiClient.get<ApexJobWorkOrder[]>(`/apex-jobs/${jobId}/work-orders`),
    enabled: !!jobId,
  })
}

export function useCreateJobWorkOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, ...data }: { jobId: string; wo_number?: string; title: string; description?: string; budget_amount?: number; status?: string; phase_id?: string | null }) =>
      apiClient.post<ApexJobWorkOrder>(`/apex-jobs/${jobId}/work-orders`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.workOrders(variables.jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.accounting(variables.jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.activity(variables.jobId) })
    },
  })
}

export function useUpdateJobWorkOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, woId, ...data }: { jobId: string; woId: string } & Partial<Omit<ApexJobWorkOrder, 'id' | 'job_id' | 'created_at' | 'author_id'>>) =>
      apiClient.patch<ApexJobWorkOrder>(`/apex-jobs/${jobId}/work-orders/${woId}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.workOrders(variables.jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.accounting(variables.jobId) })
    },
  })
}

export function useDeleteJobWorkOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, woId }: { jobId: string; woId: string }) =>
      apiClient.delete(`/apex-jobs/${jobId}/work-orders/${woId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.workOrders(variables.jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.accounting(variables.jobId) })
    },
  })
}

// ── Accounting ─────────────────────────────────────────────────

export function useJobAccounting(jobId: string) {
  return useQuery({
    queryKey: jobKeys.accounting(jobId),
    queryFn: () => apiClient.get<JobAccountingData>(`/apex-jobs/${jobId}/accounting`),
    enabled: !!jobId,
  })
}

// ── Activity ───────────────────────────────────────────────────

export function useJobActivity(jobId: string) {
  return useQuery({
    queryKey: jobKeys.activity(jobId),
    queryFn: () => apiClient.get<JobActivityEvent[]>(`/apex-jobs/${jobId}/activity`),
    enabled: !!jobId,
  })
}

// ── Contacts ───────────────────────────────────────────────────

export function useJobContacts(jobId: string) {
  return useQuery({
    queryKey: jobKeys.contacts(jobId),
    queryFn: () => apiClient.get<JobContactWithDetails[]>(`/apex-crm/jobs/${jobId}/contacts`),
    enabled: !!jobId,
  })
}

export function useAddJobContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, ...data }: { jobId: string; contact_id: string; job_role?: string; notes?: string; crm_organization_id?: string | null }) =>
      apiClient.post(`/apex-crm/jobs/${jobId}/contacts`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.contacts(variables.jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.activity(variables.jobId) })
    },
  })
}

export function useRemoveJobContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, contactLinkId }: { jobId: string; contactLinkId: string }) =>
      apiClient.delete(`/apex-crm/jobs/${jobId}/contacts/${contactLinkId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.contacts(variables.jobId) })
    },
  })
}

// ── Documents ──────────────────────────────────────────────────

export function useJobDocuments(jobId: string) {
  return useQuery({
    queryKey: jobKeys.documents(jobId),
    queryFn: () => apiClient.get<ApexDocument[]>(`/apex-documents/job/${jobId}`),
    enabled: !!jobId,
  })
}

export function useUploadJobDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, formData }: { jobId: string; formData: FormData }) => {
      formData.append('job_id', jobId)
      return apiClient.upload<ApexDocument>('/apex-documents/upload', formData)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.documents(variables.jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.activity(variables.jobId) })
    },
  })
}
