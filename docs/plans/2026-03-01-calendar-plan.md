# Calendar Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-featured calendar with 5 views (Month/Week/3-Day/Day/Agenda), native event CRUD, task time-blocking, and optional Google Calendar two-way sync — all with polished framer-motion animations.

**Architecture:** Custom CSS Grid time engine shared by Week/3-Day/Day views. Events and tasks normalized into a unified `CalendarItem` type rendered by a single pipeline. Google Calendar sync is an isolated backend module that reads/writes through the same event CRUD API. framer-motion for meaningful animations, Tailwind for micro-interactions.

**Tech Stack:** React 19, TypeScript, TanStack Query, Zustand, framer-motion (new), Tailwind CSS v4, shadcn/ui, Lucide icons. Backend: Node/Express + PostgreSQL (already built).

**Design Doc:** `docs/plans/2026-03-01-calendar-design.md`

---

## Phase 1: Foundation — Types, Hooks, Store, and Page Shell

### Task 1: Install framer-motion

**Files:**
- Modify: `frontend-next/package.json`

**Step 1: Install the dependency**

Run from `frontend-next/`:
```bash
npm install framer-motion
```

**Step 2: Verify installation**

Run: `npm ls framer-motion`
Expected: `framer-motion@` with a version number, no errors.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add framer-motion for calendar animations"
```

---

### Task 2: Fix CalendarEvent type to match backend schema

The current `CalendarEvent` type is missing fields the backend returns (`location`, `timezone`, `calendar_name`, `calendar_color`, `external_id`, `external_source`) and has a misnamed field (`recurrence` should be `rrule`). The `is_all_day` field is typed as `number` but the backend returns `boolean`.

**Files:**
- Modify: `frontend-next/src/types/calendar.ts`

**Step 1: Update the CalendarEvent interface**

Replace the entire `CalendarEvent` interface and its mutation types in `types/calendar.ts` with:

```ts
export interface CalendarEvent {
  id: string
  calendar_id: string
  user_id: string
  title: string
  description: string
  location: string
  start_date: string
  start_time: string | null
  end_date: string
  end_time: string | null
  is_all_day: boolean
  timezone: string
  rrule: string | null
  recurrence_id: string | null
  is_exception: boolean
  color: string | null
  external_id: string | null
  external_source: string | null
  external_etag: string | null
  // JOINed from calendars table
  calendar_name: string
  calendar_color: string
  created_at: string
  updated_at: string
}

export type CreateCalendarEventData = {
  title: string
  start_date: string
  end_date?: string
  start_time?: string
  end_time?: string
  is_all_day?: boolean
  calendar_id?: string
  description?: string
  location?: string
  color?: string
  rrule?: string
  timezone?: string
}

export type UpdateCalendarEventData = Partial<Omit<CalendarEvent, 'id' | 'user_id' | 'calendar_name' | 'calendar_color' | 'created_at' | 'updated_at'>>
```

Keep the `Calendar`, `CreateCalendarData`, and `UpdateCalendarData` types unchanged.

**Step 2: Verify types compile**

Run: `cd frontend-next && npx tsc --noEmit`
Expected: No errors (the hooks file uses these types but the shape is compatible).

**Step 3: Commit**

```bash
git add frontend-next/src/types/calendar.ts
git commit -m "fix(types): align CalendarEvent with backend schema — add location, timezone, external fields"
```

---

### Task 3: Add CalendarItem unified type and normalization helpers

**Files:**
- Create: `frontend-next/src/pages/calendar/utils/calendarHelpers.ts`
- Create: `frontend-next/src/pages/calendar/utils/calendarConstants.ts`

**Step 1: Create the directory structure**

```bash
mkdir -p frontend-next/src/pages/calendar/utils
mkdir -p frontend-next/src/pages/calendar/components
mkdir -p frontend-next/src/pages/calendar/components/views
mkdir -p frontend-next/src/pages/calendar/components/sidebar
mkdir -p frontend-next/src/pages/calendar/components/modals
```

**Step 2: Create calendarConstants.ts**

```ts
// frontend-next/src/pages/calendar/utils/calendarConstants.ts

export type CalendarViewType = 'month' | 'week' | '3day' | 'day' | 'agenda'

export const VIEW_LABELS: Record<CalendarViewType, string> = {
  month: 'Month',
  week: 'Week',
  '3day': '3 Day',
  day: 'Day',
  agenda: 'Agenda',
}

export const MINUTES_PER_SLOT = 15
export const SLOTS_PER_HOUR = 60 / MINUTES_PER_SLOT
export const SLOTS_PER_DAY = 24 * SLOTS_PER_HOUR
export const DEFAULT_EVENT_DURATION_MINUTES = 60
export const DEFAULT_VISIBLE_START_HOUR = 6
export const DEFAULT_VISIBLE_END_HOUR = 22

export const HOUR_HEIGHT_PX = 60
export const SLOT_HEIGHT_PX = HOUR_HEIGHT_PX / SLOTS_PER_HOUR

export const MAX_MONTH_CHIPS = 3

export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
export const DAYS_OF_WEEK_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
```

**Step 3: Create calendarHelpers.ts**

```ts
// frontend-next/src/pages/calendar/utils/calendarHelpers.ts

import type { CalendarEvent } from '@/types/calendar.js'
import type { Task } from '@/types/task.js'
import { MINUTES_PER_SLOT, DEFAULT_EVENT_DURATION_MINUTES, SLOT_HEIGHT_PX } from './calendarConstants.js'

export interface CalendarItem {
  id: string
  type: 'event' | 'task'
  title: string
  description: string
  color: string | null
  startDate: string
  startTime: string | null
  endDate: string
  endTime: string | null
  isAllDay: boolean
  calendarId: string
  calendarName: string
  calendarColor: string
  // event-specific
  location?: string
  rrule?: string | null
  externalId?: string | null
  externalSource?: string | null
  // task-specific
  status?: string
  priority?: string | null
  listId?: string | null
  completed?: boolean
}

export function eventToCalendarItem(event: CalendarEvent): CalendarItem {
  return {
    id: event.id,
    type: 'event',
    title: event.title,
    description: event.description || '',
    color: event.color,
    startDate: event.start_date,
    startTime: event.start_time,
    endDate: event.end_date || event.start_date,
    endTime: event.end_time,
    isAllDay: Boolean(event.is_all_day),
    calendarId: event.calendar_id,
    calendarName: event.calendar_name || '',
    calendarColor: event.calendar_color || '#00aaff',
    location: event.location,
    rrule: event.rrule,
    externalId: event.external_id,
    externalSource: event.external_source,
  }
}

export function taskToCalendarItem(task: Task): CalendarItem {
  return {
    id: task.id,
    type: 'task',
    title: task.title,
    description: task.description || '',
    color: null,
    startDate: task.due_date!,
    startTime: task.due_time,
    endDate: task.due_date!,
    endTime: task.due_time_end,
    isAllDay: !task.due_time,
    calendarId: '',
    calendarName: 'Tasks',
    calendarColor: '#a855f7',
    status: task.status,
    priority: task.priority,
    listId: task.list_id,
    completed: Boolean(task.completed),
  }
}

/** Parse "HH:MM" or "HH:MM:SS" into total minutes from midnight */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** Convert total minutes from midnight to "HH:MM" */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Snap minutes to nearest MINUTES_PER_SLOT boundary */
export function snapToSlot(minutes: number): number {
  return Math.round(minutes / MINUTES_PER_SLOT) * MINUTES_PER_SLOT
}

/** Get the top position (px) for a given time on the time grid */
export function timeToY(time: string): number {
  return (timeToMinutes(time) / MINUTES_PER_SLOT) * SLOT_HEIGHT_PX
}

