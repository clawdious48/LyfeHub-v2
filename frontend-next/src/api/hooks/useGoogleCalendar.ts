// frontend-next/src/api/hooks/useGoogleCalendar.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client.js'

export const googleCalendarKeys = {
  status: ['google-calendar', 'status'] as const,
  calendars: ['google-calendar', 'calendars'] as const,
}

interface GoogleCalendarStatus {
  connected: boolean
  google_email?: string
  last_synced_at?: string
  sync_enabled?: boolean
}

interface GoogleCalendarMapping {
  id: string
  google_calendar_id: string
  local_calendar_id: string
  name: string
  color: string
  sync_direction: string
  is_visible: boolean
}

export function useGoogleCalendarStatus() {
  return useQuery({
    queryKey: googleCalendarKeys.status,
    queryFn: () => apiClient.get<GoogleCalendarStatus>('/google-calendar/status'),
  })
}

export function useGoogleCalendars() {
  return useQuery({
    queryKey: googleCalendarKeys.calendars,
    queryFn: async () => {
      const res = await apiClient.get<{ calendars: GoogleCalendarMapping[] }>('/google-calendar/calendars')
      return res.calendars
    },
  })
}

export function useConnectGoogleCalendar() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.get<{ url: string }>('/auth/google/calendar')
      window.location.href = res.url
    },
  })
}

export function useDisconnectGoogleCalendar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.delete<void>('/google-calendar/connection'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: googleCalendarKeys.status })
      queryClient.invalidateQueries({ queryKey: googleCalendarKeys.calendars })
    },
  })
}

export function useSyncGoogleCalendar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.post<{ synced: number }>('/google-calendar/sync', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      queryClient.invalidateQueries({ queryKey: googleCalendarKeys.status })
    },
  })
}

export function useUpdateGoogleCalendarMapping() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; is_visible?: boolean; sync_direction?: string }) =>
      apiClient.patch(`/google-calendar/calendars/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: googleCalendarKeys.calendars })
    },
  })
}
