// frontend-next/src/pages/calendar/components/views/DayView.tsx
import { useMemo } from 'react'
import { TimeGrid } from '../TimeGrid.js'
import type { CalendarItem } from '../../utils/calendarHelpers.js'

interface DayViewProps {
  selectedDate: string
  items: CalendarItem[]
  onSlotClick?: (date: string, time: string) => void
  onItemClick?: (item: CalendarItem) => void
  onDragCreate?: (date: string, startTime: string, endTime: string) => void
}

export function DayView({ selectedDate, items, onSlotClick, onItemClick, onDragCreate }: DayViewProps) {
  const dates = useMemo(() => [new Date(selectedDate + 'T00:00:00')], [selectedDate])

  return <TimeGrid dates={dates} items={items} onSlotClick={onSlotClick} onItemClick={onItemClick} onDragCreate={onDragCreate} />
}
