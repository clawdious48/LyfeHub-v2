# Tasks Module Design

> Updated 2026-03-01. Source of truth for the React Tasks module rebuild.

## Overview

Complete rebuild of the Tasks feature from vanilla JS to React. Four display modes (List, Cards, Board, Focus), sidebar-driven smart views, My Lists, three-tier creation flow, and a two-column detail modal. Follows Jobs as the reference implementation pattern.

---

## 1. Page Architecture

### URL Strategy

- `/tasks` — defaults to My Day smart view
- `/tasks?view=my-day` / `important` / `scheduled` / `recurring` / `all` / `completed`
- `/tasks?view=list:<id>` — specific user list

Query param driven, not route-based — same page component with different filters.

### Sidebar (contextual for `/tasks` route)

A custom `TasksSidebarContent` component registered in `sidebarConfig.ts` using the `component` pattern (same as `BaseSidebarContent` and `MailSidebarContent`).

**Smart Views** (with live count badges from `GET /api/tasks/counts`):

| Icon | View | Badge | API `view=` param |
|------|------|-------|-------------------|
| Sun | My Day | count | `my-day` |
| AlertCircle | Important | count | `important` |
| CalendarDays | Scheduled | count | `scheduled` |
| Repeat | Recurring | count | `recurring` |
| ListTodo | All Tasks | count | `all` |
| CheckCircle | Completed | — | `completed` |

- Active view highlighted with accent background
- Clicking a view updates the `?view=` query param

**My Lists** section below smart views:

- Header: "My Lists" with "+" button to create a new list
- Each item: color dot + name + incomplete task count
- Click navigates to `?view=list:{id}`
- Right-click or "..." menu: Edit (rename/recolor), Delete (ungroups tasks, doesn't delete them)
- "+ New List" opens a small modal: name input + color picker
- Lists ordered by `position`, draggable to reorder via @dnd-kit

Below that, the standard Productivity and Resources sections still appear.

**Default view:** `/tasks` with no query param defaults to "My Day" — ADHD principle: Default to Today.

### Page Layout

- No smart view tabs in page content — sidebar handles all navigation
- Content area: toolbar + active display mode
- TasksPage manages: active view (from URL), display mode, selected task ID (for modal)

### Zustand Store (`stores/tasksUiStore.ts`)

**Persisted** (localStorage key: `lyfehub-tasks-ui`):
- `displayMode`: `'list' | 'cards' | 'board' | 'focus'`
- `cardSize`: `'S' | 'M' | 'L'`
- `boardGroupBy`: `'priority' | 'energy' | 'list' | 'location'`
- `sortBy`: `'due' | 'created' | 'custom'`
- `sortDirection`: `'asc' | 'desc'`
- `moreOptionsExpanded`: boolean (detail modal state)

**Ephemeral** (resets on navigation):
- `selectedTaskId`: string | null
- `createModalOpen`: boolean

---

## 2. Display Modes

View switcher in the toolbar — four icon buttons: List, Cards, Board, Focus.

### List View

- Inline quick-add input at top: placeholder "Add a task...", Enter creates, clears, ready for next
- Each row: checkbox (toggle complete) | title | due date badge (if set) | priority dot (if set) | star toggle (important)
- Click row opens detail modal
- Completed section collapsed at bottom: "Completed (N)" — click to expand, shows completed tasks with strikethrough
- Sort options in toolbar: Due, Created, Custom

### Cards View

- Same quick-add input at top
- S/M/L size toggle in toolbar
- **Small:** Title + checkbox only, tight grid
- **Medium:** Title, checkbox, due date, priority badge, subtask progress (e.g., "2/4")
- **Large:** Title, checkbox, due date, priority, description preview (~2 lines), subtask progress, list badge
- Click card opens detail modal
- Same collapsed completed section at bottom

### Board View

- Kanban columns grouped by a selectable dimension — toolbar dropdown: Priority, Energy, List, Location
- Each column header shows the value + task count
- Cards inside columns are compact (title, due date, priority dot)
- Drag cards between columns via @dnd-kit — dropping into a new column updates that task's property (e.g., drag from "Low" to "High" changes priority)
- "Ungrouped" / "None" column for tasks without a value for the grouping field
- No inline quick-add in board — use sidebar Quick Capture or the page-level "+ Create Task" button

### Focus Mode

- Single large card centered on screen
- Shows: title, due date, priority, list, description, subtask checklist (interactive — can check them off)
- Three action buttons: "Done" (complete task), "Skip" (next task), "Reschedule" (opens date picker popover)
- Left/right arrow navigation + keyboard arrow keys
- Counter at bottom: "3 of 11 tasks"
- Respects the current smart view filter (Focus Mode on "My Day" only cycles through today's tasks)

---

## 3. Task Detail Modal

Two-column layout inside a shadcn Dialog. Opens when clicking any task from any display mode. Same modal for create and edit.

### Header (full width)

- Left: Checkbox (toggle complete) + title input (editable inline, auto-saves on blur)
- Right: Star toggle (important) + close button

### Left Column — Content (~55%)

**Description:**
- Markdown-capable textarea with simple formatting toolbar (bold, italic, heading, link, bullet, code, hr)
- Placeholder: "Add description..."
- Auto-saves on blur

**Subtasks:**
- Checklist of subtask items, each with: checkbox + text input
- Click checkbox to toggle completion
- Click text to edit inline
- "Add subtask..." input at the bottom — Enter to add, focus stays for rapid entry
- Drag handle on each subtask for reordering via @dnd-kit

### Right Column — Metadata (~45%)

**Standard fields** (always visible):
- **When** — Date picker + time range pickers (start/end)
- **Priority** — Chip group: None, Low, Medium, High
- **List** — Dropdown select from user's task lists
- **My Day** — Toggle switch (add/remove from My Day)

**More Options** (collapsible, collapsed by default, remembers expanded state):
- **Recurring** — Chip group: Never, Daily, Weekdays, Weekly, Every 2 weeks, Monthly, Yearly + day-of-week selector circles
- **Energy** — Chip group: None, Low, High
- **Location** — Chip group: None, Home, Office, Errand
- **Calendars** — Multi-select chip toggles (user's calendars)

**Relations** (always visible, below More Options):
- **People** — Linked people badges + "Add" button (opens picker)
- **Projects** — Linked project badge + "Add" button
- **Notes** — Linked notes badges + "Add" button

### Footer (full width)

- Left: Delete button (red, with confirmation) — edit mode only
- Center: "Created {date}" — edit mode only
- Right: Save button (orange accent)

### Responsive behavior

On narrow screens (< 640px), columns stack vertically — content on top, metadata below.

---

## 4. Three-Tier Task Creation

### Tier 1 — Inline Rapid-Fire (List & Cards views)

- Persistent text input at top of the task list
- Type title → Enter → task created → field clears → focus stays
- Supports rapid sequential entry without friction
- Optimistic update — task appears instantly before API confirms
- Context-aware defaults:
  - On "My Day" → `my_day: true`
  - On "Important" → `important: true`
  - On a specific list → `list_id` pre-set
  - On "All Tasks" / "Inbox" → bare task, no defaults

### Tier 2 — Sidebar Quick Capture

The existing "Task" button in sidebar Quick Capture section opens a lightweight modal:
- Title (required)
- Description (plain textarea, no markdown toolbar)
- Quick relation pickers: People, Projects, Notes
- "Create" button saves and closes
- Accessible from any page since sidebar is global
- Does NOT include date, priority, recurring, or other metadata

### Tier 3 — Page "Create Task" Button

- "+ Create Task" button in the Tasks page toolbar (next to view switcher)
- Opens the full detail modal (Section 3) in create mode
- Title field auto-focused
- All fields available upfront
- No Delete button, no Created date in create mode
- Context-aware defaults same as Tier 1

---

## 5. My Lists

**Purpose:** User-created organizational containers (e.g., "Shopping List", "Work Ideas").

**Properties:** id, name, color, position, user_id, task_count (computed).

**CRUD:**
- Create: "+ New List" in sidebar → small modal (name + color picker)
- Edit: right-click or kebab menu → rename, change color
- Delete: tasks get unassigned (`list_id = null`), not deleted (archive, never delete)
- Reorder: @dnd-kit drag-and-drop in sidebar

**Filtering:** Clicking a list sets URL to `/tasks?view=list:<id>`. Toolbar shows active list name as header.

**API:** `GET/POST /api/task-lists`, `PATCH/DELETE /api/task-lists/:id`

---

## 6. Completed Tasks & Completion Behavior

### Display

Completed tasks appear as a collapsible "Completed (N)" section at the bottom of the current view (collapsed by default). Shown in all smart views except "Completed" which shows them as the main list.

### Completion Animation

1. Checkbox click → optimistic strikethrough + fade to 50% opacity
2. After ~1 second delay, task slides into the completed section
3. In Completed view, tasks show strikethrough but can be unchecked to restore

### Past Due Nudge (ADHD principle: no guilt)

Overdue tasks show gentle options on hover:
- "Reschedule" — opens date picker popover
- "Drop it" — completes the task

No guilt language. Quiet options.

---

## 7. Hooks & Data Layer

### Query Key Factories

```typescript
taskKeys = {
  all: ['tasks'],
  lists: () => [...taskKeys.all, 'list'],
  list: (view: string) => [...taskKeys.lists(), { view }],
  counts: () => [...taskKeys.all, 'counts'],
  detail: (id: string) => [...taskKeys.all, 'detail', id],
}

taskListKeys = {
  all: ['task-lists'],
  list: () => [...taskListKeys.all, 'list'],
  detail: (id: string) => [...taskListKeys.all, 'detail', id],
}
```

### Queries

| Hook | Endpoint | Purpose |
|------|----------|---------|
| `useTasks(view, today?)` | `GET /api/tasks?view=` | Main task list with smart view filter |
| `useTask(id)` | `GET /api/tasks/:id` | Single task for detail modal |
| `useTaskCounts(today?)` | `GET /api/tasks/counts` | Sidebar badge numbers |
| `useTaskLists()` | `GET /api/task-lists` | Sidebar + list dropdown |
| `useCalendarTasks(start, end)` | `GET /api/tasks/calendar` | Calendar integration (exists) |
| `useUnscheduledTasks()` | `GET /api/tasks/calendar/unscheduled` | Calendar sidebar (exists) |

### Mutations

| Hook | Endpoint | Optimistic? |
|------|----------|------------|
| `useCreateTask()` | `POST /api/tasks` | Yes — append to list with temp ID |
| `useUpdateTask()` | `PATCH /api/tasks/:id` | No — debounced save |
| `useDeleteTask()` | `DELETE /api/tasks/:id` | No — confirm first |
| `useToggleTask()` | `POST /api/tasks/:id/toggle` | Yes — flip completed in cache |
| `useToggleMyDay()` | `POST /api/tasks/:id/toggle-my-day` | Yes — flip my_day in cache |
| `useScheduleTask()` | `PATCH /api/tasks/:id/schedule` | No |
| `useUnscheduleTask()` | `PATCH /api/tasks/:id/unschedule` | No |
| `useCreateTaskList()` | `POST /api/task-lists` | No |
| `useUpdateTaskList()` | `PATCH /api/task-lists/:id` | No |
| `useDeleteTaskList()` | `DELETE /api/task-lists/:id` | No |

### Optimistic Updates (critical for UX)

- **Checkbox toggle** — Immediately flip `completed` in cache, revert on error
- **Star toggle** — Immediately flip `important` in cache
- **My Day toggle** — Immediately flip in cache
- **Inline quick-add** — Append task to list with temp ID, replace with real ID on response
- **Board drag** — Immediately update the grouped field value in cache

---

## 8. File Structure

```
pages/
  TasksPage.tsx                          ← Top-level, manages view state + display mode
  tasks/
    components/
      list/
        TaskListView.tsx                 ← List display mode (rows + inline quick-add)
        TaskRow.tsx                      ← Single task row
        TaskCardsView.tsx               ← Cards display mode (grid + S/M/L)
        TaskCard.tsx                     ← Single task card
        TaskBoardView.tsx               ← Board display mode (kanban columns)
        TaskBoardColumn.tsx             ← Single kanban column
        TaskFocusView.tsx               ← Focus display mode (single card)
        TaskInlineAdd.tsx               ← Shared rapid-fire input component
        TaskCompletedSection.tsx        ← Collapsible completed tasks section
        TaskToolbar.tsx                 ← View switcher, sort, create button
      modals/
        TaskDetailModal.tsx             ← Two-column edit/create modal
        TaskQuickCaptureModal.tsx       ← Tier 2 lightweight modal (sidebar)
        CreateListModal.tsx             ← New list name + color picker
    utils/
      taskConstants.ts                  ← Priority/energy/location options, icons, colors
      taskHelpers.ts                    ← Filtering, sorting, grouping pure functions

stores/
  tasksUiStore.ts                       ← Display mode, card size, board group-by, sort

api/hooks/
  useTasks.ts                           ← Updated with new hooks

layouts/
  sidebarConfig.ts                      ← Add /tasks route with TasksSidebarContent
```

`TasksSidebarContent` referenced by sidebarConfig — same pattern as `BaseSidebarContent` and `MailSidebarContent`.

---

## 9. Dashboard Integration

### My Day Widget

Uses same filter as Tasks My Day smart view. Widget "View All" link → `/tasks?view=my-day`.

### Completion in Widget

Same optimistic checkbox toggle + strikethrough behavior as the full Tasks page.
