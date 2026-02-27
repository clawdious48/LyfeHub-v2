# Sidebar + Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the sidebar and dashboard in the React frontend with persistent contextual navigation and a customizable widget grid.

**Architecture:** Route-aware sidebar with Zustand store for collapse/section state. Dashboard uses react-grid-layout for a customizable 12-column widget grid with edit mode. Widget registry pattern maps type strings to React components. All data fetched via TanStack Query hooks.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, react-grid-layout, @dnd-kit/sortable, TanStack Query, Zustand, lucide-react, shadcn/ui

**Worktree:** `C:\Users\jaker\Documents\Workspace\LyfeHub-v2\.claude\worktrees\tech-stack-upgrade`
**Frontend root:** `frontend-next/`

---

## Execution Strategy: Agent Teams

Use **3 parallel agents** after Task 1 (dependency install) completes. Task 1 must run first since all agents depend on the installed packages.

### Dependency Graph

```
Task 1: Install dependencies (team lead — must complete first)
    ├── Agent "sidebar" — Tasks 2, 3, 4 (sidebar store, config, component)
    ├── Agent "dashboard" — Tasks 5, 6, 7 (hooks, widget registry, DashboardPage)
    └── Agent "widgets" — Tasks 8, 9, 10, 11, 12 (5 individual widgets)
Task 13: Integration + renames (team lead — after all agents complete)
```

### Agent Assignments

**Agent "sidebar"** (Tasks 2-4): Sidebar Zustand store, route-aware config, Sidebar + AppLayout rewrite
- Creates: `stores/sidebarStore.ts`, `layouts/sidebarConfig.ts`, rewrites `layouts/Sidebar.tsx`, `layouts/AppLayout.tsx`
- Independent of dashboard/widgets — only touches sidebar + layout files

**Agent "dashboard"** (Tasks 5-7): API hooks, widget registry, DashboardPage with react-grid-layout
- Creates: `api/hooks/useDashboard.ts`, `widgets/registry.ts`, `widgets/WidgetWrapper.tsx`, `widgets/AddWidgetDialog.tsx`, rewrites `pages/DashboardPage.tsx`
- Independent of sidebar — only touches dashboard + widget infrastructure files

**Agent "widgets"** (Tasks 8-12): 5 individual widget components
- Creates: `widgets/MyDayWidget.tsx`, `widgets/WeekCalWidget.tsx`, `widgets/QuickNotesWidget.tsx`, `widgets/InboxWidget.tsx`, `widgets/AreasWidget.tsx`
- Independent of sidebar/dashboard structure — only creates widget component files
- Uses API hooks from `api/hooks/` (already exist or created by dashboard agent)

### Team Lead Responsibilities
1. Execute Task 1 (install deps) before spawning agents
2. Spawn 3 agents in parallel with `run_in_background: true`
3. After all complete: execute Task 13 (integration, renames, verification)
4. Verify `npm run build` passes clean

---

## Task 1: Install Dependencies

**Files:**
- Modify: `frontend-next/package.json`

**Step 1: Install react-grid-layout and dnd-kit**

```bash
cd frontend-next
npm install react-grid-layout @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install -D @types/react-grid-layout
```

**Step 2: Verify installation**

```bash
cd frontend-next && npm ls react-grid-layout @dnd-kit/core
```

Expected: Both packages listed without errors.

**Step 3: Commit**

```bash
git add frontend-next/package.json frontend-next/package-lock.json
git commit -m "feat: install react-grid-layout and dnd-kit dependencies"
```

---

## Task 2: Sidebar Zustand Store (Agent: sidebar)

**Files:**
- Create: `frontend-next/src/stores/sidebarStore.ts`

**What to build:**

