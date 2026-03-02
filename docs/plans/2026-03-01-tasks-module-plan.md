# Tasks Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the complete Tasks module for the React frontend — four display modes (List, Cards, Board, Focus), sidebar-driven smart views, My Lists, three-tier creation, and a two-column detail modal.

**Architecture:** TasksPage reads `?view=` from URL and renders one of four display modes. Smart views and My Lists live in the sidebar via `TasksSidebarContent` registered in `sidebarConfig.ts`. Task detail modal opens as an overlay from any display mode. Zustand store persists display preferences.

**Tech Stack:** React 19, TypeScript, TanStack Query, Zustand, shadcn/ui, @dnd-kit, Lucide React, React Router

**Design Doc:** `docs/plans/2026-03-01-tasks-module-design.md`

---

## Task 1: Zustand Store + Constants + Helpers

**Files:**
- Create: `frontend-next/src/stores/tasksUiStore.ts`
- Create: `frontend-next/src/pages/tasks/utils/taskConstants.ts`
- Create: `frontend-next/src/pages/tasks/utils/taskHelpers.ts`

**Step 1: Create the Zustand store**

Follow the `basesUiStore.ts` pattern — manual localStorage load/save, no middleware.

```typescript
// stores/tasksUiStore.ts
import { create } from 'zustand'

const STORAGE_KEY = 'lyfehub-tasks-ui'

type DisplayMode = 'list' | 'cards' | 'board' | 'focus'
type CardSize = 'S' | 'M' | 'L'
type BoardGroupBy = 'priority' | 'energy' | 'list' | 'location'
type SortBy = 'due' | 'created' | 'custom'

interface PersistedState {
  displayMode: DisplayMode
  cardSize: CardSize
  boardGroupBy: BoardGroupBy
  sortBy: SortBy
  moreOptionsExpanded: boolean
}

function loadPersisted(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        displayMode: parsed.displayMode ?? 'list',
        cardSize: parsed.cardSize ?? 'M',
        boardGroupBy: parsed.boardGroupBy ?? 'priority',
        sortBy: parsed.sortBy ?? 'due',
        moreOptionsExpanded: parsed.moreOptionsExpanded ?? false,
      }
    }
  } catch { /* ignore */ }
  return { displayMode: 'list', cardSize: 'M', boardGroupBy: 'priority', sortBy: 'due', moreOptionsExpanded: false }
}

function savePersisted(state: PersistedState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

interface TasksUiState extends PersistedState {
  selectedTaskId: string | null
  createModalOpen: boolean
  setDisplayMode: (mode: DisplayMode) => void
  setCardSize: (size: CardSize) => void
  setBoardGroupBy: (groupBy: BoardGroupBy) => void
  setSortBy: (sort: SortBy) => void
  setMoreOptionsExpanded: (expanded: boolean) => void
  setSelectedTaskId: (id: string | null) => void
  setCreateModalOpen: (open: boolean) => void
}

export const useTasksUiStore = create<TasksUiState>((set, get) => {
  const persisted = loadPersisted()
  return {
    ...persisted,
    selectedTaskId: null,
    createModalOpen: false,
    setDisplayMode: (mode) => {
      set({ displayMode: mode })
      savePersisted({ ...get(), displayMode: mode })
    },
    setCardSize: (size) => {
      set({ cardSize: size })
      savePersisted({ ...get(), cardSize: size })
    },
    setBoardGroupBy: (groupBy) => {
      set({ boardGroupBy: groupBy })
      savePersisted({ ...get(), boardGroupBy: groupBy })
    },
    setSortBy: (sort) => {
      set({ sortBy: sort })
      savePersisted({ ...get(), sortBy: sort })
    },
    setMoreOptionsExpanded: (expanded) => {
      set({ moreOptionsExpanded: expanded })
      savePersisted({ ...get(), moreOptionsExpanded: expanded })
    },
    setSelectedTaskId: (id) => set({ selectedTaskId: id }),
    setCreateModalOpen: (open) => set({ createModalOpen: open }),
  }
})
```

