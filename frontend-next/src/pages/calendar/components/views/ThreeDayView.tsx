// frontend-next/src/pages/calendar/components/views/ThreeDayView.tsx
import { useMemo } from 'react'
import { TimeGrid } from '../TimeGrid.js'
import type { CalendarItem } from '../../utils/calendarHelpers.js'

interface ThreeDayViewProps {
  selectedDate: string
  items: CalendarItem[]
  onSlotClick?: (date: string, time: string) => void
  onItemClick?: (item: CalendarItem) => void
}

export function ThreeDayView({ selectedDate, items, onSlotClick, onItemClick }: ThreeDayViewProps) {
  const dates = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00')
    return Array.from({ length: 3 }, (_, i) => {
      const date = new Date(d)
      date.setDate(date.getDate() + i)
      return date
    })
  }, [selectedDate])

  return <TimeGrid dates={dates} items={items} onSlotClick={onSlotClick} onItemClick={onItemClick} />
}
