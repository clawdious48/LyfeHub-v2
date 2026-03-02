// frontend-next/src/pages/calendar/components/modals/QuickCreatePopover.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input.js'
import { Button } from '@/components/ui/button.js'
import { useCalendars, useCreateCalendarEvent } from '@/api/hooks/useCalendar.js'
import { formatTime, formatDate } from '../../utils/calendarHelpers.js'

interface QuickCreatePopoverProps {
  open: boolean
  onClose: () => void
  onExpandToFull: (data: { title: string; date: string; startTime?: string; endTime?: string; calendarId?: string }) => void
  date: string
  startTime?: string
  endTime?: string
  anchorPosition?: { top: number; left: number }
}

export function QuickCreatePopover({
  open, onClose, onExpandToFull, date, startTime, endTime, anchorPosition,
}: QuickCreatePopoverProps) {
  const [title, setTitle] = useState('')
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | undefined>()
  const { data: calendars = [] } = useCalendars()
  const createEvent = useCreateCalendarEvent()

  const userCalendars = calendars.filter((c) => !c.system_type || c.system_type !== 'tasks')
  const defaultCalendar = userCalendars.find((c) => c.is_default) || userCalendars[0]

  async function handleSave() {
    if (!title.trim()) return
    await createEvent.mutateAsync({
      title: title.trim(),
      start_date: date,
      end_date: date,
      start_time: startTime,
      end_time: endTime,
      calendar_id: selectedCalendarId || defaultCalendar?.id,
    })
    setTitle('')
    onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !createEvent.isPending) handleSave()
    if (e.key === 'Escape') onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 4 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="fixed z-50 w-72 bg-bg-surface border border-border rounded-xl shadow-xl p-3 space-y-3"
            style={{
              top: anchorPosition?.top ?? '50%',
              left: anchorPosition?.left ?? '50%',
            }}
          >
            {/* Close button */}
            <button onClick={onClose} className="absolute top-2 right-2 text-text-muted hover:text-text-primary">
              <X className="size-4" />
            </button>

            {/* Title input */}
            <Input
              placeholder="Event title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="text-sm"
            />

            {/* Date/time display */}
            <div className="text-xs text-text-muted">
              {formatDate(date)}
              {startTime && ` at ${formatTime(startTime)}`}
              {endTime && ` – ${formatTime(endTime)}`}
            </div>

            {/* Calendar picker */}
            <select
              value={selectedCalendarId || defaultCalendar?.id || ''}
              onChange={(e) => setSelectedCalendarId(e.target.value)}
              className="w-full text-xs bg-bg-app border border-border rounded-md px-2 py-1.5 text-text-primary"
            >
              {userCalendars.map((cal) => (
                <option key={cal.id} value={cal.id}>
                  {cal.name}
                </option>
              ))}
            </select>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => onExpandToFull({
                  title, date, startTime, endTime,
                  calendarId: selectedCalendarId || defaultCalendar?.id,
                })}
                className="text-xs text-accent hover:underline"
              >
                More options
              </button>
              <Button size="sm" onClick={handleSave} disabled={!title.trim() || createEvent.isPending}>
                {createEvent.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
