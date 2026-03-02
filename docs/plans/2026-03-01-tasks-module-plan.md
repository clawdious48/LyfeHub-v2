# Tasks Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the complete Tasks module in the React frontend with sidebar-driven smart views, three-tier task creation, My Lists, and progressive disclosure detail modal.

**Architecture:** Sidebar-driven navigation via `TasksSidebarContent` registered in `sidebarConfig.ts`. Page content switches between list and card views. URL search params (`?view=`, `?list=`) drive filtering. Zustand store for UI preferences, React Query for all data.

**Tech Stack:** React 19, TypeScript, TanStack Query, Zustand, shadcn/ui, Lucide React, @dnd-kit (for list reorder)

**Design doc:** `docs/plans/2026-03-01-tasks-module-design.md`

**Note:** This project has no test suite. Verify each task with `npx tsc --noEmit` from `frontend-next/`.

---

## Parallelization Map

Tasks 1-3 are independent foundations — can run in parallel.
Task 4 depends on Task 2 (constants).
Tasks 5-8 depend on Tasks 1-3 (store, helpers, hooks).
Tasks 9-11 depend on Tasks 5-8 (components they compose).
Task 12 depends on Tasks 9-11 (page assembles everything).
Tasks 13-15 are modals — depend on Task 3 (hooks) but independent of each other.
Task 16-17 are integration tasks — depend on Task 3 (hooks).

```
[1: Store] ──┐
[2: Constants]├──► [4: Sidebar] ──┐
[3: Hooks]  ──┤                   │
              ├──► [5: InlineAdd] ─┤
              ├──► [6: TaskRow]  ──┤
              ├──► [7: TaskCard] ──┤──► [9: Toolbar] ──┐
              └──► [8: Empty]    ──┘   [10: ListView]──┼──► [12: Page]
                                       [11: CardView]──┘
              ├──► [13: DetailModal] (independent)
              ├──► [14: QuickCapture] (independent)
              ├──► [15: ListModal] (independent)
              ├──► [16: Dashboard] (independent)
              └──► [17: Sidebar QC] (independent)
```

---

### Task 1: Zustand Store

**Files:**
- Create: `frontend-next/src/stores/tasksUiStore.ts`

**Step 1: Create the store**

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type SmartView = 'my-day' | 'important' | 'scheduled' | 'past-due' | 'recurring' | 'all' | 'completed'
type DisplayMode = 'list' | 'cards'
type CardSize = 'S' | 'M' | 'L'
type SortBy = 'due' | 'created' | 'custom'
type SortDirection = 'asc' | 'desc'

interface TasksUiState {
  // Persisted
  displayMode: DisplayMode
  cardSize: CardSize
  sortBy: SortBy
  sortDirection: SortDirection
  moreOptionsExpanded: boolean

  // Ephemeral
  activeView: SmartView
  activeListId: string | null
  selectedTaskId: string | null
  createModalOpen: boolean

  // Actions
  setDisplayMode: (mode: DisplayMode) => void
  setCardSize: (size: CardSize) => void
  setSortBy: (sort: SortBy) => void
  setSortDirection: (dir: SortDirection) => void
  setMoreOptionsExpanded: (expanded: boolean) => void
  setActiveView: (view: SmartView) => void
  setActiveListId: (id: string | null) => void
  setSelectedTaskId: (id: string | null) => void
  setCreateModalOpen: (open: boolean) => void
  resetEphemeral: () => void
}

