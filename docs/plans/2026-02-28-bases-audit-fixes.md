# Bases Module Audit & Fix Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all bugs, design violations, and missing functionality in the Bases module so it is fully functional and aligned with the CLAUDE.md vision.

**Architecture:** The Bases module was built by parallel agents who didn't have the finalized CLAUDE.md. This plan fixes 3 critical runtime bugs, 2 functional bugs, 1 design violation, wires the contextual sidebar, and removes dead code.

**Tech Stack:** React 19, TypeScript, TanStack Query, Zustand, shadcn/ui, Tailwind CSS v4

---

## Bugs Found (Audit Summary)

| # | Severity | Issue | Impact |
|---|----------|-------|--------|
| 1 | CRITICAL | Reorder hooks send `{ items }` but backend expects `{ order }` | Property & group reorder always 400 |
| 2 | CRITICAL | Frontend shows 13 property types but backend CHECK constraint only allows 8 | Creating time/datetime/email/phone/files properties → 500 |
| 3 | CRITICAL | `applyViewConfig` reads `sorts[0].column` but saved views store `propertyId` | Loading views with sorting silently fails |
| 4 | BUG | "Sort Ascending" and "Sort Descending" both call `toggleSort()` | Both cycle instead of setting specific direction |
| 5 | BUG | "Hide Column" in context menu does nothing | `handleHide()` only calls `onClose()`, never hides |
| 6 | VIOLATION | EditBaseModal says "permanently delete" | Contradicts "archive, never delete" principle |
| 7 | MISSING | No `/bases` route in `sidebarConfig.ts` | Bases page shows dashboard sidebar instead of contextual bases nav |
| 8 | DEAD CODE | 5 files in `sidebar/` directory never imported | Confusing, could be mistakenly used |
| 9 | DEAD CODE | `CELL_RENDERERS` map in `cells/index.ts` | Never used, BaseCell uses switch |
| 10 | DEAD CODE | `baseKeys.properties()` query key | Defined but never used |

---

### Task 1: Fix reorder hooks — `items` → `order`

The backend property reorder and group reorder endpoints both read `req.body.order`, but both frontend hooks send `{ items }`. This makes all drag-and-drop reordering silently fail with 400 errors.

**Files:**
- Modify: `frontend-next/src/api/hooks/useBases.ts:160-161` (useReorderProperties)
- Modify: `frontend-next/src/api/hooks/useBases.ts:278-279` (useReorderGroups)

**Step 1: Fix useReorderProperties**

In `useBases.ts` line 161, change:
```typescript
// BEFORE (broken):
apiClient.post<void>(`/bases/${baseId}/properties/reorder`, { items })

// AFTER (fixed):
apiClient.post<void>(`/bases/${baseId}/properties/reorder`, { order: items })
```

**Step 2: Fix useReorderGroups**

In `useBases.ts` line 279, change:
```typescript
// BEFORE (broken):
apiClient.post<BaseGroup[]>('/bases/groups/reorder', { items })

// AFTER (fixed):
apiClient.post<BaseGroup[]>('/bases/groups/reorder', { order: items })
```

**Step 3: Type-check**

Run: `cd frontend-next && npx tsc --noEmit`
Expected: No new errors from this change

**Step 4: Commit**

```bash
git add frontend-next/src/api/hooks/useBases.ts
git commit -m "fix(bases): send {order} not {items} to reorder endpoints

Backend expects req.body.order but hooks were sending {items}.
Property and group reordering was silently failing with 400s.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Fix property type mismatch — remove unsupported types from frontend

Backend `init.sql` line 435 has a CHECK constraint:
```sql
type TEXT NOT NULL CHECK(type IN ('text', 'number', 'select', 'multi_select', 'date', 'checkbox', 'url', 'relation'))
```

Frontend `BasePropertyType` includes 5 extra types (`time`, `datetime`, `email`, `phone`, `files`) that will cause 500 SQL constraint violations when creating properties.

**Files:**
- Modify: `frontend-next/src/types/base.ts:1-5` (BasePropertyType union)
- Modify: `frontend-next/src/pages/bases/utils/baseConstants.ts` (PROPERTY_TYPES array + FILTER_OPERATORS)
- Modify: `frontend-next/src/pages/bases/components/detail/BaseCell.tsx` (remove time/datetime/email/phone/files cases from switch)
- Verify: No other files reference the removed types

**Step 1: Fix BasePropertyType in types/base.ts**

Remove the 5 unsupported types:
```typescript
// BEFORE:
export type BasePropertyType =
  | 'text' | 'number' | 'select' | 'multi_select' | 'date'
  | 'time' | 'datetime' | 'checkbox' | 'url' | 'email'
  | 'phone' | 'files' | 'relation'