**Step 2: Create task constants**

```typescript
// pages/tasks/utils/taskConstants.ts
import {
  Sun, AlertCircle, CalendarDays, Repeat, ListTodo, CheckCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const PRIORITY_OPTIONS = [
  { value: null, label: 'None' },
  { value: 'low', label: 'Low', color: 'text-blue-400' },
  { value: 'medium', label: 'Medium', color: 'text-amber-400' },
  { value: 'high', label: 'High', color: 'text-red-400' },
] as const

export const ENERGY_OPTIONS = [
  { value: null, label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'high', label: 'High' },
] as const

export const LOCATION_OPTIONS = [
  { value: null, label: 'None' },
  { value: 'home', label: 'Home' },
  { value: 'office', label: 'Office' },
  { value: 'errand', label: 'Errand' },
] as const

export const RECURRING_OPTIONS = [
  { value: null, label: 'Never' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
] as const

export interface SmartView {
  key: string
  label: string
  icon: LucideIcon
  apiParam: string
}

export const SMART_VIEWS: SmartView[] = [
  { key: 'my-day', label: 'My Day', icon: Sun, apiParam: 'my-day' },
  { key: 'important', label: 'Important', icon: AlertCircle, apiParam: 'important' },
  { key: 'scheduled', label: 'Scheduled', icon: CalendarDays, apiParam: 'scheduled' },
  { key: 'recurring', label: 'Recurring', icon: Repeat, apiParam: 'recurring' },
  { key: 'all', label: 'All Tasks', icon: ListTodo, apiParam: 'all' },
  { key: 'completed', label: 'Completed', icon: CheckCircle, apiParam: 'completed' },
]

export const BOARD_GROUP_OPTIONS = [
  { value: 'priority', label: 'Priority' },
  { value: 'energy', label: 'Energy' },
  { value: 'list', label: 'List' },
  { value: 'location', label: 'Location' },
] as const
```

**Step 3: Create task helpers**

```typescript
// pages/tasks/utils/taskHelpers.ts
import type { Task, TaskList } from '@/types/index.js'

export function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

export function sortTasks(tasks: Task[], sortBy: 'due' | 'created' | 'custom'): Task[] {
  const sorted = [...tasks]
  switch (sortBy) {
    case 'due':
      return sorted.sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date.localeCompare(b.due_date)
      })
    case 'created':
      return sorted.sort((a, b) => b.created_at.localeCompare(a.created_at))
    case 'custom':
    default:
      return sorted
  }
}

export function groupTasksBy(
  tasks: Task[],
  groupBy: 'priority' | 'energy' | 'list' | 'location',
  lists: TaskList[] = [],
): { key: string; label: string; tasks: Task[] }[] {
  const groups = new Map<string, Task[]>()

  for (const task of tasks) {
    const value = task[groupBy] ?? 'none'
    const key = String(value)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(task)
  }

  const labelMap: Record<string, Record<string, string>> = {
    priority: { none: 'None', low: 'Low', medium: 'Medium', high: 'High' },
    energy: { none: 'None', low: 'Low', high: 'High' },
    location: { none: 'None', home: 'Home', office: 'Office', errand: 'Errand' },
  }

  if (groupBy === 'list') {
    const listMap = Object.fromEntries(lists.map(l => [l.id, l.name]))
    const result: { key: string; label: string; tasks: Task[] }[] = []
    for (const [key, groupTasks] of groups) {
      result.push({
        key,
        label: key === 'none' ? 'No List' : (listMap[key] ?? 'Unknown'),
        tasks: groupTasks,
      })
    }
    return result
  }

  const order = groupBy === 'priority'
    ? ['none', 'low', 'medium', 'high']
    : groupBy === 'energy'
      ? ['none', 'low', 'high']
      : ['none', 'home', 'office', 'errand']

  return order
    .filter(key => groups.has(key))
    .map(key => ({
      key,
      label: labelMap[groupBy]?.[key] ?? key,
      tasks: groups.get(key)!,
    }))
}

export function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const today = getToday()
  if (dateStr === today) return 'Today'
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow'
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function isOverdue(task: Task): boolean {
  if (!task.due_date || task.completed) return false
  return task.due_date < getToday()
}

export function getSubtaskProgress(task: Task): { done: number; total: number } | null {
  if (!task.subtasks || task.subtasks.length === 0) return null
  const done = task.subtasks.filter(s => s.completed).length
  return { done, total: task.subtasks.length }
}

export function getPriorityColor(priority: string | null): string {
  switch (priority) {
    case 'low': return 'text-blue-400'
    case 'medium': return 'text-amber-400'
    case 'high': return 'text-red-400'
    default: return ''
  }
}
```

