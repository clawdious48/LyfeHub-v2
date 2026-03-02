# Navigation Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace sidebar-driven navigation with a persistent header containing area buttons, module tabs with springboard dashboard switching, and contextual-only sidebar.

**Architecture:** Route-based area detection. Header reads `useLocation()` to determine active area (Personal vs Apex) and renders the corresponding module tabs. Two default dashboards share the same react-grid-layout widget engine. Sidebar renders only when a page provides contextual content. All preferences (tab order, tab styles, display mode, home dashboard) persist to `users.settings` via the existing `saveSettingsKey` system.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, @dnd-kit/sortable (tab reorder), Zustand (header store), TanStack Query (dashboard layouts), Framer Motion (swipe/crossfade animations)

**Design Doc:** `docs/plans/2026-03-02-navigation-redesign-design.md`

---

## Task 1: Create headerConfig.ts — Area & Tab Definitions

**Files:**
- Create: `frontend-next/src/layouts/headerConfig.ts`

**Step 1: Create the header config file**

```typescript
import type { LucideIcon } from 'lucide-react'
import {
  Calendar, CheckSquare, Mail, FileText, Users, Database,
  Briefcase, Contact, Package, FolderOpen, GitBranch, DollarSign, BarChart3,
} from 'lucide-react'

export type AreaId = 'personal' | 'apex'

export interface HeaderTab {
  id: string
  label: string
  icon: LucideIcon
  to: string
}

export interface AreaConfig {
  id: AreaId
  label: string
  dashboardRoute: string
  tabs: HeaderTab[]
}

export const personalArea: AreaConfig = {
  id: 'personal',
  label: 'Dashboard',
  dashboardRoute: '/',
  tabs: [
    { id: 'calendar', label: 'Calendar', icon: Calendar, to: '/calendar' },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, to: '/tasks' },
    { id: 'mail', label: 'Mail', icon: Mail, to: '/mail' },
    { id: 'notes', label: 'Notes', icon: FileText, to: '/notes' },
    { id: 'people', label: 'People', icon: Users, to: '/people' },
    { id: 'bases', label: 'Bases', icon: Database, to: '/bases' },
  ],
}

export const apexArea: AreaConfig = {
  id: 'apex',
  label: 'Apex Restoration',
  dashboardRoute: '/apex',
  tabs: [
    { id: 'jobs', label: 'Jobs', icon: Briefcase, to: '/jobs' },
    { id: 'crm', label: 'CRM', icon: Contact, to: '/apex/crm' },
    { id: 'inventory', label: 'Inventory', icon: Package, to: '/apex/inventory' },
    { id: 'documents', label: 'Documents', icon: FolderOpen, to: '/apex/documents' },
    { id: 'workflows', label: 'Workflows', icon: GitBranch, to: '/apex/workflows' },
    { id: 'accounting', label: 'Accounting', icon: DollarSign, to: '/apex/accounting' },
    { id: 'reports', label: 'Reports', icon: BarChart3, to: '/apex/reports' },
  ],
}

export const areas: AreaConfig[] = [personalArea, apexArea]

/** Personal-area routes (exact matches and prefixes) */
const personalRoutes = new Set(['/', '/calendar', '/tasks', '/mail', '/notes', '/people', '/bases'])

/** Determine active area from the current pathname */
export function getAreaForRoute(pathname: string): AreaId {
  if (personalRoutes.has(pathname)) return 'personal'
  // Check prefix match for personal routes (e.g. /tasks?view=my-day)
  const prefix = '/' + pathname.split('/')[1]
  if (personalRoutes.has(prefix)) return 'personal'
  return 'apex'
}

/** Get the AreaConfig for a given area ID */
export function getAreaConfig(areaId: AreaId): AreaConfig {
  return areaId === 'personal' ? personalArea : apexArea
}

/** Which routes should show a contextual sidebar? */
const sidebarRoutes = new Set(['/calendar', '/tasks', '/mail', '/bases'])

export function routeHasSidebar(pathname: string): boolean {
  if (sidebarRoutes.has(pathname)) return true
  const prefix = '/' + pathname.split('/')[1]
  return sidebarRoutes.has(prefix)
}
```

**Step 2: Commit**

```bash
git add frontend-next/src/layouts/headerConfig.ts
git commit -m "feat: add headerConfig with area definitions and route detection"
```

---

## Task 2: Create useHeaderStore — Tab Preferences Zustand Store

