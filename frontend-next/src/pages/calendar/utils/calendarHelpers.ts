// frontend-next/src/pages/calendar/utils/calendarHelpers.ts

import type { CalendarEvent } from '@/types/calendar.js'
import type { Task } from '@/types/task.js'
import { MINUTES_PER_SLOT, DEFAULT_EVENT_DURATION_MINUTES, SLOT_HEIGHT_PX } from './calendarConstants.js'

export interface CalendarItem {
  id: string
  type: 'event' | 'task'
  title: string
  description: string
  color: string | null
  startDate: string
  startTime: string | null
  endDate: string
  endTime: string | null
  isAllDay: boolean
  calendarId: string
  calendarName: string
  calendarColor: string
  // event-specific
  location?: string
  rrule?: string | null
  externalId?: string | null
  externalSource?: string | null
  // task-specific
  status?: string
  priority?: string | null
  listId?: string | null
  completed?: boolean
}

export function eventToCalendarItem(event: CalendarEvent): CalendarItem {
  return {
    id: event.id,
    type: 'event',
    title: event.title,
    description: event.description || '',
    color: event.color,
    startDate: normalizeDateStr(event.start_date),
    startTime: event.start_time,
    endDate: normalizeDateStr(event.end_date || event.start_date),
    endTime: event.end_time,
    isAllDay: Boolean(event.is_all_day),
    calendarId: event.calendar_id,
    calendarName: event.calendar_name || '',
    calendarColor: event.calendar_color || '#00aaff',
    location: event.location,
    rrule: event.rrule,
    externalId: event.external_id,
    externalSource: event.external_source,
  }
}

export function taskToCalendarItem(task: Task): CalendarItem {
  return {
    id: task.id,
    type: 'task',
    title: task.title,
    description: task.description || '',
    color: null,
    startDate: normalizeDateStr(task.due_date!),
    startTime: task.due_time,
    endDate: normalizeDateStr(task.due_date!),
    endTime: task.due_time_end,
    isAllDay: !task.due_time,
    calendarId: '',
    calendarName: 'Tasks',
    calendarColor: '#a855f7',
    status: task.status,
    priority: task.priority,
    listId: task.list_id,
    completed: Boolean(task.completed),
  }
}

/** Parse "HH:MM" or "HH:MM:SS" into total minutes from midnight */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** Convert total minutes from midnight to "HH:MM" */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Snap minutes to nearest MINUTES_PER_SLOT boundary */
export function snapToSlot(minutes: number): number {
  return Math.round(minutes / MINUTES_PER_SLOT) * MINUTES_PER_SLOT
}

/** Get the top position (px) for a given time on the time grid */
export function timeToY(time: string): number {
  return (timeToMinutes(time) / MINUTES_PER_SLOT) * SLOT_HEIGHT_PX
}

/** Get the time string for a given Y position on the time grid */
export function yToTime(y: number): string {
  const minutes = snapToSlot((y / SLOT_HEIGHT_PX) * MINUTES_PER_SLOT)
  return minutesToTime(Math.max(0, Math.min(minutes, 24 * 60 - MINUTES_PER_SLOT)))
}

/** Get the height (px) for a calendar item on the time grid */
export function itemHeight(item: CalendarItem): number {
  if (!item.startTime) return SLOT_HEIGHT_PX * 4 // default 1hr for no-time items
  const startMin = timeToMinutes(item.startTime)
  const endMin = item.endTime ? timeToMinutes(item.endTime) : startMin + DEFAULT_EVENT_DURATION_MINUTES
  return Math.max(((endMin - startMin) / MINUTES_PER_SLOT) * SLOT_HEIGHT_PX, SLOT_HEIGHT_PX)
}

/** Format a time string to display (e.g., "14:30" -> "2:30 PM") */
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return m === 0 ? `${hour12} ${period}` : `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

/** Normalize a date string to YYYY-MM-DD (handles ISO timestamps from Postgres) */
export function normalizeDateStr(dateStr: string): string {
  return dateStr.slice(0, 10)
}

/** Format a date to display (e.g., "2026-03-01" -> "March 1, 2026") */
export function formatDate(dateStr: string): string {
  const normalized = normalizeDateStr(dateStr)
  const date = new Date(normalized + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

/** Format a date for header display (e.g., "March 2026") */
export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/** Get date string in YYYY-MM-DD format */
export function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Check if two dates are the same day */
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Check if a date is today */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

/** Get the start of the week (Sunday) for a given date */
export function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

/** Get the end of the week (Saturday) for a given date */
export function endOfWeek(date: Date): Date {
  const d = startOfWeek(date)
  d.setDate(d.getDate() + 6)
  return d
}

/** Get an array of dates for a week starting from the given date */
export function getWeekDates(startDate: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    return d
  })
}

/** Get the month grid dates (6 rows x 7 cols) for a given month */
export function getMonthGridDates(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  const start = startOfWeek(firstDay)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })
}

/** Add days to a date */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/** Check if two time ranges overlap */
export function timeRangesOverlap(
  aStart: string, aEnd: string,
  bStart: string, bEnd: string,
): boolean {
  const aS = timeToMinutes(aStart)
  const aE = timeToMinutes(aEnd)
  const bS = timeToMinutes(bStart)
  const bE = timeToMinutes(bEnd)
  return aS < bE && bS < aE
}

/**
 * Column-packing overlap layout algorithm.
 * Given items for a single day, returns each item's column index and total columns.
 * Items must have startTime and endTime (non-all-day).
 */
export interface OverlapLayout {
  itemId: string
  column: number
  totalColumns: number
}

export function computeOverlapLayout(items: CalendarItem[]): OverlapLayout[] {
  const timed = items
    .filter((it) => it.startTime && (it.endTime || it.startTime))
    .map((it) => ({
      id: it.id,
      start: timeToMinutes(it.startTime!),
      end: timeToMinutes(it.endTime || minutesToTime(timeToMinutes(it.startTime!) + DEFAULT_EVENT_DURATION_MINUTES)),
    }))
    .sort((a, b) => a.start - b.start || a.end - b.end)

  if (timed.length === 0) return []

  // Build overlap groups — connected components where items overlap transitively
  const groups: typeof timed[][] = []
  let currentGroup = [timed[0]]

  for (let i = 1; i < timed.length; i++) {
    const groupEnd = Math.max(...currentGroup.map((it) => it.end))
    if (timed[i].start < groupEnd) {
      currentGroup.push(timed[i])
    } else {
      groups.push(currentGroup)
      currentGroup = [timed[i]]
    }
  }
  groups.push(currentGroup)

  // Assign columns within each group
  const result: OverlapLayout[] = []
  for (const group of groups) {
    const columns: { end: number }[] = []
    for (const item of group) {
      let placed = false
      for (let c = 0; c < columns.length; c++) {
        if (item.start >= columns[c].end) {
          columns[c].end = item.end
          result.push({ itemId: item.id, column: c, totalColumns: 0 })
          placed = true
          break
        }
      }
      if (!placed) {
        result.push({ itemId: item.id, column: columns.length, totalColumns: 0 })
        columns.push({ end: item.end })
      }
    }
    // Set totalColumns for all items in this group
    const totalCols = columns.length
    for (const r of result) {
      if (group.some((it) => it.id === r.itemId)) {
        r.totalColumns = totalCols
      }
    }
  }

  return result
}