/** Get the time string for a given Y position on the time grid */
export function yToTime(y: number): string {
  const minutes = snapToSlot((y / SLOT_HEIGHT_PX) * MINUTES_PER_SLOT)
  return minutesToTime(Math.max(0, Math.min(minutes, 24 * 60 - MINUTES_PER_SLOT)))
}

/** Get the height (px) for a calendar item on the time grid */
export function itemHeight(item: CalendarItem): number {
  if (!item.startTime) return SLOT_HEIGHT_PX * 4 // default 1hr for no-time items
  const startMin = timeToMinutes(item.startTime)
  const endMin = item.endTime ? timeToMinutes(item.endTime) : startMin + DEFAULT_EVENT_DURATION_MINUTES
  return Math.max(((endMin - startMin) / MINUTES_PER_SLOT) * SLOT_HEIGHT_PX, SLOT_HEIGHT_PX)
}

/** Format a time string to display (e.g., "14:30" -> "2:30 PM") */
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return m === 0 ? `${hour12} ${period}` : `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

/** Format a date to display (e.g., "2026-03-01" -> "March 1, 2026") */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

/** Format a date for header display (e.g., "March 2026") */
export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/** Get date string in YYYY-MM-DD format */
export function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Check if two dates are the same day */
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Check if a date is today */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

/** Get the start of the week (Sunday) for a given date */
export function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

/** Get the end of the week (Saturday) for a given date */
export function endOfWeek(date: Date): Date {
  const d = startOfWeek(date)
  d.setDate(d.getDate() + 6)
  return d
}

/** Get an array of dates for a week starting from the given date */
export function getWeekDates(startDate: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    return d
  })
}

/** Get the month grid dates (6 rows x 7 cols) for a given month */
export function getMonthGridDates(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  const start = startOfWeek(firstDay)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })
}

/** Add days to a date */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/** Check if two time ranges overlap */
export function timeRangesOverlap(
  aStart: string, aEnd: string,
  bStart: string, bEnd: string,
): boolean {
  const aS = timeToMinutes(aStart)
  const aE = timeToMinutes(aEnd)
  const bS = timeToMinutes(bStart)
  const bE = timeToMinutes(bEnd)
  return aS < bE && bS < aE
}

/**
 * Column-packing overlap layout algorithm.
 * Given items for a single day, returns each item's column index and total columns.
 * Items must have startTime and endTime (non-all-day).
 */
export interface OverlapLayout {
  itemId: string
  column: number
  totalColumns: number
}

export function computeOverlapLayout(items: CalendarItem[]): OverlapLayout[] {
  const timed = items
    .filter((it) => it.startTime && (it.endTime || it.startTime))
    .map((it) => ({
      id: it.id,
      start: timeToMinutes(it.startTime!),
      end: timeToMinutes(it.endTime || minutesToTime(timeToMinutes(it.startTime!) + DEFAULT_EVENT_DURATION_MINUTES)),
    }))
    .sort((a, b) => a.start - b.start || a.end - b.end)

  if (timed.length === 0) return []

  // Build overlap groups — connected components where items overlap transitively
  const groups: typeof timed[][] = []
  let currentGroup = [timed[0]]

  for (let i = 1; i < timed.length; i++) {
    const groupEnd = Math.max(...currentGroup.map((it) => it.end))
    if (timed[i].start < groupEnd) {
      currentGroup.push(timed[i])
    } else {
      groups.push(currentGroup)
      currentGroup = [timed[i]]
    }
  }
  groups.push(currentGroup)

  // Assign columns within each group
  const result: OverlapLayout[] = []
  for (const group of groups) {
    const columns: { end: number }[] = []
    for (const item of group) {
      let placed = false
      for (let c = 0; c < columns.length; c++) {
        if (item.start >= columns[c].end) {
          columns[c].end = item.end
          result.push({ itemId: item.id, column: c, totalColumns: 0 })
          placed = true
          break
        }
      }
      if (!placed) {
        result.push({ itemId: item.id, column: columns.length, totalColumns: 0 })
        columns.push({ end: item.end })
      }
    }
    // Set totalColumns for all items in this group
    const totalCols = columns.length
    for (const r of result) {
      if (group.some((it) => it.id === r.itemId)) {
        r.totalColumns = totalCols
      }
    }
  }

  return result
}
```

**Step 4: Verify types compile**

Run: `cd frontend-next && npx tsc --noEmit`
Expected: No errors.

**Step 5: Commit**

```bash
git add frontend-next/src/pages/calendar/
git commit -m "feat(calendar): add CalendarItem type, normalization helpers, date utilities, overlap layout algorithm"
```

---

### Task 4: Add calendar task hooks (schedule, unschedule, calendar tasks)

The existing `useTasks.ts` has no hooks for the calendar-specific task endpoints. Add them.

**Files:**
- Modify: `frontend-next/src/api/hooks/useCalendar.ts`
- Modify: `frontend-next/src/api/hooks/useTasks.ts`

**Step 1: Add calendar task query keys and hooks to useTasks.ts**

Add these to `useTasks.ts` after the existing exports:

```ts
import type { ScheduleTaskData } from '@/types/index.js'

// Add to taskKeys:
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (status?: string) => [...taskKeys.lists(), { status }] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  calendarRange: (start: string, end: string) => [...taskKeys.all, 'calendar', { start, end }] as const,
  scheduled: () => [...taskKeys.all, 'scheduled'] as const,
  unscheduled: () => [...taskKeys.all, 'unscheduled'] as const,
}

// New hooks — add after existing hooks:

export function useCalendarTasks(start: string, end: string) {
  return useQuery({
    queryKey: taskKeys.calendarRange(start, end),
    queryFn: async () => {
      const res = await apiClient.get<{ items: Task[] }>(
        `/tasks/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      )
      return res.items
    },
    enabled: !!start && !!end,
  })
}

export function useUnscheduledTasks() {
  return useQuery({
    queryKey: taskKeys.unscheduled(),
    queryFn: async () => {
      const res = await apiClient.get<{ items: Task[] }>('/tasks/calendar/unscheduled')
      return res.items
    },
  })
}

export function useScheduleTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: ScheduleTaskData & { id: string }) =>
      apiClient.patch<{ item: Task }>(`/tasks/${id}/schedule`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}

export function useUnscheduleTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<{ item: Task }>(`/tasks/${id}/unschedule`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}
```

**Step 2: Fix useCalendarEvents to handle nested response shape**

The backend returns `{ events: [...] }`, but the hook currently handles both shapes. The create/update hooks should also invalidate based on the range pattern. Update the `onSuccess` handlers in `useCalendar.ts`:

For `useCreateCalendarEvent`, `useUpdateCalendarEvent`, `useDeleteCalendarEvent`, change `onSuccess` to:
```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: calendarKeys.events() })
  queryClient.invalidateQueries({ queryKey: calendarKeys.lists() })
},
```

**Step 3: Verify types compile**

Run: `cd frontend-next && npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add frontend-next/src/api/hooks/useTasks.ts frontend-next/src/api/hooks/useCalendar.ts
git commit -m "feat(hooks): add calendar task hooks — schedule, unschedule, calendar range, unscheduled tasks"
```

---

### Task 5: Create calendar UI store (Zustand)

**Files:**
- Create: `frontend-next/src/stores/calendarUiStore.ts`

**Step 1: Create the store**

```ts
// frontend-next/src/stores/calendarUiStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CalendarViewType } from '@/pages/calendar/utils/calendarConstants.js'

interface CalendarUiState {
  // Persisted preferences
  defaultView: CalendarViewType
  setDefaultView: (view: CalendarViewType) => void

  // Session state (not persisted)
  currentView: CalendarViewType
  setCurrentView: (view: CalendarViewType) => void
  selectedDate: string // YYYY-MM-DD
  setSelectedDate: (date: string) => void
  hiddenCalendarIds: Set<string>
  toggleCalendarVisibility: (calendarId: string) => void
  setCalendarVisible: (calendarId: string, visible: boolean) => void
}