export const useTasksUiStore = create<TasksUiState>()(
  persist(
    (set) => ({
      // Persisted defaults
      displayMode: 'list',
      cardSize: 'M',
      sortBy: 'due',
      sortDirection: 'asc',
      moreOptionsExpanded: false,

      // Ephemeral defaults
      activeView: 'my-day',
      activeListId: null,
      selectedTaskId: null,
      createModalOpen: false,

      // Actions
      setDisplayMode: (displayMode) => set({ displayMode }),
      setCardSize: (cardSize) => set({ cardSize }),
      setSortBy: (sortBy) => set({ sortBy }),
      setSortDirection: (sortDirection) => set({ sortDirection }),
      setMoreOptionsExpanded: (moreOptionsExpanded) => set({ moreOptionsExpanded }),
      setActiveView: (activeView) => set({ activeView, activeListId: null }),
      setActiveListId: (activeListId) => set({ activeListId, activeView: 'all' }),
      setSelectedTaskId: (selectedTaskId) => set({ selectedTaskId }),
      setCreateModalOpen: (createModalOpen) => set({ createModalOpen }),
      resetEphemeral: () => set({
        activeView: 'my-day',
        activeListId: null,
        selectedTaskId: null,
        createModalOpen: false,
      }),
    }),
    {
      name: 'lyfehub-tasks-ui',
      partialize: (state) => ({
        displayMode: state.displayMode,
        cardSize: state.cardSize,
        sortBy: state.sortBy,
        sortDirection: state.sortDirection,
        moreOptionsExpanded: state.moreOptionsExpanded,
      }),
    }
  )
)
```

**Step 2: Type check**

Run: `cd frontend-next && npx tsc --noEmit`

**Step 3: Commit**

```
git add frontend-next/src/stores/tasksUiStore.ts
git commit -m "feat(tasks): add Zustand UI store with persisted preferences"
```

---

### Task 2: Constants & Helpers

**Files:**
- Create: `frontend-next/src/pages/tasks/utils/taskConstants.ts`
- Create: `frontend-next/src/pages/tasks/utils/taskHelpers.ts`

**Step 1: Create taskConstants.ts**

Define smart view config, priority/energy/location enums, and icon mappings.

```typescript
import {
  Sun, Star, Calendar, AlertTriangle, Repeat, List, CheckCircle2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface SmartViewConfig {
  key: string
  label: string
  icon: LucideIcon
  emptyTitle: string
  emptySubtitle: string
}

export const SMART_VIEWS: SmartViewConfig[] = [
  { key: 'my-day', label: 'My Day', icon: Sun, emptyTitle: 'No tasks due today', emptySubtitle: 'Enjoy your day or add something new' },
  { key: 'important', label: 'Important', icon: Star, emptyTitle: 'No important tasks', emptySubtitle: 'Star a task to see it here' },
  { key: 'scheduled', label: 'Scheduled', icon: Calendar, emptyTitle: 'No scheduled tasks', emptySubtitle: 'Set a due date to schedule a task' },
  { key: 'past-due', label: 'Past Due', icon: AlertTriangle, emptyTitle: 'Nothing past due', emptySubtitle: 'You\'re all caught up' },
  { key: 'recurring', label: 'Recurring', icon: Repeat, emptyTitle: 'No recurring tasks', emptySubtitle: 'Set a repeat pattern on a task' },
  { key: 'all', label: 'All Tasks', icon: List, emptyTitle: 'No tasks yet', emptySubtitle: 'Add a task above to get started' },
  { key: 'completed', label: 'Completed', icon: CheckCircle2, emptyTitle: 'No completed tasks', emptySubtitle: 'Complete a task to see it here' },
]

export const PRIORITIES = [
  { value: null, label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const

export const ENERGY_LEVELS = [
  { value: null, label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'high', label: 'High' },
] as const

export const LOCATIONS = [
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

export const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-green-400',
  medium: 'text-amber-400',
  high: 'text-red-400',
}
```

**Step 2: Create taskHelpers.ts**

Filtering logic, date comparison, sort functions.

```typescript
import type { Task } from '@/types/index.js'

/** Get today's date as YYYY-MM-DD string */
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

/** Filter tasks by smart view key */
export function filterTasksByView(tasks: Task[], view: string): Task[] {
  const today = getTodayString()

  switch (view) {
    case 'my-day':
      return tasks.filter(t => t.due_date === today && !t.completed)
    case 'important':
      return tasks.filter(t => t.important === 1 && !t.completed)
    case 'scheduled':
      return tasks.filter(t => t.due_date !== null && !t.completed)
    case 'past-due':
      return tasks.filter(t => t.due_date !== null && t.due_date < today && !t.completed)
    case 'recurring':
      return tasks.filter(t => t.recurring !== null && !t.completed)
    case 'all':
      return tasks.filter(t => !t.completed)
    case 'completed':
      return tasks.filter(t => !!t.completed)
    default:
      return tasks.filter(t => !t.completed)
  }
}

/** Filter tasks by list ID */
export function filterTasksByList(tasks: Task[], listId: string): Task[] {
  return tasks.filter(t => t.list_id === listId && !t.completed)
}

/** Get counts for all smart views */
export function getSmartViewCounts(tasks: Task[]): Record<string, number> {
  const today = getTodayString()
  return {
    'my-day': tasks.filter(t => t.due_date === today && !t.completed).length,
    'important': tasks.filter(t => t.important === 1 && !t.completed).length,
    'scheduled': tasks.filter(t => t.due_date !== null && !t.completed).length,
    'past-due': tasks.filter(t => t.due_date !== null && t.due_date < today && !t.completed).length,
    'recurring': tasks.filter(t => t.recurring !== null && !t.completed).length,
    'all': tasks.filter(t => !t.completed).length,
    'completed': tasks.filter(t => !!t.completed).length,
  }
}

/** Get count for a specific list */
export function getListTaskCount(tasks: Task[], listId: string): number {
  return tasks.filter(t => t.list_id === listId && !t.completed).length
}

/** Sort tasks by the given key */
export function sortTasks(tasks: Task[], sortBy: string, direction: 'asc' | 'desc'): Task[] {
  const sorted = [...tasks].sort((a, b) => {
    switch (sortBy) {
      case 'due': {
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date.localeCompare(b.due_date)
      }
      case 'created':
        return a.created_at.localeCompare(b.created_at)
      case 'custom':
      default:
        return 0
    }
  })
  return direction === 'desc' ? sorted.reverse() : sorted
}

/** Format a due date for display (e.g., "Today", "Tomorrow", "Mar 5") */
export function formatDueDate(dueDate: string | null): string | null {
  if (!dueDate) return null
  const today = getTodayString()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  if (dueDate === today) return 'Today'
  if (dueDate === tomorrowStr) return 'Tomorrow'

  const date = new Date(dueDate + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Check if a due date is past due */
export function isPastDue(dueDate: string | null): boolean {
  if (!dueDate) return false
  return dueDate < getTodayString()
}
```

**Step 3: Type check**

Run: `cd frontend-next && npx tsc --noEmit`

**Step 4: Commit**

```
git add frontend-next/src/pages/tasks/utils/
git commit -m "feat(tasks): add task constants and helper functions"
```

---

### Task 3: Extended React Query Hooks

**Files:**
- Modify: `frontend-next/src/api/hooks/useTasks.ts`
- Create: `frontend-next/src/api/hooks/useTaskLists.ts`
- Modify: `frontend-next/src/api/hooks/index.ts` (add exports)

**Step 1: Extend useTasks.ts**

Add toggle hooks and task counts. Keep all existing hooks, add:

```typescript
// Add to existing useTasks.ts after the existing exports:

export function useTaskCounts() {
  return useQuery({
    queryKey: [...taskKeys.all, 'counts'] as const,
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const res = await apiClient.get<{ counts: Record<string, number> }>(`/tasks/counts?today=${today}`)
      return res.counts
    },
  })
}

export function useToggleTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<{ item: Task }>(`/tasks/${id}/toggle`, {}),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() })
      const previousTasks = queryClient.getQueryData<Task[]>(taskKeys.list())
      if (previousTasks) {
        queryClient.setQueryData<Task[]>(taskKeys.list(), (old) =>
          old?.map(t => t.id === id ? { ...t, completed: t.completed ? 0 : 1, completed_at: t.completed ? null : new Date().toISOString() } : t)
        )
      }
      return { previousTasks }
    },
    onError: (_err, _id, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.list(), context.previousTasks)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}

