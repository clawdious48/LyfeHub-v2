# Tasks Module Design

> Approved 2026-03-01. Source of truth for the React Tasks module rebuild.

## Overview

Complete rebuild of the Tasks feature from vanilla JS to React. Three-tier creation flow, sidebar-driven smart views, My Lists, and progressive disclosure in the detail modal. Follows Jobs as the reference implementation pattern.

---

## 1. Page Structure & Navigation

### Sidebar (contextual for `/tasks` route)

A custom `TasksSidebarContent` component registered in `sidebarConfig.ts`:

**Smart Views** (with live count badges):
| Icon | View | Filter Logic |
|------|------|-------------|
| Sun | My Day | `due_date === today` (strictly today, not overdue) |
| Star | Important | `important === 1` |
| Calendar | Scheduled | `due_date !== null` |
| AlertTriangle | Past Due | `due_date < today && completed === 0` |
| Repeat | Recurring | `recurring !== null` |
| List | All Tasks | `completed === 0` |
| Check | Completed | `completed === 1` |

Past Due uses warm/amber accent — not red (ADHD calm colors principle).

**My Lists** section below smart views:
- User-created lists with colored dot, name, count badge
- "+ New List" button at bottom
- @dnd-kit drag-and-drop reorder

### Page Layout

- No smart view tabs in page content — sidebar handles all navigation
- Page reads active view/filter from URL search params
- URL strategy: `/tasks?view=my-day`, `/tasks?view=important`, `/tasks?list=<id>`
- Content area: toolbar + task list or card grid

---

## 2. Task List & Card Views

### Toolbar

- Inline quick-add input (persistent, Enter to create, auto-clears)
- "Create Task" button (opens full detail modal)
- List / Cards view toggle
- Sort: Due date, Created date, Custom (drag reorder)
- Cards view adds: S / M / L size toggle

### List View — Task Row

```
[○ checkbox] [title]  [due chip?] [priority dot?] [list chip?]  [☀ my-day] [☆ star]
```

- Checkbox: toggles complete (optimistic strikethrough + fade)
- Title: click opens detail modal
- Due date chip: only shown if set, color-coded (amber if past due, muted if future)
- Priority dot: only shown if not "none" (green/amber/red)
- List chip: only shown if assigned, uses list color
- Sun icon: toggles `my_day` field, filled orange when active
- Star icon: toggles `important` field, filled orange when active
- Chips only render when data exists

### Card View

- S/M/L cards in responsive grid
- Cards show: checkbox, title, due date, priority badge, list badge, subtask progress bar, sun + star toggles
- L cards additionally show description preview (~2 lines)

### Completed Tasks

In "All Tasks" or a specific list view, completed tasks appear in a collapsible "Completed" section at bottom (collapsed by default), with strikethrough styling.

---

## 3. Task Creation (Three Tiers)

### Tier 1 — Inline Rapid-Fire (list view)

- Persistent text input at top: `"+ Add a task..."`
- Type title → Enter → task created → field clears → focus stays
- Supports rapid sequential entry without friction
- Context inheritance: auto-assigns `list_id` if viewing a list, auto-sets `due_date` to today if viewing My Day
- Optimistic: task appears at top instantly

### Tier 2 — Sidebar Quick Capture

The existing "Task" button in the sidebar Quick Capture section opens a lightweight modal:
- Title (required)
- Description (plain textarea)
- Quick relation pickers: People, Project, Notes
- List assignment dropdown
- Save + close

### Tier 3 — Full Detail Modal ("Create Task" button)

Same modal used for editing. In create mode, no Delete button and no Created date.

**Standard section** (always visible):
- Title input + important star toggle
- When: date picker + time range picker
- Priority: None / Low / Medium / High (pill buttons)
- List: dropdown select
- Description: markdown editor with toolbar
- Subtasks: checklist with add/remove/reorder

**More Options** (collapsible, collapsed by default, remembers state):
- Recurring: preset pills (Never, Daily, Weekdays, Weekly, Every 2 weeks, Monthly, Yearly) + day-of-week circles
- Energy: None / Low / High
- Location: None / Home / Office / Errand
- Calendars: toggle chips
- Relations: Project picker (+), People picker (+), Notes picker (+)

**Footer**: Delete (red, edit only) | Created date (edit only) | Save Task (orange)

---

## 4. My Lists

**Purpose:** User-created organizational containers (e.g., "Shopping List", "Work Ideas").

**Properties:** Name, icon, color, position, user_id.