**Files:**
- Create: `frontend-next/src/stores/headerStore.ts`
- Modify: `frontend-next/src/hooks/useUserSettings.ts` — add `header` to `UserSettings` interface

**Step 1: Add header settings to UserSettings interface**

In `frontend-next/src/hooks/useUserSettings.ts`, add to the `UserSettings` interface:

```typescript
header?: {
  tabDisplayMode?: 'icon-label' | 'icon-only' | 'label-only'
  personalTabOrder?: string[]
  apexTabOrder?: string[]
  tabStyles?: Record<string, TabStyleConfig>
  homeDashboard?: 'personal' | 'apex'
}
```

Also add the `TabStyleConfig` type above the interface:

```typescript
export interface TabStyleConfig {
  bgColor?: string
  borderColor?: string
  borderWidth?: number
  opacity?: number
  selectedBgColor?: string
  hoverBgColor?: string
}
```

**Step 2: Create the header store**

```typescript
// frontend-next/src/stores/headerStore.ts
import { create } from 'zustand'
import { getUserSettings, saveSettingsKey } from '@/hooks/useUserSettings.js'
import type { TabStyleConfig } from '@/hooks/useUserSettings.js'
import type { AreaId } from '@/layouts/headerConfig.js'
import { personalArea, apexArea } from '@/layouts/headerConfig.js'

type TabDisplayMode = 'icon-label' | 'icon-only' | 'label-only'

interface HeaderState {
  tabDisplayMode: TabDisplayMode
  personalTabOrder: string[]
  apexTabOrder: string[]
  tabStyles: Record<string, TabStyleConfig>
  homeDashboard: AreaId
  _hydrated: boolean

  hydrate: () => void
  setTabDisplayMode: (mode: TabDisplayMode) => void
  setTabOrder: (area: AreaId, order: string[]) => void
  setTabStyle: (tabId: string, style: TabStyleConfig) => void
  setHomeDashboard: (area: AreaId) => void
}

const DEFAULT_PERSONAL_ORDER = personalArea.tabs.map(t => t.id)
const DEFAULT_APEX_ORDER = apexArea.tabs.map(t => t.id)

export const useHeaderStore = create<HeaderState>((set, get) => ({
  tabDisplayMode: 'icon-label',
  personalTabOrder: DEFAULT_PERSONAL_ORDER,
  apexTabOrder: DEFAULT_APEX_ORDER,
  tabStyles: {},
  homeDashboard: 'personal',
  _hydrated: false,

  hydrate: () => {
    if (get()._hydrated) return
    const settings = getUserSettings()
    set({
      tabDisplayMode: settings.header?.tabDisplayMode ?? 'icon-label',
      personalTabOrder: settings.header?.personalTabOrder ?? DEFAULT_PERSONAL_ORDER,
      apexTabOrder: settings.header?.apexTabOrder ?? DEFAULT_APEX_ORDER,
      tabStyles: settings.header?.tabStyles ?? {},
      homeDashboard: settings.header?.homeDashboard ?? 'personal',
      _hydrated: true,
    })
  },

  setTabDisplayMode: (mode) => {
    set({ tabDisplayMode: mode })
    const s = get()
    saveSettingsKey('header', {
      tabDisplayMode: mode,
      personalTabOrder: s.personalTabOrder,
      apexTabOrder: s.apexTabOrder,
      tabStyles: s.tabStyles,
      homeDashboard: s.homeDashboard,
    })
  },

  setTabOrder: (area, order) => {
    const key = area === 'personal' ? 'personalTabOrder' : 'apexTabOrder'
    set({ [key]: order })
    const s = get()
    saveSettingsKey('header', {
      tabDisplayMode: s.tabDisplayMode,
      personalTabOrder: s.personalTabOrder,
      apexTabOrder: s.apexTabOrder,
      tabStyles: s.tabStyles,
      homeDashboard: s.homeDashboard,
    })
  },

  setTabStyle: (tabId, style) => {
    set((state) => ({
      tabStyles: { ...state.tabStyles, [tabId]: style },
    }))
    const s = get()
    saveSettingsKey('header', {
      tabDisplayMode: s.tabDisplayMode,
      personalTabOrder: s.personalTabOrder,
      apexTabOrder: s.apexTabOrder,
      tabStyles: s.tabStyles,
      homeDashboard: s.homeDashboard,
    })
  },

  setHomeDashboard: (area) => {
    set({ homeDashboard: area })
    const s = get()
    saveSettingsKey('header', {
      tabDisplayMode: s.tabDisplayMode,
      personalTabOrder: s.personalTabOrder,
      apexTabOrder: s.apexTabOrder,
      tabStyles: s.tabStyles,
      homeDashboard: s.homeDashboard,
    })
  },
}))
```

