# Navigation Widget + Quick Capture Widget Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build two new dashboard widgets — a fully customizable Navigation widget with dockable collapse behavior, and a simple Quick Capture widget.

**Architecture:** Both widgets follow the existing widget registry pattern. Navigation widget stores its item tree in widget config via `onConfigChange`. A new shared `navRoutes.ts` provides the canonical route list. Dock/collapse behavior modifies DashboardPage to support dynamic widget dimension overrides.

**Tech Stack:** React 19, TypeScript, @dnd-kit/sortable (drag reorder), Lucide React (icons), shadcn/ui (Dialog, Popover, Button, Checkbox, Input), Zustand (not needed — all state in widget config).

**Design Doc:** `docs/plans/2026-03-02-navigation-widget-design.md`

---

## Task 1: Shared Route Constants

**Files:**
- Create: `frontend-next/src/layouts/navRoutes.ts`
- Modify: `frontend-next/src/layouts/sidebarConfig.ts` (import from navRoutes instead of hardcoding)

**What to do:**

Extract all navigable routes into a shared constant. This is consumed by the Navigation widget (item picker, overflow menu) and the sidebar.

```ts
// frontend-next/src/layouts/navRoutes.ts
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, Briefcase, Contact, Package, FolderOpen,
  GitBranch, DollarSign, BarChart3, Calendar, CheckSquare,
  Mail, FileText, Users, Database,
} from 'lucide-react'

export type RouteCategory = 'apex' | 'productivity' | 'resources'

export interface AppRoute {
  path: string
  label: string
  icon: LucideIcon
  category: RouteCategory
}

export const APP_ROUTES: AppRoute[] = [
  { path: '/',                label: 'Dashboard',  icon: LayoutDashboard, category: 'productivity' },
  { path: '/jobs',            label: 'Jobs',       icon: Briefcase,       category: 'apex' },
  { path: '/apex/crm',       label: 'CRM',        icon: Contact,         category: 'apex' },
  { path: '/apex/inventory',  label: 'Inventory',  icon: Package,         category: 'apex' },
  { path: '/apex/documents',  label: 'Documents',  icon: FolderOpen,      category: 'apex' },
  { path: '/apex/workflows',  label: 'Workflows',  icon: GitBranch,       category: 'apex' },
  { path: '/apex/accounting', label: 'Accounting', icon: DollarSign,      category: 'apex' },
  { path: '/apex/reports',    label: 'Reports',    icon: BarChart3,       category: 'apex' },
  { path: '/calendar',        label: 'Calendar',   icon: Calendar,        category: 'productivity' },
  { path: '/tasks',           label: 'Tasks',      icon: CheckSquare,     category: 'productivity' },
  { path: '/mail',            label: 'Mail',       icon: Mail,            category: 'productivity' },
  { path: '/notes',           label: 'Notes',      icon: FileText,        category: 'resources' },
  { path: '/people',          label: 'People',     icon: Users,           category: 'resources' },
  { path: '/bases',           label: 'Bases',      icon: Database,        category: 'resources' },
]

export const ROUTE_CATEGORIES: { key: RouteCategory; label: string }[] = [
  { key: 'apex', label: 'Apex Restoration' },
  { key: 'productivity', label: 'Productivity' },
  { key: 'resources', label: 'Resources' },
]

export function getRouteByPath(path: string): AppRoute | undefined {
  return APP_ROUTES.find((r) => r.path === path)
}
```

Then update `sidebarConfig.ts` to import icons and route paths from `navRoutes.ts` instead of duplicating them (keep the `SidebarSection`/`SidebarItem` types and the `getSectionsForRoute` logic — just reference the shared constants for consistency). This refactor is optional and can be deferred.

**Verify:** `npx tsc --noEmit` passes.

**Commit:** `feat(nav): add shared route constants (navRoutes.ts)`

---

## Task 2: Quick Capture Widget

**Files:**
- Create: `frontend-next/src/widgets/QuickCaptureWidget.tsx`
- Modify: `frontend-next/src/widgets/registry.ts` (add entry)
- Modify: `frontend-next/src/api/hooks/index.ts` (if needed)

**Dependencies:** None (can run in parallel with Task 1).

**What to do:**

Build a compact widget with capture buttons. Reuse the same capture logic from `layouts/Sidebar.tsx` (lines 29-71):

- Note and Contact: open an inline `<Dialog>` with a title Input, POST to `/api/inbox/capture` with `{ type, title }`
- Task: open `<TaskQuickCaptureModal>` (import from `@/pages/tasks/components/modals/TaskQuickCaptureModal.js`)

```tsx
// frontend-next/src/widgets/QuickCaptureWidget.tsx
```

