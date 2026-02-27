import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCalendarEvents } from '@/api/hooks'

const DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

function getWeekStart(offset: number): Date {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) + offset * 7
  return new Date(now.getFullYear(), now.getMonth(), diff)
}

function formatDateRange(start: Date): string {
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', opts)}`
}

function toISODate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function WeekCalWidget({ config: _config }: { config?: Record<string, unknown> }) {
  const [weekOffset, setWeekOffset] = useState(0)

  const weekStart = useMemo(() => getWeekStart(weekOffset), [weekOffset])

  const weekEnd = useMemo(() => {
    const end = new Date(weekStart)
    end.setDate(end.getDate() + 6)
    return end
  }, [weekStart])

  const startISO = toISODate(weekStart)
  const endISO = toISODate(weekEnd)

  const { data: events } = useCalendarEvents(startISO, endISO)

  const today = toISODate(new Date())

  const eventDates = useMemo(() => {
    if (!events) return new Set<string>()
    const dates = new Set<string>()
    for (const evt of events) {
      if (evt.start_date) {
        dates.add(evt.start_date.split('T')[0])
      }
    }
    return dates
  }, [events])

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return {
        name: DAY_NAMES[i],
        date: d.getDate(),
        iso: toISODate(d),
      }
    })
  }, [weekStart])

  return (
    <div className="flex flex-col gap-3">
      {/* Navigation header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setWeekOffset((o) => o - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm text-text-primary font-medium">
          {formatDateRange(weekStart)}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setWeekOffset((o) => o + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isToday = day.iso === today
          const hasEvents = eventDates.has(day.iso)

          return (
            <div
              key={day.iso}
              className="flex flex-col items-center gap-1 py-1"
            >
              <span
                className={`text-xs font-medium ${
                  isToday ? 'text-accent' : 'text-text-muted'
                }`}
              >
                {day.name}
              </span>
              <span
                className={`text-sm w-7 h-7 flex items-center justify-center ${
                  isToday
                    ? 'bg-accent text-white rounded-full font-medium'
                    : 'text-text-primary'
                }`}
              >
                {day.date}
              </span>
              {hasEvents ? (
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              ) : (
                <span className="w-1.5 h-1.5" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
