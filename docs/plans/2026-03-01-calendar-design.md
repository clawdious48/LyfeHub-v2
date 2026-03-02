# Calendar Feature Design

**Date:** 2026-03-01
**Status:** Approved

## Overview

Full-featured calendar system for LyfeHub with five views (Month, Week, 3-Day, Day, Agenda), native event CRUD, task time-blocking, optional two-way Google Calendar sync, and polished animations. The native calendar is fully standalone — Google integration is an optional enhancement layer with zero coupling to core functionality.

## 1. Architecture & Data Model

### Unified CalendarItem Type

Both events and tasks normalize into a common renderable type:

```ts
interface CalendarItem {
  id: string
  type: 'event' | 'task'
  title: string
  description: string
  color: string | null
  startDate: string        // YYYY-MM-DD
  startTime: string | null // HH:MM
  endDate: string          // YYYY-MM-DD
  endTime: string | null   // HH:MM
  isAllDay: boolean
  calendarId: string
  calendarName: string
  calendarColor: string
  // event-specific
  location?: string
  rrule?: string
  externalId?: string
  externalSource?: string
  // task-specific
  status?: string
  priority?: string
  taskListId?: string
}
```

### Fetching Strategy

Two parallel React Query hooks scoped to visible date range:
- `useCalendarEvents(start, end)` — `GET /api/calendar-events?start=&end=`
- `useCalendarTasks(start, end)` — `GET /api/tasks/calendar?start=&end=`

Merged client-side via `useCalendarItems(start, end)` into `CalendarItem[]`.

### State Management

- **Server data:** React Query (already set up)
- **UI state:** Local component state — selected date, current view, drag state, popover anchors
- **No global store needed**

### Calendar Sidebar

Contextual sidebar content when on `/calendar`:
1. Mini-month date picker (custom component)
2. Calendar list with color dots + visibility toggles
3. "Unscheduled Tasks" collapsible panel (drag source for time-blocking)

## 2. Calendar Views & Grid Engine

### Component Structure

```
CalendarPage
├── CalendarSidebar
│   ├── MiniMonth
│   ├── CalendarList
│   └── UnscheduledTasksPanel
├── CalendarToolbar
│   ├── DateNavigation (prev/today/next + date label)
│   ├── ViewSwitcher (Month/Week/3-Day/Day/Agenda)
│   └── CreateEventButton (+)
└── CalendarViewport (renders active view)
    ├── MonthView
    ├── WeekView
    ├── ThreeDayView
    ├── DayView
    └── AgendaView
```

### Time Grid Engine (shared by Week/3-Day/Day)

- CSS Grid: columns for days, rows at 15-minute intervals (96 rows per day)
- CalendarItems absolutely positioned within day column based on startTime/endTime
- Default visible range: 6am-10pm, scrollable to full 24h
- Time gutter on left with hour labels
- Current time indicator: accent horizontal line + dot, updates every 60s, auto-scrolls to ~30% from top on mount

### Overlap Layout Algorithm

Column-packing when events overlap in time:
- Detect overlapping time ranges
- Assign columns (max 4 before scroll)
- Each event gets `width: 1/N` of the column where N is the overlap count
- Same algorithm used by Google Calendar

### Month View

- 6-row grid of day cells
- Day cells show up to 3 event chips, then "+N more" popover
- All-day events span across cells at top
- Today cell highlighted with accent border
- Click day → navigates to Day view

### Agenda View

- Infinite-scroll list grouped by date headers
- Each item: time, title, calendar color dot, type indicator
- Empty days skipped
- Scrolls from current date forward

## 3. Event Creation & Interactions

### Three Creation Entry Points

1. **Click-drag on time grid** — Press and drag vertically to select time range. Ghost block appears with 15-min snapping. On release, quick-create popover appears.
2. **Click empty space** — Single click opens quick-create popover pre-filled with that time/date. Default 1-hour duration.
3. **Toolbar + button** — Opens full creation modal with no pre-filled time context.

### Quick-Create Popover (fast path, <15 seconds)

- Title input (auto-focused)
- Date/time display (editable inline)
- Calendar color picker dropdown
- "More options" link expands to full modal
- Enter to save, Escape to cancel

### Full Event Modal

- Title, description, location
- Start date/time, end date/time, all-day toggle
- Calendar selector
- Recurrence picker (None, Daily, Weekly, Monthly, Custom)
- Color override (optional, inherits calendar color otherwise)
- Google Calendar sync indicator (if connected)

### Drag & Resize on Existing Items

- **Move:** Drag event block to new time/day. Ghost at original position, block follows cursor with scale-up (1.03x) and elevated shadow. 15-min snap.
- **Resize:** Drag bottom edge to change end time. 15-min snap. Live time label update.
- **Drop:** Optimistic update + API PATCH, rollback on failure.

### Task-Specific Interactions

- **Drag from sidebar:** Unscheduled task chip drags onto time grid → schedules at drop position
- **Completion toggle:** Checkbox on task blocks, click to toggle. Strikethrough + fade animation.
- **Unschedule:** Context menu "Unschedule" removes time, task returns to sidebar panel

### Visual Distinction

- **Events:** Solid colored blocks with calendar color fill
- **Tasks:** Dashed border blocks with semi-transparent calendar color fill

## 4. Google Calendar Integration

### Design Principle