**Component behavior:**
- Read `config.showNote`, `config.showTask`, `config.showPerson` booleans (default all true)
- Measure container dimensions with a `ResizeObserver` or `ref.offsetWidth`/`offsetHeight`
- If wider than tall: render buttons in a horizontal row
- If taller than wide: render buttons stacked vertically
- Each button: icon + label, subtle outlined style with the capture type's color
- Note button color: `purple-500`, Task: `blue-500`, Person/Contact: `green-500`
- Clicking a button opens the corresponding capture modal

**Registry entry in `registry.ts`:**
```ts
import { PlusCircle } from 'lucide-react'
import QuickCaptureWidget from './QuickCaptureWidget.js'

'quick-capture': {
  component: QuickCaptureWidget,
  label: 'Quick Capture',
  description: 'Fast-access buttons for creating notes, tasks, and contacts',
  icon: PlusCircle,
  category: 'productivity',
  singleton: false,
  configurable: true,
  configSchema: [
    { key: 'showNote', label: 'Note', type: 'toggle', default: true },
    { key: 'showTask', label: 'Task', type: 'toggle', default: true },
    { key: 'showPerson', label: 'Person', type: 'toggle', default: true },
  ],
  minW: 3, minH: 2, defaultW: 6, defaultH: 3,
},
```

**Verify:** `npx tsc --noEmit`, then visually: add the widget to the dashboard in the browser and click each capture button.

**Commit:** `feat(dashboard): add Quick Capture widget`

---

## Task 3: Navigation Widget — Types & Core Rendering

**Files:**
- Create: `frontend-next/src/widgets/nav/navTypes.ts`
- Create: `frontend-next/src/widgets/NavigationWidget.tsx`
- Modify: `frontend-next/src/widgets/registry.ts` (add entry)

**Dependencies:** Task 1 (navRoutes.ts).

**What to do:**

### 3a. Define nav item types

```ts
// frontend-next/src/widgets/nav/navTypes.ts

export interface NavRouteItem {
  id: string
  type: 'route'
  route: string  // path from APP_ROUTES, e.g. '/jobs'
}

export interface NavHeaderItem {
  id: string
  type: 'header'
  label: string
}

export interface NavToggleHeaderItem {
  id: string
  type: 'toggle-header'
  label: string
  children: NavItem[]
  collapsed: boolean
}

export interface NavCaptureItem {
  id: string
  type: 'quick-capture'
  captureType: 'note' | 'task' | 'contact'
}

export type NavItem = NavRouteItem | NavHeaderItem | NavToggleHeaderItem | NavCaptureItem

export type OverflowTriggerStyle = 'ellipsis' | 'hamburger' | 'arrow' | 'invisible'
export type TriggerPosition = 'start' | 'end'

export interface NavWidgetConfig {
  items: NavItem[]
  overflowTrigger: OverflowTriggerStyle
  overflowPosition: TriggerPosition
  dockCollapseTrigger: OverflowTriggerStyle
  collapsed: boolean
  savedW?: number
  savedH?: number
}

export const DEFAULT_NAV_CONFIG: NavWidgetConfig = {
  items: [],
  overflowTrigger: 'ellipsis',
  overflowPosition: 'end',
  dockCollapseTrigger: 'arrow',
  collapsed: false,
}
```

### 3b. Core NavigationWidget component

The widget component:
- Reads `config` as `NavWidgetConfig`
- Measures its own container to determine orientation (via `useRef` + `ResizeObserver`)
- Renders items based on orientation (vertical list or horizontal row)
- Uses `useLocation()` from react-router to highlight the active route
- Uses `useNavigate()` to handle route clicks
- Toggle headers: click to expand/collapse, persist collapse state in config via `onConfigChange`
- Quick Capture items: open the same modals as in Sidebar.tsx (inline Dialog for note/contact, TaskQuickCaptureModal for task)

**Vertical rendering (tall widget):**
- Each route item: `<button>` with icon (size-4) + label (text-sm) + active accent left border
- Headers: uppercase muted text with horizontal line
- Toggle headers: clickable row with chevron icon, children indented 16px
- Quick Capture items: icon + label with "+" badge, colored by type

**Horizontal rendering (wide widget):**
- Items in a flex row with gap-1
- Each route: icon + label, active gets bottom border accent
- Headers: vertical divider line (`<div className="w-px h-5 bg-border" />`)
- Toggle headers: dropdown trigger — click opens a Popover with children listed vertically
- Items wrap if they overflow

**Registry entry:**
```ts
import { Navigation2 } from 'lucide-react'
import NavigationWidget from './NavigationWidget.js'

'navigation': {
  component: NavigationWidget,
  label: 'Navigation',
  description: 'Customizable app navigation with dockable collapse',
  icon: Navigation2,
  category: 'utility',
  singleton: false,
  configurable: true,
  configSchema: [{ key: 'items', label: 'Nav Items', type: 'nav-editor' as any }],
  minW: 2, minH: 2, defaultW: 4, defaultH: 12,
},
```

