// frontend-next/src/pages/calendar/components/CurrentTimeIndicator.tsx
import { useState, useEffect } from 'react'
import { timeToY } from '../utils/calendarHelpers.js'

export function CurrentTimeIndicator() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const top = timeToY(time)

  return (
    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top }}>
      <div className="flex items-center">
        <div className="size-2.5 rounded-full bg-red-500 -ml-1 shrink-0" />
        <div className="flex-1 h-px bg-red-500" />
      </div>
    </div>
  )
}