**Step 3: Commit**

```bash
git add frontend-next/src/stores/headerStore.ts frontend-next/src/hooks/useUserSettings.ts
git commit -m "feat: add useHeaderStore for tab preferences and display mode"
```

---

## Task 3: Rewrite Header.tsx — Area Buttons, Module Tabs, Actions

**Files:**
- Modify: `frontend-next/src/layouts/Header.tsx` (full rewrite)

This is the core of the navigation redesign. The new header has three zones:

**Step 1: Rewrite Header.tsx**

```typescript
// frontend-next/src/layouts/Header.tsx
import { useLocation, useNavigate, NavLink } from 'react-router-dom'
import { Moon, Sun, LogOut, FileText, CheckSquare, UserPlus, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button.js'
import { useTheme } from '@/contexts/ThemeContext.js'
import { useAuth } from '@/hooks/useAuth.js'
import { useHeaderStore } from '@/stores/headerStore.js'
import { getAreaForRoute, getAreaConfig, areas } from '@/layouts/headerConfig.js'
import type { AreaId, HeaderTab } from '@/layouts/headerConfig.js'

export default function Header() {
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const {
    tabDisplayMode,
    personalTabOrder,
    apexTabOrder,
    tabStyles,
  } = useHeaderStore()

  const activeArea = getAreaForRoute(pathname)
  const areaConfig = getAreaConfig(activeArea)
  const tabOrder = activeArea === 'personal' ? personalTabOrder : apexTabOrder
  const isDashboard = pathname === '/' || pathname === '/apex'

  // Sort tabs by user-configured order
  const orderedTabs = [...areaConfig.tabs].sort((a, b) => {
    const ai = tabOrder.indexOf(a.id)
    const bi = tabOrder.indexOf(b.id)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })

  return (
    <header className="h-14 shrink-0 bg-bg-surface border-b border-border flex items-center px-4 gap-4">
      {/* Left zone: Area buttons */}
      <div className="flex items-center gap-1">
        {areas.map((area) => (
          <button
            key={area.id}
            onClick={() => navigate(area.dashboardRoute)}
            className={[
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              activeArea === area.id
                ? 'bg-accent-light text-accent'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
            ].join(' ')}
          >
            {area.label}
          </button>
        ))}
      </div>

      {/* Center zone: Module tabs */}
      <nav className="flex-1 flex items-center justify-center gap-1">
        {orderedTabs.map((tab) => {
          const style = tabStyles[tab.id]
          return (
            <NavLink
              key={tab.id}
              to={tab.to}
              className={({ isActive }) => {
                const base = 'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors'
                // Apply custom styles if present, otherwise use defaults
                if (isActive) {
                  return `${base} bg-accent-light text-accent`
                }
                return `${base} text-text-secondary hover:text-text-primary hover:bg-bg-hover`
              }}
            >
              {tabDisplayMode !== 'label-only' && <tab.icon className="size-4" />}
              {tabDisplayMode !== 'icon-only' && <span>{tab.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* Dot indicators (visible on dashboard pages) */}
      {/* Implemented in Task 6 with springboard */}

      {/* Right zone: Capture + Settings + Theme + User */}
      <div className="flex items-center gap-1">
        {/* Quick Capture buttons */}
        <Button variant="ghost" size="icon-sm" title="New Note"
          className="text-purple-500/70 hover:text-purple-500 hover:bg-purple-500/10">
          <FileText className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" title="New Task"
          className="text-blue-500/70 hover:text-blue-500 hover:bg-blue-500/10">
          <CheckSquare className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" title="New Contact"
          className="text-green-500/70 hover:text-green-500 hover:bg-green-500/10">
          <UserPlus className="size-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Settings */}
        <NavLink to="/settings">
          <Button variant="ghost" size="icon-sm"
            className="text-text-secondary hover:text-text-primary">
            <Settings className="size-4" />
          </Button>
        </NavLink>

        {/* Theme toggle */}
        <Button variant="ghost" size="icon-sm" onClick={toggleTheme}
          className="text-text-secondary hover:text-text-primary">
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        {/* User */}
        {user && (
          <div className="flex items-center gap-2 ml-1">
            <span className="text-sm text-text-secondary hidden lg:inline">{user.name || user.email}</span>
            <Button variant="ghost" size="icon-sm" onClick={logout}
              className="text-text-secondary hover:text-danger">
              <LogOut className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
```