// AFTER:
export type BasePropertyType =
  | 'text' | 'number' | 'select' | 'multi_select' | 'date'
  | 'checkbox' | 'url' | 'relation'
```

**Step 2: Remove unsupported types from PROPERTY_TYPES in baseConstants.ts**

Remove the entries for `time`, `datetime`, `email`, `phone`, `files` from the `PROPERTY_TYPES` array. Keep only the 8 backend-supported types.

Also remove `time` and `datetime` entries from `FILTER_OPERATORS` if they exist.

**Step 3: Simplify BaseCell.tsx switch statements**

In `renderEditor()`: Remove `case 'time':` and `case 'datetime':` (they currently fall through to CellDateEditor). Remove `case 'email':` and `case 'phone':` (they currently fall through to CellTextEditor).

In `renderCell()`: Remove `case 'email':` and `case 'phone':` (they fall through to CellText). Remove `case 'time':` and `case 'datetime':` (they fall through to CellDate).

The `url` type is supported by the backend. The `files` type is NOT supported by the backend — remove the `case 'files':` from both switches. The `CellFiles` and `CellRelation` components stay because `relation` IS supported and `files` can be added back if the backend gains support.

**Step 4: Search for remaining references to removed types**

Run grep for: `'time'|'datetime'|'email'|'phone'|'files'` across `frontend-next/src/pages/bases/` to find any remaining usages. Clean up as needed.

**Step 5: Type-check**

Run: `cd frontend-next && npx tsc --noEmit`
Expected: No errors (removing types from the union may surface call sites that need cleanup)

**Step 6: Commit**

```bash
git add frontend-next/src/types/base.ts frontend-next/src/pages/bases/utils/baseConstants.ts frontend-next/src/pages/bases/components/detail/BaseCell.tsx
git commit -m "fix(bases): remove 5 property types not supported by backend CHECK constraint

Backend only allows: text, number, select, multi_select, date, checkbox, url, relation.
Frontend was showing time, datetime, email, phone, files which caused 500 errors.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Fix view config sort field mismatch

When a saved view is loaded via `applyViewConfig()`, the store reads `sorts[0].column` but `BaseViewConfig.sorts` uses `propertyId`. Sorting from saved views silently fails.

**Files:**
- Modify: `frontend-next/src/stores/basesUiStore.ts:75-77` (applyViewConfig type signature)
- Modify: `frontend-next/src/stores/basesUiStore.ts:170-171` (sort application logic)

**Step 1: Fix the applyViewConfig type signature and logic**

In `basesUiStore.ts`, the `applyViewConfig` function type has:
```typescript
sorts?: Array<{ column: string; direction: 'asc' | 'desc' }>
```

Change to:
```typescript
sorts?: Array<{ propertyId: string; direction: 'asc' | 'desc' }>
```

And in the implementation (line 171), change:
```typescript
// BEFORE:
updates.sortColumn = config.sorts[0].column

// AFTER:
updates.sortColumn = config.sorts[0].propertyId
```

**Step 2: Type-check**