**Step 4: Verify TypeScript compiles**

Run: `cd frontend-next && npx tsc --noEmit`

**Step 5: Commit**

```
git commit -m "feat(tasks): add Zustand store, constants, and helper functions"
```

---

## Task 2: Extended Hooks — useTasks + useTaskLists

**Files:**
- Modify: `frontend-next/src/api/hooks/useTasks.ts`
- Create: `frontend-next/src/api/hooks/useTaskLists.ts`
- Modify: `frontend-next/src/api/hooks/index.ts` (add exports)

**Step 1: Rewrite useTasks.ts**

Replace the current status-based query with view-based filtering. Add `useTaskCounts`, `useToggleTask`, `useToggleMyDay`, `useToggleImportant` with optimistic updates. Keep existing calendar hooks.

Key changes:
- `useTasks(view)` sends `?view=` and `?today=` params
- `useTaskCounts()` hits `GET /api/tasks/counts`
- `useToggleTask()` uses `onMutate` to flip `completed` in all cached lists, rollback on error
- `useToggleImportant()` uses `onMutate` to flip `important` in all cached lists
- `useToggleMyDay()` uses `onMutate` to flip `my_day` in all cached lists
- All mutations invalidate `taskKeys.counts()` on settle

**Step 2: Create useTaskLists.ts**

New file with `taskListKeys` factory, `useTaskLists()`, `useCreateTaskList()`, `useUpdateTaskList()`, `useDeleteTaskList()`. Follow `useJobs.ts` pattern.

**Step 3: Export from index.ts**

Add `export * from './useTaskLists.js'` to `api/hooks/index.ts`.

**Step 4: Verify and commit**

```
git commit -m "feat(tasks): rewrite task hooks with view filtering, counts, toggles, and optimistic updates"
```

---

## Task 3: Sidebar — TasksSidebarContent + sidebarConfig

**Files:**
- Create: `frontend-next/src/pages/tasks/components/TasksSidebarContent.tsx`
- Modify: `frontend-next/src/layouts/sidebarConfig.ts`

**Step 1: Create TasksSidebarContent**

Follow `BaseSidebarContent.tsx` pattern. Renders two sections:

1. **Smart Views** — Map `SMART_VIEWS` from constants. Each is a button with: icon, label, count badge (from `useTaskCounts()`). Active view highlighted via `useSearchParams()`. Click sets `?view=` param via `setSearchParams()`.

2. **My Lists** — From `useTaskLists()`. Each shows: color dot, name, task_count badge. Click sets `?view=list:{id}`. "+" button opens `CreateListModal`. "..." dropdown on each for edit/delete.

Separator between sections. "New List" button at bottom.

**Step 2: Register /tasks route in sidebarConfig.ts**

Add import for `TasksSidebarContent` and a `/tasks` key in `contextualSections` with the Tasks nav component + standard Productivity + Resources sections.

**Step 3: Verify and commit**

```
git commit -m "feat(tasks): add sidebar content with smart views, counts, and My Lists"
```

---

## Task 4: TaskInlineAdd + TaskToolbar + TaskCompletedSection

**Files:**
- Create: `frontend-next/src/pages/tasks/components/list/TaskInlineAdd.tsx`
- Create: `frontend-next/src/pages/tasks/components/list/TaskToolbar.tsx`
- Create: `frontend-next/src/pages/tasks/components/list/TaskCompletedSection.tsx`

