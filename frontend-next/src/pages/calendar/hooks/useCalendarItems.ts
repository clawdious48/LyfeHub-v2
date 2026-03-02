// frontend-next/src/pages/calendar/hooks/useCalendarItems.ts
import { useMemo } from 'react'
import { useCalendarEvents } from '@/api/hooks/useCalendar.js'
import { useTaskBase } from '@/api/hooks/useTasksAdapter.js'
import { eventToCalendarItem, taskRecordToCalendarItem } from '../utils/calendarHelpers.js'
import type { CalendarItem } from '../utils/calendarHelpers.js'
import { useCalendarUiStore } from '@/stores/calendarUiStore.js'

export function useCalendarItems(startDate: string, endDate: string) {
  const { data: events = [], isLoading: eventsLoading } = useCalendarEvents(startDate, endDate)
  const { records: allTasks, isLoading: tasksLoading } = useTaskBase()
  const hiddenCalendarIds = useCalendarUiStore((s) => s.hiddenCalendarIds)

  const items: CalendarItem[] = useMemo(() => {
    const eventItems = events.map(eventToCalendarItem)
    const taskItems = allTasks
      .filter((t) => t.due_date && !t.completed && t.due_date >= startDate && t.due_date <= endDate)
      .map(taskRecordToCalendarItem)
    const all = [...eventItems, ...taskItems]
    return all.filter((item) => !hiddenCalendarIds.has(item.calendarId))
  }, [events, allTasks, startDate, endDate, hiddenCalendarIds])

  return {
    items,
    isLoading: eventsLoading || tasksLoading,
  }
}
