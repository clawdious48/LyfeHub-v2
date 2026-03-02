// frontend-next/src/pages/calendar/components/views/AgendaView.tsx
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { CalendarItem } from '../../utils/calendarHelpers.js'
import { formatDate, formatTime } from '../../utils/calendarHelpers.js'

interface AgendaViewProps {
  items: CalendarItem[]
  onItemClick?: (item: CalendarItem) => void
}

export function AgendaView({ items, onItemClick }: AgendaViewProps) {
  // Group by date, sort chronologically, skip empty days
  const grouped = useMemo(() => {
    const map = new Map<string, CalendarItem[]>()
    for (const item of items) {
      const existing = map.get(item.startDate) || []
      existing.push(item)
      map.set(item.startDate, existing)
    }
    // Sort dates
    const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
    // Sort items within each date by time
    for (const [, dateItems] of sorted) {
      dateItems.sort((a, b) => {
        if (!a.startTime && !b.startTime) return 0
        if (!a.startTime) return -1
        if (!b.startTime) return 1
        return a.startTime.localeCompare(b.startTime)
      })
    }
    return sorted
  }, [items])

  if (grouped.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm">
        No events or tasks in this range
      </div>
    )
  }

  return (
    <div className="overflow-y-auto h-full px-4 py-4 space-y-4">
      {grouped.map(([dateStr, dateItems]) => (
        <div key={dateStr}>
          <div className="sticky top-0 bg-bg-app/95 backdrop-blur-sm py-1 mb-2 z-10">
            <h3 className="text-sm font-semibold text-text-primary">{formatDate(dateStr)}</h3>
          </div>
          <div className="space-y-1">
            {dateItems.map((item, idx) => {
              const color = item.color || item.calendarColor
              const isTask = item.type === 'task'
              return (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03, duration: 0.15 }}
                  onClick={() => onItemClick?.(item)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-bg-hover transition-colors text-left group"
                >
                  {/* Color dot / checkbox */}
                  {isTask ? (
                    <div
                      className="size-4 rounded border-2 shrink-0"
                      style={{
                        borderColor: color,
                        backgroundColor: item.completed ? color : 'transparent',
                      }}
                    />
                  ) : (
                    <div
                      className="size-3 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                  )}

                  {/* Time */}
                  <div className="w-20 shrink-0 text-xs text-text-muted">
                    {item.isAllDay ? (
                      'All day'
                    ) : item.startTime ? (
                      <>
                        {formatTime(item.startTime)}
                        {item.endTime && (
                          <>
                            <br />
                            <span className="opacity-60">{formatTime(item.endTime)}</span>
                          </>
                        )}
                      </>
                    ) : (
                      ''
                    )}
                  </div>

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <div className={[
                      'text-sm text-text-primary truncate',
                      item.completed && 'line-through opacity-50',
                    ].filter(Boolean).join(' ')}>
                      {item.title}
                    </div>
                    {item.location && (
                      <div className="text-xs text-text-muted truncate">{item.location}</div>
                    )}
                  </div>

                  {/* Type badge */}
                  <span className={[
                    'text-[10px] px-1.5 py-0.5 rounded-full shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
                    isTask ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400',
                  ].join(' ')}>
                    {isTask ? 'Task' : 'Event'}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