export function useToggleImportant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, important }: { id: string; important: number }) =>
      apiClient.patch<{ item: Task }>(`/tasks/${id}`, { important }),
    onMutate: async ({ id, important }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() })
      const previousTasks = queryClient.getQueryData<Task[]>(taskKeys.list())
      if (previousTasks) {
        queryClient.setQueryData<Task[]>(taskKeys.list(), (old) =>
          old?.map(t => t.id === id ? { ...t, important } : t)
        )
      }
      return { previousTasks }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.list(), context.previousTasks)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}

export function useToggleMyDay() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<{ item: Task }>(`/tasks/${id}/toggle-my-day`, {}),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() })
      const today = new Date().toISOString().split('T')[0]
      const previousTasks = queryClient.getQueryData<Task[]>(taskKeys.list())
      if (previousTasks) {
        queryClient.setQueryData<Task[]>(taskKeys.list(), (old) =>
          old?.map(t => t.id === id ? { ...t, due_date: t.due_date === today ? null : today } : t)
        )
      }
      return { previousTasks }
    },
    onError: (_err, _id, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.list(), context.previousTasks)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}
```

**Step 2: Create useTaskLists.ts**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client.js'
import type { TaskList } from '@/types/index.js'

export const taskListKeys = {
  all: ['task-lists'] as const,
  lists: () => [...taskListKeys.all, 'list'] as const,
  detail: (id: string) => [...taskListKeys.all, 'detail', id] as const,
}

export function useTaskLists() {
  return useQuery({
    queryKey: taskListKeys.lists(),
    queryFn: async () => {
      const res = await apiClient.get<{ lists: TaskList[] }>('/task-lists')
      return res.lists
    },
  })
}

export function useCreateTaskList() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; color?: string }) =>
      apiClient.post<{ list: TaskList }>('/task-lists', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskListKeys.lists() })
    },
  })
}

export function useUpdateTaskList() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; color?: string; icon?: string; position?: number }) =>
      apiClient.patch<{ list: TaskList }>(`/task-lists/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskListKeys.lists() })
    },
  })
}