A Zustand store managing:
- `collapsed: boolean` — sidebar collapsed state, persisted to localStorage key `lyfehub-sidebar-collapsed`
- `sectionStates: Record<string, boolean>` — which sections are collapsed, persisted to localStorage key `lyfehub-sidebar-sections`
- `toggleCollapsed()` — toggle sidebar collapsed
- `toggleSection(sectionKey: string)` — toggle a section's collapsed state
- `isSectionCollapsed(sectionKey: string): boolean` — check if section is collapsed

Initialize from localStorage on creation. Save to localStorage on every state change (use Zustand `subscribe` or middleware).

```typescript
// stores/sidebarStore.ts
import { create } from 'zustand'

const COLLAPSED_KEY = 'lyfehub-sidebar-collapsed'
const SECTIONS_KEY = 'lyfehub-sidebar-sections'

function loadCollapsed(): boolean {
  return localStorage.getItem(COLLAPSED_KEY) === '1'
}

function loadSections(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(SECTIONS_KEY) || '{}')
  } catch {
    return {}
  }
}

interface SidebarState {
  collapsed: boolean
  sectionStates: Record<string, boolean>
  toggleCollapsed: () => void
  toggleSection: (key: string) => void
  isSectionCollapsed: (key: string) => boolean
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  collapsed: loadCollapsed(),
  sectionStates: loadSections(),

  toggleCollapsed: () => {
    set(state => {
      const next = !state.collapsed
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
      return { collapsed: next }
    })
  },

  toggleSection: (key: string) => {
    set(state => {
      const next = { ...state.sectionStates, [key]: !state.sectionStates[key] }
      localStorage.setItem(SECTIONS_KEY, JSON.stringify(next))
      return { sectionStates: next }
    })
  },

  isSectionCollapsed: (key: string) => {
    return get().sectionStates[key] ?? false
  },
}))
```

**Commit:** `feat: add sidebar Zustand store with localStorage persistence`

---

## Task 3: Sidebar Route Config (Agent: sidebar)

**Files:**
- Create: `frontend-next/src/layouts/sidebarConfig.ts`

**What to build:**

Type definitions and route-keyed config for sidebar contextual sections. Each route maps to an array of sections. Each section has a header, icon, and array of nav items.

```typescript
// layouts/sidebarConfig.ts
import type { LucideIcon } from 'lucide-react'
import {
  Briefcase, Calendar, CheckSquare,
  FileText, Users, Database,
  Wrench, BookOpen,
} from 'lucide-react'

export interface SidebarItem {
  label: string
  icon: LucideIcon
  to: string
  badge?: number
}

export interface SidebarSection {
  key: string          // unique key for collapse state persistence
  header: string
  icon: LucideIcon
  items: SidebarItem[]
}

export const sidebarSections: Record<string, SidebarSection[]> = {
  '/': [
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
      key: 'tools',
      header: 'Tools',
      icon: Wrench,
      items: [],  // TBD
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
  // Other pages use dashboard sections as fallback for now
}

export function getSectionsForRoute(pathname: string): SidebarSection[] {
  return sidebarSections[pathname] || sidebarSections['/']
}
```

**Commit:** `feat: add route-aware sidebar config`

---

## Task 4: Rewrite Sidebar + AppLayout (Agent: sidebar)

**Files:**
- Rewrite: `frontend-next/src/layouts/Sidebar.tsx`
- Rewrite: `frontend-next/src/layouts/AppLayout.tsx`
- Modify: `frontend-next/src/layouts/Header.tsx` (remove elements that move to sidebar)

**What to build for Sidebar.tsx:**