**Step 2: Wire up Quick Capture click handlers**

The Quick Capture buttons need to open the same modals currently used in the sidebar. Move the capture state up to a shared location — either AppLayout state or a small Zustand store. Since the Sidebar already has `TaskQuickCaptureModal` and a generic capture modal, extract the capture logic into the AppLayout and pass it down (or use a Zustand store like `useCaptureStore`).

Simplest approach: create `stores/captureStore.ts`:

```typescript
import { create } from 'zustand'

type CaptureType = 'note' | 'task' | 'contact'

interface CaptureState {
  open: boolean
  type: CaptureType
  openCapture: (type: CaptureType) => void
  close: () => void
}

export const useCaptureStore = create<CaptureState>((set) => ({
  open: false,
  type: 'note',
  openCapture: (type) => set({ open: true, type }),
  close: () => set({ open: false }),
}))
```

Then the Header buttons call `useCaptureStore.getState().openCapture('note')` etc. The capture modals render in `AppLayout.tsx` reading from this store.

**Step 3: Commit**

```bash
git add frontend-next/src/layouts/Header.tsx frontend-next/src/stores/captureStore.ts
git commit -m "feat: rewrite Header with area buttons, module tabs, and quick capture"
```

---

## Task 4: Update AppLayout.tsx — Conditional Sidebar + Capture Modals

**Files:**
- Modify: `frontend-next/src/layouts/AppLayout.tsx`

**Step 1: Update AppLayout**

The layout now conditionally renders the sidebar based on `routeHasSidebar()`, and hosts the capture modals.

```typescript
import { Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import Sidebar from '@/layouts/Sidebar.js'
import Header from '@/layouts/Header.js'
import { routeHasSidebar } from '@/layouts/headerConfig.js'
import { useCaptureStore } from '@/stores/captureStore.js'
import { TaskQuickCaptureModal } from '@/pages/tasks/components/modals/TaskQuickCaptureModal.js'
import { apiClient } from '@/api/client.js'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog.js'
import { Button } from '@/components/ui/button.js'
import { Input } from '@/components/ui/input.js'

export default function AppLayout() {
  const { pathname } = useLocation()
  const showSidebar = routeHasSidebar(pathname)
  const { open, type, close } = useCaptureStore()

  const [captureTitle, setCaptureTitle] = useState('')
  const [saving, setSaving] = useState(false)

  const isTaskCapture = open && type === 'task'
  const isGenericCapture = open && type !== 'task'

  async function handleSave() {
    if (!captureTitle.trim()) return
    setSaving(true)
    try {
      await apiClient.post('/inbox/capture', { type, title: captureTitle.trim() })
      close()
      setCaptureTitle('')
    } catch (err) {
      console.error('Capture failed:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-bg-app">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        {showSidebar && <Sidebar />}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Generic capture modal (notes, contacts) */}
      <Dialog open={isGenericCapture} onOpenChange={(o) => { if (!o) close() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New {type.charAt(0).toUpperCase() + type.slice(1)}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder={`Enter ${type} title...`}
              value={captureTitle}
              onChange={(e) => setCaptureTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !saving) handleSave() }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSave} disabled={!captureTitle.trim() || saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task quick capture modal */}
      <TaskQuickCaptureModal open={isTaskCapture} onOpenChange={(o) => { if (!o) close() }} />
    </div>
  )
}
```

Note the layout changed from `flex` (horizontal: sidebar | content) to `flex-col` (vertical: header above, then horizontal sidebar | content).

**Step 2: Commit**

```bash
git add frontend-next/src/layouts/AppLayout.tsx
git commit -m "feat: update AppLayout with conditional sidebar and capture modals"
```

---

## Task 5: Simplify Sidebar.tsx — Contextual Content Only

**Files:**
- Modify: `frontend-next/src/layouts/Sidebar.tsx`

**Step 1: Strip Sidebar down to contextual content only**

Remove: Dashboard nav link, Apex section, Quick Capture section, Settings link, user name display.
Keep: Contextual sections (the `component` ones like CalendarSidebarContent, TasksSidebarContent), collapse toggle.

The sidebar should now only render sections that have a `component` field (page-specific content), plus basic nav items within the current area if any section provides them. The primary job is showing page-specific tools (mini-calendar, smart views, base browser, etc.).

