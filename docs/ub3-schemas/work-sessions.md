# Work Sessions Database Schema

> **Source:** Jake's Ultimate Brain 3.0 Notion Workspace  
> **Database ID:** `22f49e36-383b-81b7-8b8b-cb12da7b83f0`  
> **Icon:** 🔴 Stopwatch (external: notion.so/icons/stopwatch_red.svg)  
> **Created:** 2025-07-13  
> **Last Edited:** 2025-07-28

## Description

This is the primary/source database for all work sessions (e.g. time-tracking sessions) in Ultimate Brain. All work sessions are contained in this database; the Sessions views in Task pages are linked views of this database with unique sets of filters, sorts, and display criteria that make them more useful.

A "Work Session" represents work done by a single person on a single task for a period of time.

---

## Properties Overview

| Property | Type | ID | Purpose |
|----------|------|-----|---------|
| Name | title | `title` | Session name (auto-generated from task) |
| Start | date | `RVAs` | When session started |
| End | date | `fs^H` | When session ended |
| Duration (Mins) | formula | `JTr^` | Duration in minutes (numeric) |
| Duration | formula | `iXcb` | Duration formatted as HH:MM:SS |
| Start/End | formula | `Lj]R` | Date range for calendar display |
| Tasks | relation | `;tfM` | Link to Tasks database |
| Project | rollup | `N[;s` | Project from linked task |
| Team Member | people | `\}oW` | Person who did the work |
| End Session | button | `a]g|` | Click to end session |

---

## Core Properties

### Name
- **Type:** `title`
- **ID:** `title`
- **Description:** The name of this session. Usually generated automatically when you click the Start button within a Task.

### Start
- **Type:** `date`
- **ID:** `RVAs`
- **Description:** The date/time the session started.
- **Notes:** Includes time component for precise tracking.

### End
- **Type:** `date`
- **ID:** `fs^H`
- **Description:** The date/time the session ended.
- **Notes:** When empty, the session is considered "active" (still running).

---

## Computed Properties (Formulas)

### Duration (Mins)
- **Type:** `formula`
- **ID:** `JTr^`
- **Description:** This session's duration in minutes. Calculated by subtracting the Start date/time value from the End date/time value.
- **Returns:** `number`

**Formula Logic:**
```
let(
  duration,
  if(
    empty(End),
    dateBetween(now(), Start, "minutes"),     // If still running, calc to now
    dateBetween(End, Start, "minutes")        // If ended, calc between start/end
  ),
  duration >= 0 ? duration : 0                // Ensure non-negative
)
```

**Behavior:**
- If `End` is empty → calculates duration from `Start` to `now()` (live counter)
- If `End` has a value → calculates duration between `Start` and `End`
- Returns 0 if result would be negative

---

### Duration
- **Type:** `formula`
- **ID:** `iXcb`
- **Description:** This session's duration, formatted in HH:MM:SS as a string value.
- **Returns:** `string`

**Formula Logic:**
```
lets(
  duration, Duration (Mins),
  hours, floor(duration / 60),
  hoursLabel, hours < 10 ? "0" + hours : hours,
  minutes, duration % 60,
  minutesLabel, minutes < 10 ? "0" + minutes : minutes,
  hoursLabel + ":" + minutesLabel + ":00"
)
```

**Output Format:** `HH:MM:00` (e.g., "01:30:00" for 90 minutes)
- Always zero-padded (02:05:00 not 2:5:00)
- Seconds always shown as `:00` (not tracked)

---

### Start/End
- **Type:** `formula`
- **ID:** `Lj]R`
- **Description:** A date range constructed from the Start and End date values.
- **Returns:** `date` (date range)

**Formula Logic:**
```
dateRange(Start, End)
```

**Purpose:** Used as the "Calendar By" property in the Calendar view within the Work Sessions source database. This allows viewing sessions in Notion Calendar as time blocks.

---

## Relation Properties

### Tasks
- **Type:** `relation`
- **ID:** `;tfM` (URL-encoded: `%3BtfM`)
- **Related Database:** Tasks
- **Related Database ID:** `22f49e36-383b-814f-a8d0-e553c1923507`
- **Relation Type:** `dual_property` (bidirectional)
- **Synced Property in Tasks:** `Sessions` (ID: `MKFa`)

**Description:** This session's task. Connects to the Sessions relation property in the Tasks database.

