// frontend-next/src/pages/calendar/hooks/useCalendarItems.ts
import { useMemo } from 'react'
import { useCalendarEvents } from '@/api/hooks/useCalendar.js'
import { useCalendarTasks } from '@/api/hooks/useTasks.js'
import { eventToCalendarItem, taskToCalendarItem } from '../utils/calendarHelpers.js'
import type { CalendarItem } from '../utils/calendarHelpers.js'
import { useCalendarUiStore } from '@/stores/calendarUiStore.js'

export function useCalendarItems(startDate: string, endDate: string) {
  const { data: events = [], isLoading: eventsLoading } = useCalendarEvents(startDate, endDate)
  const { data: tasks = [], isLoading: tasksLoading } = useCalendarTasks(startDate, endDate)
  const hiddenCalendarIds = useCalendarUiStore((s) => s.hiddenCalendarIds)

  const items: CalendarItem[] = useMemo(() => {
    const eventItems = events.map(eventToCalendarItem)
    const taskItems = tasks
      .filter((t) => t.due_date)
      .map(taskToCalendarItem)
    const all = [...eventItems, ...taskItems]
    // Filter by hidden calendars
    return all.filter((item) => !hiddenCalendarIds.has(item.calendarId))
  }, [events, tasks, hiddenCalendarIds])

  return {
    items,
    isLoading: eventsLoading || tasksLoading,
  }
}
