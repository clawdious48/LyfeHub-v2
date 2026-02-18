# Calendar Feature — Working Document
*Created: 2026-02-18 | Worktree: `/root/lyfehub-v2/worktrees/calendar/` | Preview: port 4006*

---

## 1. Current State Audit

### What Exists Today

The calendar is a **task-centric time-blocking system** — not a traditional calendar. Tasks *are* the events. There is no separate events table.

#### Backend (30% complete)
- **`calendars` table** — Full CRUD for calendar containers (name, color, description)
- **System calendars** auto-created: "My Calendar" (default) + "Tasks" (system type)
- **Task scheduling fields**: `scheduled_date`, `scheduled_start`, `scheduled_end`, `is_all_day`
- **API endpoints**: GET/POST/PATCH/DELETE `/api/calendars`, plus task scheduling queries
- **RBAC**: Calendar scope properly enforced on all endpoints

**🔴 Critical gaps:**
- **No `calendar_events` table** — can't create standalone events (meetings, appointments, birthdays)
- **`task_item_calendars` junction table exists but is completely unused** — dead code
- **Tasks have no `calendar_id`** — can't assign tasks to specific calendars
- **No recurrence** — no RRULE, no patterns, no exception handling
- **No timezone support** — dates/times stored as plain text
- **No reminders/notifications table**
- **No external calendar sync** (Google Calendar, iCal)

#### Frontend (50% complete)
- **4 views work**: Month, Week, 3-Day, Day — all render correctly
- **Navigation**: Prev/next/today buttons + keyboard shortcuts (M/W/D/3/T/arrows)
- **Drag-and-drop (3 systems)**:
  - Sidebar → calendar (schedule unscheduled tasks)
  - Calendar → sidebar (unschedule tasks)
  - Click-drag on empty time slots (create new time blocks)
- **Pending block with resize** — after dropping, pulsing blue dashed block with drag handles (15-min snapping)
- **Calendar management** — create/edit calendars with colors
- **Sidebar** — shows scheduled/unscheduled task lists with counts
- **Dark mode** — fully supported

**🔴 Critical bugs/gaps:**
- **Click-drag assigns wrong date** — event placed on wrong day column
- **No overlapping event layout** — concurrent events stack on top of each other (should use column-splitting like Google Calendar)
- **Day view positioning bug** — events placed relative to hour cells instead of full grid
- **No touch support** — only mouse events, completely broken on mobile for drag operations
- **Week starts Sunday, widget starts Monday** — inconsistent
- **Dashboard "This Week" widget** — shows dates but no events
- **Dashboard "My Day" widget** — doesn't load tasks
- **No "Create Event" button** — users must discover click-drag (terrible discoverability)
- **Events don't use their calendar's color** — all render orange regardless
- **Month view click does nothing** — no event creation on date click
- **No current-time indicator line**

#### What Actually Works (UX Audit)
- All 4 calendar views render and navigate correctly
- Click-drag on week/day views creates time blocks (but on wrong date)
- Event click → task detail popup with edit/delete/complete
- Calendar categories can be created with colors
- Mobile layout is responsive (sidebar hides, bottom nav appears)
- Quick Task capture works (but tasks only, no events)

---

## 2. Architecture Decision: Events vs Enhanced Tasks

### The Core Question
> Should calendar events be a separate entity from tasks, or should tasks be enhanced to serve as both?

### Option A: Separate `calendar_events` Table
```
tasks → things you DO (have completion state)
events → things that HAPPEN (time-based, no completion)
```

**Pros:**
- Clean data model — events and tasks are conceptually different things
- Events get their own fields (location, attendees, video link, RRULE) without bloating the tasks table
- External calendar sync (Google Calendar) maps cleanly to events, not tasks
- "Meeting at 3pm" is NOT a task — you don't "complete" a meeting, you attend it

**Cons:**
- Two data sources to render on the calendar
- More complex queries (UNION events + scheduled tasks)
- More API endpoints to maintain
- Users might be confused about when to use which

### Option B: Enhanced Tasks (Tasks = Everything)
```
tasks with is_event=true → behave as events
tasks with is_event=false → behave as tasks
```

