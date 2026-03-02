export interface Calendar {
  id: string
  name: string
  description: string
  color: string
  user_id: string
  is_default: number
  system_type: string | null
  created_at: string
  updated_at: string
}

export interface CalendarEvent {
  id: string
  calendar_id: string
  user_id: string
  title: string
  description: string
  location: string
  start_date: string
  start_time: string | null
  end_date: string
  end_time: string | null
  is_all_day: boolean
  timezone: string
  rrule: string | null
  recurrence_id: string | null
  is_exception: boolean
  color: string | null
  external_id: string | null
  external_source: string | null
  external_etag: string | null
  // JOINed from calendars table
  calendar_name: string
  calendar_color: string
  created_at: string
  updated_at: string
}

export type CreateCalendarEventData = {
  title: string
  start_date: string
  end_date?: string
  start_time?: string
  end_time?: string
  is_all_day?: boolean
  calendar_id?: string
  description?: string
  location?: string
  color?: string
  rrule?: string
  timezone?: string
}

export type UpdateCalendarEventData = Partial<Omit<CalendarEvent, 'id' | 'user_id' | 'calendar_name' | 'calendar_color' | 'created_at' | 'updated_at'>>

export type CreateCalendarData = Partial<Omit<Calendar, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & {
  name: string
}

export type UpdateCalendarData = Partial<Omit<Calendar, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
