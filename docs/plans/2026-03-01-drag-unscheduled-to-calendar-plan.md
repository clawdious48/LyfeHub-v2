# Drag Unscheduled Tasks to Calendar — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable dragging unscheduled tasks from the calendar sidebar onto time-grid and month-grid calendar views to schedule them.

**Architecture:** Native HTML5 Drag and Drop API (not @dnd-kit) because the sidebar and calendar live in different component subtrees (`AppLayout > Sidebar` vs `AppLayout > main > CalendarPage`). Native drag events propagate across DOM boundaries naturally. The existing `draggable` attribute on task items just needs `dataTransfer` wired up. TimeGrid's pointer events for click-drag-create don't conflict with HTML5 drop events.

**Tech Stack:** React 19, TypeScript, TanStack Query, Zustand, Tailwind CSS v4

---

### Task 1: Wire drag data on UnscheduledTasksPanel

**Files:**
- Modify: `frontend-next/src/pages/calendar/components/sidebar/UnscheduledTasksPanel.tsx`

**Step 1: Replace onDragStart prop with native dataTransfer**

Remove the `UnscheduledTasksPanelProps` interface and `onDragStart` prop entirely (it's never passed by any parent). Replace the `onDragStart` handler on the `<motion.div>` at line 51 with native `dataTransfer` calls. Add a `draggingId` state variable to track the currently dragged task for visual feedback.

```tsx
// At top of component, add state:
const [draggingId, setDraggingId] = useState<string | null>(null)

// On the <motion.div> for each task (replace line 51):
onDragStart={(e) => {
  e.dataTransfer.setData('application/x-task-id', task.id)
  e.dataTransfer.setData('text/plain', task.title)
  e.dataTransfer.effectAllowed = 'move'
  setDraggingId(task.id)
}}
onDragEnd={() => setDraggingId(null)}

// Add opacity style to the same <motion.div>:
style={{ opacity: draggingId === task.id ? 0.4 : 1 }}
```

The full interface becomes empty, so remove it. The component signature becomes:
```tsx
export function UnscheduledTasksPanel() {
```

**Step 2: Verify drag data is set**

Run: `npx tsc --noEmit` from `frontend-next/`
Expected: 0 errors

**Step 3: Commit**

```bash
git add frontend-next/src/pages/calendar/components/sidebar/UnscheduledTasksPanel.tsx
git commit -m "feat(calendar): wire drag data on unscheduled task items"
```

---

### Task 2: Add drop zones to TimeGrid day columns

**Files:**
- Modify: `frontend-next/src/pages/calendar/components/TimeGrid.tsx`

**Step 1: Add onTaskDrop prop and drop indicator state**

Add to the `TimeGridProps` interface:
```ts
onTaskDrop?: (taskId: string, date: string, startTime: string, endTime: string) => void
```

Destructure in component params. Add state for the drop indicator:
```ts
const [dropIndicator, setDropIndicator] = useState<{ dateStr: string; top: number; height: number } | null>(null)
```

Import `HOUR_HEIGHT_PX` is already imported. `DEFAULT_EVENT_DURATION_MINUTES` is not — import it from `../utils/calendarConstants.js`.

**Step 2: Add drag event handlers**

Create three callbacks using `useCallback`:

```tsx
const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, dateStr: string) => {
  if (!e.dataTransfer.types.includes('application/x-task-id')) return
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  const rect = e.currentTarget.getBoundingClientRect()
  const y = e.clientY - rect.top + (scrollRef.current?.scrollTop || 0)
  const snappedY = snapToSlot(y)
  setDropIndicator({ dateStr, top: snappedY, height: HOUR_HEIGHT_PX })
}, [snapToSlot])

const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
  // Only clear if leaving the column (not entering a child)
  if (e.currentTarget.contains(e.relatedTarget as Node)) return
  setDropIndicator(null)
}, [])

const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, dateStr: string) => {
  e.preventDefault()
  const taskId = e.dataTransfer.getData('application/x-task-id')
  if (!taskId) return
  setDropIndicator(null)

  const rect = e.currentTarget.getBoundingClientRect()
  const y = e.clientY - rect.top + (scrollRef.current?.scrollTop || 0)
  const startTime = yToTime(y)
  const startMin = (snapToSlot(y) / SLOT_HEIGHT_PX) * MINUTES_PER_SLOT
  const endTime = minutesToTime(Math.min(startMin + DEFAULT_EVENT_DURATION_MINUTES, 24 * 60 - MINUTES_PER_SLOT))
  onTaskDrop?.(taskId, dateStr, startTime, endTime)
}, [yToTime, snapToSlot, onTaskDrop])
```

**Step 3: Attach handlers to day column divs**

On each day column `<div>` (the one at line 175 with `key={dateStr}`), add:
```tsx
onDragOver={(e) => handleDragOver(e, dateStr)}
onDragLeave={handleDragLeave}
onDrop={(e) => handleDrop(e, dateStr)}
```

**Step 4: Render the drop indicator**

After the ghost block render (line 226-234), add:
```tsx
{/* Task drop indicator */}
{dropIndicator && dropIndicator.dateStr === dateStr && (
  <div
    className="absolute left-1 right-1 bg-purple-500/15 border-2 border-dashed border-purple-500/60 rounded-md pointer-events-none"
    style={{
      top: dropIndicator.top,
      height: dropIndicator.height,
    }}
  />
)}
```

**Step 5: Verify**

Run: `npx tsc --noEmit` from `frontend-next/`
Expected: 0 errors

**Step 6: Commit**

```bash
git add frontend-next/src/pages/calendar/components/TimeGrid.tsx
git commit -m "feat(calendar): add drop zones to TimeGrid day columns"
```

---

### Task 3: Add drop zones to MonthView day cells

**Files:**
- Modify: `frontend-next/src/pages/calendar/components/views/MonthView.tsx`

**Step 1: Add onTaskDrop prop and drop target state**

Add to the `MonthViewProps` interface:
```ts
onTaskDrop?: (taskId: string, date: string) => void
```

Destructure in component params. Add state:
```ts
const [dropTargetDate, setDropTargetDate] = useState<string | null>(null)
```

Import `useState` (add to existing React import at line 1).

**Step 2: Add drag handlers on day cells**

On each day cell `<div>` (the one at line 67 with `key={dateStr}`), add these handlers:
```tsx
onDragOver={(e) => {
  if (!e.dataTransfer.types.includes('application/x-task-id')) return
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  setDropTargetDate(dateStr)
}}
onDragLeave={(e) => {
  if (e.currentTarget.contains(e.relatedTarget as Node)) return
  setDropTargetDate(null)
}}
onDrop={(e) => {
  e.preventDefault()
  const taskId = e.dataTransfer.getData('application/x-task-id')
  if (!taskId) return
  setDropTargetDate(null)
  onTaskDrop?.(taskId, dateStr)
}}
```

**Step 3: Add visual highlight on drop target**

Update the day cell className to include a highlight when it's the drop target. Add to the className array:
```tsx
dropTargetDate === dateStr && 'ring-2 ring-inset ring-purple-500/60 bg-purple-500/10',
```

**Step 4: Verify**

Run: `npx tsc --noEmit` from `frontend-next/`
Expected: 0 errors

**Step 5: Commit**

```bash
git add frontend-next/src/pages/calendar/components/views/MonthView.tsx
git commit -m "feat(calendar): add drop zones to MonthView day cells"
```

---

### Task 4: Pass onTaskDrop through view wrappers

**Files:**
- Modify: `frontend-next/src/pages/calendar/components/views/WeekView.tsx`
- Modify: `frontend-next/src/pages/calendar/components/views/ThreeDayView.tsx`
- Modify: `frontend-next/src/pages/calendar/components/views/DayView.tsx`

**Step 1: Update WeekView**

Add to `WeekViewProps`:
```ts
onTaskDrop?: (taskId: string, date: string, startTime: string, endTime: string) => void
```

Destructure `onTaskDrop` in the component params. Pass to `<TimeGrid>`:
```tsx
return <TimeGrid dates={dates} items={items} onSlotClick={onSlotClick} onItemClick={onItemClick} onDragCreate={onDragCreate} onTaskDrop={onTaskDrop} />
```

**Step 2: Update ThreeDayView**

Identical change — add `onTaskDrop` to `ThreeDayViewProps`, destructure, pass to `<TimeGrid>`.

**Step 3: Update DayView**

Identical change — add `onTaskDrop` to `DayViewProps`, destructure, pass to `<TimeGrid>`.

**Step 4: Verify**

Run: `npx tsc --noEmit` from `frontend-next/`
Expected: 0 errors

**Step 5: Commit**

```bash
git add frontend-next/src/pages/calendar/components/views/WeekView.tsx frontend-next/src/pages/calendar/components/views/ThreeDayView.tsx frontend-next/src/pages/calendar/components/views/DayView.tsx
git commit -m "feat(calendar): pass onTaskDrop through Week/ThreeDay/Day view wrappers"
```

---

### Task 5: Wire useScheduleTask mutation in CalendarPage

**Files:**
- Modify: `frontend-next/src/pages/CalendarPage.tsx`

**Step 1: Import useScheduleTask**

Add to imports:
```ts
import { useScheduleTask } from '@/api/hooks/useTasks.js'
```

**Step 2: Add mutation and handler**

Inside the component, after the existing hooks:
```ts
const scheduleTask = useScheduleTask()

function handleTaskDrop(taskId: string, date: string, startTime?: string, endTime?: string) {
  scheduleTask.mutate({
    id: taskId,
    due_date: date,
    due_time: startTime,
    due_time_end: endTime,
  })
}
```

**Step 3: Pass onTaskDrop to all five views**

On `<MonthView>`, add:
```tsx
onTaskDrop={(taskId, date) => handleTaskDrop(taskId, date)}
```

On `<WeekView>`, add:
```tsx
onTaskDrop={handleTaskDrop}
```

On `<ThreeDayView>`, add:
```tsx
onTaskDrop={handleTaskDrop}
```

On `<DayView>`, add:
```tsx
onTaskDrop={handleTaskDrop}
```

AgendaView does not need onTaskDrop (it's a read-only list view with no spatial drop targets).

**Step 4: Verify**

Run: `npx tsc --noEmit` from `frontend-next/`
Expected: 0 errors

**Step 5: Commit**

```bash
git add frontend-next/src/pages/CalendarPage.tsx
git commit -m "feat(calendar): wire useScheduleTask for drag-to-schedule"
```

---

### Task 6: Also update CalendarSidebarContent (remove stale onDragStart prop)

**Files:**
- Modify: `frontend-next/src/pages/calendar/components/sidebar/CalendarSidebarContent.tsx` (if it passes `onDragStart` to `UnscheduledTasksPanel`)

**Step 1: Check and clean up**

Check if `CalendarSidebarContent.tsx` passes `onDragStart` to `<UnscheduledTasksPanel>`. If yes, remove the prop. If it already passes nothing, no change needed.

**Step 2: Verify**

Run: `npx tsc --noEmit` from `frontend-next/`
Expected: 0 errors

**Step 3: Commit (only if changes were made)**

```bash
git add frontend-next/src/pages/calendar/components/sidebar/CalendarSidebarContent.tsx
git commit -m "chore(calendar): remove stale onDragStart prop from sidebar"
```

---

## Existing Code to Reuse

| What | Where | Notes |
|------|-------|-------|
| `useScheduleTask()` | `frontend-next/src/api/hooks/useTasks.ts:92-101` | Calls `PATCH /tasks/:id/schedule`, invalidates `taskKeys.all` |
| `useUnscheduledTasks()` | `frontend-next/src/api/hooks/useTasks.ts:82-90` | Already used by `UnscheduledTasksPanel` |
| `snapToSlot()` | `TimeGrid.tsx:31` (local `useCallback`) | Already exists in TimeGrid |
| `yToTime()` | `TimeGrid.tsx:33-37` (local `useCallback`) | Already exists in TimeGrid |
| `minutesToTime()` | `calendarHelpers.ts:84-88` | Already imported in TimeGrid |
| `HOUR_HEIGHT_PX` | `calendarConstants.ts:20` = 60px | Already imported in TimeGrid |
| `SLOT_HEIGHT_PX` | `calendarConstants.ts:21` = 15px | Already imported in TimeGrid |
| `DEFAULT_EVENT_DURATION_MINUTES` | `calendarConstants.ts:16` = 60 | Needs import in TimeGrid |
| `ScheduleTaskData` | `types/task.ts:54-58` | `{ due_date, due_time?, due_time_end? }` |

## Verification

1. Navigate to `/calendar` in Week view
2. Confirm an unscheduled task appears in the sidebar panel
3. Drag the task onto a day column — dashed purple ghost indicator should appear at cursor position, snapping to 15-min intervals
4. Drop — task disappears from sidebar and appears as a purple dashed-border block at the drop time
5. Switch to Month view, drag another task onto a day cell — cell highlights with purple ring, drop schedules as all-day
6. Switch to Agenda view — both tasks should appear with correct dates/times
7. Check browser console for zero errors
8. Run `npx tsc --noEmit` — 0 errors
