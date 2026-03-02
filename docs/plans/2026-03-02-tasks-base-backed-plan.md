# Tasks Base-Backed Rearchitecture — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewire the Tasks module to read/write from the Tasks default base (`core-tasks`) via the Bases API, replacing the standalone `/api/tasks` hooks.

**Architecture:** Thin adapter layer (`useTasksAdapter.ts`) wraps `useDefaultBase('Tasks')` + custom mutations hitting `/api/bases/core/core-tasks/records`. Smart views are client-side filters. Task lists become select options on the `list_id` property. Calendar integration rewired to read from the adapter.

**Tech Stack:** React 19, TanStack Query, Zustand, existing Bases API

**Parallelization Map:**
```
Wave 1: Task 1 (backend list_id), Task 2 (adapter hooks) — independent
Wave 2: Tasks 3, 4, 5, 6, 7 (component rewiring) — all independent, depend on Task 2
Wave 3: Task 8 (cleanup + barrel exports)
Wave 4: Task 9 (TypeScript check + visual test)
```

---

### Task 1: Backend — Change `list_id` property from text to select

**Files:**
- Modify: `backend/src/db/coreBases.js:409`

**Context:** The `list_id` property on the Tasks core base is currently `type: 'text'`. It needs to become `type: 'select'` with an empty options array, so users can create task lists as select options.

**Step 1: Update the property definition**

In `backend/src/db/coreBases.js`, find line 409:
```js
{ id: 'list_id', name: 'List', type: 'text', position: 17, width: 150 },
```

Change to:
```js
{ id: 'list_id', name: 'List', type: 'select', position: 17, width: 150, options: [] },
```

**Step 2: Verify backend starts**

Run: `docker restart lyfehub-dev`
Check: `docker logs lyfehub-dev --tail 20` — no errors

**Step 3: Commit**

```bash
git add backend/src/db/coreBases.js
git commit -m "fix(backend): change Tasks base list_id property from text to select"
```

---

### Task 2: Create `useTasksAdapter.ts` — the adapter layer

**Files:**
- Create: `frontend-next/src/api/hooks/useTasksAdapter.ts`

**Context:** This is the core file of the rearchitecture. It provides the same hook interface the UI components expect, but backed by the Tasks base via `useDefaultBase('Tasks')` and custom core base mutations. The backend returns checkbox fields as booleans (`true`/`false`) and empty fields as empty strings (`''`). The adapter normalizes these for UI consumption.

**Key backend API endpoints:**
- `GET /api/bases/default/Tasks` — returns `{ id, name, properties, records }` (via `useDefaultBase`)
- `POST /api/bases/core/core-tasks/records` — create record with `{ values: {...} }`
- `PUT /api/bases/core/core-tasks/records/:id` — update record with `{ values: {...} }`
- `DELETE /api/bases/core/core-tasks/records/:id` — delete record

**Key query key:** `['bases', 'default', 'Tasks']` — all mutations must invalidate this.

**Step 1: Create the adapter file**