export const useCalendarUiStore = create<CalendarUiState>()(
  persist(
    (set) => ({
      defaultView: 'month',
      setDefaultView: (view) => set({ defaultView: view }),

      currentView: 'month',
      setCurrentView: (view) => set({ currentView: view }),
      selectedDate: new Date().toISOString().slice(0, 10),
      setSelectedDate: (date) => set({ selectedDate: date }),
      hiddenCalendarIds: new Set<string>(),
      toggleCalendarVisibility: (calendarId) =>
        set((state) => {
          const next = new Set(state.hiddenCalendarIds)
          if (next.has(calendarId)) next.delete(calendarId)
          else next.add(calendarId)
          return { hiddenCalendarIds: next }
        }),
      setCalendarVisible: (calendarId, visible) =>
        set((state) => {
          const next = new Set(state.hiddenCalendarIds)
          if (visible) next.delete(calendarId)
          else next.add(calendarId)
          return { hiddenCalendarIds: next }
        }),
    }),
    {
      name: 'lyfehub-calendar-ui',
      partialize: (state) => ({
        defaultView: state.defaultView,
        hiddenCalendarIds: Array.from(state.hiddenCalendarIds),
      }),
      merge: (persisted: any, current) => ({
        ...current,
        ...persisted,
        hiddenCalendarIds: new Set(persisted?.hiddenCalendarIds || []),
      }),
    },
  ),
)
```

**Step 2: Verify types compile**

Run: `cd frontend-next && npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add frontend-next/src/stores/calendarUiStore.ts
git commit -m "feat(store): add calendar UI store — view state, selected date, calendar visibility toggles"
```

---

### Task 6: Create useCalendarItems composite hook

This hook fetches both events and tasks for a date range and normalizes them into `CalendarItem[]`.

**Files:**
- Create: `frontend-next/src/pages/calendar/hooks/useCalendarItems.ts`

**Step 1: Create the hook**

```ts
// frontend-next/src/pages/calendar/hooks/useCalendarItems.ts
import { useMemo } from 'react'
import { useCalendarEvents } from '@/api/hooks/useCalendar.js'
import { useCalendarTasks } from '@/api/hooks/useTasks.js'
import { eventToCalendarItem, taskToCalendarItem } from '../utils/calendarHelpers.js'
import type { CalendarItem } from '../utils/calendarHelpers.js'
import { useCalendarUiStore } from '@/stores/calendarUiStore.js'

export function useCalendarItems(startDate: string, endDate: string) {
  const { data: events = [], isLoading: eventsLoading } = useCalendarEvents(startDate, endDate)
  const { data: tasks = [], isLoading: tasksLoading } = useCalendarTasks(startDate, endDate)
  const hiddenCalendarIds = useCalendarUiStore((s) => s.hiddenCalendarIds)

  const items: CalendarItem[] = useMemo(() => {
    const eventItems = events.map(eventToCalendarItem)
    const taskItems = tasks
      .filter((t) => t.due_date)
      .map(taskToCalendarItem)
    const all = [...eventItems, ...taskItems]
    // Filter by hidden calendars
    return all.filter((item) => !hiddenCalendarIds.has(item.calendarId))
  }, [events, tasks, hiddenCalendarIds])

  return {
    items,
    isLoading: eventsLoading || tasksLoading,
  }
}
```

**Step 2: Verify types compile**

Run: `cd frontend-next && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add frontend-next/src/pages/calendar/hooks/
git commit -m "feat(calendar): add useCalendarItems composite hook — merges events and tasks into unified items"
```

---

### Task 7: Build CalendarPage shell with toolbar and view switching

This replaces the stub `CalendarPage.tsx` with the real layout: toolbar (date nav + view switcher + create button) and viewport that renders the active view.

**Files:**
- Modify: `frontend-next/src/pages/CalendarPage.tsx`
- Create: `frontend-next/src/pages/calendar/components/CalendarToolbar.tsx`

**Step 1: Create CalendarToolbar**

```tsx
// frontend-next/src/pages/calendar/components/CalendarToolbar.tsx
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button.js'
import { useCalendarUiStore } from '@/stores/calendarUiStore.js'
import { VIEW_LABELS, type CalendarViewType } from '../utils/calendarConstants.js'
import { formatMonthYear, addDays, startOfWeek, toDateString } from '../utils/calendarHelpers.js'

interface CalendarToolbarProps {
  onCreateEvent: () => void
}

const VIEW_ORDER: CalendarViewType[] = ['month', 'week', '3day', 'day', 'agenda']

