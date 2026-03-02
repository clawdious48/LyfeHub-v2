// frontend-next/src/pages/CalendarPage.tsx
import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCalendarUiStore } from '@/stores/calendarUiStore.js'
import { CalendarToolbar } from '@/pages/calendar/components/CalendarToolbar.js'
import { useCalendarItems } from '@/pages/calendar/hooks/useCalendarItems.js'
import { toDateString, startOfWeek, addDays, getMonthGridDates } from '@/pages/calendar/utils/calendarHelpers.js'
import type { CalendarItem } from '@/pages/calendar/utils/calendarHelpers.js'
import { MonthView } from '@/pages/calendar/components/views/MonthView.js'
import { WeekView } from '@/pages/calendar/components/views/WeekView.js'
import { ThreeDayView } from '@/pages/calendar/components/views/ThreeDayView.js'
import { DayView } from '@/pages/calendar/components/views/DayView.js'
import { AgendaView } from '@/pages/calendar/components/views/AgendaView.js'

export default function CalendarPage() {
  const { currentView, selectedDate, setSelectedDate, setCurrentView } = useCalendarUiStore()
  const [createModalOpen, setCreateModalOpen] = useState(false)

  // Compute the date range for the current view
  const { startDate, endDate } = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00')
    if (currentView === 'month') {
      const grid = getMonthGridDates(d.getFullYear(), d.getMonth())
      return { startDate: toDateString(grid[0]), endDate: toDateString(grid[41]) }
    }
    if (currentView === 'week') {
      const ws = startOfWeek(d)
      return { startDate: toDateString(ws), endDate: toDateString(addDays(ws, 6)) }
    }
    if (currentView === '3day') {
      return { startDate: toDateString(d), endDate: toDateString(addDays(d, 2)) }
    }
    if (currentView === 'day') {
      return { startDate: toDateString(d), endDate: toDateString(d) }
    }
    // agenda: 30 days forward
    return { startDate: toDateString(d), endDate: toDateString(addDays(d, 30)) }
  }, [currentView, selectedDate])

  const { items, isLoading } = useCalendarItems(startDate, endDate)

  function handleSlotClick(date: string, time: string) {
    // TODO: Open quick-create popover at this date/time (Task 14)
    console.log('Slot clicked:', date, time)
  }

  function handleItemClick(item: CalendarItem) {
    // TODO: Open event/task detail modal (Task 15)
    console.log('Item clicked:', item.id, item.type)
  }

  return (
    <div className="flex flex-col h-full">
      <CalendarToolbar onCreateEvent={() => setCreateModalOpen(true)} />
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentView}-${startDate}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {currentView === 'month' && (
              <MonthView
                selectedDate={selectedDate}
                items={items}
                onDayClick={(date) => {
                  setSelectedDate(date)
                  setCurrentView('day')
                }}
                onItemClick={handleItemClick}
              />
            )}
            {currentView === 'week' && (
              <WeekView
                selectedDate={selectedDate}
                items={items}
                onSlotClick={handleSlotClick}
                onItemClick={handleItemClick}
              />
            )}
            {currentView === '3day' && (
              <ThreeDayView
                selectedDate={selectedDate}
                items={items}
                onSlotClick={handleSlotClick}
                onItemClick={handleItemClick}
              />
            )}
            {currentView === 'day' && (
              <DayView
                selectedDate={selectedDate}
                items={items}
                onSlotClick={handleSlotClick}
                onItemClick={handleItemClick}
              />
            )}
            {currentView === 'agenda' && (
              <AgendaView
                items={items}
                onItemClick={handleItemClick}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