```typescript
// frontend-next/src/api/hooks/useTasksAdapter.ts
import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client.js'
import { useDefaultBase, baseKeys } from './useBases.js'
import type { BaseRecord, BaseProperty, SelectOption } from '@/types/index.js'

// ── Constants ────────────────────────────────────────────────

const CORE_BASE_ID = 'core-tasks'
const CORE_BASE_NAME = 'Tasks'
const TASKS_QUERY_KEY = [...baseKeys.all, 'default', CORE_BASE_NAME] as const

// ── Types ────────────────────────────────────────────────────

export interface Subtask {
  id: string
  text: string
  completed: boolean
}

export interface TaskRecord {
  id: string
  baseId: string
  globalId: number | null
  position: number
  createdAt: string
  updatedAt: string
  // Semantic fields from values
  title: string
  description: string
  status: string
  my_day: boolean
  due_date: string | null
  due_time: string | null
  due_time_end: string | null
  snooze_date: string | null
  priority: string | null
  energy: string | null
  location: string | null
  important: boolean
  completed: boolean
  completed_at: string | null
  recurring: string | null
  recurring_days: string[]
  project_id: string | null
  list_id: string | null
  subtasks: Subtask[]
  people_ids: string[]
  note_ids: string[]
}

// ── Transformers ─────────────────────────────────────────────

function emptyToNull(val: unknown): string | null {
  if (val === '' || val == null) return null
  return String(val)
}

function toTaskRecord(record: BaseRecord): TaskRecord {
  const v = record.values
  return {
    id: record.id,
    baseId: record.base_id,
    globalId: record.global_id,
    position: record.position,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    title: String(v.title ?? ''),
    description: String(v.description ?? ''),
    status: String(v.status ?? 'todo'),
    my_day: Boolean(v.my_day),
    due_date: emptyToNull(v.due_date),
    due_time: emptyToNull(v.due_time),
    due_time_end: emptyToNull(v.due_time_end),
    snooze_date: emptyToNull(v.snooze_date),
    priority: emptyToNull(v.priority),
    energy: emptyToNull(v.energy),
    location: emptyToNull(v.location),
    important: Boolean(v.important),
    completed: Boolean(v.completed),
    completed_at: emptyToNull(v.completed_at),
    recurring: emptyToNull(v.recurring),
    recurring_days: Array.isArray(v.recurring_days) ? v.recurring_days : [],
    project_id: emptyToNull(v.project_id),
    list_id: emptyToNull(v.list_id),
    subtasks: Array.isArray(v.subtasks) ? v.subtasks : [],
    people_ids: Array.isArray(v.people_ids) ? v.people_ids : [],
    note_ids: Array.isArray(v.note_ids) ? v.note_ids : [],
  }
}

function toBaseValues(updates: Partial<TaskRecord>): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  const map: Record<string, string> = {
    title: 'title', description: 'description', status: 'status',
    my_day: 'my_day', due_date: 'due_date', due_time: 'due_time',
    due_time_end: 'due_time_end', snooze_date: 'snooze_date',
    priority: 'priority', energy: 'energy', location: 'location',
    important: 'important', completed: 'completed', completed_at: 'completed_at',
    recurring: 'recurring', recurring_days: 'recurring_days',
    project_id: 'project_id', list_id: 'list_id', subtasks: 'subtasks',
    people_ids: 'people_ids', note_ids: 'note_ids',
  }
  for (const [key, propId] of Object.entries(map)) {
    if (key in updates) {
      values[propId] = (updates as Record<string, unknown>)[key]
    }
  }
  return values
}

// ── Smart View Filters ───────────────────────────────────────

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function filterByView(records: TaskRecord[], view: string): TaskRecord[] {
  const today = getToday()

  if (view.startsWith('list:')) {
    const listValue = view.slice(5)
    return records.filter(r => !r.completed && r.list_id === listValue)
  }

  switch (view) {
    case 'my-day':
      return records.filter(r => !r.completed && r.my_day)
    case 'important':
      return records.filter(r => !r.completed && r.important)
    case 'scheduled':
      return records.filter(r => !r.completed && r.due_date != null)
    case 'recurring':
      return records.filter(r => !r.completed && r.recurring != null)
    case 'completed':
      return records.filter(r => r.completed)
    case 'all':
    default:
      return records.filter(r => !r.completed)
  }
}

function computeCounts(records: TaskRecord[]): Record<string, number> {
  const today = getToday()
  return {
    'my-day': records.filter(r => !r.completed && r.my_day).length,
    'important': records.filter(r => !r.completed && r.important).length,
    'scheduled': records.filter(r => !r.completed && r.due_date != null).length,
    'recurring': records.filter(r => !r.completed && r.recurring != null).length,
    'all': records.filter(r => !r.completed).length,
    'completed': records.filter(r => r.completed).length,
  }
}

// ── Query Hooks ──────────────────────────────────────────────

export function useTaskBase() {
  const { data, isLoading, error } = useDefaultBase(CORE_BASE_NAME)
  const records = useMemo(
    () => (data?.records ?? []).map(toTaskRecord),
    [data?.records],
  )
  const properties = data?.properties ?? []
  return { base: data, records, properties, isLoading, error }
}

export function useTaskRecords(view: string) {
  const { records, isLoading, error } = useTaskBase()
  const filtered = useMemo(
    () => filterByView(records, view),
    [records, view],
  )
  return { data: filtered, isLoading, error }
}

export function useTaskRecord(id: string) {
  const { records } = useTaskBase()
  return useMemo(
    () => records.find(r => r.id === id),
    [records, id],
  )
}

export function useTaskCounts() {
  const { records, isLoading } = useTaskBase()
  const counts = useMemo(
    () => computeCounts(records),
    [records],
  )
  return { data: counts, isLoading }
}

// ── Mutation Hooks ───────────────────────────────────────────

export function useCreateTaskRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<TaskRecord> & { title: string }) =>
      apiClient.post<BaseRecord>(`/bases/core/${CORE_BASE_ID}/records`, {
        values: toBaseValues(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY })
    },
  })
}

export function useUpdateTaskRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<TaskRecord> & { id: string }) =>
      apiClient.put<BaseRecord>(`/bases/core/${CORE_BASE_ID}/records/${id}`, {
        values: toBaseValues(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY })
    },
  })
}

export function useDeleteTaskRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<void>(`/bases/core/${CORE_BASE_ID}/records/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY })
    },
  })
}

