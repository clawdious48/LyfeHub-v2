// frontend-next/src/pages/calendar/components/modals/EventModal.tsx
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog.js'
import { Input } from '@/components/ui/input.js'
import { Button } from '@/components/ui/button.js'
import { Label } from '@/components/ui/label.js'
import { Textarea } from '@/components/ui/textarea.js'
import {
  useCalendars,
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useDeleteCalendarEvent,
} from '@/api/hooks/useCalendar.js'
import type { CalendarEvent } from '@/types/calendar.js'
import { Trash2, MapPin, Clock } from 'lucide-react'

interface EventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: CalendarEvent | null
  prefill?: {
    title?: string
    date?: string
    startTime?: string
    endTime?: string
    calendarId?: string
  }
}

export function EventModal({ open, onOpenChange, event, prefill }: EventModalProps) {
  const isEdit = !!event
  const { data: calendars = [] } = useCalendars()
  const createEvent = useCreateCalendarEvent()
  const updateEvent = useUpdateCalendarEvent()
  const deleteEvent = useDeleteCalendarEvent()
  const userCalendars = calendars.filter((c) => !c.system_type || c.system_type !== 'tasks')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [isAllDay, setIsAllDay] = useState(false)
  const [calendarId, setCalendarId] = useState('')
  const [color, setColor] = useState('')

  // Populate form when opening
  useEffect(() => {
    if (!open) return
    if (event) {
      setTitle(event.title)
      setDescription(event.description || '')
      setLocation(event.location || '')
      setStartDate(event.start_date)
      setStartTime(event.start_time || '')
      setEndDate(event.end_date || event.start_date)
      setEndTime(event.end_time || '')
      setIsAllDay(Boolean(event.is_all_day))
      setCalendarId(event.calendar_id)
      setColor(event.color || '')
    } else {
      const today = new Date().toISOString().slice(0, 10)
      setTitle(prefill?.title || '')
      setDescription('')
      setLocation('')
      setStartDate(prefill?.date || today)
      setStartTime(prefill?.startTime || '')
      setEndDate(prefill?.date || today)
      setEndTime(prefill?.endTime || '')
      setIsAllDay(false)
      setCalendarId(prefill?.calendarId || userCalendars.find((c) => c.is_default)?.id || userCalendars[0]?.id || '')
      setColor('')
    }
  }, [open, event])

  async function handleSave() {
    if (!title.trim()) return
    const data = {
      title: title.trim(),
      description,
      location,
      start_date: startDate,
      end_date: endDate || startDate,
      start_time: isAllDay ? undefined : startTime || undefined,
      end_time: isAllDay ? undefined : endTime || undefined,
      is_all_day: isAllDay,
      calendar_id: calendarId,
      color: color || undefined,
    }
    if (isEdit && event) {
      await updateEvent.mutateAsync({ id: event.id, ...data })
    } else {
      await createEvent.mutateAsync(data)
    }
    onOpenChange(false)
  }

  async function handleDelete() {
    if (!event) return
    await deleteEvent.mutateAsync(event.id)
    onOpenChange(false)
  }

  const isPending = createEvent.isPending || updateEvent.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Event' : 'New Event'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <Input
            placeholder="Event title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />

          {/* Date/time row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-text-muted mb-1 block">Start</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              {!isAllDay && (
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1" />
              )}
            </div>
            <div>
              <Label className="text-xs text-text-muted mb-1 block">End</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              {!isAllDay && (
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1" />
              )}
            </div>
          </div>

          {/* All-day toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
              className="accent-accent"
            />
            <span className="text-sm text-text-secondary">All day</span>
          </label>

          {/* Location */}
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-text-muted shrink-0" />
            <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>

          {/* Description */}
          <Textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />

          {/* Calendar picker */}
          <div>
            <Label className="text-xs text-text-muted mb-1 block">Calendar</Label>
            <select
              value={calendarId}
              onChange={(e) => setCalendarId(e.target.value)}
              className="w-full text-sm bg-bg-app border border-border rounded-md px-3 py-2 text-text-primary"
            >
              {userCalendars.map((cal) => (
                <option key={cal.id} value={cal.id}>
                  {cal.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div>
            {isEdit && (
              <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleteEvent.isPending} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                <Trash2 className="size-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={!title.trim() || isPending}>
              {isPending ? 'Saving...' : isEdit ? 'Save' : 'Create'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
