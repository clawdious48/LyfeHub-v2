// frontend-next/src/pages/CalendarPage.tsx
import { useState, useMemo, useEffect } from 'react'
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
import { QuickCreatePopover } from '@/pages/calendar/components/modals/QuickCreatePopover.js'
import { EventModal } from '@/pages/calendar/components/modals/EventModal.js'
import type { CalendarEvent } from '@/types/calendar.js'
import { useUpdateTaskRecord } from '@/api/hooks/useTasksAdapter.js'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'

export default function CalendarPage() {
  const { currentView, selectedDate, setSelectedDate, setCurrentView } = useCalendarUiStore()

  // Quick-create popover state
  const [quickCreateOpen, setQuickCreateOpen] = useState(false)
  const [quickCreateDate, setQuickCreateDate] = useState('')
  const [quickCreateStartTime, setQuickCreateStartTime] = useState<string | undefined>()
  const [quickCreateEndTime, setQuickCreateEndTime] = useState<string | undefined>()
  const [quickCreateAnchor, setQuickCreateAnchor] = useState<{ top: number; left: number } | undefined>()

  // Event modal state
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [eventModalPrefill, setEventModalPrefill] = useState<{
    title?: string
    date?: string
    startTime?: string
    endTime?: string
    calendarId?: string
  } | undefined>()

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
  const updateTaskRecord = useUpdateTaskRecord()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()

  // Handle post-OAuth redirect
  useEffect(() => {
    if (searchParams.get('google_connected') === 'true') {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      queryClient.invalidateQueries({ queryKey: ['google-calendar'] })
      queryClient.invalidateQueries({ queryKey: ['calendars'] })
      // Clean up the URL
      searchParams.delete('google_connected')
      setSearchParams(searchParams, { replace: true })
    }
  }, [])

  function handleTaskDrop(taskId: string, date: string, startTime?: string, endTime?: string) {
    updateTaskRecord.mutate({
      id: taskId,
      due_date: date,
      due_time: startTime || null,
      due_time_end: endTime || null,
    })
  }

  function handleSlotClick(date: string, time: string) {
    // Calculate default end time (1 hour later)
    const [h, m] = time.split(':').map(Number)
    const endMinutes = h * 60 + m + 60
    const endH = Math.floor(endMinutes / 60) % 24
    const endM = endMinutes % 60
    const computedEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`

    setQuickCreateDate(date)
    setQuickCreateStartTime(time)
    setQuickCreateEndTime(computedEndTime)
    setQuickCreateAnchor(undefined)
    setQuickCreateOpen(true)
  }

  function handleItemClick(item: CalendarItem) {
    if (item.type === 'task') {
      // TODO: Open task detail in future
      console.log('Task clicked:', item.id)
      return
    }
    // For events, open edit modal with prefilled data
    setEventModalPrefill({
      title: item.title,
      date: item.startDate,
      startTime: item.startTime || undefined,
      endTime: item.endTime || undefined,
      calendarId: item.calendarId,
    })
    setEditingEvent(null) // TODO: fetch full CalendarEvent for edit mode
    setEventModalOpen(true)
  }

  function handleDragCreate(date: string, startTime: string, endTime: string) {
    setQuickCreateDate(date)
    setQuickCreateStartTime(startTime)
    setQuickCreateEndTime(endTime)
    setQuickCreateAnchor(undefined)
    setQuickCreateOpen(true)
  }

  function handleCreateEvent() {
    setEditingEvent(null)
    setEventModalPrefill(undefined)
    setEventModalOpen(true)
  }

  return (
    <div className="flex flex-col h-full">
      <CalendarToolbar onCreateEvent={handleCreateEvent} />
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
                onTaskDrop={(taskId, date) => handleTaskDrop(taskId, date)}
              />
            )}
            {currentView === 'week' && (
              <WeekView
                selectedDate={selectedDate}
                items={items}
                onSlotClick={handleSlotClick}
                onItemClick={handleItemClick}
                onDragCreate={handleDragCreate}
                onTaskDrop={handleTaskDrop}
              />
            )}
            {currentView === '3day' && (
              <ThreeDayView
                selectedDate={selectedDate}
                items={items}
                onSlotClick={handleSlotClick}
                onItemClick={handleItemClick}
                onDragCreate={handleDragCreate}
                onTaskDrop={handleTaskDrop}
              />
            )}
            {currentView === 'day' && (
              <DayView
                selectedDate={selectedDate}
                items={items}
                onSlotClick={handleSlotClick}
                onItemClick={handleItemClick}
                onDragCreate={handleDragCreate}
                onTaskDrop={handleTaskDrop}
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

      {/* Quick-create popover for slot clicks */}
      <QuickCreatePopover
        open={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
        onExpandToFull={(data) => {
          setQuickCreateOpen(false)
          setEventModalPrefill(data)
          setEventModalOpen(true)
        }}
        date={quickCreateDate}
        startTime={quickCreateStartTime}
        endTime={quickCreateEndTime}
        anchorPosition={quickCreateAnchor}
      />

      {/* Full event create/edit modal */}
      <EventModal
        open={eventModalOpen}
        onOpenChange={setEventModalOpen}
        event={editingEvent}
        prefill={eventModalPrefill}
      />
    </div>
  )
}