Google Calendar is an **optional enhancement layer**. The native calendar is fully functional without it. No Google imports in core calendar components. If never connected, no Google UI appears anywhere — no nags, no disabled features.

### Connection Flow

1. User clicks "Connect Google Calendar" in calendar sidebar or Settings
2. Backend redirects to Google OAuth consent screen
3. User grants calendar access → callback stores encrypted refresh token
4. Sidebar shows "Google Calendar" section with synced calendars

### Database Additions

```sql
google_calendar_connections {
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  google_email TEXT,
  access_token TEXT,          -- encrypted
  refresh_token TEXT,         -- encrypted
  token_expires_at TIMESTAMPTZ,
  sync_enabled BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
}

google_calendar_mappings {
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  google_calendar_id TEXT,    -- Google's calendar ID string
  local_calendar_id TEXT REFERENCES calendars(id),
  sync_direction TEXT DEFAULT 'both',  -- 'both' | 'pull_only' | 'push_only'
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ
}
```

### Sync Strategy (Polling, Upgradeable to Webhooks)

- **Initial sync:** Pull events from last 30 days + next 90 days. Store with `external_id`, `external_source='google'`, `external_etag`.
- **Periodic sync:** Poll every 5 minutes using Google's `syncToken` (incremental, only changed events).
- **Push to Google:** On local create/edit/delete of events in synced calendars, immediately push to Google Calendar API.
- **Conflict resolution:** Compare `external_etag` before push. Most-recent-write wins (single-user app).
- **Token refresh:** Auto-refresh access token using stored refresh token on expiry.

### What Syncs

- Events: title, description, location, start/end times, all-day, recurrence, color
- Calendars: each Google Calendar creates a corresponding local calendar
- NOT synced: tasks (Google Tasks is separate API, out of scope)

### UI Indicators

- Synced events: small Google icon badge
- Sidebar: "Last synced: N min ago", manual "Sync now" button
- Connection status dot (green/yellow/red)

### Backend Routes

```
GET    /api/auth/google/calendar           → OAuth redirect
GET    /api/auth/google/calendar/callback   → OAuth callback
DELETE /api/google-calendar/connection      → Disconnect
GET    /api/google-calendar/status          → Connection status + last sync
POST   /api/google-calendar/sync            → Manual sync trigger
GET    /api/google-calendar/calendars       → List Google calendars
PATCH  /api/google-calendar/calendars/:id   → Toggle visibility/sync direction
```

## 5. Animation & Polish System

### Library

Adding **framer-motion** for spring physics, gesture detection, and AnimatePresence. Tailwind stays for hover states and micro-transitions.

### View & Navigation Transitions

- **View switching:** AnimatePresence crossfade with directional slide. 200ms ease-out. Month→Week = zoom in, Week→Month = zoom out.
- **Date navigation:** Content slides in from navigation direction. 150ms.
- **Today button:** Smooth scroll to current time + brief highlight pulse on time indicator.

### Creation Animations

- **Click-drag ghost block:** Appears instantly, neon border with soft glow, semi-transparent glass fill. 15-min snap has crisp "tick" feel.
- **Quick-create popover:** Spring in from anchor point. Scale 0.95→1.0 + fade. Spring: stiffness 500, damping 30.
- **Full modal:** Existing Radix dialog animation (fade+zoom, 200ms).
- **Event appears after save:** Slides into position from y:-8px with brief neon glow pulse (300ms).

### Drag & Resize

- **Pickup:** Scale 1.0→1.03 over 100ms, shadow deepens, z-index bumps. Ghost dashed outline at original position.
- **While dragging:** Block follows cursor with slight spring lag. Live time label updates at 15-min boundaries.
- **Drop:** Spring settle (stiffness 400, damping 25). Slight overshoot then settle. Ghost fades out.
- **Cancel (Escape):** Block springs back to original position. 200ms.

### Task-Specific Polish

- **Sidebar to calendar drag:** Task chip lifts from sidebar, follows cursor to grid. Faint time-slot highlight at drop target. On drop, morphs from chip shape to time-block.
- **Completion toggle:** Checkbox fills with color (left-to-right wipe, 200ms). Title strikethrough reveals left-to-right. Block fades to 60% opacity.
- **Unschedule:** Block shrinks toward sidebar + fades out. Task chip reappears in sidebar with slide-in.

### Calendar Sidebar Animations

- **Mini-month selection:** Filled circle scales in with spring. Week range highlight slides smoothly.
- **Calendar toggle:** Color dot pulses on toggle. Events for that calendar fade in/out with 150ms stagger cascade.
- **Unscheduled tasks panel:** Height animation on collapse/expand. Staggered fade-in on items (50ms per item, max 5 then instant).

### Micro-Interactions (Tailwind, no framer-motion)

- Hover on event blocks: brightness increase + border glow. `transition-all duration-150`
- Hover on empty time slots: faint highlight. `transition-colors duration-100`
- View switcher active tab: pill/underline slides with CSS transition
- All toolbar buttons: existing `transition-all` pattern

### Loading States

- Skeleton shimmer on event blocks while fetching
- Grid structure renders immediately (no layout shift), events populate in

### Current Time Indicator

- Accent horizontal line spanning full grid width
- Small dot on left edge at time gutter
- Updates every 60 seconds
- View auto-scrolls so current time is at ~30% from top on mount
