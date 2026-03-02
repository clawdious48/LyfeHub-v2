# Tasks Module Rearchitecture — Base-Backed Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewire the Tasks module so it reads/writes from the Tasks default base (`core-tasks`) via the Bases API, making it a polished UI layer over base records — not a separate data system.

**Architecture:** Thin adapter layer (`useTasksAdapter.ts`) wraps `useDefaultBase('Tasks')` and base record mutations, providing typed `TaskRecord` hooks to UI components. Smart views are client-side filters. Task lists are select options on the `list_id` property.

**Tech Stack:** React 19, TanStack Query, Zustand, existing Bases API hooks

---

## Core Principle (Rule 0)

The Bases system IS the data layer. The Tasks page is a specialized, polished UI that reads and writes records from the Tasks default base. There is NO separate tasks table for the React frontend.

- Add a task in Tasks page → creates a record in the Tasks base → visible in Bases view
- Add a record to the Tasks base → visible in Tasks page
- ONE source of truth: `base_records` table via Bases API

---

## The Adapter Pattern

### Property Mapping

The Tasks base has 21 properties. The adapter maps property IDs to semantic field names:

```typescript
const TASK_PROPS = {
  title: 'title',
  description: 'description',
  status: 'status',
  my_day: 'my_day',
  due_date: 'due_date',
  due_time: 'due_time',         // stored as text, HH:MM format
  due_time_end: 'due_time_end', // stored as text, HH:MM format
  snooze_date: 'snooze_date',
  priority: 'priority',
  energy: 'energy',
  location: 'location',
  important: 'important',
  completed: 'completed',
  completed_at: 'completed_at',
  recurring: 'recurring',
  recurring_days: 'recurring_days',
  project_id: 'project_id',
  list_id: 'list_id',           // select type, options = user lists
  subtasks: 'subtasks',         // JSON text: Subtask[]
  people_ids: 'people_ids',
  note_ids: 'note_ids',
} as const
```

### TaskRecord Type

```typescript
interface TaskRecord {
  id: string              // BaseRecord.id
  baseId: string          // BaseRecord.base_id
  globalId: number | null // BaseRecord.global_id
  position: number        // BaseRecord.position
  createdAt: string       // BaseRecord.created_at
  updatedAt: string       // BaseRecord.updated_at

  // Semantic fields (extracted from values)
  title: string
  description: string
  status: string | null         // 'todo' | 'doing' | 'done'
  my_day: number                // 0 | 1
  due_date: string | null
  due_time: string | null       // HH:MM
  due_time_end: string | null   // HH:MM
  snooze_date: string | null
  priority: string | null       // 'low' | 'medium' | 'high'
  energy: string | null         // 'low' | 'high'
  location: string | null       // 'home' | 'office' | 'errand'
  important: number             // 0 | 1
  completed: number             // 0 | 1
  completed_at: string | null
  recurring: string | null
  recurring_days: string[]
  project_id: string | null
  list_id: string | null        // select option value
  subtasks: Subtask[]
  people_ids: string[]
  note_ids: string[]
}

interface Subtask {
  id: string
  text: string
  completed: boolean
}
```

### Transformer Functions

```typescript
// BaseRecord → TaskRecord
function toTaskRecord(record: BaseRecord): TaskRecord

// Partial TaskRecord update → { values: {...} } for bases API
function toBaseValues(updates: Partial<TaskRecord>): Record<string, unknown>
```

The `toTaskRecord` function handles:
- Extracting values from `record.values[propertyId]`
- Parsing `subtasks` from JSON text to `Subtask[]`
- Defaulting checkbox fields to 0 if null
- Defaulting array fields to `[]` if null
- Parsing `recurring_days` from stored format to `string[]`

The `toBaseValues` function handles:
- Serializing `subtasks` back to JSON text
- Only including changed fields in the values object

---

## Hooks Provided by the Adapter

| Hook | Signature | Wraps |
|------|-----------|-------|
| `useTaskBase()` | `() → { base, records, properties, isLoading }` | `useDefaultBase('Tasks')` |
| `useTaskRecords(view)` | `(view: string) → TaskRecord[]` | Filters records by smart view |
| `useTaskRecord(id)` | `(id: string) → TaskRecord \| undefined` | Extracts from cache |
| `useTaskCounts()` | `() → Record<string, number>` | Derives from full record set |
| `useCreateTaskRecord()` | `() → mutation` | `useCreateBaseRecord(baseId)` + value mapping |
| `useUpdateTaskRecord()` | `() → mutation` | `useUpdateBaseRecord(baseId)` + value mapping |
| `useDeleteTaskRecord()` | `() → mutation` | `useDeleteBaseRecord(baseId)` |
| `useToggleTaskComplete()` | `() → mutation` | Optimistic `completed` toggle |
| `useToggleTaskMyDay()` | `() → mutation` | Optimistic `my_day` toggle |
| `useToggleTaskImportant()` | `() → mutation` | Optimistic `important` toggle |
| `useTaskListOptions()` | `() → SelectOption[]` | Reads `list_id` property options |
| `useAddTaskListOption()` | `() → mutation` | Adds select option to `list_id` property |