**Usage:**
- Each work session is linked to exactly one task
- From the Tasks database, you can see all sessions logged against that task
- Enables time tracking rollups at the task level

---

## Rollup Properties

### Project
- **Type:** `rollup`
- **ID:** `N[;s` (URL-encoded: `N%5B%3Bs`)
- **Source Relation:** `Tasks` (ID: `;tfM`)
- **Source Property:** `Project` (ID: `mvxY`)
- **Function:** `show_original`

**Description:** The project (if any) to which this session's task is related.

**Chain:** Work Session → Task → Project

This provides a quick way to see which project a session belongs to without navigating through the task.

---

## People Properties

### Team Member
- **Type:** `people`
- **ID:** `\}oW` (URL-encoded: `%5C%7DoW`)
- **Description:** The person who completed this work session.

**Notes:** While Ultimate Brain is meant for personal use, this property helps to future-proof the template for team scenarios. Useful for:
- Filtering sessions by person
- Team time tracking
- Multi-user workspaces

---

## Button Properties

### End Session
- **Type:** `button`
- **ID:** `a]g|` (URL-encoded: `a%5Dg%7C`)
- **Description:** Click this button to end this work session by setting the current date/time in the End property.

**Behavior:**
- Sets `End` to current date/time
- If `End` already has a value, clicking will **overwrite** it with the current date/time
- Paired with a "Start Session" button in the Tasks database

---

## Database Relationships

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  Work Sessions  │────────▶│      Tasks      │────────▶│    Projects     │
│                 │ Tasks   │                 │ Project │                 │
│                 │         │   Sessions ◀────│         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
        │
        │ (rollup: Project)
        └──────────────────────────────────────────────────────────────────┘
```

**Key Relationships:**
- **Work Sessions → Tasks:** Each session belongs to one task (via `Tasks` relation)
- **Tasks → Work Sessions:** Each task can have many sessions (via `Sessions` relation)
- **Work Sessions → Projects:** Indirect via rollup from the linked task

---

## Common Use Cases

### Starting a Work Session
1. Navigate to a Task
2. Click the "Start Session" button (creates new Work Session with Start = now)
3. Session name auto-generated (typically task name + timestamp)
4. Task relation auto-set

### Ending a Work Session
1. Navigate to the active Work Session
2. Click "End Session" button
3. End date/time set to now
4. Duration auto-calculated

### Viewing Time on a Task
- Open any Task
- View the linked Sessions (filtered linked database view)
- Duration rollup on Task shows total time

### Calendar Integration
- Use the `Start/End` formula property as Calendar By
- Sessions appear as time blocks in Notion Calendar
- Visual representation of work periods

---

## LyfeHub Implementation Notes

### Required Fields for MVP
- `name` (title) - Session identifier
- `start` (datetime) - Required, session start
- `end` (datetime) - Optional, null = active session
- `task_id` (relation) - Link to task

### Computed Fields
- `duration_mins` - Calculate on read: `end ? (end - start) / 60000 : (now - start) / 60000`
- `duration_display` - Format as HH:MM:SS string
- `is_active` - Boolean: `end === null`

### Considerations
1. **Live Duration:** Active sessions need real-time duration updates (client-side)
2. **Single Active:** Consider enforcing only one active session at a time
3. **Project Rollup:** Can be computed via task relationship, no need to store
4. **Team Member:** Include if building for multi-user; skip for solo MVP

### API Endpoints
```
GET    /api/sessions              - List all sessions
GET    /api/sessions/active       - Get currently active session
POST   /api/sessions              - Start new session (auto-sets start)
PATCH  /api/sessions/:id          - Update session
PATCH  /api/sessions/:id/end      - End session (sets end to now)
GET    /api/tasks/:id/sessions    - List sessions for a task
```

---

## Raw Property Reference

| Property | ID (Raw) | ID (URL-encoded) |
|----------|----------|------------------|
| Tasks | `;tfM` | `%3BtfM` |
| Duration (Mins) | `JTr^` | `JTr%5E` |
| Start/End | `Lj]R` | `Lj%5DR` |
| Project | `N[;s` | `N%5B%3Bs` |
| Start | `RVAs` | `RVAs` |
| Team Member | `\}oW` | `%5C%7DoW` |
| End Session | `a]g|` | `a%5Dg%7C` |
| End | `fs^H` | `fs%5EH` |
| Duration | `iXcb` | `iXcb` |
| Name | `title` | `title` |