**Step 1: Create TaskInlineAdd**

Props: `activeView: string`, `activeListId: string | null`

- Input with placeholder "Add a task..."
- On Enter with non-empty value: call `createTask.mutate({ title, ...contextDefaults })`
- Context defaults: if view is `my-day` → `{ my_day: 1 }`, if `important` → `{ important: 1 }`, if list view → `{ list_id }`
- Clear input, keep focus via `inputRef`
- Styled with glassmorphic input: `bg-bg-surface border-border rounded-lg`

**Step 2: Create TaskToolbar**

Props: `activeView: string`, `onCreateTask: () => void`

- Left: "+ Create Task" button (calls `onCreateTask`)
- Center: View mode switcher — 4 icon buttons (List/LayoutGrid/Columns3/Target) reading from `useTasksUiStore`
- Right side controls:
  - Cards mode: S/M/L size toggle
  - Board mode: "Group by" dropdown with `BOARD_GROUP_OPTIONS`
  - List/Cards: Sort dropdown (Due/Created/Custom)

**Step 3: Create TaskCompletedSection**

Props: `tasks: Task[]`, `onSelectTask: (id: string) => void`

- `useState` for `expanded` (default false)
- Header button: "Completed ({tasks.length})" with chevron icon
- When expanded: render tasks with strikethrough title + muted styling
- Each row still has checkbox (to uncomplete) + title click (opens modal)

**Step 4: Verify and commit**

```
git commit -m "feat(tasks): add inline add, toolbar, and completed section components"
```

---

## Task 5: TaskRow + TaskListView

**Files:**
- Create: `frontend-next/src/pages/tasks/components/list/TaskRow.tsx`
- Create: `frontend-next/src/pages/tasks/components/list/TaskListView.tsx`

**Step 1: Create TaskRow**

Props: `task: Task`, `onSelect: (id: string) => void`

Layout: `flex items-center gap-3 px-3 py-2 hover:bg-bg-hover rounded-lg cursor-pointer`

Elements (left to right):
- Checkbox button (circle outline → filled check on complete). Uses `useToggleTask()`. Stop propagation so it doesn't trigger row click.
- Title text (click triggers `onSelect(task.id)`). If completed: `line-through text-text-muted`.
- Spacer `flex-1`
- Due date badge: `formatDueDate()`, amber text if `isOverdue()`, muted otherwise. Only shown if `due_date` is set.
- Priority dot: small colored circle. Only shown if priority is not null. Color from `getPriorityColor()`.
- Star button: filled/outlined star icon. Uses `useToggleImportant()`. Orange when active.

**Step 2: Create TaskListView**

Props: `tasks: Task[]`, `completedTasks: Task[]`, `activeView: string`, `activeListId: string | null`, `onSelectTask: (id: string) => void`

Composition:
1. `<TaskInlineAdd>` at top
2. `sortTasks(tasks, sortBy)` from store, then map through `<TaskRow>`
3. Empty state if no tasks: "No tasks yet. Add one above!"
4. `<TaskCompletedSection>` at bottom if `completedTasks.length > 0`

**Step 3: Verify and commit**

```
git commit -m "feat(tasks): add TaskRow and TaskListView components"
```

---

## Task 6: TaskCard + TaskCardsView

**Files:**
- Create: `frontend-next/src/pages/tasks/components/list/TaskCard.tsx`
- Create: `frontend-next/src/pages/tasks/components/list/TaskCardsView.tsx`

**Step 1: Create TaskCard**

Props: `task: Task`, `size: 'S' | 'M' | 'L'`, `onSelect: (id: string) => void`

Glass card with `bg-bg-surface border border-border rounded-lg p-3`. Click triggers `onSelect`.

- **S:** Checkbox + title only. Compact padding `p-2`.
- **M:** Checkbox, title, due date badge, priority badge pill, subtask progress text "2/4".
- **L:** All of M + description preview (2-line truncate `line-clamp-2 text-text-muted text-xs`), list name badge.

Star toggle in top-right corner on all sizes.

**Step 2: Create TaskCardsView**

