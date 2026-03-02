// frontend-next/src/pages/calendar/utils/calendarConstants.ts

export type CalendarViewType = 'month' | 'week' | '3day' | 'day' | 'agenda'

export const VIEW_LABELS: Record<CalendarViewType, string> = {
  month: 'Month',
  week: 'Week',
  '3day': '3 Day',
  day: 'Day',
  agenda: 'Agenda',
}

export const MINUTES_PER_SLOT = 15
export const SLOTS_PER_HOUR = 60 / MINUTES_PER_SLOT
export const SLOTS_PER_DAY = 24 * SLOTS_PER_HOUR
export const DEFAULT_EVENT_DURATION_MINUTES = 60
export const DEFAULT_VISIBLE_START_HOUR = 6
export const DEFAULT_VISIBLE_END_HOUR = 22

export const HOUR_HEIGHT_PX = 60
export const SLOT_HEIGHT_PX = HOUR_HEIGHT_PX / SLOTS_PER_HOUR

export const MAX_MONTH_CHIPS = 3

export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
export const DAYS_OF_WEEK_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