**Pros:**
- Single data model — everything is a task item
- Simpler queries — one table, one API
- Users don't have to think about the distinction
- A meeting *can* be a task ("Attend meeting" → done when it's over)

**Cons:**
- Task table gets bloated with event-specific fields (location, attendees, RRULE, video_link)
- Semantic confusion — is a birthday an "incomplete task"?
- External calendar sync is awkward (Google events becoming tasks with completion state?)
- You end up with a god table that does everything poorly

### ⭐ Recommendation: Hybrid — Separate Events Table, Unified Calendar View

**Create a `calendar_events` table** for standalone events, but render both events AND scheduled tasks on the same calendar. The calendar becomes a **unified time view** that pulls from two sources:

```
Calendar renders:
├── calendar_events (meetings, appointments, birthdays, synced Google events)
└── task_items WHERE scheduled_date IS NOT NULL (time-blocked tasks)
```

**Why this is the right call:**

1. **They're genuinely different things.** A dentist appointment isn't a task. Your daughter's birthday isn't a task. A recurring team standup isn't a task. Forcing them into a task model creates semantic nonsense (an "incomplete" birthday that's been "overdue" since yesterday).

2. **External sync demands it.** When you sync Google Calendar, those events come in with locations, attendees, video links, RRULE patterns — none of which belong in a tasks table. You need a proper events container.

3. **The UI can be unified.** Users see ONE calendar with both events and tasks on it. They don't need to know the backend distinction. Visually differentiate them:
   - **Events** = solid colored blocks (fixed commitments)
   - **Tasks** = dashed/striped blocks (flexible time blocks, can be rescheduled)

4. **It's what every successful app does.** Sunsama, Morgen, Todoist, Notion Calendar — they ALL have separate event and task models that render on a unified calendar.

5. **Tasks stay clean.** The task system works great for tasks. Don't pollute it with event semantics.

---

## 3. Proposed Data Model

### New `calendar_events` Table
```sql
CREATE TABLE calendar_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id TEXT NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Core fields
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  location TEXT DEFAULT '',
  
  -- Time
  start_date DATE NOT NULL,
  start_time TIME,           -- NULL for all-day events
  end_date DATE NOT NULL,
  end_time TIME,
  is_all_day BOOLEAN DEFAULT false,
  timezone TEXT DEFAULT 'America/Denver',
  
  -- Recurrence (iCal RRULE standard)
  rrule TEXT,                 -- e.g., "FREQ=WEEKLY;BYDAY=MO,WE,FR"
  recurrence_id TEXT,         -- links to parent event for exceptions
  is_exception BOOLEAN DEFAULT false,
  
  -- Display
  color TEXT,                 -- override calendar color
  
  -- External sync
  external_id TEXT,           -- Google Calendar event ID, etc.
  external_source TEXT,       -- 'google', 'outlook', 'ical'
  external_etag TEXT,         -- for sync conflict detection
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calendar_events_user ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_calendar ON calendar_events(calendar_id);
CREATE INDEX idx_calendar_events_dates ON calendar_events(start_date, end_date);
CREATE INDEX idx_calendar_events_external ON calendar_events(external_id, external_source);
```

### Enhanced `task_items` (Minimal Additions)
```sql
-- Add to existing task_items:
ALTER TABLE task_items ADD COLUMN calendar_id TEXT REFERENCES calendars(id);
-- (Links scheduled tasks to a specific calendar for color coding)
```

