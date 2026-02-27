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
  title: string
  description: string
  start_date: string
  start_time: string | null
  end_date: string | null
  end_time: string | null
  is_all_day: number
  recurrence: string | null
  color: string | null
  created_at: string
  updated_at: string
}

export type CreateCalendarData = Partial<Omit<Calendar, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & {
  name: string
}

export type UpdateCalendarData = Partial<Omit<Calendar, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

export type CreateCalendarEventData = Partial<Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>> & {
  title: string
  start_date: string
}

export type UpdateCalendarEventData = Partial<Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>>