Run: `cd frontend-next && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add frontend-next/src/stores/basesUiStore.ts
git commit -m "fix(bases): read sorts[0].propertyId not .column when loading view config

BaseViewConfig stores sorts as {propertyId, direction} but applyViewConfig
was reading .column, causing saved view sorting to silently fail.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Fix ColumnContextMenu — sort directions + hide column

Two bugs in `ColumnContextMenu.tsx`:
1. "Sort Ascending" and "Sort Descending" both call `toggleSort()` which cycles, instead of setting specific directions
2. "Hide Column" does nothing — `handleHide()` only calls `onClose()`

**Files:**
- Modify: `frontend-next/src/pages/bases/components/detail/ColumnContextMenu.tsx`

**Step 1: Fix sort handlers**

Replace `handleSortAsc` and `handleSortDesc`:

```typescript
// BEFORE:
function handleSortAsc() {
  toggleSort(property.id)
  onClose()
}
function handleSortDesc() {
  toggleSort(property.id)
  onClose()
}

// AFTER:
function handleSortAsc() {
  setSortColumn(property.id)
  setSortDirection('asc')
  onClose()
}
function handleSortDesc() {
  setSortColumn(property.id)
  setSortDirection('desc')
  onClose()
}
```

Update the destructured store imports — replace `toggleSort` with `setSortColumn, setSortDirection`:

```typescript
// BEFORE:
const { toggleSort, setVisibleColumns } = useBasesUiStore()

// AFTER:
const { setSortColumn, setSortDirection, setVisibleColumns, visibleColumns } = useBasesUiStore()
```

**Step 2: Fix handleHide**

The `handleHide` function needs to actually remove the column from visible columns. Need to also access `visibleColumns` from the store (added in step 1) and the full properties list. Add a `properties` prop to the component:

```typescript
// Add to ColumnContextMenuProps:
properties: BaseProperty[]

// Updated handleHide:
function handleHide() {
  const allPropertyIds = properties.map(p => p.id)
  const currentVisible = visibleColumns ?? allPropertyIds
  setVisibleColumns(currentVisible.filter(id => id !== property.id))
  onClose()
}
```

Update the call site in `BaseDetailView.tsx` to pass `properties`:
```tsx
<ColumnContextMenu
  property={contextMenu.property}
  baseId={baseId}
  position={contextMenu.position}
  onClose={() => setContextMenu(null)}
  onEdit={(property) => setEditProperty(property)}
  properties={properties}  // ADD THIS
/>
```

**Step 3: Type-check**

Run: `cd frontend-next && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add frontend-next/src/pages/bases/components/detail/ColumnContextMenu.tsx frontend-next/src/pages/bases/components/detail/BaseDetailView.tsx
git commit -m "fix(bases): column context menu sort directions and hide column

Sort Ascending/Descending now set specific directions instead of cycling.
Hide Column now actually removes the column from visible columns.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Fix EditBaseModal delete messaging

The delete confirmation says "permanently delete" and "cannot be undone" which directly contradicts the "archive, never delete" design principle from CLAUDE.md.

**Files:**
- Modify: `frontend-next/src/pages/bases/components/modals/EditBaseModal.tsx:150-152`

**Step 1: Update delete messaging**

Change the destructive text:

```typescript
// BEFORE:
<p className="text-sm text-destructive">
  This will permanently delete this base and all its records. This cannot be undone.
</p>

// AFTER:
<p className="text-sm text-destructive">
  This will archive this base and its records. Are you sure?
</p>
```

Also change the button label from "Delete Base" to "Archive Base" and "Confirm Delete" to "Confirm Archive":

```tsx
// Button text changes:
"Delete Base" → "Archive Base"
"Confirm Delete" → "Confirm Archive"
"Deleting..." → "Archiving..."
```

**Step 2: Commit**