export function CalendarToolbar({ onCreateEvent }: CalendarToolbarProps) {
  const { currentView, setCurrentView, selectedDate, setSelectedDate } = useCalendarUiStore()

  const selected = new Date(selectedDate + 'T00:00:00')

  function navigatePrev() {
    const d = new Date(selectedDate + 'T00:00:00')
    if (currentView === 'month') d.setMonth(d.getMonth() - 1)
    else if (currentView === 'week') d.setDate(d.getDate() - 7)
    else if (currentView === '3day') d.setDate(d.getDate() - 3)
    else d.setDate(d.getDate() - 1)
    setSelectedDate(toDateString(d))
  }

  function navigateNext() {
    const d = new Date(selectedDate + 'T00:00:00')
    if (currentView === 'month') d.setMonth(d.getMonth() + 1)
    else if (currentView === 'week') d.setDate(d.getDate() + 7)
    else if (currentView === '3day') d.setDate(d.getDate() + 3)
    else d.setDate(d.getDate() + 1)
    setSelectedDate(toDateString(d))
  }

  function goToToday() {
    setSelectedDate(toDateString(new Date()))
  }

  function getHeaderLabel(): string {
    if (currentView === 'month') return formatMonthYear(selected)
    if (currentView === 'day') {
      return selected.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    }
    if (currentView === 'agenda') return formatMonthYear(selected)
    // week / 3day: show range
    const start = currentView === 'week' ? startOfWeek(selected) : selected
    const days = currentView === 'week' ? 6 : 2
    const end = addDays(start, days)
    const sameMonth = start.getMonth() === end.getMonth()
    if (sameMonth) {
      return `${start.toLocaleDateString('en-US', { month: 'long' })} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`
    }
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
      {/* Left: Nav */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={goToToday}>
          Today
        </Button>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="size-8" onClick={navigatePrev}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={navigateNext}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <h2 className="text-lg font-semibold text-text-primary ml-2">{getHeaderLabel()}</h2>
      </div>

      {/* Right: View switcher + Create */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-bg-surface border border-border rounded-lg p-0.5">
          {VIEW_ORDER.map((view) => (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
              className={[
                'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150',
                currentView === view
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
              ].join(' ')}
            >
              {VIEW_LABELS[view]}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={onCreateEvent} className="gap-1.5">
          <Plus className="size-4" />
          Event
        </Button>
      </div>
    </div>
  )
}
```

**Step 2: Replace CalendarPage stub**

```tsx
// frontend-next/src/pages/CalendarPage.tsx
import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCalendarUiStore } from '@/stores/calendarUiStore.js'
import { CalendarToolbar } from '@/pages/calendar/components/CalendarToolbar.js'
import { useCalendarItems } from '@/pages/calendar/hooks/useCalendarItems.js'
import { toDateString, startOfWeek, addDays, getMonthGridDates } from '@/pages/calendar/utils/calendarHelpers.js'

export default function CalendarPage() {
  const { currentView, selectedDate } = useCalendarUiStore()
  const [createModalOpen, setCreateModalOpen] = useState(false)

  // Compute the date range for the current view
  const { startDate, endDate } = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00')
    if (currentView === 'month') {
      const grid = getMonthGridDates(d.getFullYear(), d.getMonth())
      return { startDate: toDateString(grid[0]), endDate: toDateString(grid[41]) }
    }
    if (currentView === 'week') {
      const ws = startOfWeek(d)
      return { startDate: toDateString(ws), endDate: toDateString(addDays(ws, 6)) }
    }
    if (currentView === '3day') {
      return { startDate: toDateString(d), endDate: toDateString(addDays(d, 2)) }
    }
    if (currentView === 'day') {
      return { startDate: toDateString(d), endDate: toDateString(d) }
    }
    // agenda: 30 days forward
    return { startDate: toDateString(d), endDate: toDateString(addDays(d, 30)) }
  }, [currentView, selectedDate])

  const { items, isLoading } = useCalendarItems(startDate, endDate)

  return (
    <div className="flex flex-col h-full">
      <CalendarToolbar onCreateEvent={() => setCreateModalOpen(true)} />
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentView}-${startDate}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {/* Views will be added in Phase 2 */}
            <div className="p-6 text-text-secondary text-sm">
              <p>{currentView} view — {items.length} items loaded for {startDate} to {endDate}</p>
              {isLoading && <p>Loading...</p>}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
```

**Step 3: Verify types compile**

Run: `cd frontend-next && npx tsc --noEmit`

**Step 4: Commit**

```bash
git add frontend-next/src/pages/CalendarPage.tsx frontend-next/src/pages/calendar/components/CalendarToolbar.tsx
git commit -m "feat(calendar): build page shell with toolbar — date nav, view switcher, animated view transitions"
```

---

### Task 8: Add calendar sidebar config with CalendarSidebarContent component

**Files:**
- Create: `frontend-next/src/pages/calendar/components/sidebar/CalendarSidebarContent.tsx`
- Modify: `frontend-next/src/layouts/sidebarConfig.ts`

**Step 1: Create CalendarSidebarContent**

This is the initial sidebar — mini-month and calendar list. Unscheduled tasks panel will be added in Phase 3.

```tsx
// frontend-next/src/pages/calendar/components/sidebar/CalendarSidebarContent.tsx
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react'
import { useCalendars } from '@/api/hooks/useCalendar.js'
import { useCalendarUiStore } from '@/stores/calendarUiStore.js'
import {
  getMonthGridDates,
  toDateString,
  isToday,
  isSameDay,
  DAYS_OF_WEEK,
} from '@/pages/calendar/utils/calendarHelpers.js'

export function CalendarSidebarContent() {
  const { selectedDate, setSelectedDate, hiddenCalendarIds, toggleCalendarVisibility } = useCalendarUiStore()
  const { data: calendars = [] } = useCalendars()
  const selected = new Date(selectedDate + 'T00:00:00')

  // Mini-month state — can navigate independently of the main calendar
  const [miniMonth, setMiniMonth] = useState(() => ({ year: selected.getFullYear(), month: selected.getMonth() }))
  const gridDates = getMonthGridDates(miniMonth.year, miniMonth.month)

  function prevMonth() {
    setMiniMonth((prev) => {
      const d = new Date(prev.year, prev.month - 1, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  function nextMonth() {
    setMiniMonth((prev) => {
      const d = new Date(prev.year, prev.month + 1, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  const miniMonthLabel = new Date(miniMonth.year, miniMonth.month, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4 px-1">
      {/* Mini-month */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-text-primary">{miniMonthLabel}</span>
          <div className="flex items-center gap-0.5">
            <button onClick={prevMonth} className="p-0.5 rounded hover:bg-bg-hover transition-colors">
              <ChevronLeft className="size-3.5 text-text-muted" />
            </button>
            <button onClick={nextMonth} className="p-0.5 rounded hover:bg-bg-hover transition-colors">
              <ChevronRight className="size-3.5 text-text-muted" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-0">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="text-center text-[10px] text-text-muted py-0.5">
              {day.charAt(0)}
            </div>
          ))}
          {gridDates.map((date, i) => {
            const inMonth = date.getMonth() === miniMonth.month
            const today = isToday(date)
            const isSelected = isSameDay(date, selected)
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(toDateString(date))}
                className={[
                  'text-[11px] w-full aspect-square flex items-center justify-center rounded-full transition-all duration-150',
                  !inMonth && 'text-text-muted/40',
                  inMonth && !isSelected && !today && 'text-text-secondary hover:bg-bg-hover',
                  today && !isSelected && 'text-accent font-bold',
                  isSelected && 'bg-accent text-white font-bold',
                ].filter(Boolean).join(' ')}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>
      </div>

      {/* Calendar list */}
      <div>
        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
          Calendars
        </div>
        <div className="space-y-0.5">
          {calendars.map((cal) => {
            const hidden = hiddenCalendarIds.has(cal.id)
            return (
              <button
                key={cal.id}
                onClick={() => toggleCalendarVisibility(cal.id)}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-bg-hover transition-colors group"
              >
                <span
                  className={[
                    'size-3 rounded-sm shrink-0 transition-opacity duration-150',
                    hidden && 'opacity-30',
                  ].filter(Boolean).join(' ')}
                  style={{ backgroundColor: cal.color }}
                />
                <span className={[
                  'text-text-secondary text-xs truncate flex-1 text-left transition-opacity duration-150',
                  hidden && 'opacity-50 line-through',
                ].filter(Boolean).join(' ')}>
                  {cal.name}
                </span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                  {hidden ? (
                    <EyeOff className="size-3 text-text-muted" />
                  ) : (
                    <Eye className="size-3 text-text-muted" />
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Add /calendar route to sidebarConfig.ts**

Add the import at the top of `sidebarConfig.ts`:
```ts
import { CalendarSidebarContent } from '@/pages/calendar/components/sidebar/CalendarSidebarContent.js'
```

Add a new `/calendar` key to `contextualSections`:
```ts
'/calendar': [
  {
    key: 'calendar-nav',
    header: 'Calendar',
    icon: Calendar,
    items: [],
    component: CalendarSidebarContent,
  },
  {
    key: 'productivity',
    header: 'Productivity',
    icon: Briefcase,
    items: [
      { label: 'Calendar', icon: Calendar, to: '/calendar' },
      { label: 'Tasks', icon: CheckSquare, to: '/tasks' },
      { label: 'Mail', icon: Mail, to: '/mail' },
    ],
  },
  {
    key: 'resources',
    header: 'Resources',
    icon: BookOpen,
    items: [
      { label: 'Notes', icon: FileText, to: '/notes' },
      { label: 'People', icon: Users, to: '/people' },
      { label: 'Bases', icon: Database, to: '/bases' },
    ],
  },
],
```

**Step 3: Verify types compile and dev server runs**

Run: `cd frontend-next && npx tsc --noEmit`

**Step 4: Commit**

```bash
git add frontend-next/src/pages/calendar/components/sidebar/ frontend-next/src/layouts/sidebarConfig.ts
git commit -m "feat(calendar): add sidebar with mini-month date picker and calendar visibility toggles"
```

---

## Phase 2: Calendar Views

### Task 9: Build the shared TimeGrid component

The core rendering engine used by Week, 3-Day, and Day views. Renders a vertical time grid with hour labels, slots, current time indicator, and positioned CalendarItem blocks.

**Files:**
- Create: `frontend-next/src/pages/calendar/components/TimeGrid.tsx`
- Create: `frontend-next/src/pages/calendar/components/CalendarItemBlock.tsx`
- Create: `frontend-next/src/pages/calendar/components/CurrentTimeIndicator.tsx`

**Step 1: Create CurrentTimeIndicator**

```tsx
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
```

**Step 2: Create CalendarItemBlock**

This renders a single event or task on the time grid, with visual distinction (solid for events, dashed for tasks).

```tsx
// frontend-next/src/pages/calendar/components/CalendarItemBlock.tsx
import { motion } from 'framer-motion'
import type { CalendarItem, OverlapLayout } from '../utils/calendarHelpers.js'
import { timeToY, itemHeight, formatTime } from '../utils/calendarHelpers.js'
import { SLOT_HEIGHT_PX } from '../utils/calendarConstants.js'

interface CalendarItemBlockProps {
  item: CalendarItem
  layout?: OverlapLayout
  onClick?: (item: CalendarItem) => void
}

export function CalendarItemBlock({ item, layout, onClick }: CalendarItemBlockProps) {
  const top = item.startTime ? timeToY(item.startTime) : 0
  const height = itemHeight(item)
  const color = item.color || item.calendarColor || '#00aaff'

  const column = layout?.column ?? 0
  const totalColumns = layout?.totalColumns ?? 1
  const widthPercent = 100 / totalColumns
  const leftPercent = column * widthPercent

  const isTask = item.type === 'task'
  const isCompleted = isTask && item.completed

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: isCompleted ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={() => onClick?.(item)}
      className={[
        'absolute rounded-md px-2 py-1 text-left overflow-hidden cursor-pointer',
        'transition-[filter,box-shadow] duration-150',
        'hover:brightness-110 hover:shadow-md',
        isTask ? 'border-2 border-dashed' : 'border border-solid border-white/10',
        isCompleted && 'line-through',
      ].filter(Boolean).join(' ')}
      style={{
        top,
        height: Math.max(height, SLOT_HEIGHT_PX),
        left: `${leftPercent}%`,
        width: `calc(${widthPercent}% - 4px)`,
        backgroundColor: isTask ? `${color}20` : `${color}30`,
        borderColor: isTask ? `${color}80` : undefined,
      }}
    >
      <div className="flex items-start gap-1 h-full">
        {isTask && (
          <div
            className="size-3 rounded-sm border-2 shrink-0 mt-0.5"
            style={{ borderColor: color, backgroundColor: isCompleted ? color : 'transparent' }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div
            className="text-xs font-medium leading-tight truncate"
            style={{ color }}
          >
            {item.title}
          </div>
          {height >= SLOT_HEIGHT_PX * 2 && item.startTime && (
            <div className="text-[10px] mt-0.5 opacity-70" style={{ color }}>
              {formatTime(item.startTime)}
              {item.endTime && ` – ${formatTime(item.endTime)}`}
            </div>
          )}
        </div>
      </div>
    </motion.button>
  )
}
```

**Step 3: Create TimeGrid**

```tsx
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
```

**Step 4: Verify types compile**

Run: `cd frontend-next && npx tsc --noEmit`

**Step 5: Commit**

```bash
git add frontend-next/src/pages/calendar/components/TimeGrid.tsx frontend-next/src/pages/calendar/components/CalendarItemBlock.tsx frontend-next/src/pages/calendar/components/CurrentTimeIndicator.tsx
git commit -m "feat(calendar): build TimeGrid engine — hour grid, overlap layout, item blocks, current time indicator"
```

---

### Task 10: Build WeekView, ThreeDayView, and DayView

These are thin wrappers around TimeGrid with appropriate date ranges.

**Files:**
- Create: `frontend-next/src/pages/calendar/components/views/WeekView.tsx`
- Create: `frontend-next/src/pages/calendar/components/views/ThreeDayView.tsx`
- Create: `frontend-next/src/pages/calendar/components/views/DayView.tsx`

**Step 1: Create WeekView**

```tsx
// frontend-next/src/pages/calendar/components/views/WeekView.tsx
import { useMemo } from 'react'
import { TimeGrid } from '../TimeGrid.js'
import { startOfWeek, getWeekDates } from '../../utils/calendarHelpers.js'
import type { CalendarItem } from '../../utils/calendarHelpers.js'

interface WeekViewProps {
  selectedDate: string
  items: CalendarItem[]
  onSlotClick?: (date: string, time: string) => void
  onItemClick?: (item: CalendarItem) => void
}

export function WeekView({ selectedDate, items, onSlotClick, onItemClick }: WeekViewProps) {
  const dates = useMemo(() => {
    const start = startOfWeek(new Date(selectedDate + 'T00:00:00'))
    return getWeekDates(start)
  }, [selectedDate])

  return <TimeGrid dates={dates} items={items} onSlotClick={onSlotClick} onItemClick={onItemClick} />
}
```

**Step 2: Create ThreeDayView**

```tsx
// frontend-next/src/pages/calendar/components/views/ThreeDayView.tsx
import { useMemo } from 'react'
import { TimeGrid } from '../TimeGrid.js'
import type { CalendarItem } from '../../utils/calendarHelpers.js'

interface ThreeDayViewProps {
  selectedDate: string
  items: CalendarItem[]
  onSlotClick?: (date: string, time: string) => void
  onItemClick?: (item: CalendarItem) => void
}

export function ThreeDayView({ selectedDate, items, onSlotClick, onItemClick }: ThreeDayViewProps) {
  const dates = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00')
    return Array.from({ length: 3 }, (_, i) => {
      const date = new Date(d)
      date.setDate(date.getDate() + i)
      return date
    })
  }, [selectedDate])

  return <TimeGrid dates={dates} items={items} onSlotClick={onSlotClick} onItemClick={onItemClick} />
}
```

**Step 3: Create DayView**

```tsx
// frontend-next/src/pages/calendar/components/views/DayView.tsx
import { useMemo } from 'react'
import { TimeGrid } from '../TimeGrid.js'
import type { CalendarItem } from '../../utils/calendarHelpers.js'

interface DayViewProps {
  selectedDate: string
  items: CalendarItem[]
  onSlotClick?: (date: string, time: string) => void
  onItemClick?: (item: CalendarItem) => void
}

export function DayView({ selectedDate, items, onSlotClick, onItemClick }: DayViewProps) {
  const dates = useMemo(() => [new Date(selectedDate + 'T00:00:00')], [selectedDate])

  return <TimeGrid dates={dates} items={items} onSlotClick={onSlotClick} onItemClick={onItemClick} />
}
```

**Step 4: Verify types compile**

Run: `cd frontend-next && npx tsc --noEmit`

**Step 5: Commit**

```bash
git add frontend-next/src/pages/calendar/components/views/
git commit -m "feat(calendar): add Week, 3-Day, and Day views wrapping shared TimeGrid"
```

---

### Task 11: Build MonthView

**Files:**
- Create: `frontend-next/src/pages/calendar/components/views/MonthView.tsx`

**Step 1: Create MonthView**

```tsx
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
```

**Step 2: Verify types compile**

Run: `cd frontend-next && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add frontend-next/src/pages/calendar/components/views/MonthView.tsx
git commit -m "feat(calendar): add MonthView — 6-week grid with event chips, +N more, today highlight"
```

---

### Task 12: Build AgendaView

**Files:**
- Create: `frontend-next/src/pages/calendar/components/views/AgendaView.tsx`

**Step 1: Create AgendaView**

```tsx
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
```

**Step 2: Verify types compile**

Run: `cd frontend-next && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add frontend-next/src/pages/calendar/components/views/AgendaView.tsx
git commit -m "feat(calendar): add AgendaView — chronological list grouped by date with staggered animations"
```

---

### Task 13: Wire all views into CalendarPage

Update CalendarPage to render the actual views instead of the placeholder.

**Files:**
- Modify: `frontend-next/src/pages/CalendarPage.tsx`

**Step 1: Import and render views**

Replace the placeholder div inside the AnimatePresence with a view-switching function:

```tsx
// Add imports:
import { MonthView } from '@/pages/calendar/components/views/MonthView.js'
import { WeekView } from '@/pages/calendar/components/views/WeekView.js'
import { ThreeDayView } from '@/pages/calendar/components/views/ThreeDayView.js'
import { DayView } from '@/pages/calendar/components/views/DayView.js'
import { AgendaView } from '@/pages/calendar/components/views/AgendaView.js'
```

Replace the placeholder div content inside the `motion.div` with:

```tsx
{currentView === 'month' && (
  <MonthView
    selectedDate={selectedDate}
    items={items}
    onDayClick={(date) => {
      setSelectedDate(date)
      setCurrentView('day')
    }}
    onItemClick={handleItemClick}
  />
)}
{currentView === 'week' && (
  <WeekView
    selectedDate={selectedDate}
    items={items}
    onSlotClick={handleSlotClick}
    onItemClick={handleItemClick}
  />
)}
{currentView === '3day' && (
  <ThreeDayView
    selectedDate={selectedDate}
    items={items}
    onSlotClick={handleSlotClick}
    onItemClick={handleItemClick}
  />
)}
{currentView === 'day' && (
  <DayView
    selectedDate={selectedDate}
    items={items}
    onSlotClick={handleSlotClick}
    onItemClick={handleItemClick}
  />
)}
{currentView === 'agenda' && (
  <AgendaView
    items={items}
    onItemClick={handleItemClick}
  />
)}
```

Add these handler stubs above the return:

```tsx
const { setSelectedDate, setCurrentView } = useCalendarUiStore()

function handleSlotClick(date: string, time: string) {
  // TODO: Open quick-create popover at this date/time (Task 14)
  console.log('Slot clicked:', date, time)
}

function handleItemClick(item: CalendarItem) {
  // TODO: Open event/task detail modal (Task 15)
  console.log('Item clicked:', item.id, item.type)
}
```

Add the CalendarItem import:
```tsx
import type { CalendarItem } from '@/pages/calendar/utils/calendarHelpers.js'
```

**Step 2: Verify types compile and dev server runs**

Run: `cd frontend-next && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add frontend-next/src/pages/CalendarPage.tsx
git commit -m "feat(calendar): wire all 5 views into CalendarPage with animated transitions"
```

---

## Phase 3: Event Creation & Interaction

### Task 14: Build QuickCreatePopover for events

**Files:**
- Create: `frontend-next/src/pages/calendar/components/modals/QuickCreatePopover.tsx`

**Step 1: Create the component**

```tsx
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
```

**Step 2: Verify types compile**

Run: `cd frontend-next && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add frontend-next/src/pages/calendar/components/modals/QuickCreatePopover.tsx
git commit -m "feat(calendar): add QuickCreatePopover — fast event creation with spring animation"
```

---

### Task 15: Build full EventModal for create/edit

**Files:**
- Create: `frontend-next/src/pages/calendar/components/modals/EventModal.tsx`

**Step 1: Create EventModal**

```tsx
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
```

**Step 2: Verify types compile**

Run: `cd frontend-next && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add frontend-next/src/pages/calendar/components/modals/EventModal.tsx
git commit -m "feat(calendar): add EventModal — full create/edit with date, time, location, calendar picker, delete"
```

---

### Task 16: Wire QuickCreatePopover and EventModal into CalendarPage

Connect the creation entry points: slot click opens quick-create, toolbar button opens full modal, "More options" expands quick-create to full modal.

**Files:**
- Modify: `frontend-next/src/pages/CalendarPage.tsx`

**Step 1: Add state and wire up the modals**

Add imports for the modals and CalendarEvent type. Add state for quick-create popover (open, anchor position, prefill data), full modal (open, event for editing, prefill data). Wire `handleSlotClick` to open the quick-create popover. Wire `handleItemClick` to fetch the full event and open the edit modal. Wire the toolbar create button to open the full modal. Wire "More options" on quick-create to close popover and open full modal with prefill data.

This is a significant update to CalendarPage — replace the entire file with the wired-up version that includes both modals and all interaction handlers.

**Step 2: Verify types compile and test in browser**

Run: `cd frontend-next && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add frontend-next/src/pages/CalendarPage.tsx
git commit -m "feat(calendar): wire quick-create popover and event modal — all 3 creation entry points working"
```

---

### Task 17: Add UnscheduledTasksPanel to sidebar

**Files:**
- Create: `frontend-next/src/pages/calendar/components/sidebar/UnscheduledTasksPanel.tsx`
- Modify: `frontend-next/src/pages/calendar/components/sidebar/CalendarSidebarContent.tsx`

**Step 1: Create UnscheduledTasksPanel**

```tsx
// frontend-next/src/pages/calendar/components/sidebar/UnscheduledTasksPanel.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, GripVertical } from 'lucide-react'
import { useUnscheduledTasks } from '@/api/hooks/useTasks.js'

interface UnscheduledTasksPanelProps {
  onDragStart?: (taskId: string) => void
}

export function UnscheduledTasksPanel({ onDragStart }: UnscheduledTasksPanelProps) {
  const [expanded, setExpanded] = useState(true)
  const { data: tasks = [], isLoading } = useUnscheduledTasks()

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 w-full text-xs font-semibold text-text-muted uppercase tracking-wider mb-1"
      >
        <ChevronRight className={[
          'size-3 transition-transform duration-200',
          expanded && 'rotate-90',
        ].join(' ')} />
        <span>Unscheduled ({tasks.length})</span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {isLoading ? (
              <div className="text-xs text-text-muted py-2 px-2">Loading...</div>
            ) : tasks.length === 0 ? (
              <div className="text-xs text-text-muted py-2 px-2">All tasks scheduled</div>
            ) : (
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {tasks.slice(0, 20).map((task, idx) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(idx * 0.05, 0.25) }}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-grab hover:bg-bg-hover transition-colors group"
                    draggable
                    onDragStart={() => onDragStart?.(task.id)}
                  >
                    <GripVertical className="size-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    <div className="size-2.5 rounded-sm border border-purple-500/60 shrink-0" />
                    <span className="text-text-secondary truncate">{task.title}</span>
                    {task.priority && (
                      <span className={[
                        'text-[9px] px-1 rounded shrink-0',
                        task.priority === 'high' ? 'text-red-400 bg-red-400/10' :
                        task.priority === 'medium' ? 'text-yellow-400 bg-yellow-400/10' :
                        'text-text-muted bg-bg-hover',
                      ].join(' ')}>
                        {task.priority}
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

**Step 2: Add UnscheduledTasksPanel to CalendarSidebarContent**

Import and add below the calendar list section in `CalendarSidebarContent.tsx`:
```tsx
import { UnscheduledTasksPanel } from './UnscheduledTasksPanel.js'

// Add at the end of the space-y-4 div:
<UnscheduledTasksPanel />
```

**Step 3: Verify types compile**

Run: `cd frontend-next && npx tsc --noEmit`

**Step 4: Commit**

```bash
git add frontend-next/src/pages/calendar/components/sidebar/
git commit -m "feat(calendar): add UnscheduledTasksPanel to sidebar — collapsible list with drag handles"
```

---

## Phase 4: Google Calendar Integration (Backend)

### Task 18: Add Google Calendar database tables and migration

**Files:**
- Modify: `backend/src/db/init.sql`

**Step 1: Add the migration**

Add to the end of `init.sql` (as a new migration block):

```sql
-- Migration 032: Google Calendar integration tables
CREATE TABLE IF NOT EXISTS google_calendar_connections (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  google_email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  sync_enabled BOOLEAN DEFAULT true,
  sync_token TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gcal_conn_user ON google_calendar_connections(user_id);

CREATE TABLE IF NOT EXISTS google_calendar_mappings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  google_calendar_id TEXT NOT NULL,
  local_calendar_id TEXT REFERENCES calendars(id) ON DELETE CASCADE,
  sync_direction TEXT DEFAULT 'both',
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gcal_map_user ON google_calendar_mappings(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_gcal_map_unique ON google_calendar_mappings(user_id, google_calendar_id);
```

**Step 2: Restart the backend container to apply migration**

Run: `docker restart lyfehub-dev`

**Step 3: Verify tables exist**

Run: `docker exec lyfehub-dev-db psql -U lyfehub -d lyfehub -c "\dt google_*"`
Expected: Both tables listed.

**Step 4: Commit**

```bash
git add backend/src/db/init.sql
git commit -m "feat(db): add google_calendar_connections and google_calendar_mappings tables"
```

---

### Task 19: Create Google Calendar service module

**Files:**
- Create: `backend/src/services/googleCalendar.js`

**Step 1: Install googleapis**

Run from `backend/`:
```bash
npm install googleapis
```

**Step 2: Create the service**

Build `backend/src/services/googleCalendar.js` with:
- `getAuthUrl(userId)` — generates OAuth URL with calendar scope
- `handleCallback(code, userId)` — exchanges code for tokens, stores in DB
- `getClient(userId)` — returns authenticated google calendar client (auto-refreshes token)
- `syncCalendars(userId)` — pulls user's Google Calendar list, creates/updates local calendar mappings
- `syncEvents(userId)` — incremental sync using syncToken, upserts into calendar_events with external_id/source
- `pushEventToGoogle(userId, event)` — creates/updates event in Google Calendar
- `deleteEventFromGoogle(userId, eventId)` — deletes event from Google Calendar
- `disconnectGoogle(userId)` — removes connection and mappings

All database operations use the existing `db/pool.js` query helpers. Token encryption uses `crypto.createCipheriv` with a `GOOGLE_ENCRYPTION_KEY` env var.

This is the largest single file in the backend addition. The full implementation should follow the Google Calendar API v3 patterns: `calendar.events.list`, `calendar.events.insert`, `calendar.events.update`, `calendar.events.delete`, using `syncToken` for incremental sync.

**Step 3: Commit**

```bash
git add backend/src/services/googleCalendar.js backend/package.json backend/package-lock.json
git commit -m "feat(google-cal): add Google Calendar service — OAuth, sync, push, disconnect"
```

---

### Task 20: Create Google Calendar API routes

**Files:**
- Create: `backend/src/routes/googleCalendar.js`
- Modify: `backend/src/index.js` (mount the router)

**Step 1: Create the route file**

```js
// backend/src/routes/googleCalendar.js
const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const googleCalendar = require('../services/googleCalendar');

const router = express.Router();
router.use(authMiddleware);

// Initiate OAuth flow
router.get('/auth/google/calendar', async (req, res) => {
  try {
    const url = await googleCalendar.getAuthUrl(req.user.id);
    res.json({ url });
  } catch (err) {
    console.error('Google Calendar auth error:', err);
    res.status(500).json({ error: 'Failed to initiate Google Calendar auth' });
  }
});

// OAuth callback
router.get('/auth/google/calendar/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'Authorization code required' });
    await googleCalendar.handleCallback(code, req.user.id);
    // Redirect to calendar page after successful connection
    res.redirect('/calendar?google_connected=true');
  } catch (err) {
    console.error('Google Calendar callback error:', err);
    res.redirect('/calendar?google_error=true');
  }
});

// Connection status
router.get('/google-calendar/status', async (req, res) => {
  try {
    const status = await googleCalendar.getConnectionStatus(req.user.id);
    res.json(status);
  } catch (err) {
    console.error('Google Calendar status error:', err);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Disconnect
router.delete('/google-calendar/connection', async (req, res) => {
  try {
    await googleCalendar.disconnectGoogle(req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Google Calendar disconnect error:', err);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// Manual sync trigger
router.post('/google-calendar/sync', async (req, res) => {
  try {
    const result = await googleCalendar.syncEvents(req.user.id);
    res.json(result);
  } catch (err) {
    console.error('Google Calendar sync error:', err);
    res.status(500).json({ error: 'Failed to sync' });
  }
});

// List Google calendars with mapping info
router.get('/google-calendar/calendars', async (req, res) => {
  try {
    const calendars = await googleCalendar.getGoogleCalendars(req.user.id);
    res.json({ calendars });
  } catch (err) {
    console.error('Google Calendar list error:', err);
    res.status(500).json({ error: 'Failed to list calendars' });
  }
});

// Toggle calendar visibility/sync direction
router.patch('/google-calendar/calendars/:id', async (req, res) => {
  try {
    const { is_visible, sync_direction } = req.body;
    const mapping = await googleCalendar.updateMapping(req.params.id, req.user.id, { is_visible, sync_direction });
    res.json({ mapping });
  } catch (err) {
    console.error('Google Calendar mapping update error:', err);
    res.status(500).json({ error: 'Failed to update mapping' });
  }
});

module.exports = router;
```

**Step 2: Mount in index.js**

Add to the route mounting section of `backend/src/index.js`:
```js
app.use('/api', require('./routes/googleCalendar'));
```

**Step 3: Commit**

```bash
git add backend/src/routes/googleCalendar.js backend/src/index.js
git commit -m "feat(google-cal): add API routes — auth, status, sync, disconnect, calendar management"
```

---

### Task 21: Hook Google Calendar sync into event CRUD

When a user creates/edits/deletes an event that belongs to a Google-synced calendar, push the change to Google Calendar.

**Files:**
- Modify: `backend/src/routes/calendarEvents.js`

**Step 1: Add Google sync hooks**

After each create/update/delete in the calendar events route, check if the event's calendar is Google-synced and push accordingly. Import the google calendar service conditionally — if the service throws (no connection), fail silently (the native event is already saved).

Add to the POST handler (after `res.status(201).json({ event })`):
```js
// Fire-and-forget Google sync (don't block the response)
try {
  const googleCalendar = require('../services/googleCalendar');
  googleCalendar.pushEventToGoogle(userId, event).catch(() => {});
} catch (_) { /* Google sync not configured */ }
```

Same pattern for PATCH and DELETE handlers.

**Step 2: Commit**

```bash
git add backend/src/routes/calendarEvents.js
git commit -m "feat(google-cal): hook event CRUD into Google Calendar push sync"
```

---

## Phase 5: Google Calendar Integration (Frontend)

### Task 22: Add Google Calendar frontend hooks

**Files:**
- Create: `frontend-next/src/api/hooks/useGoogleCalendar.ts`

**Step 1: Create the hooks**

```ts
// frontend-next/src/api/hooks/useGoogleCalendar.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client.js'

export const googleCalendarKeys = {
  status: ['google-calendar', 'status'] as const,
  calendars: ['google-calendar', 'calendars'] as const,
}

interface GoogleCalendarStatus {
  connected: boolean
  google_email?: string
  last_synced_at?: string
  sync_enabled?: boolean
}

interface GoogleCalendarMapping {
  id: string
  google_calendar_id: string
  local_calendar_id: string
  name: string
  color: string
  sync_direction: string
  is_visible: boolean
}

export function useGoogleCalendarStatus() {
  return useQuery({
    queryKey: googleCalendarKeys.status,
    queryFn: () => apiClient.get<GoogleCalendarStatus>('/google-calendar/status'),
  })
}

export function useGoogleCalendars() {
  return useQuery({
    queryKey: googleCalendarKeys.calendars,
    queryFn: async () => {
      const res = await apiClient.get<{ calendars: GoogleCalendarMapping[] }>('/google-calendar/calendars')
      return res.calendars
    },
  })
}

export function useConnectGoogleCalendar() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.get<{ url: string }>('/auth/google/calendar')
      window.location.href = res.url
    },
  })
}

export function useDisconnectGoogleCalendar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.delete<void>('/google-calendar/connection'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: googleCalendarKeys.status })
      queryClient.invalidateQueries({ queryKey: googleCalendarKeys.calendars })
    },
  })
}

export function useSyncGoogleCalendar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.post<{ synced: number }>('/google-calendar/sync', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      queryClient.invalidateQueries({ queryKey: googleCalendarKeys.status })
    },
  })
}

export function useUpdateGoogleCalendarMapping() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; is_visible?: boolean; sync_direction?: string }) =>
      apiClient.patch(`/google-calendar/calendars/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: googleCalendarKeys.calendars })
    },
  })
}
```

**Step 2: Commit**

```bash
git add frontend-next/src/api/hooks/useGoogleCalendar.ts
git commit -m "feat(google-cal): add frontend hooks — status, connect, disconnect, sync, calendar management"
```

---

### Task 23: Add Google Calendar section to sidebar

**Files:**
- Create: `frontend-next/src/pages/calendar/components/sidebar/GoogleCalendarSection.tsx`
- Modify: `frontend-next/src/pages/calendar/components/sidebar/CalendarSidebarContent.tsx`

**Step 1: Create GoogleCalendarSection**

This component conditionally renders only when Google Calendar is connected. Shows sync status, synced calendars, and disconnect button.

```tsx
// frontend-next/src/pages/calendar/components/sidebar/GoogleCalendarSection.tsx
import { RefreshCw, Unplug, Cloud } from 'lucide-react'
import {
  useGoogleCalendarStatus,
  useGoogleCalendars,
  useConnectGoogleCalendar,
  useDisconnectGoogleCalendar,
  useSyncGoogleCalendar,
} from '@/api/hooks/useGoogleCalendar.js'
import { Button } from '@/components/ui/button.js'

export function GoogleCalendarSection() {
  const { data: status } = useGoogleCalendarStatus()
  const { data: calendars = [] } = useGoogleCalendars()
  const connect = useConnectGoogleCalendar()
  const disconnect = useDisconnectGoogleCalendar()
  const sync = useSyncGoogleCalendar()

  if (!status?.connected) {
    return (
      <div>
        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
          Google Calendar
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs gap-1.5"
          onClick={() => connect.mutate()}
          disabled={connect.isPending}
        >
          <Cloud className="size-3.5" />
          Connect Google Calendar
        </Button>
      </div>
    )
  }

  const lastSynced = status.last_synced_at
    ? new Date(status.last_synced_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : 'Never'

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Google Calendar
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => sync.mutate()}
            disabled={sync.isPending}
            className="p-1 rounded hover:bg-bg-hover transition-colors"
            title="Sync now"
          >
            <RefreshCw className={['size-3 text-text-muted', sync.isPending && 'animate-spin'].filter(Boolean).join(' ')} />
          </button>
          <button
            onClick={() => disconnect.mutate()}
            className="p-1 rounded hover:bg-bg-hover transition-colors"
            title="Disconnect"
          >
            <Unplug className="size-3 text-text-muted" />
          </button>
        </div>
      </div>

      <div className="text-[10px] text-text-muted mb-2">
        {status.google_email} &middot; Last sync: {lastSynced}
      </div>

      <div className="space-y-0.5">
        {calendars.map((cal) => (
          <div key={cal.id} className="flex items-center gap-2 px-2 py-1 text-xs text-text-secondary">
            <span className="size-2.5 rounded-sm shrink-0" style={{ backgroundColor: cal.color }} />
            <span className="truncate">{cal.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Add to CalendarSidebarContent**

Import and add between the calendar list and unscheduled tasks panel:
```tsx
import { GoogleCalendarSection } from './GoogleCalendarSection.js'

// Add in the space-y-4 div, between CalendarList and UnscheduledTasksPanel:
<GoogleCalendarSection />
```

**Step 3: Commit**

```bash
git add frontend-next/src/pages/calendar/components/sidebar/GoogleCalendarSection.tsx frontend-next/src/pages/calendar/components/sidebar/CalendarSidebarContent.tsx
git commit -m "feat(google-cal): add sidebar section — connect, sync status, calendar list, disconnect"
```

---

## Phase 6: Polish & Cleanup

### Task 24: Add Google badge to synced events in CalendarItemBlock

**Files:**
- Modify: `frontend-next/src/pages/calendar/components/CalendarItemBlock.tsx`

**Step 1: Add a small Google icon**

In `CalendarItemBlock`, check if `item.externalSource === 'google'` and render a small cloud/sync icon in the top-right corner of the block.

**Step 2: Commit**

```bash
git add frontend-next/src/pages/calendar/components/CalendarItemBlock.tsx
git commit -m "feat(calendar): add Google sync badge on externally synced events"
```

---

### Task 25: Add click-drag time block creation on TimeGrid

**Files:**
- Modify: `frontend-next/src/pages/calendar/components/TimeGrid.tsx`

**Step 1: Add drag state and ghost block rendering**

Add a `dragState` ref tracking mousedown position, and render a semi-transparent ghost block as the user drags. On mouseup, calculate the start/end times and call `onSlotClick` with both. The ghost block should use the neon glow animation from the design spec.

Key behavior:
- `onPointerDown` on empty grid area starts tracking
- `onPointerMove` updates the ghost block height (snapped to 15-min slots)
- `onPointerUp` converts to time range, fires `onDragCreate?.(date, startTime, endTime)`
- Ghost block: `bg-accent/20 border border-accent/50 rounded-md` with a subtle pulse animation

**Step 2: Add `onDragCreate` prop to TimeGrid and wire it in CalendarPage to open QuickCreatePopover**

**Step 3: Commit**

```bash
git add frontend-next/src/pages/calendar/components/TimeGrid.tsx frontend-next/src/pages/CalendarPage.tsx
git commit -m "feat(calendar): add click-drag time block creation with ghost block and 15-min snap"
```

---

### Task 26: Update ROADMAP.md and CLAUDE.md

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `CLAUDE.md`

**Step 1: Update ROADMAP.md**

Mark calendar features as complete:
- Calendar CRUD → Done
- Calendar events CRUD → Done
- Month/Week/Day/Agenda views → Done
- 3-Day view → Done
- Unified view (events + scheduled tasks) → Done
- Google Calendar sync → Done
- Click-drag to create time blocks → Done

Mark as remaining:
- Drag to move/resize events → Not Started
- Recurring events (RRULE) → Not Started
- Reminders/notifications → Not Started
- Task drag from sidebar to grid → Not Started

**Step 2: Update Calendar section in CLAUDE.md**

Update the Calendar Design section to reflect current state.

**Step 3: Commit**

```bash
git add docs/ROADMAP.md CLAUDE.md
git commit -m "docs: update roadmap and CLAUDE.md with calendar feature completion status"
```

---

## Summary

| Phase | Tasks | What Gets Built |
|-------|-------|-----------------|
| 1: Foundation | Tasks 1-8 | framer-motion, fixed types, CalendarItem, hooks, store, page shell, sidebar |
| 2: Views | Tasks 9-13 | TimeGrid engine, all 5 views wired and rendering |
| 3: Creation | Tasks 14-17 | QuickCreatePopover, EventModal, unscheduled tasks panel |
| 4: Google Backend | Tasks 18-21 | DB tables, service module, API routes, CRUD sync hooks |
| 5: Google Frontend | Tasks 22-23 | Frontend hooks, sidebar Google section |
| 6: Polish | Tasks 24-26 | Google badge, click-drag creation, docs update |

**Total: 26 tasks across 6 phases.**

Dependencies:
- Phase 2 depends on Phase 1
- Phase 3 depends on Phase 2
- Phase 4 is independent (backend only) — can run in parallel with Phase 2-3
- Phase 5 depends on Phase 4
- Phase 6 depends on all prior phases