// ── Optimistic Toggle Hooks ──────────────────────────────────

function useOptimisticToggle(field: 'completed' | 'my_day' | 'important') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, currentValue }: { id: string; currentValue: boolean }) =>
      apiClient.put<BaseRecord>(`/bases/core/${CORE_BASE_ID}/records/${id}`, {
        values: {
          [field]: !currentValue,
          ...(field === 'completed' && !currentValue ? { completed_at: new Date().toISOString().split('T')[0] } : {}),
          ...(field === 'completed' && currentValue ? { completed_at: '' } : {}),
        },
      }),
    onMutate: async ({ id, currentValue }) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY })
      const previous = queryClient.getQueryData(TASKS_QUERY_KEY)
      queryClient.setQueryData(TASKS_QUERY_KEY, (old: any) => {
        if (!old?.records) return old
        return {
          ...old,
          records: old.records.map((r: BaseRecord) =>
            r.id === id
              ? { ...r, values: { ...r.values, [field]: !currentValue } }
              : r,
          ),
        }
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(TASKS_QUERY_KEY, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY })
    },
  })
}

export function useToggleTaskComplete() {
  return useOptimisticToggle('completed')
}

export function useToggleTaskMyDay() {
  return useOptimisticToggle('my_day')
}

export function useToggleTaskImportant() {
  return useOptimisticToggle('important')
}

// ── Task List Options (from list_id property) ────────────────

