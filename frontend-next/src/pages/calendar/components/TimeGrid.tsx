// frontend-next/src/pages/calendar/components/TimeGrid.tsx
import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import type { CalendarItem } from '../utils/calendarHelpers.js'
import { toDateString, isToday, computeOverlapLayout, formatTime, minutesToTime } from '../utils/calendarHelpers.js'
import { HOUR_HEIGHT_PX, SLOT_HEIGHT_PX, SLOTS_PER_DAY, DEFAULT_VISIBLE_START_HOUR, MINUTES_PER_SLOT, DEFAULT_EVENT_DURATION_MINUTES } from '../utils/calendarConstants.js'
import { CalendarItemBlock } from './CalendarItemBlock.js'
import { CurrentTimeIndicator } from './CurrentTimeIndicator.js'

interface DragState {
  active: boolean
  dateStr: string
  startY: number
  currentY: number
}

interface TimeGridProps {
  dates: Date[]
  items: CalendarItem[]
  onSlotClick?: (date: string, time: string) => void
  onItemClick?: (item: CalendarItem) => void
  onDragCreate?: (date: string, startTime: string, endTime: string) => void
  onTaskDrop?: (taskId: string, date: string, startTime: string, endTime: string) => void
}

const TOTAL_HEIGHT = SLOTS_PER_DAY * SLOT_HEIGHT_PX

export function TimeGrid({ dates, items, onSlotClick, onItemClick, onDragCreate, onTaskDrop }: TimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState>({ active: false, dateStr: '', startY: 0, currentY: 0 })
  const [ghostBlock, setGhostBlock] = useState<{ dateStr: string; top: number; height: number } | null>(null)
  const [dropIndicator, setDropIndicator] = useState<{ dateStr: string; top: number; height: number } | null>(null)

  const snapToSlot = useCallback((y: number) => Math.round(y / SLOT_HEIGHT_PX) * SLOT_HEIGHT_PX, [])

  const yToTime = useCallback((y: number) => {
    const snapped = snapToSlot(y)
    const totalMinutes = Math.max(0, Math.min((snapped / SLOT_HEIGHT_PX) * MINUTES_PER_SLOT, 24 * 60 - MINUTES_PER_SLOT))
    return minutesToTime(totalMinutes)
  }, [snapToSlot])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, dateStr: string) => {
    // Only start drag on the column background, not on items
    if (e.target !== e.currentTarget) return
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top + (scrollRef.current?.scrollTop || 0)
    const snappedY = snapToSlot(y)

    dragRef.current = { active: true, dateStr, startY: snappedY, currentY: snappedY }
    e.currentTarget.setPointerCapture(e.pointerId)
    // Don't show ghost yet — wait for move to distinguish click from drag
  }, [snapToSlot])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>, dateStr: string) => {
    if (!dragRef.current.active || dragRef.current.dateStr !== dateStr) return
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top + (scrollRef.current?.scrollTop || 0)
    const snappedY = snapToSlot(y)
    dragRef.current.currentY = snappedY

    const minY = Math.min(dragRef.current.startY, snappedY)
    const maxY = Math.max(dragRef.current.startY, snappedY)
    const height = maxY - minY

    // Only show ghost if dragged at least one slot
    if (height >= SLOT_HEIGHT_PX) {
      setGhostBlock({ dateStr, top: minY, height })
    }
  }, [snapToSlot])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>, dateStr: string) => {
    if (!dragRef.current.active || dragRef.current.dateStr !== dateStr) return
    const { startY, currentY } = dragRef.current
    dragRef.current = { active: false, dateStr: '', startY: 0, currentY: 0 }
    setGhostBlock(null)

    const minY = Math.min(startY, currentY)
    const maxY = Math.max(startY, currentY)
    const height = maxY - minY

    // If the drag was less than one slot, treat it as a click (handled by onClick)
    if (height < SLOT_HEIGHT_PX) return

    const startTime = yToTime(minY)
    const endTime = yToTime(maxY)
    onDragCreate?.(dateStr, startTime, endTime)
  }, [yToTime, onDragCreate])

  // HTML5 drop handlers for scheduling unscheduled tasks
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, dateStr: string) => {
    if (!e.dataTransfer.types.includes('application/x-task-id')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top + (scrollRef.current?.scrollTop || 0)
    const snappedY = snapToSlot(y)
    setDropIndicator({ dateStr, top: snappedY, height: HOUR_HEIGHT_PX })
  }, [snapToSlot])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    // Only clear if leaving the column (not entering a child)
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setDropIndicator(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, dateStr: string) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('application/x-task-id')
    if (!taskId) return
    setDropIndicator(null)

    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top + (scrollRef.current?.scrollTop || 0)
    const startTime = yToTime(y)
    const startMin = (snapToSlot(y) / SLOT_HEIGHT_PX) * MINUTES_PER_SLOT
    const endTime = minutesToTime(Math.min(startMin + DEFAULT_EVENT_DURATION_MINUTES, 24 * 60 - MINUTES_PER_SLOT))
    onTaskDrop?.(taskId, dateStr, startTime, endTime)
  }, [yToTime, snapToSlot, onTaskDrop])

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
                  'flex-1 relative border-l border-border touch-none',
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
                onPointerDown={(e) => handlePointerDown(e, dateStr)}
                onPointerMove={(e) => handlePointerMove(e, dateStr)}
                onPointerUp={(e) => handlePointerUp(e, dateStr)}
                onDragOver={(e) => handleDragOver(e, dateStr)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, dateStr)}
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

                {/* Drag-create ghost block */}
                {ghostBlock && ghostBlock.dateStr === dateStr && (
                  <div
                    className="absolute left-1 right-1 bg-accent/20 border-2 border-accent/60 rounded-md pointer-events-none animate-pulse"
                    style={{
                      top: ghostBlock.top,
                      height: ghostBlock.height,
                    }}
                  />
                )}

                {/* Task drop indicator */}
                {dropIndicator && dropIndicator.dateStr === dateStr && (
                  <div
                    className="absolute left-1 right-1 bg-purple-500/15 border-2 border-dashed border-purple-500/60 rounded-md pointer-events-none"
                    style={{
                      top: dropIndicator.top,
                      height: dropIndicator.height,
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