```typescript
import { useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useSidebarStore } from '@/stores/sidebarStore.js'
import { getSectionsForRoute } from '@/layouts/sidebarConfig.js'

export default function Sidebar() {
  const { pathname } = useLocation()
  const { collapsed, toggleCollapsed, toggleSection, isSectionCollapsed } = useSidebarStore()
  const sections = getSectionsForRoute(pathname)

  return (
    <aside
      className={[
        'shrink-0 bg-bg-surface border-r border-border h-full flex flex-col',
        'transition-[width] duration-300 ease-in-out overflow-hidden',
        collapsed ? 'w-12' : 'w-56',
      ].join(' ')}
    >
      {/* Contextual sections */}
      <nav className="flex-1 py-2 px-2 space-y-3 overflow-y-auto">
        {sections.map((section) => {
          const SectionComponent = section.component
          if (!SectionComponent && section.items.length === 0) return null
          const sectionCollapsed = isSectionCollapsed(section.key)
          return (
            <div key={section.key}>
              {!collapsed && (
                <button
                  onClick={() => toggleSection(section.key)}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-text-muted w-full"
                >
                  <span>{section.header}</span>
                </button>
              )}
              {(!sectionCollapsed || collapsed) && (
                <div className="mt-0.5">
                  {SectionComponent && !collapsed && <SectionComponent />}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="mt-auto border-t border-border px-2 py-2">
        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex items-center justify-center w-full py-2 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
      </div>
    </aside>
  )
}
```

**Step 2: Update sidebarConfig.ts**

Remove the `apexSection` constant and the logic that prepends it to every route. Remove all the nav-link-only sections (Productivity, Resources, Tools) — those are now header tabs. Keep only sections with `component` fields.

```typescript
// Simplified sidebarConfig.ts — only contextual component sections
import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Calendar, CheckSquare, Database, Mail } from 'lucide-react'
import { CalendarSidebarContent } from '@/pages/calendar/components/sidebar/CalendarSidebarContent.js'
import { TasksSidebarContent } from '@/pages/tasks/components/TasksSidebarContent.js'
import { BaseSidebarContent } from '@/pages/bases/components/BaseSidebarContent.js'
import { MailSidebarContent } from '@/pages/mail/components/MailSidebarContent.js'

export interface SidebarSection {
  key: string
  header: string
  icon: LucideIcon
  items: [] // No nav items — those are in the header now
  component: ComponentType
}

const contextualSections: Record<string, SidebarSection[]> = {
  '/calendar': [
    { key: 'calendar-nav', header: 'Calendar', icon: Calendar, items: [], component: CalendarSidebarContent },
  ],
  '/tasks': [
    { key: 'tasks-nav', header: 'Tasks', icon: CheckSquare, items: [], component: TasksSidebarContent },
  ],
  '/bases': [
    { key: 'bases-browser', header: 'Bases', icon: Database, items: [], component: BaseSidebarContent },
  ],
  '/mail': [
    { key: 'mail-nav', header: 'Mail', icon: Mail, items: [], component: MailSidebarContent },
  ],
}

export function getSectionsForRoute(pathname: string): SidebarSection[] {
  if (contextualSections[pathname]) return contextualSections[pathname]
  const prefix = '/' + pathname.split('/')[1]
  if (contextualSections[prefix]) return contextualSections[prefix]
  return []
}
```

**Step 3: Commit**

```bash
git add frontend-next/src/layouts/Sidebar.tsx frontend-next/src/layouts/sidebarConfig.ts
git commit -m "feat: simplify sidebar to contextual-only, remove nav links"
```

---

## Task 6: Create Apex Dashboard Page + Backend Multi-Dashboard Support

**Files:**
- Create: `frontend-next/src/pages/ApexDashboardPage.tsx`
- Modify: `frontend-next/src/router.tsx` — add `/apex` route
- Modify: `backend/src/routes/dashboard.js` — support `?dashboard=` query param
- Modify: `frontend-next/src/api/hooks/useDashboard.ts` — accept dashboard ID param

**Step 1: Extend backend to support multiple dashboards**

In `backend/src/routes/dashboard.js`, the `dashboard_layouts` table currently has a `UNIQUE(user_id)` constraint. We need to support multiple layouts per user. Add a `dashboard_id` column or use the existing `id` differently.

Simplest approach: add a `dashboard_id` column (VARCHAR, default `'personal'`), change the unique constraint to `UNIQUE(user_id, dashboard_id)`.