Props: same as TaskListView

Grid container. Columns based on `cardSize` from store:
- S: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2`
- M: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`
- L: `grid-cols-1 sm:grid-cols-2 gap-4`

Includes `TaskInlineAdd` at top and `TaskCompletedSection` at bottom.

**Step 3: Verify and commit**

```
git commit -m "feat(tasks): add TaskCard and TaskCardsView with S/M/L sizes"
```

---

## Task 7: TaskBoardColumn + TaskBoardView

**Files:**
- Create: `frontend-next/src/pages/tasks/components/list/TaskBoardColumn.tsx`
- Create: `frontend-next/src/pages/tasks/components/list/TaskBoardView.tsx`

**Step 1: Create TaskBoardColumn**

Props: `groupKey: string`, `label: string`, `tasks: Task[]`, `onSelectTask: (id: string) => void`

Vertical column with:
- Header: label + count badge
- Droppable area using `@dnd-kit` `useDroppable`
- List of compact task cards (title + due date + priority dot), each draggable with `useSortable`

**Step 2: Create TaskBoardView**

Props: `tasks: Task[]`, `lists: TaskList[]`, `onSelectTask: (id: string) => void`

- Reads `boardGroupBy` from Zustand store
- Groups tasks via `groupTasksBy()` helper
- Wraps columns in `DndContext` from `@dnd-kit/core`
- On `dragEnd`: extract `active.id` (task ID) and `over.id` (target column key). Call `useUpdateTask()` to set the new field value (e.g., `{ id: taskId, priority: 'high' }`).
- Horizontal flex container with `overflow-x-auto gap-4`

**Step 3: Verify and commit**

```
git commit -m "feat(tasks): add TaskBoardView with kanban columns and drag-and-drop"
```

---

## Task 8: TaskFocusView

**Files:**
- Create: `frontend-next/src/pages/tasks/components/list/TaskFocusView.tsx`

**Step 1: Create TaskFocusView**

Props: `tasks: Task[]`, `onSelectTask: (id: string) => void`

State: `currentIndex: number` (default 0)

Layout: Centered large card (`max-w-lg mx-auto`), glassmorphic styling.

Card contents:
- Title (large, `text-xl`)
- Metadata row: due date, priority badge, list name
- Description (rendered as text, or basic markdown)
- Subtask checklist (interactive: clicking toggles subtask completion via `useUpdateTask` sending updated subtasks array)

Three action buttons below card:
- "Done" (green accent) — `useToggleTask()`, then advance index
- "Skip" (muted) — advance index
- "Reschedule" (blue accent) — shadcn Popover with date input, calls `useScheduleTask()`

Navigation: Left/Right arrow buttons flanking the card. `useEffect` with `keydown` listener for ArrowLeft/ArrowRight. Wrap around at ends.

Counter: `{currentIndex + 1} of {tasks.length} tasks` below buttons.

Empty state if no tasks: "All clear! Nothing to focus on."

**Step 2: Verify and commit**

```
git commit -m "feat(tasks): add TaskFocusView with single-card triage mode"
```

---

## Task 9: TasksPage — Wire Everything Together

**Files:**
- Modify: `frontend-next/src/pages/TasksPage.tsx`

**Step 1: Rewrite TasksPage**