### New `event_reminders` Table
```sql
CREATE TABLE event_reminders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT REFERENCES calendar_events(id) ON DELETE CASCADE,
  task_item_id TEXT REFERENCES task_items(id) ON DELETE CASCADE,
  -- One of event_id or task_item_id must be set
  
  minutes_before INTEGER NOT NULL DEFAULT 15,
  reminder_type TEXT DEFAULT 'notification', -- 'notification', 'email'
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Feature Roadmap (Priority Order)

### Phase 1: Foundation (MVP) 🔴
*Goal: A usable calendar with events AND tasks*

1. **Create `calendar_events` table + migration**
2. **Events API** — CRUD endpoints for calendar events
3. **Unified calendar rendering** — show both events and scheduled tasks
4. **"Create Event" button** — obvious, discoverable entry point
5. **Event creation modal** — title, date, start/end time, all-day toggle, calendar picker
6. **Fix click-drag date bug** — events assigned to correct day
7. **Fix overlapping event layout** — column-splitting algorithm
8. **Event colors from calendar** — use the calendar's color, not hardcoded orange
9. **Current time indicator** — red line showing "now" on week/day views
10. **Month view click → create event** — click a date cell to add an event

### Phase 2: Polish & Usability 🟡
*Goal: Pleasant to use daily*

11. **Touch support** — touchstart/touchmove/touchend for all drag operations
12. **Dashboard "My Day" widget** — merge today's events + tasks in timeline
13. **Dashboard "This Week" widget** — actually show events/tasks
14. **Consistent week start** — make configurable (Mon or Sun)
15. **Event editing inline** — click event → edit in popup without full modal
16. **Quick create with natural language** — "Dentist tomorrow 3pm" parsing
17. **Event location field**
18. **Multi-day events** — spanning across columns
19. **Undo for scheduling changes** — toast with undo button

### Phase 3: Recurring Events 🟡
*Goal: Handle real-life patterns*

20. **RRULE support** — daily, weekly, monthly, yearly presets
21. **Custom recurrence** — every N days/weeks, specific weekdays
22. **Edit scope** — "This event" / "This and following" / "All events"
23. **Exception handling** — single occurrence modifications
24. **Visual indicators** — recurrence icon on event blocks

### Phase 4: External Sync 🟢
*Goal: Google Calendar integration*

25. **Google Calendar OAuth** — reuse existing credentials
26. **Read sync** — pull Google events into LyfeHub
27. **Write sync** — push LyfeHub events to Google
28. **Conflict resolution** — etag-based, last-write-wins with notification
29. **Sync status indicator** — show when last synced

### Phase 5: Advanced 🟢
*Goal: Power features*

30. **Reminders/notifications** — with PWA push support
31. **Time blocking templates** ("Frames") — recurring daily structures
32. **Agenda/list view** — scrollable list of upcoming events
33. **Event search**
34. **iCal URL import** — read-only sync for Apple/Outlook calendars
35. **Capacity indicator** — "6h planned of 8h available"

---

## 5. ADHD Design Principles

Based on research of ADHD-focused tools (Tiimo, Sunsama, Morgen):

1. **Default to Today** — landing view should be "My Day," not month overview
2. **Progressive disclosure** — show simple create form first, expand for details
3. **Calm colors** — blue/green/purple. Red ONLY for truly urgent. No anxiety-inducing design.
4. **No guilt mechanics** — no streaks, no shame for missed tasks. Gentle "reschedule?" nudges.
5. **Quick capture < 15 seconds** — event creation must be fast
6. **Visual distinction** — events (solid) vs tasks (dashed) at a glance
7. **"Reschedule / Drop it" on overdue** — two buttons, no judgment
8. **Celebration on completion** — small animation/confetti for completing time-blocked tasks
9. **Capacity awareness** — don't let the calendar get so full it causes overwhelm

---

## 6. Discussion Log

*(Ongoing decisions and conversations tracked here)*

### 2026-02-18: Events vs Tasks Decision
**Question:** Should events be separate from tasks or should tasks be enhanced?

**Decision:** Hybrid approach — separate `calendar_events` table for true events (meetings, appointments, things that happen at a time), unified calendar rendering that shows both events and scheduled tasks. Tasks remain tasks. Events remain events. The calendar is the unified view.

**Rationale:** See Section 2 above for full analysis.

---

## References

- Full research doc: `apps/BRaiN/docs/calendar-research.md`
- Backend audit: Sub-agent report (2026-02-18)
- Frontend audit: Sub-agent report (2026-02-18)  
- UX audit: Sub-agent report (2026-02-18)
- Calendar CSS: `frontend/css/calendar.css`
- Calendar JS: `frontend/js/calendar.js` (~2800 lines)
- Calendar DB: `backend/src/db/calendars.js`
- Week widget: `frontend/js/widgets/week-calendar.js`