```javascript
// Add migration at top of route file (or in schema.js)
// ALTER TABLE dashboard_layouts ADD COLUMN IF NOT EXISTS dashboard_id VARCHAR(50) DEFAULT 'personal';
// DROP INDEX IF EXISTS dashboard_layouts_user_id_idx;
// CREATE UNIQUE INDEX IF NOT EXISTS dashboard_layouts_user_dash_idx ON dashboard_layouts(user_id, dashboard_id);

// GET /api/dashboard/layout?dashboard=personal|apex
router.get('/layout', async (req, res) => {
  try {
    const userId = req.user.id;
    const dashboardId = req.query.dashboard || 'personal';
    const row = await db.getOne(
      'SELECT layout_json FROM dashboard_layouts WHERE user_id = $1 AND dashboard_id = $2',
      [userId, dashboardId]
    );
    // ... return row or default based on dashboardId
  }
});

// PUT /api/dashboard/layout?dashboard=personal|apex
router.put('/layout', async (req, res) => {
  try {
    const userId = req.user.id;
    const dashboardId = req.query.dashboard || 'personal';
    // ... upsert with (user_id, dashboard_id) conflict
  }
});
```

Define `DEFAULT_APEX_LAYOUT` with starter Apex widgets (Navigation widget + a placeholder welcome widget).

**Step 2: Update useDashboard hooks**

```typescript
// frontend-next/src/api/hooks/useDashboard.ts
export const dashboardKeys = {
  all: ['dashboard'] as const,
  layout: (dashboardId?: string) => [...dashboardKeys.all, 'layout', dashboardId ?? 'personal'] as const,
  // ...
}

export function useDashboardLayout(dashboardId: string = 'personal') {
  return useQuery({
    queryKey: dashboardKeys.layout(dashboardId),
    queryFn: () => apiClient.get<DashboardLayoutResponse>(`/dashboard/layout?dashboard=${dashboardId}`),
  })
}

export function useSaveDashboardLayout(dashboardId: string = 'personal') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (layout: DashboardLayout) =>
      apiClient.put<{ success: boolean }>(`/dashboard/layout?dashboard=${dashboardId}`, { layout }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.layout(dashboardId) })
    },
  })
}
```

**Step 3: Create ApexDashboardPage**

Copy the structure from `DashboardPage.tsx` but use `useDashboardLayout('apex')` and `useSaveDashboardLayout('apex')`. Define a separate `DEFAULT_APEX_WIDGETS` array for the initial Apex dashboard layout.

```typescript
// frontend-next/src/pages/ApexDashboardPage.tsx
// Same widget grid pattern as DashboardPage, but:
// - Uses useDashboardLayout('apex') / useSaveDashboardLayout('apex')
// - Has its own DEFAULT_APEX_WIDGETS
// - Title: "Apex Restoration"
```

**Step 4: Add route**

In `router.tsx`, add: `{ path: 'apex', element: <ApexDashboardPage /> }`

**Step 5: Commit**

```bash
git add backend/src/routes/dashboard.js frontend-next/src/api/hooks/useDashboard.ts frontend-next/src/pages/ApexDashboardPage.tsx frontend-next/src/router.tsx
git commit -m "feat: multi-dashboard support with Apex dashboard page"
```

---

## Task 7: Dashboard Springboard — Swipe & Keyboard Navigation

**Files:**
- Create: `frontend-next/src/layouts/DashboardSpringboard.tsx`
- Modify: `frontend-next/src/pages/DashboardPage.tsx` — wrap in springboard
- Modify: `frontend-next/src/pages/ApexDashboardPage.tsx` — wrap in springboard

**Step 1: Install framer-motion (if not already present)**

```bash
cd frontend-next && npm install framer-motion
```

**Step 2: Create DashboardSpringboard component**

This component wraps the two dashboard pages in a horizontal scroll container with snap points. It handles:
- CSS `scroll-snap-type: x mandatory` for trackpad swipe
- Arrow key listeners (Left/Right to cycle, Up/Down to jump to Home)
- Dot indicators that update on scroll
- Smooth scrolling on keyboard/button navigation
- Syncs with the URL via `navigate()` when the active dashboard changes

```typescript
// frontend-next/src/layouts/DashboardSpringboard.tsx
// Renders a horizontal scroll container with two "pages"
// Each page is a full-width dashboard
// Scroll position determines which dashboard is visible
// On scroll settle, navigate() to the correct route
// Arrow key handlers for keyboard navigation
// Dot indicators rendered below header tabs
```