```typescript
import { useSearchParams } from 'react-router-dom'
import { useTasks } from '@/api/hooks/index.js'
import { useTaskLists } from '@/api/hooks/index.js'
import { useTasksUiStore } from '@/stores/tasksUiStore.js'
import { TaskToolbar } from './tasks/components/list/TaskToolbar.js'
import { TaskListView } from './tasks/components/list/TaskListView.js'
import { TaskCardsView } from './tasks/components/list/TaskCardsView.js'
import { TaskBoardView } from './tasks/components/list/TaskBoardView.js'
import { TaskFocusView } from './tasks/components/list/TaskFocusView.js'
import { TaskDetailModal } from './tasks/components/modals/TaskDetailModal.js'

export default function TasksPage() {
  const [searchParams] = useSearchParams()
  const view = searchParams.get('view') ?? 'my-day'
  const listId = view.startsWith('list:') ? view.slice(5) : null

  const { data: tasks = [], isLoading } = useTasks(view)
  const { data: lists = [] } = useTaskLists()
  const {
    displayMode,
    selectedTaskId, setSelectedTaskId,
    createModalOpen, setCreateModalOpen,
  } = useTasksUiStore()

  const activeTasks = tasks.filter(t => !t.completed)
  const completedTasks = tasks.filter(t => !!t.completed)

  if (isLoading) {
    return <div className="p-6"><p className="text-text-secondary text-sm">Loading tasks...</p></div>
  }

  const viewProps = {
    tasks: activeTasks,
    completedTasks,
    activeView: view,
    activeListId: listId,
    onSelectTask: setSelectedTaskId,
  }

  return (
    <div className="p-6 space-y-4">
      <TaskToolbar
        activeView={view}
        onCreateTask={() => setCreateModalOpen(true)}
      />

      {displayMode === 'list' && <TaskListView {...viewProps} />}
      {displayMode === 'cards' && <TaskCardsView {...viewProps} />}
      {displayMode === 'board' && <TaskBoardView tasks={activeTasks} lists={lists} onSelectTask={setSelectedTaskId} />}
      {displayMode === 'focus' && <TaskFocusView tasks={activeTasks} onSelectTask={setSelectedTaskId} />}

      <TaskDetailModal
        taskId={selectedTaskId ?? undefined}
        open={!!selectedTaskId || createModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTaskId(null)
            setCreateModalOpen(false)
          }
        }}
      />
    </div>
  )
}
```

**Step 2: Verify and commit**

```
git commit -m "feat(tasks): wire TasksPage with view routing, display modes, and modals"
```

---

## Task 10: TaskDetailModal — Two-Column Layout

**Files:**
- Create: `frontend-next/src/pages/tasks/components/modals/TaskDetailModal.tsx`

**Step 1: Create the two-column modal**

Uses shadcn `Dialog`. Props: `taskId?: string`, `open: boolean`, `onOpenChange: (open: boolean) => void`

If `taskId` provided: fetch via `useTask(taskId)` and populate form. Otherwise: create mode with empty form.

Local state for all form fields (controlled inputs). On save: call `useUpdateTask` or `useCreateTask`.

**Header (full width):** `flex items-center gap-3`
- Checkbox button (toggle complete, edit mode only)
- Title input (`text-lg font-medium bg-transparent border-none outline-none flex-1`)
- Star toggle button
- Close button (X icon)

**Body:** `flex gap-6` (two columns), `flex-col` on small screens

**Left column (w-[55%]):**
- Description section: label + textarea with basic formatting toolbar buttons
- Subtasks section: label + list of subtask rows (checkbox + text input + delete button) + "Add subtask..." input at bottom

**Right column (w-[45%]):**
- When: date input + time start/end inputs
- Priority: chip group buttons from `PRIORITY_OPTIONS`
- List: Select dropdown from `useTaskLists()`
- My Day: toggle switch

- Collapsible "More Options" (controlled by `moreOptionsExpanded` from store):
  - Recurring: chip group from `RECURRING_OPTIONS` + day-of-week circle buttons
  - Energy: chip group from `ENERGY_OPTIONS`
  - Location: chip group from `LOCATION_OPTIONS`
  - Calendars: calendar toggle chips (if available)

- Relations section:
  - People: list of linked names + "Add" button (placeholder)
  - Projects: linked project + "Add" button (placeholder)
  - Notes: list of linked notes + "Add" button (placeholder)

**Footer:** `flex items-center justify-between`
- Delete button (red variant, edit mode only, with confirm dialog)
- Created date text (edit mode only)
- Save button (accent color)

**Step 2: Verify and commit**

```
git commit -m "feat(tasks): add two-column TaskDetailModal with progressive disclosure"
```

---

## Task 11: TaskQuickCaptureModal + CreateListModal