Full sidebar component with:
1. **Top section**: Dashboard + Jobs buttons side by side (icon + label). Active state based on current route. Use `NavLink` for both.
2. **Capture section**: Collapsible. Three buttons: Note (purple bg icon), Task (blue bg icon), Contact (green bg icon). Each opens a capture modal (use `Dialog` from shadcn). Post to `/api/inbox/capture` with `{ type, title }`.
3. **Contextual sections**: Read from `getSectionsForRoute(pathname)`. Each section is collapsible via `useSidebarStore().toggleSection(key)`. Section items are `NavLink`s.
4. **Bottom bar**: Pinned to bottom with `mt-auto`. Settings gear icon (links to `/settings`) + user name from `useAuth()`. User name is just text for now (Profile page is future).
5. **Collapse toggle**: Small chevron button. Calls `useSidebarStore().toggleCollapsed()`.
6. **Collapsed state**: When collapsed, sidebar is 48px wide. Show only icons. Use CSS `transition: width 300ms ease`. Collapsed tooltips via `title` attribute.
7. **Capture modal**: Simple dialog with title input field, Save/Cancel buttons. On save, POST to `/api/inbox/capture` with `{ type: 'note'|'task'|'contact', title }`. On success, close and show toast.

Key Tailwind classes:
- Expanded: `w-56` (224px)
- Collapsed: `w-12` (48px)
- Transition: `transition-[width] duration-300 ease-in-out`
- Section headers: `text-xs font-semibold uppercase tracking-wider text-text-muted`
- Nav items: `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium`
- Active: `bg-accent-light text-accent`
- Hover: `hover:bg-bg-hover hover:text-text-primary`
- Capture icons: `w-6 h-6 rounded-md flex items-center justify-center` with bg colors (purple: `bg-purple-500/10 text-purple-500`, blue: `bg-blue-500/10 text-blue-500`, green: `bg-green-500/10 text-green-500`)

**What to build for AppLayout.tsx:**

```typescript
export default function AppLayout() {
  return (
    <div className="h-screen flex bg-bg-app">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

No changes needed to layout structure — the sidebar handles its own width transitions.

**What to update in Header.tsx:**

The header no longer needs the "LyfeHub" branding (that was in the sidebar before). Keep: theme toggle + user menu + logout. The left side can be empty or show a page title.

**Commit:** `feat: rewrite sidebar with persistent contextual navigation`

---

## Task 5: Dashboard API Hooks (Agent: dashboard)

**Files:**
- Create: `frontend-next/src/api/hooks/useDashboard.ts`
- Modify: `frontend-next/src/api/hooks/index.ts` (add exports)

**What to build:**

TanStack Query hooks for dashboard layout and inbox:

```typescript
// api/hooks/useDashboard.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client.js'

// Types
interface WidgetLayout {
  id: string
  type: string
  x: number
  y: number
  w: number
  h: number
}

interface DashboardLayout {
  widgets: WidgetLayout[]
}

interface DashboardLayoutResponse {
  layout: DashboardLayout
  isDefault: boolean
}

interface InboxItem {
  id: string
  type: 'task' | 'note' | 'person'
  title: string
  created_at: string
  age: string
}

interface InboxResponse {
  items: InboxItem[]
  count: number
  limit: number
}

interface InboxCountResponse {
  count: number
  tasks: number
  notes: number
  people: number
}

// Query keys
export const dashboardKeys = {
  all: ['dashboard'] as const,
  layout: () => [...dashboardKeys.all, 'layout'] as const,
  inbox: (limit?: number) => [...dashboardKeys.all, 'inbox', limit] as const,
  inboxCount: () => [...dashboardKeys.all, 'inbox-count'] as const,
}

// Hooks
export function useDashboardLayout() {
  return useQuery({
    queryKey: dashboardKeys.layout(),
    queryFn: () => apiClient.get<DashboardLayoutResponse>('/dashboard/layout'),
  })
}

export function useSaveDashboardLayout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (layout: DashboardLayout) =>
      apiClient.put<{ success: boolean }>('/dashboard/layout', { layout }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.layout() })
    },
  })
}

export function useInbox(limit = 10) {
  return useQuery({
    queryKey: dashboardKeys.inbox(limit),
    queryFn: () => apiClient.get<InboxResponse>(`/inbox?limit=${limit}`),
  })
}

