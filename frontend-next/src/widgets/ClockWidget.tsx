import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth.js'

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatTime(date: Date, format: '12h' | '24h', showSeconds: boolean): string {
  let hours = date.getHours()
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')

  if (format === '12h') {
    const period = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12 || 12
    const time = showSeconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`
    return `${time} ${period}`
  }

  const h = hours.toString().padStart(2, '0')
  return showSeconds ? `${h}:${minutes}:${seconds}` : `${h}:${minutes}`
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function ClockWidget({ config }: { config?: Record<string, unknown> }) {
  const format = (config?.format as '12h' | '24h') ?? '12h'
  const showSeconds = (config?.showSeconds as boolean) ?? false
  const showGreeting = (config?.showGreeting as boolean) ?? true

  const user = useAuth((s) => s.user)

  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date())
    }, showSeconds ? 1000 : 60000)

    return () => clearInterval(interval)
  }, [showSeconds])

  const timeString = formatTime(now, format, showSeconds)
  const dateString = formatDate(now)
  const greeting = getGreeting(now.getHours())
  const firstName = user?.name?.split(' ')[0] ?? ''

  return (
    <div className="flex flex-col items-center justify-center h-full gap-1">
      <span className="text-4xl font-semibold text-text-primary tracking-tight">
        {timeString}
      </span>
      <span className="text-sm text-text-secondary">
        {dateString}
      </span>
      {showGreeting && firstName && (
        <span className="text-sm text-text-muted mt-1">
          {greeting}, {firstName}
        </span>
      )}
    </div>
  )
}