**Files:**
- Create: `frontend-next/src/pages/tasks/components/modals/TaskQuickCaptureModal.tsx`
- Create: `frontend-next/src/pages/tasks/components/modals/CreateListModal.tsx`

**Step 1: Create TaskQuickCaptureModal (Tier 2)**

Lightweight shadcn Dialog. Props: `open: boolean`, `onOpenChange: (open: boolean) => void`

Fields:
- Title input (required, autofocused)
- Description textarea (plain, 3 rows)
- Relation pickers: People, Projects, Notes — each is a label + "Add" button (placeholder for now, will wire to real pickers later)
- "Create Task" button — calls `useCreateTask()` with title + description, closes modal

**Step 2: Create CreateListModal**

Shadcn Dialog. Props: `open: boolean`, `onOpenChange: (open: boolean) => void`

Fields:
- Name input (required, autofocused)
- Color picker: row of 8 color dot buttons (predefined palette: red, orange, amber, green, teal, blue, purple, pink). Selected dot has a ring.
- "Create" button — calls `useCreateTaskList()` with name + selected color, closes modal

**Step 3: Wire TaskQuickCaptureModal into Sidebar**

In `Sidebar.tsx`, the existing capture modal currently creates a generic inbox item. For the "Task" capture type, render `TaskQuickCaptureModal` instead of the generic dialog.

**Step 4: Verify and commit**

```
git commit -m "feat(tasks): add quick capture modal and create list modal"
```

---

## Task 12: Final Integration + Visual Testing

**Files:**
- Modify: `frontend-next/src/api/hooks/index.ts` (ensure all exports)
- Verify: All imports resolve, TypeScript compiles, dev server renders

**Step 1: Ensure all exports are wired**

Check `api/hooks/index.ts` exports all new hooks (`useTaskLists`, `useTaskCounts`, `useToggleTask`, `useToggleImportant`, `useToggleMyDay`).

Check `types/index.ts` exports `TaskList`.

**Step 2: Full TypeScript check**

Run: `cd frontend-next && npx tsc --noEmit`
Fix any type errors.

**Step 3: Visual smoke test**

Start dev server (`npm run dev`), navigate to `/tasks`. Verify:
- Sidebar shows smart views with count badges
- Clicking smart views changes URL param and filters tasks
- My Lists appear with color dots and counts
- Inline add creates tasks rapidly (Enter, clear, repeat)
- List view renders rows with checkbox, title, due date, priority, star
- Cards view renders grid with S/M/L toggle
- Board view renders kanban columns, drag works
- Focus mode shows single card with Done/Skip/Reschedule
- Detail modal opens on click with two-column layout
- Completed section collapses/expands at bottom
- "+ Create Task" button opens detail modal in create mode

**Step 4: Final commit**

```
git commit -m "feat(tasks): complete Tasks module integration"
```

---

## Parallelization Map

Tasks that can run in parallel (no dependencies between them):

```
Task 1 (store + constants + helpers)
  |
  ├──► Task 2 (hooks)
  |      |
  |      └──► Task 3 (sidebar) ──────────────────────┐
  |                                                    |
  ├──► Task 4 (inline add + toolbar + completed)      |
  |      |                                             |
  |      ├──► Task 5 (TaskRow + TaskListView)         |
  |      ├──► Task 6 (TaskCard + TaskCardsView)       |
  |      ├──► Task 7 (TaskBoardView)                  |
  |      └──► Task 8 (TaskFocusView)                  |
  |                                                    |
  ├──► Task 10 (TaskDetailModal) ─────────────────────┤
  └──► Task 11 (QuickCaptureModal + CreateListModal)  |
                                                       |
                                            Task 9 (TasksPage wiring) ◄──┘
                                                       |
                                            Task 12 (integration test) ◄──┘
```

**Wave 1:** Task 1
**Wave 2:** Tasks 2, 4, 10, 11 (all need store/constants but are independent of each other)
**Wave 3:** Tasks 3, 5, 6, 7, 8 (need hooks + shared components)
**Wave 4:** Task 9 (wires everything together)
**Wave 5:** Task 12 (final verification)