export function useTaskListOptions() {
  const { properties } = useTaskBase()
  return useMemo(() => {
    const listProp = properties.find(p => p.id === 'list_id')
    if (!listProp || !Array.isArray(listProp.options)) return []
    return listProp.options as SelectOption[]
  }, [properties])
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend-next && npx tsc --noEmit`
Expected: PASS (no errors from adapter file)

**Step 3: Commit**

```bash
git add frontend-next/src/api/hooks/useTasksAdapter.ts
git commit -m "feat(tasks): add base-backed adapter hooks for Tasks module"
```

---

### Task 3: Rewire `TasksPage.tsx`

**Files:**
- Modify: `frontend-next/src/pages/TasksPage.tsx`

**Context:** Replace `useTasks(view)` and `useTaskLists()` with adapter hooks. The `TaskRecord` type uses booleans for `completed` (not numbers), so the filter logic stays the same since `Boolean(true)` is truthy.

**Step 1: Rewrite TasksPage.tsx**

```typescript
import { useSearchParams } from 'react-router-dom'
import { useTaskRecords, useTaskListOptions } from '@/api/hooks/useTasksAdapter.js'
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

  const { data: tasks = [], isLoading } = useTaskRecords(view)
  const listOptions = useTaskListOptions()
  const {
    displayMode,
    selectedTaskId, setSelectedTaskId,
    createModalOpen, setCreateModalOpen,
  } = useTasksUiStore()

  const activeTasks = tasks.filter(t => !t.completed)
  const completedTasks = tasks.filter(t => t.completed)

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-text-secondary text-sm">Loading tasks...</p>
      </div>
    )
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
      {displayMode === 'board' && (
        <TaskBoardView
          tasks={activeTasks}
          listOptions={listOptions}
          onSelectTask={setSelectedTaskId}
        />
      )}
      {displayMode === 'focus' && (
        <TaskFocusView
          tasks={activeTasks}
          onSelectTask={setSelectedTaskId}
        />
      )}

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

**Key change:** `TaskBoardView` now receives `listOptions` (SelectOption[]) instead of `lists` (TaskList[]).

**Step 2: Update `TaskBoardView` to accept `listOptions` prop**

In `frontend-next/src/pages/tasks/components/list/TaskBoardView.tsx`, change the `lists` prop to `listOptions` and update the type from `TaskList[]` to `SelectOption[]`. The board groups tasks by property values — the column labels come from select option labels. Where it currently uses `lists.map(l => l.name)` for the "list" grouping, use `listOptions.map(o => o.label)` instead.

**Step 3: Verify TypeScript compiles**

Run: `cd frontend-next && npx tsc --noEmit`

**Step 4: Commit**

```bash
git add frontend-next/src/pages/TasksPage.tsx frontend-next/src/pages/tasks/components/list/TaskBoardView.tsx
git commit -m "feat(tasks): rewire TasksPage to use base-backed adapter"
```

---

### Task 4: Rewire `TasksSidebarContent.tsx`

**Files:**
- Modify: `frontend-next/src/pages/tasks/components/TasksSidebarContent.tsx`

**Context:** Replace `useTaskCounts()` and `useTaskLists()` with adapter hooks. Lists now come from `useTaskListOptions()` which returns `SelectOption[]` (each has `label`, `value`, `color`).

**Step 1: Rewrite TasksSidebarContent.tsx**

Replace the imports and data fetching:
```typescript
import { useTaskCounts, useTaskListOptions } from '@/api/hooks/useTasksAdapter.js'
```

Replace `const { data: counts = {} } = useTaskCounts()` with:
```typescript
const { data: counts = {} } = useTaskCounts()
```

Replace `const { data: lists = [] } = useTaskLists()` with:
```typescript
const listOptions = useTaskListOptions()
```

In the My Lists section, replace `lists.map((list) => ...)` with:
```typescript
{listOptions.map((option) => {
  const optionValue = option.value || option.label
  const isActive = activeView === `list:${optionValue}`
  return (
    <button
      key={optionValue}
      onClick={() => setView(`list:${optionValue}`)}
      className={[
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full group',
        isActive
          ? 'bg-accent-light text-accent'
          : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
      ].join(' ')}
    >
      <span
        className="size-2.5 rounded-full shrink-0"
        style={{ backgroundColor: option.color || '#3b82f6' }}
      />
      <span className="flex-1 text-left truncate">{option.label}</span>
    </button>
  )
})}
```

Remove the `useTaskLists` import from `@/api/hooks/useTaskLists.js`.

**Step 2: Verify TypeScript compiles**

**Step 3: Commit**

```bash
git add frontend-next/src/pages/tasks/components/TasksSidebarContent.tsx
git commit -m "feat(tasks): rewire sidebar to use base-backed adapter"
```

