import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client.js'
import type {
  Calendar,
  CalendarEvent,
  CreateCalendarData,
  UpdateCalendarData,
  CreateCalendarEventData,
  UpdateCalendarEventData,
} from '@/types/index.js'

export const calendarKeys = {
  all: ['calendars'] as const,
  lists: () => [...calendarKeys.all, 'list'] as const,
  events: () => ['calendar-events'] as const,
  eventRange: (start: string, end: string) =>
    [...calendarKeys.events(), { start, end }] as const,
}

export function useCalendars() {
  return useQuery({
    queryKey: calendarKeys.lists(),
    queryFn: () => apiClient.get<Calendar[]>('/calendars'),
  })
}

export function useCreateCalendar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCalendarData) =>
      apiClient.post<Calendar>('/calendars', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.lists() })
    },
  })
}

export function useUpdateCalendar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateCalendarData & { id: string }) =>
      apiClient.patch<Calendar>(`/calendars/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.lists() })
    },
  })
}

export function useDeleteCalendar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<void>(`/calendars/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.lists() })
    },
  })
}

export function useCalendarEvents(start: string, end: string) {
  return useQuery({
    queryKey: calendarKeys.eventRange(start, end),
    queryFn: () =>
      apiClient.get<CalendarEvent[]>(
        `/calendar-events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      ),
    enabled: !!start && !!end,
  })
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCalendarEventData) =>
      apiClient.post<CalendarEvent>('/calendar-events', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.events() })
    },
  })
}

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateCalendarEventData & { id: string }) =>
      apiClient.patch<CalendarEvent>(`/calendar-events/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.events() })
    },
  })
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<void>(`/calendar-events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.events() })
    },
  })
}