export function useInboxCount() {
  return useQuery({
    queryKey: dashboardKeys.inboxCount(),
    queryFn: () => apiClient.get<InboxCountResponse>('/inbox/count'),
    refetchInterval: 30_000, // refresh every 30s
  })
}

export function useArchiveInboxItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, type }: { id: string; type: string }) =>
      apiClient.post<{ success: boolean }>(`/inbox/${id}/archive`, { type }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.inbox() })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.inboxCount() })
    },
  })
}
```

Add exports to `api/hooks/index.ts`.

**Commit:** `feat: add dashboard and inbox TanStack Query hooks`

---

## Task 6: Widget Registry + Wrapper (Agent: dashboard)

**Files:**
- Create: `frontend-next/src/widgets/registry.ts`
- Create: `frontend-next/src/widgets/WidgetWrapper.tsx`
- Create: `frontend-next/src/widgets/AddWidgetDialog.tsx`

**What to build:**

**registry.ts**: Maps widget type strings to component + metadata. Import actual widget components (they'll be created by the widgets agent — use lazy imports or check for undefined gracefully).

```typescript
import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Sun, Calendar, FileText, Inbox, Target } from 'lucide-react'

export interface WidgetDefinition {
  component: ComponentType<{ config?: Record<string, unknown> }>
  label: string
  icon: LucideIcon
  minW: number
  minH: number
  defaultW: number
  defaultH: number
}

// Lazy imports so the registry doesn't break if widgets aren't built yet
import MyDayWidget from './MyDayWidget.js'
import WeekCalWidget from './WeekCalWidget.js'
import QuickNotesWidget from './QuickNotesWidget.js'
import InboxWidget from './InboxWidget.js'
import AreasWidget from './AreasWidget.js'