---

### Task 5: Rewire input components — `TaskInlineAdd`, `TaskQuickCaptureModal`

**Files:**
- Modify: `frontend-next/src/pages/tasks/components/list/TaskInlineAdd.tsx`
- Modify: `frontend-next/src/pages/tasks/components/modals/TaskQuickCaptureModal.tsx`

**Context:** These components create new tasks. Replace `useCreateTask` with `useCreateTaskRecord` from the adapter.

**Step 1: Update TaskInlineAdd.tsx**

Replace import:
```typescript
import { useCreateTaskRecord } from '@/api/hooks/useTasksAdapter.js'
```

Replace `const createTask = useCreateTask()` with:
```typescript
const createTask = useCreateTaskRecord()
```

The `createTask.mutate({ title: trimmed, ...defaults })` call stays the same — the adapter's `useCreateTaskRecord` accepts partial `TaskRecord` with `title` required.

**Step 2: Update TaskQuickCaptureModal.tsx**

Same pattern — replace `useCreateTask` import with `useCreateTaskRecord` from `useTasksAdapter.js`.

**Step 3: Verify TypeScript compiles**

**Step 4: Commit**

```bash
git add frontend-next/src/pages/tasks/components/list/TaskInlineAdd.tsx frontend-next/src/pages/tasks/components/modals/TaskQuickCaptureModal.tsx
git commit -m "feat(tasks): rewire task creation to use base-backed adapter"
```

---

### Task 6: Rewire `TaskDetailModal.tsx`

**Files:**
- Modify: `frontend-next/src/pages/tasks/components/modals/TaskDetailModal.tsx`

**Context:** The detail modal loads a single task, edits it, toggles fields, and manages subtasks. Replace `useTask`, `useUpdateTask`, `useDeleteTask`, `useToggleMyDay`, `useToggleImportant` with adapter hooks.

**Step 1: Replace imports**

```typescript
import {
  useTaskRecord,
  useUpdateTaskRecord,
  useDeleteTaskRecord,
  useToggleTaskMyDay,
  useToggleTaskImportant,
  useTaskListOptions,
} from '@/api/hooks/useTasksAdapter.js'
```

**Step 2: Replace hook calls**

- `useTask(taskId)` → `useTaskRecord(taskId)` — returns `TaskRecord | undefined` directly (no `.data` wrapper)
- `useUpdateTask()` → `useUpdateTaskRecord()` — same signature: `mutate({ id, ...fields })`
- `useDeleteTask()` → `useDeleteTaskRecord()` — same signature: `mutate(id)`
- `useToggleMyDay()` → `useToggleTaskMyDay()` — now: `mutate({ id, currentValue: task.my_day })`
- `useToggleImportant()` → `useToggleTaskImportant()` — now: `mutate({ id, currentValue: task.important })`
- `useTaskLists()` → `useTaskListOptions()` — returns `SelectOption[]` instead of `TaskList[]`

**Step 3: Update field access**

The `TaskRecord` uses booleans for checkbox fields:
- `task.completed` → `boolean` (was `number`)
- `task.my_day` → `boolean` (was `number`)
- `task.important` → `boolean` (was `number`)

Most code checks truthiness (`if (task.completed)`) which works identically with booleans. If any code checks `=== 1` or `=== 0`, update to `=== true` / `=== false`.

**Step 4: Update list dropdown**

Replace `lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)` with:
```typescript
{listOptions.map(opt => (
  <option key={opt.value || opt.label} value={opt.value || opt.label}>
    {opt.label}
  </option>
))}
```

**Step 5: Verify TypeScript compiles**

**Step 6: Commit**

```bash
git add frontend-next/src/pages/tasks/components/modals/TaskDetailModal.tsx
git commit -m "feat(tasks): rewire detail modal to use base-backed adapter"
```

---

### Task 7: Rewire `CreateListModal.tsx`

