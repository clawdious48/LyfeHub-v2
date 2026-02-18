# Calendar Phase 1: Foundation — Implementation Plan

**Feature:** Standalone calendar events + unified calendar rendering (events + tasks)
**Reference:** `CALENDAR-WORKING-DOC.md` (audit findings + architecture decisions)
**Created:** 2026-02-18
**Worktree:** `/root/lyfehub-v2/worktrees/calendar/`
**Preview:** http://82.180.136.224:4006

---

## Evals (Acceptance Criteria)

### E1: Database — Events Table Exists & Works
- [ ] `calendar_events` table created with all columns (title, description, location, start/end date/time, is_all_day, timezone, rrule, calendar_id, user_id, external sync fields)
- [ ] `event_reminders` table created
- [ ] `task_items` table has `calendar_id` column added (FK to calendars)
- [ ] Migration runs cleanly on fresh DB and existing DB
- [ ] Indexes exist on user_id, calendar_id, date range, and external_id

### E2: API — Full Events CRUD
- [ ] `GET /api/calendar-events` — list events for user (supports date range filtering via `?start=&end=`)
- [ ] `GET /api/calendar-events/:id` — get single event
- [ ] `POST /api/calendar-events` — create event (title, calendar_id, start_date required)
- [ ] `PATCH /api/calendar-events/:id` — update event fields
- [ ] `DELETE /api/calendar-events/:id` — delete event
- [ ] All endpoints require auth and respect RBAC (calendar scope)
- [ ] Creating an event without a calendar_id assigns it to the user's default calendar
- [ ] Events return their parent calendar's color in the response

### E3: Unified Calendar Rendering
- [ ] Calendar view shows BOTH events and scheduled tasks on the same grid
- [ ] Events render as solid colored blocks using their calendar's color
- [ ] Scheduled tasks render with a visually distinct style (dashed border or striped pattern)
- [ ] Both events and tasks are clickable — events open event detail, tasks open task detail
- [ ] Month view shows both events and tasks in date cells
- [ ] Week/Day/3-Day views show both in time grid with correct positioning

### E4: Event Creation UX
- [ ] Visible "Create Event" button exists (not hidden behind click-drag discovery)
- [ ] Clicking a date cell in month view opens event creation modal
- [ ] Event creation modal has: title, date, start time, end time, all-day toggle, calendar picker (dropdown with colors), description, location
- [ ] Click-drag on week/day views creates an event (not just a task) — user chooses type
- [ ] Quick-add (FAB/+) includes option to create event (not just task)

### E5: Bug Fixes — Critical Issues
- [ ] Click-drag assigns event to correct date column (not wrong day)
- [ ] Overlapping events display side-by-side (column-splitting), not stacked on top
- [ ] Current time indicator (red/orange line) visible on week/day views
- [ ] Events use their calendar's color (not hardcoded orange)
- [ ] Day view event positioning uses full grid (not individual hour cells)

### E6: Dashboard Integration
- [ ] "This Week" widget shows both events and tasks (not empty)
- [ ] "My Day" widget shows today's events + today's tasks merged
- [ ] Week widget and full calendar use consistent week start day

### E7: Mobile Baseline
- [ ] Touch events (touchstart/touchmove/touchend) added for drag operations
- [ ] Event creation modal is usable on mobile viewport (375px)
- [ ] Calendar views don't overflow horizontally on mobile

---

## Task List

| ID | Task | Description | Depends On | Parallel Group |
|----|------|-------------|------------|----------------|
| T1 | DB Migration | Create `calendar_events` table, `event_reminders` table, add `calendar_id` to `task_items` | — | A |
| T2 | Events DB Layer | `backend/src/db/calendarEvents.js` — CRUD functions, date range queries, calendar color joins | T1 | B |
| T3 | Events API Routes | REST endpoints for calendar events CRUD with auth/RBAC | T2 | C |
| T4 | Frontend API Client | Add event API calls to `frontend/js/api.js` | T3 | D |
| T5 | Unified Data Loading | Update `calendar.js` to fetch both events AND tasks, merge into single render array | T4 | D |
| T6 | Event Rendering | Render events as solid blocks with calendar colors; render tasks as dashed blocks; handle overlapping layout (column-splitting algorithm) | T5 | E |
| T7 | Event Creation Modal | New modal for creating/editing events (title, dates, times, all-day, calendar, description, location) | T4 | D |
| T8 | Create Event Entry Points | "Create Event" button, month cell click, click-drag type chooser (event vs task), quick-add option | T6, T7 | F |
| T9 | Click-Drag Date Fix | Fix wrong-day assignment bug in click-drag time selection | — | A |
| T10 | Current Time Indicator | Red line showing current time on week/day/3-day views, updates every minute | — | A |
| T11 | Calendar Color Integration | Events + tasks use their calendar's color instead of hardcoded orange | T6 | F |
| T12 | Day View Positioning Fix | Fix event blocks positioned in hour cells instead of full grid | — | A |
| T13 | Dashboard Widgets | Update "This Week" and "My Day" widgets to show both events and tasks | T3 | D |
| T14 | Touch Support | Add touch event handlers for drag operations (schedule, reschedule, resize) | T6 | F |
| T15 | Mobile Polish | Ensure creation modal, views, and interactions work on 375px viewport | T8, T14 | G |

---

## Execution Order

**Phase A (Parallel — No Dependencies):**
- T1: DB Migration
- T9: Click-Drag Date Fix
- T10: Current Time Indicator
- T12: Day View Positioning Fix

**Phase B (Requires T1):**
- T2: Events DB Layer

**Phase C (Requires T2):**
- T3: Events API Routes

**Phase D (Parallel — Requires T3):**
- T4: Frontend API Client
- T5: Unified Data Loading
- T7: Event Creation Modal
- T13: Dashboard Widgets

**Phase E (Requires T5):**
- T6: Event Rendering (unified render + overlap algorithm)

**Phase F (Parallel — Requires T6 + T7):**
- T8: Create Event Entry Points
- T11: Calendar Color Integration
- T14: Touch Support

**Phase G (Requires T8 + T14):**
- T15: Mobile Polish

---

## Post-Implementation

1. **Code Review** — Sub-agent reviews all new code for quality, security, consistency
2. **QA via Browser Agent** — Sub-agent tests every eval criterion on preview (port 4006)
3. **Report** — Complete only after all evals pass

---

## Status

**[ ] Awaiting Approval**