The springboard listens for `scroll` events, uses `IntersectionObserver` or `scrollLeft` math to determine which dashboard is active, and calls `navigate('/')` or `navigate('/apex')` accordingly. The CSS `scroll-snap` ensures the dashboards always settle on exact boundaries.

**Step 3: Create a wrapper route**

Instead of separate `/` and `/apex` routes rendering different pages, create a single springboard route that renders both dashboards side by side:

In `router.tsx`, replace:
```typescript
{ index: true, element: <DashboardPage /> }
// and
{ path: 'apex', element: <ApexDashboardPage /> }
```

With a `DashboardSpringboard` component that renders both and scrolls to the correct one based on the URL.

**Step 4: Commit**

```bash
git add frontend-next/src/layouts/DashboardSpringboard.tsx frontend-next/src/pages/DashboardPage.tsx frontend-next/src/pages/ApexDashboardPage.tsx frontend-next/src/router.tsx
git commit -m "feat: dashboard springboard with swipe, keyboard nav, and dot indicators"
```

---

## Task 8: Header Tab Animation — Crossfade on Area Switch

**Files:**
- Modify: `frontend-next/src/layouts/Header.tsx` — add AnimatePresence for tab transitions

**Step 1: Add animation to tab zone**

When the active area changes (either via area button click or springboard swipe), the center tabs should crossfade. Use `framer-motion`'s `AnimatePresence` + `motion.div` with `key={activeArea}`.

```typescript
import { AnimatePresence, motion } from 'framer-motion'

// In the center zone:
<AnimatePresence mode="wait">
  <motion.nav
    key={activeArea}
    initial={{ opacity: 0, x: activeArea === 'apex' ? 20 : -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: activeArea === 'apex' ? -20 : 20 }}
    transition={{ duration: 0.2 }}
    className="flex-1 flex items-center justify-center gap-1"
  >
    {orderedTabs.map((tab) => (
      // ... NavLink tabs
    ))}
  </motion.nav>
</AnimatePresence>
```

**Step 2: Commit**

```bash
git add frontend-next/src/layouts/Header.tsx
git commit -m "feat: animated tab crossfade on area switch"
```

---

## Task 9: Tab Reordering in Edit Mode — @dnd-kit

**Files:**
- Create: `frontend-next/src/layouts/HeaderTabBar.tsx` — extracted tab bar component with drag support
- Modify: `frontend-next/src/layouts/Header.tsx` — use HeaderTabBar

**Step 1: Create HeaderTabBar with drag-and-drop**

Extract the tab rendering into its own component. In edit mode, wrap tabs in `@dnd-kit/sortable` context. On drag end, call `useHeaderStore.setTabOrder()`.

```typescript
// frontend-next/src/layouts/HeaderTabBar.tsx
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
// ... renders tabs, sortable in edit mode, static otherwise
```

**Step 2: Determine how edit mode is communicated to the header**

The dashboard's `isEditing` state needs to be visible to the header. Options:
- Zustand store (e.g., `useDashboardUiStore` with `isEditing` flag)
- React Context from the dashboard page

Simplest: add `isEditing` to a Zustand store that the dashboard sets and the header reads.

**Step 3: Commit**

```bash
git add frontend-next/src/layouts/HeaderTabBar.tsx frontend-next/src/layouts/Header.tsx
git commit -m "feat: draggable tab reordering in dashboard edit mode"
```

---

## Task 10: Tab Style Customization — Gear Icon Popover

**Files:**
- Create: `frontend-next/src/layouts/TabStylePopover.tsx`
- Modify: `frontend-next/src/layouts/HeaderTabBar.tsx` — add gear icon on hover in edit mode

**Step 1: Create TabStylePopover**

A popover that appears when clicking the gear icon on a tab in edit mode. Contains:
- Color picker for tab background
- Color picker for border + thickness slider
- Opacity slider for translucency
- Color picker for selected state
- Color picker for hover state
- "Reset to default" button

```typescript
// frontend-next/src/layouts/TabStylePopover.tsx
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.js'
// ... color pickers, opacity slider, save to useHeaderStore.setTabStyle()
```

**Step 2: Apply custom styles to tabs**

In `HeaderTabBar.tsx`, read `tabStyles[tab.id]` from the store and apply as inline styles (or Tailwind arbitrary values) to each tab's container.

**Step 3: Commit**

```bash
git add frontend-next/src/layouts/TabStylePopover.tsx frontend-next/src/layouts/HeaderTabBar.tsx
git commit -m "feat: per-tab style customization with gear icon popover"
```