**Files:**
- Modify: `frontend-next/src/pages/tasks/components/modals/CreateListModal.tsx`

**Context:** Creating a list is now adding a select option to the `list_id` property. This uses `useUpdateProperty(baseId)` from `useBases.ts` to update the property's options array.

**Step 1: Rewrite CreateListModal.tsx**

Replace the import and mutation:
```typescript
import { useTaskBase, useTaskListOptions } from '@/api/hooks/useTasksAdapter.js'
import { useUpdateProperty } from '@/api/hooks/useBases.js'
import type { SelectOption } from '@/types/index.js'
```

Get base ID and current options:
```typescript
const { base } = useTaskBase()
const listOptions = useTaskListOptions()
const updateProperty = useUpdateProperty(base?.id ?? '')
```

Replace the submit handler — instead of creating a task list, add a select option:
```typescript
function handleSubmit() {
  if (!name.trim() || !base) return
  const listProp = base.properties?.find(p => p.id === 'list_id')
  if (!listProp) return
  const newOption: SelectOption = {
    label: name.trim(),
    value: name.trim().toLowerCase().replace(/\s+/g, '-'),
    color: selectedColor,
  }
  const currentOptions = Array.isArray(listProp.options) ? listProp.options : []
  updateProperty.mutate({
    propId: 'list_id',
    options: [...currentOptions, newOption],
  }, {
    onSuccess: () => {
      setName('')
      onOpenChange(false)
    },
  })
}
```

**Step 2: Verify TypeScript compiles**

**Step 3: Commit**

```bash
git add frontend-next/src/pages/tasks/components/modals/CreateListModal.tsx
git commit -m "feat(tasks): rewire list creation to add select option on base property"
```

---

### Task 8: Rewire calendar integration

**Files:**
- Modify: `frontend-next/src/pages/calendar/hooks/useCalendarItems.ts`
- Modify: `frontend-next/src/pages/calendar/utils/calendarHelpers.ts`

**Context:** The calendar needs tasks with `due_date` for the visible date range. Currently uses `useCalendarTasks(start, end)` from the old tasks API. Replace with adapter's `useTaskBase()` which gives all records, then filter by date range.

**Step 1: Update calendarHelpers.ts**

Add a new function alongside the existing `taskToCalendarItem` that accepts `TaskRecord`:

```typescript
import type { TaskRecord } from '@/api/hooks/useTasksAdapter.js'

export function taskRecordToCalendarItem(task: TaskRecord): CalendarItem {
  return {
    id: task.id,
    type: 'task',
    title: task.title,
    description: task.description || '',
    color: null,
    startDate: normalizeDateStr(task.due_date!),
    startTime: task.due_time,
    endDate: normalizeDateStr(task.due_date!),
    endTime: task.due_time_end,
    isAllDay: !task.due_time,
    calendarId: '',
    calendarName: 'Tasks',
    calendarColor: '#a855f7',
    status: task.status,
    priority: task.priority,
    listId: task.list_id,
    completed: task.completed,
  }
}
```

**Step 2: Update useCalendarItems.ts**

Replace task import and hook:
```typescript
import { useTaskBase } from '@/api/hooks/useTasksAdapter.js'
import { eventToCalendarItem, taskRecordToCalendarItem } from '../utils/calendarHelpers.js'
```

Replace the hook body:
```typescript
export function useCalendarItems(startDate: string, endDate: string) {
  const { data: events = [], isLoading: eventsLoading } = useCalendarEvents(startDate, endDate)
  const { records: allTasks, isLoading: tasksLoading } = useTaskBase()
  const hiddenCalendarIds = useCalendarUiStore((s) => s.hiddenCalendarIds)

  const items: CalendarItem[] = useMemo(() => {
    const eventItems = events.map(eventToCalendarItem)
    const taskItems = allTasks
      .filter((t) => t.due_date && !t.completed && t.due_date >= startDate && t.due_date <= endDate)
      .map(taskRecordToCalendarItem)
    const all = [...eventItems, ...taskItems]
    return all.filter((item) => !hiddenCalendarIds.has(item.calendarId))
  }, [events, allTasks, startDate, endDate, hiddenCalendarIds])

  return {
    items,
    isLoading: eventsLoading || tasksLoading,
  }
}
```