```bash
git add frontend-next/src/pages/bases/components/modals/EditBaseModal.tsx
git commit -m "fix(bases): change delete messaging to archive per design principles

CLAUDE.md says 'archive, never delete'. Changed destructive messaging
from 'permanently delete' to 'archive' language throughout.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Remove dead code

Three categories of dead code to clean up:

1. `pages/bases/components/sidebar/` — 5 files never imported (BasesSidebar, SidebarGroupList, SidebarGroup, SidebarBaseItem, SidebarUngroupedBases)
2. `cells/index.ts` — `CELL_RENDERERS` map and `getCellRenderer()` function never used
3. `baseKeys.properties()` — query key defined but never used

**Files:**
- Delete: `frontend-next/src/pages/bases/components/sidebar/BasesSidebar.tsx`
- Delete: `frontend-next/src/pages/bases/components/sidebar/SidebarGroupList.tsx`
- Delete: `frontend-next/src/pages/bases/components/sidebar/SidebarGroup.tsx`
- Delete: `frontend-next/src/pages/bases/components/sidebar/SidebarBaseItem.tsx`
- Delete: `frontend-next/src/pages/bases/components/sidebar/SidebarUngroupedBases.tsx`
- Modify: `frontend-next/src/pages/bases/components/detail/cells/index.ts` (remove CELL_RENDERERS + getCellRenderer)
- Modify: `frontend-next/src/api/hooks/useBases.ts` (remove unused baseKeys.properties)

**Step 1: Delete sidebar directory**

```bash
rm -rf frontend-next/src/pages/bases/components/sidebar/
```

Per CLAUDE.md rule #5 (Module File Organization): "There is NO `sidebar/` directory under a module."

**Step 2: Clean cells/index.ts**

Remove the `CELL_RENDERERS` constant and `getCellRenderer()` function. Keep only the named exports of cell components.

**Step 3: Remove unused query key**

In `useBases.ts`, remove:
```typescript
properties: (baseId: string) => [...baseKeys.all, 'properties', baseId] as const,
```

**Step 4: Verify no broken imports**

Run: `cd frontend-next && npx tsc --noEmit`
Expected: No errors (deleted files were not imported anywhere)

**Step 5: Commit**

```bash
git add -A frontend-next/src/pages/bases/components/sidebar/ frontend-next/src/pages/bases/components/detail/cells/index.ts frontend-next/src/api/hooks/useBases.ts
git commit -m "chore(bases): remove dead code — sidebar dir, unused CELL_RENDERERS, unused query key

Per CLAUDE.md: no sidebar/ directory under modules. Sidebar content
belongs in layouts/sidebarConfig.ts. Also removed unused cell renderer
map and unused baseKeys.properties() query key.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Wire bases contextual sidebar into sidebarConfig.ts

The `/bases` route needs its own contextual sidebar sections. When on the Bases page, the sidebar should show:

1. **Base Groups** — Collapsible folders with their bases listed. Clicking a base navigates to it.
2. **Ungrouped Bases** — Bases not in any group.
3. **Actions** — "Create Base" and "Create Group" quick actions.

This is currently missing — `sidebarConfig.ts` only defines `'/'`, so `/bases` falls back to the dashboard sidebar.

Per CLAUDE.md architecture rule #1: module-specific sidebar content goes in `sidebarConfig.ts`, NOT as components inside the page.

**Files:**
- Modify: `frontend-next/src/layouts/sidebarConfig.ts` — add `/bases` route key with bases-specific sections
- Modify: `frontend-next/src/layouts/Sidebar.tsx` — add support for dynamic/data-driven sidebar sections (bases groups are fetched from API, not static items)

**Important design decision:** The sidebar config currently uses static `SidebarItem[]` arrays with `label`, `icon`, `to` (route path). But bases sidebar content is dynamic — groups and bases come from API data. This means either:

**(A)** Extend sidebarConfig to support a "component" section type that renders a custom React component for that route
**(B)** Keep static config but add a separate "dynamic content" slot in Sidebar.tsx that renders based on route

Approach **(A)** is cleaner — add a `component` field to `SidebarSection` that, when present, renders a React component instead of the static item list. This keeps all sidebar config centralized.

**Step 1: Extend SidebarSection type in sidebarConfig.ts**

```typescript
// Add to SidebarSection:
export interface SidebarSection {
  key: string
  header: string
  icon: LucideIcon
  items: SidebarItem[]
  component?: React.ComponentType  // When set, renders this instead of items
}
```

**Step 2: Create BaseSidebarContent component**

Create `frontend-next/src/pages/bases/components/BaseSidebarContent.tsx`:

This component will:
- Use `useBaseGroups()` and `useBases()` hooks to fetch data
- Render collapsible groups with their bases
- Render ungrouped bases
- Render "Create Base" and "Create Group" buttons
- Highlight the currently selected base (read from URL or BasesPage state)
- Support `useToggleGroupCollapse()` for collapsing groups

This is the bases-specific content that was in the now-deleted `BasesSidebar` but adapted to fit within the app-level sidebar as a section component.

**Step 3: Add `/bases` route key to sidebarSections**

```typescript
'/bases': [
  {
    key: 'bases-browser',
    header: 'Bases',
    icon: Database,
    items: [],
    component: BaseSidebarContent,
  },
  // Also include standard navigation sections
  {
    key: 'productivity',
    header: 'Productivity',
    icon: Briefcase,
    items: [
      { label: 'Jobs', icon: Briefcase, to: '/jobs' },
      { label: 'Calendar', icon: Calendar, to: '/calendar' },
      { label: 'Tasks', icon: CheckSquare, to: '/tasks' },
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

**Step 4: Update Sidebar.tsx to render component sections**

In `Sidebar.tsx`, where sections are rendered, add a check:

```tsx
{section.component ? (
  <section.component />
) : (
  // existing item rendering code
)}
```

**Step 5: Type-check**

Run: `cd frontend-next && npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add frontend-next/src/layouts/sidebarConfig.ts frontend-next/src/layouts/Sidebar.tsx frontend-next/src/pages/bases/components/BaseSidebarContent.tsx
git commit -m "feat(bases): wire contextual bases sidebar into app-level sidebarConfig

Added /bases route key to sidebarConfig with a component-based section
that renders base groups, ungrouped bases, and create actions.
Extended SidebarSection to support dynamic component sections.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 8: Full type-check and visual verification

Final verification that everything compiles and renders correctly.

**Step 1: Full type-check**

Run: `cd frontend-next && npx tsc --noEmit`
Expected: Zero errors

**Step 2: Start dev server**

Run: `cd frontend-next && npm run dev`
Expected: Vite starts on port 5174 with no build errors

**Step 3: Verify Docker backend is running**

Run: `docker start lyfehub-dev lyfehub-dev-db`
Expected: Both containers running

**Step 4: Visual verification in Chrome**

Use Chrome MCP tools to verify:

1. Navigate to `http://localhost:5174/bases`
2. Verify the sidebar shows bases-specific content (groups, bases list, create buttons) — NOT the dashboard sidebar
3. Click a base to open detail view
4. Verify the table renders with correct cells
5. Right-click a column header → verify "Sort Ascending" sorts ascending, "Sort Descending" sorts descending, "Hide Column" hides the column
6. Click "+ Property" → verify only 8 supported types are shown (text, number, select, multi_select, date, checkbox, url, relation)
7. If views exist, click a view tab → verify sorting is correctly applied
8. Click "Edit" on a base → verify delete section says "archive" not "permanently delete"

**Step 5: Final commit (if any visual fixes needed)**

Only commit if Step 4 revealed issues that need fixing. Otherwise, the previous commits cover everything.

---

## Execution Summary

| Task | What | Severity | Files Changed |
|------|------|----------|--------------|
| 1 | Fix reorder hooks `items` → `order` | CRITICAL | 1 |
| 2 | Remove 5 unsupported property types | CRITICAL | 3+ |
| 3 | Fix view config sort field `column` → `propertyId` | CRITICAL | 1 |
| 4 | Fix context menu sort + hide | BUG | 2 |
| 5 | Fix delete messaging → archive | VIOLATION | 1 |
| 6 | Remove dead code | CLEANUP | 7 deleted, 2 modified |
| 7 | Wire bases contextual sidebar | MISSING | 3 |
| 8 | Type-check + visual verification | VERIFY | 0 |

**Total: 8 tasks, ~12 files touched, 7 commits**

Tasks 1-3 are independent (no shared files). Tasks 4-6 are independent. Task 7 depends on Task 6 (sidebar dir deleted first). Task 8 depends on all previous tasks.

**Parallel execution:** Tasks 1, 2, 3 can run simultaneously. Tasks 4, 5, 6 can run simultaneously. Task 7 after 6. Task 8 last.