**Verify:** `npx tsc --noEmit`. Add the widget to dashboard. It will render empty (no items configured yet) with a "Configure navigation items" empty state and a link to open edit mode.

**Commit:** `feat(dashboard): add Navigation widget core rendering`

---

## Task 4: Navigation Widget — Config Editor

**Files:**
- Create: `frontend-next/src/widgets/nav/NavConfigEditor.tsx`
- Create: `frontend-next/src/widgets/nav/NavItemPicker.tsx`
- Create: `frontend-next/src/widgets/nav/NavBuilderList.tsx`
- Modify: `frontend-next/src/widgets/WidgetConfigDialog.tsx` (add `'nav-editor'` field type)

**Dependencies:** Task 3.

**What to do:**

### 4a. Add `'nav-editor'` type to ConfigField

In `registry.ts`, add `'nav-editor'` to the ConfigField type union. In `WidgetConfigDialog.tsx`'s `ConfigFieldRenderer`, add a case that renders `<NavConfigEditor>` for this type.

### 4b. NavItemPicker (left panel)

A panel that shows available items to add:

- **Routes section:** All 14 routes from `APP_ROUTES` with checkboxes. Checked = already in nav. Clicking an unchecked route adds it to the builder list.
- **Quick Capture section:** Note, Task, Contact with checkboxes. Same behavior.
- **Structure section:** Two buttons: "+ Add Header" (prompts for label text via inline input), "+ Add Toggle Header" (same).

Each "add" action calls a callback that appends the new item to the nav config items array.

### 4c. NavBuilderList (right panel)

A drag-sortable list using `@dnd-kit/sortable`:

- `DndContext` + `SortableContext` with `verticalListSortingStrategy`
- Each item row: drag handle (GripVertical), icon, label, X remove button
- Toggle header items: rendered as a group container with a slightly different background. Children are indented and also sortable within the group.
- Drag an item onto a toggle header to nest it. Drag it out to un-nest.
- `onDragEnd` handler updates the items array in config.

For nesting (drag into toggle headers), use `@dnd-kit/core`'s `DragOverlay` and detect when an item is dragged over a toggle header. If dropped on a toggle header, insert into its `children` array. If dropped outside any toggle header, insert at root level.

### 4d. NavConfigEditor (container)

Wraps both panels in a two-column layout:
```
┌─────────────────────────────┐
│ Item Picker  │ Nav Builder  │
│ (left)       │ (right)      │
│              │              │
├──────────────┴──────────────┤
│ Overflow: [Style] [Position]│
│ Dock:     [Style]           │
└─────────────────────────────┘
```

The overflow and dock trigger config are simple selects below the two panels.

Props: `config: NavWidgetConfig`, `onChange: (config: NavWidgetConfig) => void`

**Verify:** `npx tsc --noEmit`. Enter edit mode, click gear icon on Navigation widget. The config editor should open with the two-panel layout. Add routes, drag to reorder, add a toggle header, nest items under it.

**Commit:** `feat(dashboard): add Navigation widget config editor with drag-to-reorder`

---

## Task 5: Navigation Widget — Overflow Menu

**Files:**
- Create: `frontend-next/src/widgets/nav/NavOverflowMenu.tsx`
- Modify: `frontend-next/src/widgets/NavigationWidget.tsx` (render overflow menu)

**Dependencies:** Task 3.

**What to do:**

Build a component that renders the overflow trigger and popover.

**Props:**
```ts
interface NavOverflowMenuProps {
  configuredRoutes: string[]  // paths already in the nav
  triggerStyle: OverflowTriggerStyle
  position: TriggerPosition
  orientation: 'vertical' | 'horizontal'
}
```

**Logic:**
- Compute `missingRoutes = APP_ROUTES.filter(r => !configuredRoutes.includes(r.path))`
- If `missingRoutes.length === 0`, render nothing
- Otherwise, render the trigger based on `triggerStyle`:
  - `'ellipsis'`: `<MoreHorizontal>` or `<MoreVertical>` icon (auto based on orientation)
  - `'hamburger'`: `<Menu>` icon
  - `'arrow'`: `<ChevronRight>`, `<ChevronLeft>`, `<ChevronUp>`, `<ChevronDown>` (auto based on orientation + position)
  - `'invisible'`: no icon, but a hover zone div that triggers `onMouseEnter`
- Trigger opens a `<Popover>` (shadcn) containing the missing routes grouped by `ROUTE_CATEGORIES`
- Each route item: icon + label, click navigates and closes popover

