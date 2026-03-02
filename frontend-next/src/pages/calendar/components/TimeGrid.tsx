// frontend-next/src/pages/calendar/components/TimeGrid.tsx
import { useRef, useEffect, useMemo } from 'react'
import type { CalendarItem } from '../utils/calendarHelpers.js'
import { toDateString, isToday, computeOverlapLayout, formatTime, minutesToTime } from '../utils/calendarHelpers.js'
import { HOUR_HEIGHT_PX, SLOT_HEIGHT_PX, SLOTS_PER_DAY, DEFAULT_VISIBLE_START_HOUR } from '../utils/calendarConstants.js'
import { CalendarItemBlock } from './CalendarItemBlock.js'
import { CurrentTimeIndicator } from './CurrentTimeIndicator.js'

interface TimeGridProps {
  dates: Date[]
  items: CalendarItem[]
  onSlotClick?: (date: string, time: string) => void
  onItemClick?: (item: CalendarItem) => void
}

const TOTAL_HEIGHT = SLOTS_PER_DAY * SLOT_HEIGHT_PX

export function TimeGrid({ dates, items, onSlotClick, onItemClick }: TimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to current time or DEFAULT_VISIBLE_START_HOUR on mount
  useEffect(() => {
    if (!scrollRef.current) return
    const now = new Date()
    const scrollTarget = isToday(dates[0]) || dates.some(isToday)
      ? (now.getHours() * 60 + now.getMinutes()) / 60 * HOUR_HEIGHT_PX - scrollRef.current.clientHeight * 0.3
      : DEFAULT_VISIBLE_START_HOUR * HOUR_HEIGHT_PX
    scrollRef.current.scrollTop = Math.max(0, scrollTarget)
  }, [dates])

  // Group items by date
  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>()
    for (const date of dates) {
      map.set(toDateString(date), [])
    }
    for (const item of items) {
      const dateItems = map.get(item.startDate)
      if (dateItems) dateItems.push(item)
    }
    return map
  }, [dates, items])

  // Compute overlap layouts per date
  const layoutsByDate = useMemo(() => {
    const map = new Map<string, Map<string, ReturnType<typeof computeOverlapLayout>[0]>>()
    for (const [dateStr, dateItems] of itemsByDate) {
      const layouts = computeOverlapLayout(dateItems)
      const layoutMap = new Map(layouts.map((l) => [l.itemId, l]))
      map.set(dateStr, layoutMap)
    }
    return map
  }, [itemsByDate])

  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="flex flex-col h-full">
      {/* Day headers */}
      <div className="flex border-b border-border shrink-0">
        <div className="w-16 shrink-0" /> {/* time gutter spacer */}
        {dates.map((date) => {
          const today = isToday(date)
          return (
            <div
              key={toDateString(date)}
              className={[
                'flex-1 text-center py-2 border-l border-border',
                today && 'bg-accent/5',
              ].filter(Boolean).join(' ')}
            >
              <div className="text-xs text-text-muted">
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className={[
                'text-lg font-semibold',
                today ? 'text-accent' : 'text-text-primary',
              ].join(' ')}>
                {date.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Scrollable grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex relative" style={{ height: TOTAL_HEIGHT }}>
          {/* Time gutter */}
          <div className="w-16 shrink-0 relative">
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute right-2 text-[11px] text-text-muted -translate-y-1/2"
                style={{ top: hour * HOUR_HEIGHT_PX }}
              >
                {hour === 0 ? '' : formatTime(minutesToTime(hour * 60))}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {dates.map((date) => {
            const dateStr = toDateString(date)
            const dateItems = itemsByDate.get(dateStr) || []
            const dateLayouts = layoutsByDate.get(dateStr)
            const today = isToday(date)

            return (
              <div
                key={dateStr}
                className={[
                  'flex-1 relative border-l border-border',
                  today && 'bg-accent/[0.02]',
                ].filter(Boolean).join(' ')}
                onClick={(e) => {
                  if (e.target !== e.currentTarget) return
                  const rect = e.currentTarget.getBoundingClientRect()
                  const y = e.clientY - rect.top + (scrollRef.current?.scrollTop || 0)
                  const minutes = Math.floor(y / SLOT_HEIGHT_PX) * 15
                  const time = minutesToTime(Math.max(0, Math.min(minutes, 23 * 60 + 45)))
                  onSlotClick?.(dateStr, time)
                }}
              >
                {/* Hour lines */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 border-t border-border/50"
                    style={{ top: hour * HOUR_HEIGHT_PX }}
                  />
                ))}
                {/* Half-hour lines */}
                {hours.map((hour) => (
                  <div
                    key={`half-${hour}`}
                    className="absolute left-0 right-0 border-t border-border/20"
                    style={{ top: hour * HOUR_HEIGHT_PX + HOUR_HEIGHT_PX / 2 }}
                  />
                ))}

                {/* Current time indicator (only on today's column) */}
                {today && <CurrentTimeIndicator />}

                {/* Calendar items */}
                {dateItems
                  .filter((item) => item.startTime && !item.isAllDay)
                  .map((item) => (
                    <CalendarItemBlock
                      key={item.id}
                      item={item}
                      layout={dateLayouts?.get(item.id)}
                      onClick={onItemClick}
                    />
                  ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