Also update any imports of `useScheduleTask`/`useUnscheduleTask` elsewhere in the calendar module to use `useUpdateTaskRecord` from the adapter.

**Step 3: Verify TypeScript compiles**

**Step 4: Commit**

```bash
git add frontend-next/src/pages/calendar/hooks/useCalendarItems.ts frontend-next/src/pages/calendar/utils/calendarHelpers.ts
git commit -m "feat(calendar): rewire task integration to use base-backed adapter"
```

---

### Task 9: Delete old hooks + update barrel exports

**Files:**
- Delete: `frontend-next/src/api/hooks/useTasks.ts`
- Delete: `frontend-next/src/api/hooks/useTaskLists.ts`
- Modify: `frontend-next/src/api/hooks/index.ts`

**Context:** Remove all old task/taskList exports and replace with adapter exports. Any remaining imports of the old hooks in other files need to be updated.

**Step 1: Delete old files**

```bash
rm frontend-next/src/api/hooks/useTasks.ts
rm frontend-next/src/api/hooks/useTaskLists.ts
```

**Step 2: Update index.ts**

Remove the entire `useTasks.js` and `useTaskLists.js` export blocks. Add:

```typescript
export {
  useTaskBase,
  useTaskRecords,
  useTaskRecord,
  useTaskCounts,
  useCreateTaskRecord,
  useUpdateTaskRecord,
  useDeleteTaskRecord,
  useToggleTaskComplete,
  useToggleTaskMyDay,
  useToggleTaskImportant,
  useTaskListOptions,
} from './useTasksAdapter.js'
export type { TaskRecord, Subtask } from './useTasksAdapter.js'
```

**Step 3: Search for any remaining imports of old hooks**

Search the entire `frontend-next/src/` for any remaining imports from `useTasks.js` or `useTaskLists.js` and update them to import from `useTasksAdapter.js`.

Check for: `from.*useTasks`, `from.*useTaskLists`, `useCalendarTasks`, `useScheduleTask`, `useUnscheduleTask`.

**Step 4: Verify TypeScript compiles**

Run: `cd frontend-next && npx tsc --noEmit`
Expected: PASS with zero errors

**Step 5: Commit**

```bash
git add -A frontend-next/src/api/hooks/
git commit -m "feat(tasks): delete legacy task hooks, export base-backed adapter"
```

---

### Task 10: TypeScript check + visual smoke test

**Files:** None (testing only)

**Step 1: TypeScript check**

Run: `cd frontend-next && npx tsc --noEmit`
Expected: PASS

**Step 2: Start dev server**

Run: `cd frontend-next && npm run dev`
Ensure: Vite starts on port 5174

**Step 3: Visual smoke test in browser**

Open `http://localhost:5174/tasks` and verify:

1. **Sidebar:** Smart views show with count badges. My Lists section shows any existing lists.
2. **All Tasks view:** Shows tasks from the Tasks base. Count in sidebar matches.
3. **Inline add:** Type a task name, press Enter → task appears immediately.
4. **Detail modal:** Click a task → modal opens with all fields populated.
5. **Toggle checkbox:** Click complete checkbox → optimistic update, task moves to completed section.
6. **View switching:** List, Cards, Board, Focus all render correctly.
7. **Calendar:** Navigate to `/calendar` → scheduled tasks still appear on the calendar.
8. **Bases cross-check:** Navigate to `/bases`, open the Tasks base → same records visible.

**Step 4: Fix any issues found**

If errors occur, check browser console, fix, and re-test.

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(tasks): complete base-backed rearchitecture — Tasks page reads/writes from Tasks base"
```