**Rendering in NavigationWidget:**
- If `position === 'start'`: render overflow menu before the items
- If `position === 'end'`: render overflow menu after the items
- For `'invisible'` style: the trigger is a 20px-wide (vertical) or 20px-tall (horizontal) hover zone at the edge

**Verify:** Configure the Navigation widget with only 3-4 routes. The overflow menu should show the remaining routes. Click one to navigate.

**Commit:** `feat(dashboard): add Navigation widget overflow menu`

---

## Task 6: Navigation Widget — Dock & Collapse

**Files:**
- Modify: `frontend-next/src/pages/DashboardPage.tsx` (handle collapsed widget dimensions)
- Modify: `frontend-next/src/widgets/NavigationWidget.tsx` (collapse trigger + collapsed rendering)
- Create: `frontend-next/src/widgets/nav/NavDockDetector.ts` (edge detection utility)

**Dependencies:** Task 3.

**What to do:**

### 6a. Edge detection utility

```ts
// frontend-next/src/widgets/nav/NavDockDetector.ts
export type DockEdge = 'left' | 'right' | 'top' | 'bottom' | null

export function detectDockEdge(
  x: number, y: number, w: number, h: number,
  maxCols: number, allWidgets: { y: number; h: number }[]
): DockEdge {
  if (x === 0) return 'left'
  if (x + w >= maxCols) return 'right'
  if (y === 0) return 'top'
  // "lowest" = no other widget has a higher y+h
  const maxBottom = Math.max(...allWidgets.map(w => w.y + w.h))
  if (y + h >= maxBottom) return 'bottom'
  return null
}
```

### 6b. DashboardPage changes

Pass each widget's grid position to `WidgetWrapper` so it can be forwarded to NavigationWidget. The Navigation widget needs `x, y, w, h` and the full widgets array to detect its edge.

When a Navigation widget has `collapsed: true` in its config, DashboardPage overrides its layout dimensions:
- Docked left/right: `w = 1`
- Docked top/bottom: `h = 1`

When expanded, restore from `savedW`/`savedH` in the config.

Add to `handleConfigChange`: if the new config contains `collapsed: true` and `savedW`/`savedH`, also update the widget's `w`/`h` in the widgets state. If `collapsed: false`, restore them.

### 6c. Collapsed rendering in NavigationWidget

When `config.collapsed === true`:
- Render only a thin strip with the expand trigger
- Trigger style from `config.dockCollapseTrigger`
- Clicking the trigger sets `collapsed: false` via `onConfigChange`

When not collapsed but docked (edge detected):
- Show the collapse trigger at the appropriate position:
  - Docked left: collapse trigger at right edge of widget
  - Docked right: collapse trigger at left edge
  - Docked top: collapse trigger at bottom
  - Docked bottom: collapse trigger at top
- Clicking sets `collapsed: true`, saves current `w`/`h` to `savedW`/`savedH`

The grid's existing CSS transitions (`transition-property: left, top, width, height` from react-grid-layout styles) handle the reflow animation.

**Verify:** Place the Navigation widget at the left edge of the grid (x=0). A collapse trigger should appear. Click it — the widget shrinks to 1 column, other widgets fill the space. Click the expand trigger — it slides back.

**Commit:** `feat(dashboard): add Navigation widget dock and collapse behavior`

---

## Task 7: Final Integration & Polish

**Files:**
- Modify: `frontend-next/src/widgets/registry.ts` (verify both entries)
- Modify: `frontend-next/src/api/hooks/index.ts` (if any new hooks needed)
- Modify: `docs/ROADMAP.md` (update with completion)

**Dependencies:** All previous tasks.

**What to do:**

1. Verify both widgets appear in the Add Widget dialog under their categories
2. Verify Navigation widget empty state shows a helpful message
3. Verify Quick Capture widget works (each button opens correct modal)
4. Verify Navigation widget with configured items navigates correctly
5. Verify active route highlighting
6. Verify overflow menu shows only unconfigured routes
7. Verify dock/collapse animation
8. Verify layout persistence — add widgets, configure them, click Done, refresh page
9. Run `npx tsc --noEmit` — clean
10. Update `docs/ROADMAP.md` with the dashboard widget additions

**Commit:** `feat(dashboard): Navigation and Quick Capture widget integration complete`

---

## Execution Order

```
Wave 1 (parallel):
  Task 1: navRoutes.ts
  Task 2: Quick Capture Widget

Wave 2 (depends on Task 1):
  Task 3: Navigation Widget core rendering

Wave 3 (parallel, all depend on Task 3):
  Task 4: Config editor
  Task 5: Overflow menu
  Task 6: Dock & collapse

Wave 4:
  Task 7: Integration & polish
```

Estimated: 4 waves, 7 tasks, ~30 minutes per task.