export function useDeleteTaskList() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<{ success: boolean }>(`/task-lists/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskListKeys.lists() })
    },
  })
}
```

**Step 3: Update index.ts exports**

Add to `frontend-next/src/api/hooks/index.ts`:

```typescript
export * from './useTaskLists.js'
```

Verify `useTasks.ts` exports are already present. Add `useToggleTask`, `useToggleImportant`, `useToggleMyDay`, `useTaskCounts` to the barrel export if needed.

**Step 4: Type check**

Run: `cd frontend-next && npx tsc --noEmit`

**Step 5: Commit**

```
git add frontend-next/src/api/hooks/useTasks.ts frontend-next/src/api/hooks/useTaskLists.ts frontend-next/src/api/hooks/index.ts
git commit -m "feat(tasks): add toggle hooks with optimistic updates, task list CRUD hooks"
```

---

### Task 4: Sidebar Content Component

**Files:**
- Create: `frontend-next/src/pages/tasks/components/sidebar/TasksSidebarContent.tsx`
- Modify: `frontend-next/src/layouts/sidebarConfig.ts`

**Step 1: Create TasksSidebarContent.tsx**

This component renders smart views with count badges and My Lists with colored dots. It reads from `useSearchParams` to highlight the active view and sets params on click.

Reference `BaseSidebarContent.tsx` and `MailSidebarContent.tsx` for the pattern. The component should:

- Import `useTasks` and derive counts client-side via `getSmartViewCounts()` from `taskHelpers.ts`
- Import `useTaskLists` for My Lists section
- Import `SMART_VIEWS` from `taskConstants.ts` for view config
- Use `useSearchParams` to read/write `?view=` and `?list=` params
- Use `useNavigate` to navigate to `/tasks?view=<key>` or `/tasks?list=<id>`
- Render smart view items as clickable rows with icon, label, count badge
- Active item gets accent highlight (like active sidebar items elsewhere)
- My Lists section with colored circle, name, count, kebab menu (edit/delete)
- "+ New List" button at bottom opens `CreateListModal`
- Past Due view uses `text-amber-400` for its icon

**Step 2: Register in sidebarConfig.ts**

Add a `/tasks` key to `contextualSections`:

```typescript
import { TasksSidebarContent } from '@/pages/tasks/components/sidebar/TasksSidebarContent.js'

// In contextualSections:
'/tasks': [
  {
    key: 'tasks-nav',
    header: 'Tasks',
    icon: CheckSquare,
    items: [],
    component: TasksSidebarContent,
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

**Step 3: Type check**

Run: `cd frontend-next && npx tsc --noEmit`

**Step 4: Commit**

```
git add frontend-next/src/pages/tasks/components/sidebar/TasksSidebarContent.tsx frontend-next/src/layouts/sidebarConfig.ts
git commit -m "feat(tasks): add sidebar content with smart views and My Lists"
```

---

### Task 5: TaskInlineAdd Component

**Files:**
- Create: `frontend-next/src/pages/tasks/components/list/TaskInlineAdd.tsx`

**Step 1: Create the component**

A persistent text input at the top of the task list. Behavior:
- Placeholder: `"+ Add a task..."`
- On Enter with non-empty text: call `useCreateTask` with `{ title }`, clear input, keep focus
- Context inheritance: accept `defaultListId` and `defaultDueDate` props, include in create payload
- Optimistic: task appears instantly (handled by the hook's cache invalidation)
- Subtle border, transparent background, matches the glassmorphic style
- `useRef` to hold input ref for focus management

```typescript
interface TaskInlineAddProps {
  defaultListId?: string | null
  defaultDueDate?: string | null
}
```

Uses `useCreateTask()` from hooks. On success callback, clear input and refocus.

**Step 2: Type check and commit**

```
git add frontend-next/src/pages/tasks/components/list/TaskInlineAdd.tsx
git commit -m "feat(tasks): add inline rapid-fire task creation input"
```

---

### Task 6: TaskRow Component

**Files:**
- Create: `frontend-next/src/pages/tasks/components/list/TaskRow.tsx`

**Step 1: Create the component**

A single list row with all interactive elements.

```typescript
interface TaskRowProps {
  task: Task
  onSelect: (id: string) => void
  showPastDueActions?: boolean
}
```

Layout: `[checkbox] [title] [chips...] [sun] [star]`

- Checkbox: circular, uses `useToggleTask()`. When checked, title gets `line-through opacity-50` classes.
- Title: `<span>` that calls `onSelect(task.id)` on click. `cursor-pointer` with hover underline.
- Due date chip: rendered via `formatDueDate()`. Badge component with `text-amber-400` if `isPastDue()`, otherwise `text-text-muted`.
- Priority dot: small colored circle using `PRIORITY_COLORS` map. Only renders if `task.priority` is set.
- List chip: small badge with the list color. Only renders if `task.list_id` is set. (Accept `listName` and `listColor` as props or derive from context.)
- Sun icon (Lucide `Sun`): toggles My Day via `useToggleMyDay()`. Filled orange (`text-accent fill-accent`) when `task.due_date === today`, muted otherwise.
- Star icon (Lucide `Star`): toggles Important via `useToggleImportant()`. Filled orange when `task.important === 1`, muted otherwise.
- Past Due actions (shown on hover when `showPastDueActions`): "Reschedule" button opens a date picker popover, "Drop it" button completes the task.
- Chips only render when their data exists — use conditional rendering.
- Row hover: `bg-bg-hover` background transition.

**Step 2: Type check and commit**

```
git add frontend-next/src/pages/tasks/components/list/TaskRow.tsx
git commit -m "feat(tasks): add TaskRow with checkbox, chips, star, and my-day toggles"
```

---

### Task 7: TaskCard Component

**Files:**
- Create: `frontend-next/src/pages/tasks/components/list/TaskCard.tsx`

**Step 1: Create the component**

```typescript
interface TaskCardProps {
  task: Task
  size: 'S' | 'M' | 'L'
  onSelect: (id: string) => void
}
```

- Glass card style (`bg-bg-surface border border-border rounded-lg`)
- S card: checkbox + title + star only (compact)
- M card: checkbox + title + due chip + priority badge + subtask progress + sun + star
- L card: everything from M + 2-line description preview
- Subtask progress: `"2/5 subtasks"` text with a thin progress bar if subtasks exist
- Click card body (not checkbox/star/sun) opens detail modal via `onSelect`
- Same toggle hooks as TaskRow for checkbox, star, sun

**Step 2: Type check and commit**

```
git add frontend-next/src/pages/tasks/components/list/TaskCard.tsx
git commit -m "feat(tasks): add TaskCard with S/M/L size variants"
```

---

### Task 8: TaskEmptyState Component

**Files:**
- Create: `frontend-next/src/pages/tasks/components/list/TaskEmptyState.tsx`

**Step 1: Create the component**

```typescript
interface TaskEmptyStateProps {
  viewKey: string
}
```

- Looks up `SMART_VIEWS` from `taskConstants.ts` to get `emptyTitle` and `emptySubtitle`
- Renders centered icon (from the smart view config) + title + subtitle
- Muted styling (`text-text-muted`)
- For list views (not a smart view), show "No tasks in this list" + "Add a task above"

**Step 2: Type check and commit**

```
git add frontend-next/src/pages/tasks/components/list/TaskEmptyState.tsx
git commit -m "feat(tasks): add empty state component per smart view"
```

---

### Task 9: TaskToolbar Component

**Files:**
- Create: `frontend-next/src/pages/tasks/components/list/TaskToolbar.tsx`

**Step 1: Create the component**

```typescript
interface TaskToolbarProps {
  activeViewLabel: string
  onCreateTask: () => void
}
```

- Left side: view/list label as heading text, "Create Task" button (accent colored, opens full modal)
- Center: List / Cards toggle buttons (uses `useTasksUiStore` `displayMode`)
- Cards mode shows S / M / L size pills (uses `useTasksUiStore` `cardSize`)
- Right side: Sort controls — "Due", "Created", "Custom" buttons with sort direction indicator
- Uses shadcn Button, toggle button group pattern
- All state comes from `useTasksUiStore`

**Step 2: Type check and commit**

```
git add frontend-next/src/pages/tasks/components/list/TaskToolbar.tsx
git commit -m "feat(tasks): add toolbar with view toggle, sort controls, create button"
```

---

### Task 10: TaskListView Component

**Files:**
- Create: `frontend-next/src/pages/tasks/components/list/TaskListView.tsx`

**Step 1: Create the component**

```typescript
interface TaskListViewProps {
  tasks: Task[]
  viewKey: string
  activeListId: string | null
  onSelectTask: (id: string) => void
}
```

- Renders `TaskInlineAdd` at top (passes `defaultListId` if viewing a list, `defaultDueDate` if viewing My Day)
- Maps filtered+sorted tasks to `TaskRow` components
- If viewing "all" or a specific list, completed tasks go in a collapsible "Completed" section at bottom (collapsed by default, uses `Collapsible` from shadcn or a simple `useState` toggle)
- Pass `showPastDueActions={viewKey === 'past-due'}` to TaskRow
- If no tasks after filtering, show `TaskEmptyState`
- Uses `sortTasks()` from `taskHelpers.ts` with store's `sortBy`/`sortDirection`

**Step 2: Type check and commit**

```
git add frontend-next/src/pages/tasks/components/list/TaskListView.tsx
git commit -m "feat(tasks): add TaskListView with inline add, rows, and completed section"
```

---

### Task 11: TaskCardView Component

**Files:**
- Create: `frontend-next/src/pages/tasks/components/list/TaskCardView.tsx`

**Step 1: Create the component**

```typescript
interface TaskCardViewProps {
  tasks: Task[]
  viewKey: string
  onSelectTask: (id: string) => void
}
```

- Responsive CSS grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` (adjusts based on card size)
- Maps filtered+sorted tasks to `TaskCard` with `size` from store
- Empty state fallback
- Same sort logic as TaskListView

**Step 2: Type check and commit**

```
git add frontend-next/src/pages/tasks/components/list/TaskCardView.tsx
git commit -m "feat(tasks): add TaskCardView with responsive grid"
```

---

### Task 12: TasksPage Top-Level Component

**Files:**
- Modify: `frontend-next/src/pages/TasksPage.tsx`

**Step 1: Rewrite TasksPage.tsx**

This is the orchestrator. It:

- Reads `?view=` and `?list=` from `useSearchParams`
- Syncs URL params to Zustand store on mount/change
- Calls `useTasks()` to fetch all tasks
- Derives the filtered task list using `filterTasksByView()` or `filterTasksByList()`
- Renders `TaskToolbar` with the active view/list label
- Conditionally renders `TaskListView` or `TaskCardView` based on `displayMode` from store
- Manages `selectedTaskId` state for the detail modal
- Manages `createModalOpen` for the full create modal
- Renders `TaskDetailModal` (create mode when `createModalOpen`, edit mode when `selectedTaskId`)
- Renders `CreateListModal` (if needed, or this can be managed by the sidebar content)

Pattern follows `JobsPage.tsx`:

```typescript
export default function TasksPage() {
  const [searchParams] = useSearchParams()
  const viewParam = searchParams.get('view') || 'my-day'
  const listParam = searchParams.get('list')

  const { displayMode } = useTasksUiStore()
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const { data: allTasks = [], isLoading } = useTasks()

  const tasks = listParam
    ? filterTasksByList(allTasks, listParam)
    : filterTasksByView(allTasks, viewParam)

  // ... render toolbar + list/card view + modals
}
```

**Step 2: Type check**

Run: `cd frontend-next && npx tsc --noEmit`

**Step 3: Commit**

```
git add frontend-next/src/pages/TasksPage.tsx
git commit -m "feat(tasks): wire up TasksPage with URL-driven filtering and view switching"
```

---

### Task 13: TaskDetailModal

**Files:**
- Create: `frontend-next/src/pages/tasks/components/modals/TaskDetailModal.tsx`

**Step 1: Create the modal**

This is the largest component. Uses shadcn `Dialog`.

```typescript
interface TaskDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId?: string | null       // Edit mode: fetch and populate
  defaultListId?: string | null // Create mode: pre-set list
  defaultDueDate?: string | null // Create mode: pre-set date
}
```

**Standard section** (always visible):
- Title input (large, borderless) + star toggle button (top-right) + close X
- **When**: Date picker (shadcn Popover + Calendar) + time inputs (two `<input type="time">`)
- **Priority**: Row of 4 pill buttons (None/Low/Medium/High), active one gets accent highlight
- **List**: `<Select>` dropdown populated from `useTaskLists()`
- **Description**: `<Textarea>` with placeholder "Add description... (Markdown supported)". Full markdown editor is a future enhancement — start with plain textarea.
- **Subtasks**: Checklist. Each subtask: checkbox + text input + delete X. "+ Add subtask" button at bottom. Subtasks stored as JSON array `[{ id, text, completed }]`.

**More Options** (collapsible):
- Toggle chevron: "More Options" text with rotating chevron icon. `moreOptionsExpanded` from Zustand store.
- **Recurring**: Row of pill buttons from `RECURRING_OPTIONS` + day-of-week circles (S M T W T F S) for weekly/biweekly
- **Energy**: Row of pill buttons from `ENERGY_LEVELS`
- **Location**: Row of pill buttons from `LOCATIONS`
- **Calendars**: Toggle chips (fetch from `useCalendars()` hook if available, or hardcode "My Calendar" / "Tasks" for now)
- **Relations**: Project (+), People (+), Notes (+) — each is a button that opens a picker. For now, render as disabled placeholder buttons with "Coming soon" tooltip. Full relation pickers are a separate feature.

**Footer**:
- Left: Delete button (red, only in edit mode). Calls `useDeleteTask()` + closes modal.
- Center: "Created {date}" text (edit mode only)
- Right: "Save Task" button (accent). Calls `useCreateTask()` or `useUpdateTask()` depending on mode.

**Data flow**:
- Edit mode: `useTask(taskId)` fetches data, populates form state
- Create mode: empty form with defaults from props
- Local form state via `useState` (not Zustand — form state is modal-scoped)
- Save collects all form fields into the API payload

**Step 2: Type check and commit**

```
git add frontend-next/src/pages/tasks/components/modals/TaskDetailModal.tsx
git commit -m "feat(tasks): add TaskDetailModal with standard fields and collapsible More Options"
```

---

### Task 14: TaskQuickCaptureModal

**Files:**
- Create: `frontend-next/src/pages/tasks/components/modals/TaskQuickCaptureModal.tsx`

**Step 1: Create the modal**

Lightweight modal for sidebar Quick Capture "Task" button.

```typescript
interface TaskQuickCaptureModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}
```

Fields:
- Title (required) — `<Input>` with autofocus
- Description — `<Textarea>` (plain, 3 rows)
- List — `<Select>` dropdown from `useTaskLists()`, optional
- Relations (placeholder buttons for now): People (+), Project (+), Notes (+)
- "Save" button (accent) — calls `useCreateTask()`, closes modal on success

This is intentionally simpler than `TaskDetailModal`. No date, priority, recurring, energy, location, subtasks.

**Step 2: Type check and commit**

```
git add frontend-next/src/pages/tasks/components/modals/TaskQuickCaptureModal.tsx
git commit -m "feat(tasks): add lightweight quick capture modal for sidebar"
```

---

### Task 15: CreateListModal

**Files:**
- Create: `frontend-next/src/pages/tasks/components/modals/CreateListModal.tsx`

**Step 1: Create the modal**

Small modal for creating/editing a task list.

```typescript
interface CreateListModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editList?: TaskList | null  // If provided, edit mode
}
```

Fields:
- Name — `<Input>` with autofocus
- Color — Row of color swatches (8-10 preset colors matching the neon palette). Click to select, active one gets a checkmark overlay.

Footer:
- Cancel button
- "Create List" / "Save" button (accent)

Uses `useCreateTaskList()` or `useUpdateTaskList()` depending on mode.

**Step 2: Type check and commit**

```
git add frontend-next/src/pages/tasks/components/modals/CreateListModal.tsx
git commit -m "feat(tasks): add CreateListModal with name and color picker"
```

---

### Task 16: Dashboard MyDayWidget Integration

**Files:**
- Modify: `frontend-next/src/widgets/MyDayWidget.tsx`

**Step 1: Update MyDayWidget to use real task data**

The existing MyDayWidget should:

- Import `useTasks` from hooks
- Filter tasks where `due_date === today` using `filterTasksByView(tasks, 'my-day')`
- Render task items with checkbox (toggle via `useToggleTask`) + title
- "View All" link navigates to `/tasks?view=my-day`
- Keep existing calendar event display if it has one

Read the current `MyDayWidget.tsx` first to understand its current implementation, then integrate real task data.

**Step 2: Type check and commit**

```
git add frontend-next/src/widgets/MyDayWidget.tsx
git commit -m "feat(dashboard): connect MyDayWidget to real task data"
```

---

### Task 17: Wire Sidebar Quick Capture

**Files:**
- Modify: `frontend-next/src/layouts/Sidebar.tsx` (or wherever the Quick Capture "Task" button lives)

**Step 1: Connect the Task button to TaskQuickCaptureModal**

The sidebar already has a Quick Capture section with a "Task" button. Wire it to open `TaskQuickCaptureModal`.

Read the current Sidebar implementation to find where the Task button is rendered. It likely already has an `onClick` handler — update it to set state that opens the `TaskQuickCaptureModal`.

The modal component should be rendered inside the Sidebar component (or lifted to AppLayout) since it needs to be accessible from any page.

**Step 2: Type check and commit**

```
git add frontend-next/src/layouts/Sidebar.tsx
git commit -m "feat(sidebar): wire Quick Capture Task button to TaskQuickCaptureModal"
```

---

### Task 18: Final Integration & ROADMAP Update

**Files:**
- Modify: `frontend-next/src/router.tsx` (verify `/tasks` route exists)
- Modify: `docs/ROADMAP.md` (update Tasks status)

**Step 1: Verify routing**

Confirm that `router.tsx` has the `/tasks` route pointing to `TasksPage`. It should already exist as a stub — just verify it imports the right component.

**Step 2: Update ROADMAP.md**

Add Tasks module to the "What's Built" section with the date and feature summary.

**Step 3: Full type check**

Run: `cd frontend-next && npx tsc --noEmit`

Fix any remaining type errors across all new files.

**Step 4: Commit**

```
git add docs/ROADMAP.md frontend-next/src/router.tsx
git commit -m "docs: update ROADMAP with Tasks module completion"
```

---

## Summary

| Task | Component | Depends On | Est. Complexity |
|------|-----------|-----------|-----------------|
| 1 | Zustand Store | — | Small |
| 2 | Constants & Helpers | — | Small |
| 3 | React Query Hooks | — | Medium |
| 4 | Sidebar Content | 2 | Medium |
| 5 | Inline Add | 3 | Small |
| 6 | Task Row | 2, 3 | Medium |
| 7 | Task Card | 2, 3 | Medium |
| 8 | Empty State | 2 | Small |
| 9 | Toolbar | 1 | Small |
| 10 | List View | 5, 6, 8 | Medium |
| 11 | Card View | 7, 8 | Small |
| 12 | Tasks Page | 9, 10, 11 | Medium |
| 13 | Detail Modal | 3 | Large |
| 14 | Quick Capture Modal | 3 | Small |
| 15 | Create List Modal | 3 | Small |
| 16 | Dashboard Widget | 3 | Small |
| 17 | Sidebar QC Wiring | 14 | Small |
| 18 | Integration & Docs | All | Small |
