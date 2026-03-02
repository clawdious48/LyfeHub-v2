import { useMemo } from 'react'
import { Plus, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button.js'
import { useTaskBase, useToggleTaskComplete, useCalendarEvents, useCalendars } from '@/api/hooks/index.js'

const MAX_VISIBLE = 10

type DayItem =
  | { kind: 'task'; id: string; title: string; time?: string; completed: boolean }
  | { kind: 'event'; id: string; title: string; startTime?: string; endTime?: string; calendarColor?: string; allDay?: boolean }

function getTimeSection(time?: string): 'morning' | 'afternoon' | 'evening' | 'unscheduled' {
  if (!time) return 'unscheduled'
  const hour = parseInt(time.split(':')[0], 10)
  if (isNaN(hour)) return 'unscheduled'
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

function formatTimeRange(start?: string, end?: string): string {
  if (!start) return ''
  const fmt = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return m ? `${h12}:${String(m).padStart(2, '0')} ${ampm}` : `${h12} ${ampm}`
  }
  if (end) return `${fmt(start)} - ${fmt(end)}`
  return fmt(start)
}

function sortByTime(a: DayItem, b: DayItem): number {
  const timeA = a.kind === 'task' ? a.time : a.startTime
  const timeB = b.kind === 'task' ? b.time : b.startTime
  if (!timeA && !timeB) return 0
  if (!timeA) return 1
  if (!timeB) return -1
  return timeA.localeCompare(timeB)
}

const sectionLabels: Record<string, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  unscheduled: 'Unscheduled',
}

export default function MyDayWidget({ config: _config }: { config?: Record<string, unknown> }) {
  const { records: tasks, isLoading: tasksLoading } = useTaskBase()
  const toggleComplete = useToggleTaskComplete()
  const { data: calendars } = useCalendars()

  const today = useMemo(() => new Date().toISOString().split('T')[0], [])
  const { data: events, isLoading: eventsLoading } = useCalendarEvents(today, today)

  const calendarColorMap = useMemo(() => {
    const map = new Map<string, string>()
    if (calendars) {
      for (const cal of calendars) {
        map.set(cal.id, cal.color)
      }
    }
    return map
  }, [calendars])

  const dayItems = useMemo((): DayItem[] => {
    const items: DayItem[] = []

    if (tasks) {
      for (const t of tasks) {
        if (t.due_date?.startsWith(today) || t.my_day) {
          items.push({
            kind: 'task',
            id: t.id,
            title: t.title,
            time: t.due_time ?? undefined,
            completed: !!t.completed,
          })
        }
      }
    }

    if (events) {
      for (const e of events) {
        items.push({
          kind: 'event',
          id: e.id,
          title: e.title,
          startTime: e.start_time ?? undefined,
          endTime: e.end_time ?? undefined,
          calendarColor: e.calendar_color || calendarColorMap.get(e.calendar_id) || undefined,
          allDay: e.is_all_day,
        })
      }
    }

    items.sort(sortByTime)
    return items
  }, [tasks, events, today, calendarColorMap])

  const sections = useMemo(() => {
    const grouped: Record<string, DayItem[]> = {}
    for (const item of dayItems) {
      const time = item.kind === 'task' ? item.time : item.startTime
      const section = getTimeSection(time)
      if (!grouped[section]) grouped[section] = []
      grouped[section].push(item)
    }
    return grouped
  }, [dayItems])

  const isLoading = tasksLoading || eventsLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-text-muted text-sm">Loading...</p>
      </div>
    )
  }

  if (dayItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <p className="text-text-secondary text-sm">No tasks or events today</p>
        <Button variant="outline" size="sm" className="text-accent border-accent">
          <Plus className="size-3.5" />
          Add Task
        </Button>
      </div>
    )
  }

  const sectionOrder = ['morning', 'afternoon', 'evening', 'unscheduled'] as const
  let totalRendered = 0

  return (
    <div className="flex flex-col gap-0.5 overflow-y-auto max-h-full">
      {sectionOrder.map((sectionKey) => {
        const items = sections[sectionKey]
        if (!items || items.length === 0) return null
        if (totalRendered >= MAX_VISIBLE) return null

        const remaining = MAX_VISIBLE - totalRendered
        const visible = items.slice(0, remaining)
        totalRendered += visible.length

        return (
          <div key={sectionKey} className="mb-1">
            <div className="flex items-center gap-2 px-2 pt-1.5 pb-0.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                {sectionLabels[sectionKey]}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
            {visible.map((item) =>
              item.kind === 'task' ? (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-bg-hover transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleComplete.mutate({ id: item.id, currentValue: item.completed })}
                    className={`size-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                      item.completed
                        ? 'bg-accent border-accent text-white'
                        : 'border-text-muted hover:border-accent'
                    }`}
                  >
                    {item.completed && (
                      <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="2,6 5,9 10,3" />
                      </svg>
                    )}
                  </button>
                  <span
                    className={`text-sm truncate ${
                      item.completed
                        ? 'text-text-muted line-through'
                        : 'text-text-primary'
                    }`}
                  >
                    {item.title}
                  </span>
                  {item.time && (
                    <span className="text-xs text-text-muted ml-auto shrink-0">
                      {formatTimeRange(item.time)}
                    </span>
                  )}
                </div>
              ) : (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-bg-hover transition-colors"
                >
                  <Circle
                    className="size-3 shrink-0"
                    fill={item.calendarColor || 'var(--color-accent)'}
                    stroke="none"
                  />
                  <span className="text-sm truncate text-text-primary">
                    {item.title}
                  </span>
                  <span className="text-xs text-text-muted ml-auto shrink-0">
                    {item.allDay
                      ? 'All day'
                      : formatTimeRange(item.startTime, item.endTime)}
                  </span>
                </div>
              ),
            )}
          </div>
        )
      })}
      {dayItems.length > MAX_VISIBLE && (
        <p className="text-xs text-text-muted px-2 pt-1">
          and {dayItems.length - MAX_VISIBLE} more
        </p>
      )}
    </div>
  )
}