---

## Task 11: Tab Display Mode Toggle

**Files:**
- Modify: `frontend-next/src/layouts/Header.tsx` — add display mode toggle in right zone or as a subtle header control

**Step 1: Add a display mode cycle button**

A small button (or dropdown) that cycles between icon+label, icon-only, and label-only. Could be a three-state toggle near the tabs, or in a header settings dropdown.

Simplest approach: a small icon button at the end of the tab bar that cycles modes on click. Tooltip shows current mode.

```typescript
// In Header.tsx right zone or end of tab bar:
<Button variant="ghost" size="icon-xs" onClick={() => {
  const modes: TabDisplayMode[] = ['icon-label', 'icon-only', 'label-only']
  const next = modes[(modes.indexOf(tabDisplayMode) + 1) % modes.length]
  useHeaderStore.getState().setTabDisplayMode(next)
}} title={`Display: ${tabDisplayMode}`}>
  {/* Toggle icon */}
</Button>
```

**Step 2: Commit**

```bash
git add frontend-next/src/layouts/Header.tsx
git commit -m "feat: tab display mode toggle (icon+label, icon-only, label-only)"
```

---

## Task 12: Hydrate Header Store on Auth

**Files:**
- Modify: `frontend-next/src/layouts/AppLayout.tsx` — call `useHeaderStore.hydrate()` on mount

**Step 1: Add hydration call**

In `AppLayout.tsx`, call `useHeaderStore.getState().hydrate()` inside a `useEffect` on mount (similar to how `useSidebarStore.hydrate()` is called).

```typescript
import { useHeaderStore } from '@/stores/headerStore.js'

// Inside AppLayout:
useEffect(() => {
  useHeaderStore.getState().hydrate()
}, [])
```

**Step 2: Commit**

```bash
git add frontend-next/src/layouts/AppLayout.tsx
git commit -m "feat: hydrate header store from user settings on app load"
```

---

## Task 13: Database Migration for Multi-Dashboard Support

**Files:**
- Modify: `backend/src/db/schema.js` — add migration for `dashboard_id` column

**Step 1: Add migration**

In the schema initialization, add:

```sql
ALTER TABLE dashboard_layouts ADD COLUMN IF NOT EXISTS dashboard_id VARCHAR(50) DEFAULT 'personal';

-- Drop old unique constraint if it exists, create new compound one
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'dashboard_layouts_user_id_key') THEN
    ALTER TABLE dashboard_layouts DROP CONSTRAINT dashboard_layouts_user_id_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS dashboard_layouts_user_dash_idx ON dashboard_layouts(user_id, dashboard_id);
```

**Step 2: Commit**

```bash
git add backend/src/db/schema.js
git commit -m "feat: add dashboard_id column for multi-dashboard support"
```

---

## Task 14: Update CLAUDE.md — Document New Architecture

**Files:**
- Modify: `CLAUDE.md` (worktree root) — update architecture rules, sidebar section, header section

**Step 1: Update architecture documentation**

Update the following sections in CLAUDE.md:
- **Architecture Rule 1** — Change from "ONE Sidebar" to describe the new header-driven navigation + contextual sidebar
- **App Shell (Done)** section — Update to reflect the new Header, area buttons, springboard
- Add a **Header Navigation** section describing area detection, tab customization, springboard

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with new header-driven navigation architecture"
```

---

## Task Summary

| Task | Description | Dependencies |
|------|-------------|--------------|
| 1 | headerConfig.ts — area & tab definitions | None |
| 2 | useHeaderStore — tab preferences store | Task 1 |
| 3 | Rewrite Header.tsx — area buttons, tabs, actions | Tasks 1, 2 |
| 4 | Update AppLayout.tsx — conditional sidebar + capture modals | Task 3 |
| 5 | Simplify Sidebar.tsx — contextual only | Task 4 |
| 6 | Apex Dashboard + backend multi-dashboard | None (parallel with 1-5) |
| 7 | Dashboard Springboard — swipe + keyboard | Tasks 4, 6 |
| 8 | Header tab animation — crossfade | Task 7 |
| 9 | Tab reordering — @dnd-kit | Tasks 3, 8 |
| 10 | Tab style customization — gear popover | Task 9 |
| 11 | Tab display mode toggle | Task 3 |
| 12 | Hydrate header store on auth | Task 2 |
| 13 | DB migration for multi-dashboard | None (parallel) |
| 14 | Update CLAUDE.md | All tasks |