---

## Smart View Filtering (Client-Side)

All smart views filter the full record set fetched by `useDefaultBase('Tasks')`:

| View | Filter Logic |
|------|-------------|
| `my-day` | `r.my_day == 1 && !r.completed` |
| `important` | `r.important == 1 && !r.completed` |
| `scheduled` | `r.due_date != null && !r.completed` |
| `recurring` | `r.recurring != null && !r.completed` |
| `all` | `!r.completed` |
| `completed` | `r.completed == 1` |
| `list:{optionValue}` | `r.list_id === optionValue && !r.completed` |

Task counts are derived from these same filters applied to the full set.

---

## Task Lists as Select Options

The `list_id` property on the Tasks base becomes type `select`. Each list is a select option:

```typescript
{
  label: "Groceries",
  value: "groceries",
  color: "#22c55e"
}
```

**CreateListModal:** Instead of `POST /api/task-lists`, adds a new option to the `list_id` property via `useUpdateProperty`. Sends the updated options array.

**Sidebar "My Lists":** Reads `list_id` property's `options` array from the base's properties.

**Migration:** The `list_id` property in `coreBases.js` needs to be changed from type `text` to type `select` with empty initial options.

---

## Calendar Integration

The calendar currently uses `useCalendarTasks(start, end)` which calls `/api/tasks/calendar`. This needs to be rewired:

**New approach:** Calendar queries the Tasks base adapter:
- Import `useTaskBase()` to get all records
- Filter for records with `due_date` in the visible date range
- Transform to `CalendarItem` using existing normalization helpers

**Schedule/Unschedule:** Use `useUpdateTaskRecord()` to set/clear `due_date`, `due_time`, `due_time_end`.

**Drag from sidebar to calendar:** Same `useUpdateTaskRecord()` mutation.

---

## Files Changed

### NEW
- `frontend-next/src/api/hooks/useTasksAdapter.ts` — the adapter layer

### DELETED
- `frontend-next/src/api/hooks/useTasks.ts` — replaced by adapter
- `frontend-next/src/api/hooks/useTaskLists.ts` — lists are now select options

### REWRITTEN
- `frontend-next/src/pages/TasksPage.tsx` — swap hook imports
- `frontend-next/src/pages/tasks/components/TasksSidebarContent.tsx` — swap hooks, lists from property options
- `frontend-next/src/pages/tasks/components/modals/CreateListModal.tsx` — add select option instead of POST /task-lists

### MINOR EDITS (import swaps)
- `frontend-next/src/pages/tasks/components/list/TaskInlineAdd.tsx`
- `frontend-next/src/pages/tasks/components/modals/TaskDetailModal.tsx`
- `frontend-next/src/pages/tasks/components/modals/TaskQuickCaptureModal.tsx`
- `frontend-next/src/api/hooks/index.ts` — swap exports
- `frontend-next/src/pages/calendar/hooks/useCalendarItems.ts` — rewire task queries

### NO CHANGES (receive data as props)
- `TaskToolbar.tsx`, `TaskRow.tsx`, `TaskCard.tsx`, `TaskListView.tsx`, `TaskCardsView.tsx`
- `TaskBoardColumn.tsx`, `TaskBoardView.tsx`, `TaskFocusView.tsx`, `TaskCompletedSection.tsx`

### BACKEND (minimal)
- `backend/src/db/coreBases.js` — change `list_id` property from type `text` to type `select`

---

## Optimistic Updates

Toggle mutations (complete, my_day, important) use TanStack Query optimistic updates:

```typescript
onMutate: async (args) => {
  // Cancel in-flight queries
  await queryClient.cancelQueries({ queryKey: baseKeys.detail(tasksBaseId) })
  // Snapshot previous data
  const previous = queryClient.getQueryData(baseKeys.detail(tasksBaseId))
  // Optimistically update the record in the cached base
  queryClient.setQueryData(baseKeys.detail(tasksBaseId), (old) => ({
    ...old,
    records: old.records.map(r =>
      r.id === recordId
        ? { ...r, values: { ...r.values, [field]: newValue } }
        : r
    )
  }))
  return { previous }
},
onError: (_err, _vars, context) => {
  queryClient.setQueryData(baseKeys.detail(tasksBaseId), context.previous)
},
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: baseKeys.detail(tasksBaseId) })
}
```

---

## What This Does NOT Change

- The Zustand store (`tasksUiStore.ts`) — stays as-is
- Constants and helpers (`taskConstants.ts`, `taskHelpers.ts`) — stay as-is
- Display mode switching (List/Cards/Board/Focus) — stays as-is
- The sidebar architecture — stays as-is
- The old vanilla frontend — it still uses `/api/tasks` independently
