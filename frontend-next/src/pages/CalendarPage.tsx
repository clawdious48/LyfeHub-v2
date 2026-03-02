// frontend-next/src/pages/CalendarPage.tsx
import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCalendarUiStore } from '@/stores/calendarUiStore.js'
import { CalendarToolbar } from '@/pages/calendar/components/CalendarToolbar.js'
import { useCalendarItems } from '@/pages/calendar/hooks/useCalendarItems.js'
import { toDateString, startOfWeek, addDays, getMonthGridDates } from '@/pages/calendar/utils/calendarHelpers.js'

export default function CalendarPage() {
  const { currentView, selectedDate } = useCalendarUiStore()
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
            {/* Views will be added in Phase 2 */}
            <div className="p-6 text-text-secondary text-sm">
              <p>{currentView} view — {items.length} items loaded for {startDate} to {endDate}</p>
              {isLoading && <p>Loading...</p>}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
