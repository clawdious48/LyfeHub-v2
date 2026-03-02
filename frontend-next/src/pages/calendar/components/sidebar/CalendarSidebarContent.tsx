// frontend-next/src/pages/calendar/components/sidebar/CalendarSidebarContent.tsx
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react'
import { useCalendars } from '@/api/hooks/useCalendar.js'
import { useCalendarUiStore } from '@/stores/calendarUiStore.js'
import {
  getMonthGridDates,
  toDateString,
  isToday,
  isSameDay,
} from '@/pages/calendar/utils/calendarHelpers.js'
import { DAYS_OF_WEEK } from '@/pages/calendar/utils/calendarConstants.js'

export function CalendarSidebarContent() {
  const { selectedDate, setSelectedDate, hiddenCalendarIds, toggleCalendarVisibility } = useCalendarUiStore()
  const { data: calendars = [] } = useCalendars()
  const selected = new Date(selectedDate + 'T00:00:00')

  // Mini-month state — can navigate independently of the main calendar
  const [miniMonth, setMiniMonth] = useState(() => ({ year: selected.getFullYear(), month: selected.getMonth() }))
  const gridDates = getMonthGridDates(miniMonth.year, miniMonth.month)

  function prevMonth() {
    setMiniMonth((prev) => {
      const d = new Date(prev.year, prev.month - 1, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  function nextMonth() {
    setMiniMonth((prev) => {
      const d = new Date(prev.year, prev.month + 1, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  const miniMonthLabel = new Date(miniMonth.year, miniMonth.month, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4 px-1">
      {/* Mini-month */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-text-primary">{miniMonthLabel}</span>
          <div className="flex items-center gap-0.5">
            <button onClick={prevMonth} className="p-0.5 rounded hover:bg-bg-hover transition-colors">
              <ChevronLeft className="size-3.5 text-text-muted" />
            </button>
            <button onClick={nextMonth} className="p-0.5 rounded hover:bg-bg-hover transition-colors">
              <ChevronRight className="size-3.5 text-text-muted" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-0">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="text-center text-[10px] text-text-muted py-0.5">
              {day.charAt(0)}
            </div>
          ))}
          {gridDates.map((date, i) => {
            const inMonth = date.getMonth() === miniMonth.month
            const today = isToday(date)
            const isSelected = isSameDay(date, selected)
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(toDateString(date))}
                className={[
                  'text-[11px] w-full aspect-square flex items-center justify-center rounded-full transition-all duration-150',
                  !inMonth && 'text-text-muted/40',
                  inMonth && !isSelected && !today && 'text-text-secondary hover:bg-bg-hover',
                  today && !isSelected && 'text-accent font-bold',
                  isSelected && 'bg-accent text-white font-bold',
                ].filter(Boolean).join(' ')}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>
      </div>

      {/* Calendar list */}
      <div>
        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
          Calendars
        </div>
        <div className="space-y-0.5">
          {calendars.map((cal) => {
            const hidden = hiddenCalendarIds.has(cal.id)
            return (
              <button
                key={cal.id}
                onClick={() => toggleCalendarVisibility(cal.id)}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-bg-hover transition-colors group"
              >
                <span
                  className={[
                    'size-3 rounded-sm shrink-0 transition-opacity duration-150',
                    hidden && 'opacity-30',
                  ].filter(Boolean).join(' ')}
                  style={{ backgroundColor: cal.color }}
                />
                <span className={[
                  'text-text-secondary text-xs truncate flex-1 text-left transition-opacity duration-150',
                  hidden && 'opacity-50 line-through',
                ].filter(Boolean).join(' ')}>
                  {cal.name}
                </span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                  {hidden ? (
                    <EyeOff className="size-3 text-text-muted" />
                  ) : (
                    <Eye className="size-3 text-text-muted" />
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
