// frontend-next/src/pages/calendar/components/views/WeekView.tsx
import { useMemo } from 'react'
import { TimeGrid } from '../TimeGrid.js'
import { startOfWeek, getWeekDates } from '../../utils/calendarHelpers.js'
import type { CalendarItem } from '../../utils/calendarHelpers.js'

interface WeekViewProps {
  selectedDate: string
  items: CalendarItem[]
  onSlotClick?: (date: string, time: string) => void
  onItemClick?: (item: CalendarItem) => void
  onDragCreate?: (date: string, startTime: string, endTime: string) => void
}

export function WeekView({ selectedDate, items, onSlotClick, onItemClick, onDragCreate }: WeekViewProps) {
  const dates = useMemo(() => {
    const start = startOfWeek(new Date(selectedDate + 'T00:00:00'))
    return getWeekDates(start)
  }, [selectedDate])

  return <TimeGrid dates={dates} items={items} onSlotClick={onSlotClick} onItemClick={onItemClick} onDragCreate={onDragCreate} />
}