export const widgetRegistry: Record<string, WidgetDefinition> = {
  'my-day':      { component: MyDayWidget, label: 'My Day', icon: Sun, minW: 4, minH: 3, defaultW: 6, defaultH: 4 },
  'week-cal':    { component: WeekCalWidget, label: 'This Week', icon: Calendar, minW: 4, minH: 2, defaultW: 6, defaultH: 3 },
  'quick-notes': { component: QuickNotesWidget, label: 'Quick Notes', icon: FileText, minW: 3, minH: 2, defaultW: 6, defaultH: 3 },
  'inbox':       { component: InboxWidget, label: 'Inbox', icon: Inbox, minW: 3, minH: 3, defaultW: 6, defaultH: 4 },
  'areas':       { component: AreasWidget, label: 'Areas', icon: Target, minW: 4, minH: 2, defaultW: 12, defaultH: 3 },
}
```

**WidgetWrapper.tsx**: Renders a widget inside a Card with header (title + "View All" link + remove button in edit mode).

```typescript
// Takes: type, isEditing, onRemove
// Looks up registry, renders component inside Card
// Shows drag handle + remove button when isEditing
```

**AddWidgetDialog.tsx**: Dialog listing available widgets from registry (excluding ones already on the dashboard). Click to add.

**Commit:** `feat: add widget registry, wrapper, and add-widget dialog`

---

## Task 7: DashboardPage with react-grid-layout (Agent: dashboard)

**Files:**
- Rewrite: `frontend-next/src/pages/DashboardPage.tsx`

**What to build:**

Full dashboard page using react-grid-layout:

1. **Load layout** via `useDashboardLayout()` hook
2. **Default layout** if none saved (the 5 default widgets from design doc)
3. **Render grid** using `<ResponsiveGridLayout>` with 12 columns
4. **Edit mode toggle**: Button top-right. When editing, widgets show drag handles and remove buttons. "+ Add Widget" button appears at bottom.
5. **Save on done**: When user clicks "Done", PUT the current layout via `useSaveDashboardLayout()`
6. **Widget rendering**: For each widget in layout, look up `widgetRegistry[type]`, render via `WidgetWrapper`

Key implementation details:
- Import `react-grid-layout/css/styles.css` and `react-grid-layout/css/resizable.css`
- Use `<ResponsiveGridLayout>` with breakpoints `{ lg: 1200, md: 996, sm: 768, xs: 480 }`
- cols: `{ lg: 12, md: 12, sm: 6, xs: 1 }`
- rowHeight: 80
- isDraggable / isResizable only when `isEditing`
- onLayoutChange callback updates local state
- Each grid item has `key={widget.id}`, `data-grid={{ x, y, w, h, minW, minH }}`

Default layout constant:
```typescript
const DEFAULT_WIDGETS = [
  { id: 'default-my-day',   type: 'my-day',      x: 0, y: 0, w: 6, h: 4 },
  { id: 'default-calendar', type: 'week-cal',     x: 6, y: 0, w: 6, h: 3 },
  { id: 'default-notes',    type: 'quick-notes',  x: 0, y: 4, w: 6, h: 3 },
  { id: 'default-inbox',    type: 'inbox',         x: 6, y: 3, w: 6, h: 4 },
  { id: 'default-areas',    type: 'areas',         x: 0, y: 7, w: 12, h: 3 },
]
```

**Commit:** `feat: rebuild DashboardPage with react-grid-layout widget grid`

---

## Task 8: My Day Widget (Agent: widgets)

**Files:**
- Create: `frontend-next/src/widgets/MyDayWidget.tsx`

**What to build:**

Shows today's tasks and events. Uses `useTasks()` from existing hooks (filter for today/my-day). Empty state: "No tasks or events today" + "+ Add Task" button (accent color, outlined).

Header: "MY DAY" with "View All ->" link pointing to `/tasks`.

If tasks exist, show a compact list: checkbox + title + optional due time. Max 5 items with "and N more" if truncated.

**Commit:** `feat: add My Day dashboard widget`

---

## Task 9: Week Calendar Widget (Agent: widgets)

**Files:**
- Create: `frontend-next/src/widgets/WeekCalWidget.tsx`

**What to build:**

Week strip calendar showing Mon-Sun with date navigation.

- Header: "THIS WEEK" with "View All ->" link to `/calendar`
- Date range navigation: `< Feb 23 - Mar 1 >` with prev/next buttons
- 7 day columns: day name (MON, TUE...) + date number
- Today highlighted with accent circle background
- Uses local state for current week offset (no API call needed for the strip itself)
- `useCalendarEvents()` from existing hooks to show dot indicators for days with events

**Commit:** `feat: add This Week calendar dashboard widget`

---

## Task 10: Quick Notes Widget (Agent: widgets)

**Files:**
- Create: `frontend-next/src/widgets/QuickNotesWidget.tsx`

**What to build:**

Shows recent notes. Uses `apiClient.get('/notes?limit=5')` (direct call or create a small hook).

Header: "QUICK NOTES" with "View All ->" link.

Empty state: "No notes yet" + subtitle "Start capturing your thoughts" + "+ New Note" button.

If notes exist, show a compact list: note title + age string. Click opens note (or navigates to notes section — for now just a placeholder).

**Commit:** `feat: add Quick Notes dashboard widget`

---

## Task 11: Inbox Widget (Agent: widgets)

**Files:**
- Create: `frontend-next/src/widgets/InboxWidget.tsx`

**What to build:**

Shows unified inbox items. Uses `useInbox()` and `useInboxCount()` hooks (from Task 5).

Header: "INBOX" with count badge + "Process All ->" link.

Empty state: "All clear — nothing to process" + subtitle "Items will appear here when captured".

If items exist, show list with type icon (task=checkbox blue, note=purple doc, person=green avatar) + title + age. Each item has an archive button (calls `useArchiveInboxItem()`).

**Commit:** `feat: add Inbox dashboard widget`

---

## Task 12: Areas Widget (Agent: widgets)

**Files:**
- Create: `frontend-next/src/widgets/AreasWidget.tsx`

**What to build:**

Shows areas from the Tags base (filtered by Type="Area"). This is a placeholder widget for now since the Tags base has 0 records.

Header: "AREAS" (no "View All" link for now).

The widget should:
1. Fetch all bases via `useBases()` to find the Tags base (name = "Tags")
2. If found, fetch records via `useBaseRecords(tagsBaseId)`
3. Filter records where the `Type` field value = "Area"
4. If records exist, show them in a compact card grid
5. Empty state: "No areas defined yet" + subtitle "Areas help you organize what matters most"

Since this will be empty for now, focus on a clean empty state that looks intentional, not broken (unlike the current app's gray box).

**Commit:** `feat: add Areas dashboard widget`

---

## Task 13: Integration, Renames, Verification (Team Lead)

**Files:**
- Modify: `frontend-next/src/router.tsx` (rename apex -> jobs route)
- Modify: `frontend-next/src/pages/ApexPage.tsx` -> rename to `JobsPage.tsx`

**Step 1: Rename Apex to Jobs in router**

In `router.tsx`:
- Change `import ApexPage` to `import JobsPage from '@/pages/JobsPage'`
- Change route path from `'apex'` to `'jobs'`
- Change element to `<JobsPage />`

**Step 2: Rename ApexPage.tsx -> JobsPage.tsx**

Rename the file and update the component:
```typescript
export default function JobsPage() {
  return (
    <div className="p-6">
      <h1 className="font-heading text-2xl text-text-primary mb-4">Jobs</h1>
      <p className="text-text-secondary text-sm">Job management will go here.</p>
    </div>
  )
}
```

**Step 3: Verify build**

```bash
cd frontend-next && npm run build
```

Expected: Build passes clean with no TypeScript errors.

**Step 4: Visual verification**

Start dev server and check in browser:
- Sidebar renders with Dashboard/Jobs top buttons
- Capture section shows Note/Task/Contact
- Contextual sections (Productivity/Tools/Resources) render with correct items
- Sidebar collapses/expands with smooth animation
- Dashboard shows 5 widgets in grid layout
- Edit mode works (drag, resize, remove, add)
- Dark mode works on both sidebar and dashboard

**Step 5: Commit all integration work**

```bash
git add -A
git commit -m "feat: integrate sidebar + dashboard, rename Apex to Jobs"
```

---

## Summary

| Task | Agent | Creates/Modifies | Depends On |
|------|-------|-----------------|------------|
| 1. Install deps | Team lead | package.json | — |
| 2. Sidebar store | sidebar | stores/sidebarStore.ts | Task 1 |
| 3. Sidebar config | sidebar | layouts/sidebarConfig.ts | Task 1 |
| 4. Sidebar + AppLayout | sidebar | layouts/Sidebar.tsx, AppLayout.tsx, Header.tsx | Tasks 2, 3 |
| 5. Dashboard hooks | dashboard | api/hooks/useDashboard.ts | Task 1 |
| 6. Widget registry | dashboard | widgets/registry.ts, WidgetWrapper.tsx, AddWidgetDialog.tsx | Task 1 |
| 7. DashboardPage | dashboard | pages/DashboardPage.tsx | Tasks 5, 6 |
| 8. My Day widget | widgets | widgets/MyDayWidget.tsx | Task 1 |
| 9. Week Cal widget | widgets | widgets/WeekCalWidget.tsx | Task 1 |
| 10. Quick Notes widget | widgets | widgets/QuickNotesWidget.tsx | Task 1 |
| 11. Inbox widget | widgets | widgets/InboxWidget.tsx | Task 5 |
| 12. Areas widget | widgets | widgets/AreasWidget.tsx | Task 1 |
| 13. Integration | Team lead | router.tsx, JobsPage.tsx | Tasks 2-12 |