**CRUD:**
- Create: "+ New List" in sidebar → small modal (name + color picker)
- Edit: right-click or kebab menu → rename, change color
- Delete: soft-delete (archive, never delete) — tasks get unassigned (`list_id = null`), not deleted
- Reorder: @dnd-kit drag-and-drop in sidebar

**Filtering:** Clicking a list sets URL to `/tasks?list=<id>`. Toolbar shows active list name as header.

**Context inheritance:** Inline rapid-fire inherits `list_id` when viewing a specific list.

**API:** `GET/POST /api/task-lists`, `GET/PUT/DELETE /api/task-lists/:id`

---

## 5. State Management & Data Flow

### Zustand Store (`stores/tasksUiStore.ts`)

**Persisted** (localStorage key: `lyfehub-tasks-ui`):
- `displayMode`: `'list' | 'cards'`
- `cardSize`: `'S' | 'M' | 'L'`
- `sortBy`: `'due' | 'created' | 'custom'`
- `sortDirection`: `'asc' | 'desc'`
- `moreOptionsExpanded`: boolean

**Ephemeral** (resets on navigation):
- `activeView`: smart view key
- `activeListId`: string | null
- `selectedTaskId`: string | null
- `createModalOpen`: boolean

### React Query Hooks

Existing: `useTasks`, `useTask`, `useCreateTask`, `useUpdateTask`, `useDeleteTask`, `useCalendarTasks`, `useUnscheduledTasks`, `useScheduleTask`, `useUnscheduleTask`

New hooks needed:
| Hook | Purpose |
|------|---------|
| `useTaskCounts` | Badge numbers for all smart views (derived client-side from `useTasks`) |
| `useTaskLists` | Fetch all user lists |
| `useCreateTaskList` | Create a new list |
| `useUpdateTaskList` | Rename, recolor, reorder |
| `useDeleteTaskList` | Soft-delete a list |
| `useToggleTask` | Toggle complete with optimistic update |
| `useToggleImportant` | Toggle `important` with optimistic update |
| `useToggleMyDay` | Toggle `my_day` with optimistic update |

### Smart View Filtering

All client-side from `useTasks()` result:
- My Day: `task.due_date === today`
- Important: `task.important === 1`
- Scheduled: `task.due_date !== null`
- Past Due: `task.due_date < today && task.completed === 0`
- Recurring: `task.recurring !== null`
- All Tasks: `task.completed === 0`
- Completed: `task.completed === 1`

### Optimistic Updates

Critical for snappy UX:
- Checkbox: immediately strikes through + fades, rollback on error
- Star: immediately fills/unfills
- My Day sun: immediately fills/unfills
- Inline quick-add: task appears at top instantly

---

## 6. File Structure

```
pages/
  TasksPage.tsx
  tasks/
    components/
      list/
        TaskListView.tsx
        TaskCardView.tsx
        TaskRow.tsx
        TaskCard.tsx
        TaskToolbar.tsx
        TaskInlineAdd.tsx
        TaskEmptyState.tsx
      modals/
        TaskDetailModal.tsx
        TaskQuickCaptureModal.tsx
        CreateListModal.tsx
      sidebar/
        TasksSidebarContent.tsx
    utils/
      taskConstants.ts
      taskHelpers.ts

stores/
  tasksUiStore.ts

api/hooks/
  useTasks.ts                    (extended)
```

### Component Responsibilities

- **TasksPage.tsx** — Reads `?view=` and `?list=` from URL, passes active filter down, manages modal state
- **TasksSidebarContent.tsx** — Smart views + My Lists. Imported by `sidebarConfig.ts`. Uses `useSearchParams` to navigate.
- **TaskRow.tsx** — Self-contained with its own toggle handlers
- **TaskDetailModal.tsx** — Controlled by parent, handles create + edit via `initialData` prop

---

## 7. Dashboard Integration & Completion Behavior

### My Day Widget

Uses same filter as Tasks My Day smart view: `due_date === today`. Widget "View All" link → `/tasks?view=my-day`.

### Completion Behavior

1. Checkbox click → optimistic strikethrough + fade to 50% opacity
2. After ~1 second delay, task slides out of current view (unless in Completed view)
3. Toast: "Task completed" with "Undo" button (3 second window)
4. In Completed view, tasks show strikethrough but can be unchecked to restore

### Past Due Nudge

In Past Due view, each task row shows on hover:
- "Reschedule" — opens date picker popover
- "Drop it" — archives/completes the task

No guilt language. Quiet options aligned with ADHD no-guilt principle.
