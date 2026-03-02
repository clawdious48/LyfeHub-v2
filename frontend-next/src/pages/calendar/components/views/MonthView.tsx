// frontend-next/src/pages/calendar/components/views/MonthView.tsx
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { CalendarItem } from '../../utils/calendarHelpers.js'
import { getMonthGridDates, toDateString, isToday, formatTime } from '../../utils/calendarHelpers.js'
import { MAX_MONTH_CHIPS, DAYS_OF_WEEK } from '../../utils/calendarConstants.js'
import { useCalendarUiStore } from '@/stores/calendarUiStore.js'

interface MonthViewProps {
  selectedDate: string
  items: CalendarItem[]
  onDayClick?: (date: string) => void
  onItemClick?: (item: CalendarItem) => void
}

export function MonthView({ selectedDate, items, onDayClick, onItemClick }: MonthViewProps) {
  const setCurrentView = useCalendarUiStore((s) => s.setCurrentView)
  const setSelectedDate = useCalendarUiStore((s) => s.setSelectedDate)

  const selected = new Date(selectedDate + 'T00:00:00')
  const gridDates = useMemo(() => getMonthGridDates(selected.getFullYear(), selected.getMonth()), [selectedDate])

  // Group items by date
  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>()
    for (const item of items) {
      const existing = map.get(item.startDate) || []
      existing.push(item)
      map.set(item.startDate, existing)
    }
    return map
  }, [items])

  // Weeks (6 rows of 7 days)
  const weeks = useMemo(() => {
    const rows: Date[][] = []
    for (let i = 0; i < 42; i += 7) {
      rows.push(gridDates.slice(i, i + 7))
    }
    return rows
  }, [gridDates])

  return (
    <div className="flex flex-col h-full">
      {/* Day of week header */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAYS_OF_WEEK.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-text-muted py-2 border-l border-border first:border-l-0">
            {day}
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div className="flex-1 grid grid-rows-6">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 border-b border-border last:border-b-0 min-h-0">
            {week.map((date) => {
              const dateStr = toDateString(date)
              const inMonth = date.getMonth() === selected.getMonth()
              const today = isToday(date)
              const dayItems = itemsByDate.get(dateStr) || []
              const visibleItems = dayItems.slice(0, MAX_MONTH_CHIPS)
              const moreCount = dayItems.length - MAX_MONTH_CHIPS

              return (
                <div
                  key={dateStr}
                  className={[
                    'border-l border-border first:border-l-0 px-1 py-1 overflow-hidden cursor-pointer',
                    'hover:bg-bg-hover/50 transition-colors duration-100',
                    !inMonth && 'opacity-40',
                  ].filter(Boolean).join(' ')}
                  onClick={() => onDayClick?.(dateStr)}
                >
                  <div className="flex items-center justify-center mb-0.5">
                    <span className={[
                      'text-xs w-6 h-6 flex items-center justify-center rounded-full',
                      today && 'bg-accent text-white font-bold',
                      !today && 'text-text-secondary',
                    ].filter(Boolean).join(' ')}>
                      {date.getDate()}
                    </span>
                  </div>

                  {/* Event chips */}
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => {
                      const color = item.color || item.calendarColor
                      const isTask = item.type === 'task'
                      return (
                        <motion.button
                          key={item.id}
                          layout
                          onClick={(e) => {
                            e.stopPropagation()
                            onItemClick?.(item)
                          }}
                          className={[
                            'w-full text-left px-1.5 py-0.5 rounded text-[10px] leading-tight truncate',
                            'hover:brightness-125 transition-[filter] duration-100',
                            isTask ? 'border border-dashed' : '',
                          ].filter(Boolean).join(' ')}
                          style={{
                            backgroundColor: `${color}20`,
                            color,
                            borderColor: isTask ? `${color}60` : undefined,
                          }}
                        >
                          {item.startTime && (
                            <span className="opacity-70 mr-1">{formatTime(item.startTime)}</span>
                          )}
                          {item.title}
                        </motion.button>
                      )
                    })}
                    {moreCount > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedDate(dateStr)
                          setCurrentView('day')
                        }}
                        className="text-[10px] text-text-muted hover:text-accent transition-colors px-1"
                      >
                        +{moreCount} more
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
