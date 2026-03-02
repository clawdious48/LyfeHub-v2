// frontend-next/src/pages/calendar/components/CalendarToolbar.tsx
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button.js'
import { useCalendarUiStore } from '@/stores/calendarUiStore.js'
import { VIEW_LABELS, type CalendarViewType } from '../utils/calendarConstants.js'
import { formatMonthYear, addDays, startOfWeek, toDateString } from '../utils/calendarHelpers.js'

interface CalendarToolbarProps {
  onCreateEvent: () => void
}

const VIEW_ORDER: CalendarViewType[] = ['month', 'week', '3day', 'day', 'agenda']

export function CalendarToolbar({ onCreateEvent }: CalendarToolbarProps) {
  const { currentView, setCurrentView, selectedDate, setSelectedDate } = useCalendarUiStore()

  const selected = new Date(selectedDate + 'T00:00:00')

  function navigatePrev() {
    const d = new Date(selectedDate + 'T00:00:00')
    if (currentView === 'month') d.setMonth(d.getMonth() - 1)
    else if (currentView === 'week') d.setDate(d.getDate() - 7)
    else if (currentView === '3day') d.setDate(d.getDate() - 3)
    else d.setDate(d.getDate() - 1)
    setSelectedDate(toDateString(d))
  }

  function navigateNext() {
    const d = new Date(selectedDate + 'T00:00:00')
    if (currentView === 'month') d.setMonth(d.getMonth() + 1)
    else if (currentView === 'week') d.setDate(d.getDate() + 7)
    else if (currentView === '3day') d.setDate(d.getDate() + 3)
    else d.setDate(d.getDate() + 1)
    setSelectedDate(toDateString(d))
  }

  function goToToday() {
    setSelectedDate(toDateString(new Date()))
  }

  function getHeaderLabel(): string {
    if (currentView === 'month') return formatMonthYear(selected)
    if (currentView === 'day') {
      return selected.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    }
    if (currentView === 'agenda') return formatMonthYear(selected)
    // week / 3day: show range
    const start = currentView === 'week' ? startOfWeek(selected) : selected
    const days = currentView === 'week' ? 6 : 2
    const end = addDays(start, days)
    const sameMonth = start.getMonth() === end.getMonth()
    if (sameMonth) {
      return `${start.toLocaleDateString('en-US', { month: 'long' })} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`
    }
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
      {/* Left: Nav */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={goToToday}>
          Today
        </Button>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="size-8" onClick={navigatePrev}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={navigateNext}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <h2 className="text-lg font-semibold text-text-primary ml-2">{getHeaderLabel()}</h2>
      </div>

      {/* Right: View switcher + Create */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-bg-surface border border-border rounded-lg p-0.5">
          {VIEW_ORDER.map((view) => (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
              className={[
                'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150',
                currentView === view
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
              ].join(' ')}
            >
              {VIEW_LABELS[view]}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={onCreateEvent} className="gap-1.5">
          <Plus className="size-4" />
          Event
        </Button>
      </div>
    </div>
  )
}
