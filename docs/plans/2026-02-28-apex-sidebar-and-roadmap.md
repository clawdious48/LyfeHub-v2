# Apex Sidebar & App Roadmap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an "Apex Restoration" collapsible section to the sidebar with nested navigation items (Jobs, CRM, Inventory, Documents, Workflows, Accounting, Reports), create stub pages for each, and produce a full-app roadmap document that tracks what's built vs. what's remaining.

**Architecture:** The sidebar already has a contextual section system (`sidebarConfig.ts`) that renders different sections based on the current route. We'll introduce a "global sections" concept — sections that appear on every route regardless of context. The Apex Restoration section is the first global section. Jobs moves from its hardcoded top-pinned position into this group. Each new Apex sub-page gets a minimal stub component and a route entry.

**Tech Stack:** React 19, TypeScript, React Router v7, Tailwind CSS v4, Lucide React icons

**Verification:** No test suite exists. All tasks verify via `npx tsc --noEmit` (type check) and visual browser inspection at `http://localhost:5174`.

---

### Task 1: Add Apex Restoration section to sidebarConfig.ts

**Files:**
- Modify: `frontend-next/src/layouts/sidebarConfig.ts`

**Step 1: Add new icon imports**

Add these Lucide icons to the existing import:

```typescript
import {
  Briefcase, Calendar, CheckSquare,
  FileText, Users, Database,
  Wrench, BookOpen,
  HardHat, Contact, Package, FolderOpen,
  GitBranch, DollarSign, BarChart3,
} from 'lucide-react'
```

**Step 2: Extract shared sections and add global Apex section**

Refactor `sidebarSections` to separate the Apex global section from route-specific contextual sections. Define the Apex section once:

```typescript
const apexSection: SidebarSection = {
  key: 'apex',
  header: 'Apex Restoration',
  icon: HardHat,
  items: [
    { label: 'Jobs', icon: Briefcase, to: '/jobs' },
    { label: 'CRM', icon: Contact, to: '/apex/crm' },
    { label: 'Inventory', icon: Package, to: '/apex/inventory' },
    { label: 'Documents', icon: FolderOpen, to: '/apex/documents' },
    { label: 'Workflows', icon: GitBranch, to: '/apex/workflows' },
    { label: 'Accounting', icon: DollarSign, to: '/apex/accounting' },
    { label: 'Reports', icon: BarChart3, to: '/apex/reports' },
  ],
}
```

Change the `sidebarSections` record to hold only route-specific (contextual) sections. Rename it to `contextualSections`:

```typescript
const contextualSections: Record<string, SidebarSection[]> = {
  '/': [
    {
      key: 'productivity',
      header: 'Productivity',
      icon: Briefcase,
      items: [
        { label: 'Calendar', icon: Calendar, to: '/calendar' },
        { label: 'Tasks', icon: CheckSquare, to: '/tasks' },
      ],
    },
    {
      key: 'tools',
      header: 'Tools',
      icon: Wrench,
      items: [],
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
  '/bases': [
    {
      key: 'bases-browser',
      header: 'Bases',
      icon: Database,
      items: [],
      component: BaseSidebarContent,
    },
    {
      key: 'productivity',
      header: 'Productivity',
      icon: Briefcase,
      items: [
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
}
```

Note: Jobs is removed from the Productivity section since it's now under Apex.

**Step 3: Update getSectionsForRoute to prepend global sections**

```typescript
export function getSectionsForRoute(pathname: string): SidebarSection[] {
  if (contextualSections[pathname]) return [apexSection, ...contextualSections[pathname]]
  const prefix = '/' + pathname.split('/')[1]
  if (contextualSections[prefix]) return [apexSection, ...contextualSections[prefix]]
  return [apexSection, ...contextualSections['/']]
}
```

**Step 4: Run type check**

Run: `cd frontend-next && npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add frontend-next/src/layouts/sidebarConfig.ts
git commit -m "feat(sidebar): add Apex Restoration global section with nested nav items"
```

---

### Task 2: Remove hardcoded Jobs link from Sidebar.tsx

**Files:**
- Modify: `frontend-next/src/layouts/Sidebar.tsx`

**Step 1: Remove the Jobs NavLink from the top pinned section**

In `Sidebar.tsx`, the top section (lines 78-110) has two hardcoded NavLinks: Dashboard and Jobs. Remove the entire Jobs NavLink block (lines 95-109). Keep Dashboard — it stays pinned.

The top section should look like:

```tsx
{/* Top section: Dashboard */}
<div className="px-2 pt-3 pb-2 space-y-0.5">
  <NavLink
    to="/"
    end
    title={collapsed ? 'Dashboard' : undefined}
    className={({ isActive }) =>
      [
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
        isActive
          ? 'bg-accent-light text-accent'
          : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
      ].join(' ')
    }
  >
    <LayoutDashboard className="size-4 shrink-0" />
    {!collapsed && <span>Dashboard</span>}
  </NavLink>
</div>
```

**Step 2: Remove unused Briefcase import if no longer needed**

Check if `Briefcase` is still used elsewhere in Sidebar.tsx. If not, remove it from the import.

**Step 3: Run type check**

Run: `cd frontend-next && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add frontend-next/src/layouts/Sidebar.tsx
git commit -m "refactor(sidebar): move Jobs from pinned top into Apex section"
```

---

### Task 3: Create stub pages for Apex sub-sections

**Files:**
- Create: `frontend-next/src/pages/ApexCrmPage.tsx`
- Create: `frontend-next/src/pages/ApexInventoryPage.tsx`
- Create: `frontend-next/src/pages/ApexDocumentsPage.tsx`
- Create: `frontend-next/src/pages/ApexWorkflowsPage.tsx`
- Create: `frontend-next/src/pages/ApexAccountingPage.tsx`
- Create: `frontend-next/src/pages/ApexReportsPage.tsx`

**Step 1: Create all six stub pages**

Each page follows the same pattern as existing stubs (TasksPage, CalendarPage). Example for CRM:

```tsx
// ApexCrmPage.tsx
export default function ApexCrmPage() {
  return (
    <div className="p-6">
      <h1 className="font-heading text-2xl text-text-primary mb-4">CRM</h1>
      <p className="text-text-secondary text-sm">Organizations, contacts, and tags management will go here.</p>
    </div>
  )
}
```

Repeat for each page with appropriate title and description:

| File | Title | Description |
|------|-------|-------------|
| `ApexCrmPage.tsx` | CRM | Organizations, contacts, and tags management will go here. |
| `ApexInventoryPage.tsx` | Inventory | Consumable catalog, stock levels, and purchase tracking will go here. |
| `ApexDocumentsPage.tsx` | Documents | File uploads, document search, and organization will go here. |
| `ApexWorkflowsPage.tsx` | Workflows | Workflow templates, steps, and gate configuration will go here. |
| `ApexAccountingPage.tsx` | Accounting | Financial overview, estimates, payments, and job costing will go here. |
| `ApexReportsPage.tsx` | Reports | Job analytics, revenue tracking, and operational reports will go here. |

**Step 2: Run type check**

Run: `cd frontend-next && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add frontend-next/src/pages/Apex*.tsx
git commit -m "feat: add stub pages for Apex CRM, Inventory, Documents, Workflows, Accounting, Reports"
```

---

### Task 4: Add routes for Apex sub-pages

**Files:**
- Modify: `frontend-next/src/router.tsx`

**Step 1: Import the new page components**

Add imports at the top of `router.tsx`:

```typescript
import ApexCrmPage from '@/pages/ApexCrmPage'
import ApexInventoryPage from '@/pages/ApexInventoryPage'
import ApexDocumentsPage from '@/pages/ApexDocumentsPage'
import ApexWorkflowsPage from '@/pages/ApexWorkflowsPage'
import ApexAccountingPage from '@/pages/ApexAccountingPage'
import ApexReportsPage from '@/pages/ApexReportsPage'
```

**Step 2: Add route entries inside the authenticated children array**

Add after the existing `bases` route:

```typescript
{ path: 'apex/crm', element: <ApexCrmPage /> },
{ path: 'apex/inventory', element: <ApexInventoryPage /> },
{ path: 'apex/documents', element: <ApexDocumentsPage /> },
{ path: 'apex/workflows', element: <ApexWorkflowsPage /> },
{ path: 'apex/accounting', element: <ApexAccountingPage /> },
{ path: 'apex/reports', element: <ApexReportsPage /> },
```

**Step 3: Run type check**

Run: `cd frontend-next && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add frontend-next/src/router.tsx
git commit -m "feat: add routes for Apex sub-pages (CRM, Inventory, Documents, Workflows, Accounting, Reports)"
```

---

### Task 5: Visual verification in browser

**Step 1: Start the dev server (if not running)**

Run: `cd frontend-next && npm run dev`

**Step 2: Open the app and verify sidebar**

Navigate to `http://localhost:5174` in the browser. Verify:

- [ ] Dashboard is pinned at the top (no Jobs next to it)
- [ ] "Apex Restoration" section appears below Quick Capture
- [ ] Apex section is collapsible (click header to toggle)
- [ ] All 7 items visible under Apex: Jobs, CRM, Inventory, Documents, Workflows, Accounting, Reports
- [ ] Clicking each item navigates to the correct stub page
- [ ] Jobs still shows the full Jobs module (not a stub)
- [ ] Sidebar collapsed mode shows icons with tooltip titles for each Apex item
- [ ] Apex section appears on all routes (dashboard, jobs, bases, etc.)

**Step 3: Fix any visual issues found**

If anything looks off (spacing, icons, navigation), fix it before proceeding.

---

### Task 6: Create the full app roadmap document

**Files:**
- Create: `docs/ROADMAP.md`

**Step 1: Write the roadmap document**

Create `docs/ROADMAP.md` with the following structure:

```markdown
# LyfeHub v2 — Full App Roadmap

> This is a living document. Update it each time a feature is worked on or completed.
> Last updated: 2026-02-28

## Status Legend

| Symbol | Meaning |
|--------|---------|
| Done | Backend + Frontend complete |
| Backend Only | API/DB built, no React UI |
| Stub | Route + placeholder page exists |
| Not Started | Nothing built yet |

---

## Core Platform

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Auth (JWT + API keys) | Done | Done | Done |
| User profiles | Done | Not started | Backend Only |
| Theme system (dark/light) | N/A | Done | Done |
| Design tokens (Tailwind v4) | N/A | Done | Done |
| App layout (sidebar + header) | N/A | Done | Done |
| Dashboard (react-grid-layout) | Done | Done | Done |
| Quick Capture (inbox) | Done | Done | Done |
| Settings page | Partial | Not started | Backend Only |
| Notification system | Not started | Not started | Not Started |
| Mobile responsive | N/A | Partial | In Progress |

---

## LyfeHub Personal (user_id-scoped)

### Tasks

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Task CRUD | Done | Stub | Backend Only |
| Task lists | Done | Not started | Backend Only |
| Subtasks | Done | Not started | Backend Only |
| My Day / Important / Scheduled views | Not started | Not started | Not Started |
| Task modal redesign | Done | Not started | Backend Only |

### Calendar

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Calendar CRUD | Done | Stub | Backend Only |
| Calendar events CRUD | Done | Not started | Backend Only |
| Month/Week/Day/Agenda views | Not started | Not started | Not Started |
| Unified events + tasks view | Not started | Not started | Not Started |
| Recurring events (RRULE) | Not started | Not started | Not Started |
| Google Calendar sync | Not started | Not started | Not Started |

### Notes

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Notes CRUD | Done | Not started | Backend Only |
| Markdown editor | Not started | Not started | Not Started |
| Notes page + route | Not started | Not started | Not Started |

### People

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| People CRUD | Done | Stub | Backend Only |
| People groups | Done | Not started | Backend Only |

### Bases (Notion-style databases)

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Base CRUD | Done | Done | Done |
| Properties (15 types) | Done | Done | Done |
| Records + inline editing | Done | Done | Done |
| Views (filters, sorts, column config) | Done | Done | Done |
| Groups (collapsible folders) | Done | Done | Done |
| Relations (two-way sync) | Done | Done | Done |
| Sidebar base browser | Done | Done | Done |

---

## Apex Restoration (org_id-scoped)

### Organization & Auth

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Organizations CRUD | Done | Not started | Backend Only |
| Org member management | Done | Not started | Backend Only |
| Role-based access (5 roles) | Done | N/A | Backend Only |
| Phase-level assignments | Done | Not started | Backend Only |
| API key scopes | Done | N/A | Backend Only |

### Jobs

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Job CRUD | Done | Done | Done |
| Job phases | Done | Done | Done |
| Job list views (card, table, kanban) | Done | Done | Done |
| Job detail view | Done | Done | Done |
| Job notes | Done | Done | Done |
| Job estimates | Done | Done | Done |
| Job payments | Done | Done | Done |
| Job labor entries | Done | Done | Done |
| Job receipts/expenses | Done | Done | Done |
| Job work orders | Done | Done | Done |
| Job contacts (CRM link) | Done | Done | Done |
| Job activity log | Done | Done | Done |
| Job accounting summary | Done | Done | Done |
| Job documents tab | Done | Done | Done |
| Job supplements | Done | Not started | Backend Only |
| Sub-contractor invoices | Done | Not started | Backend Only |
| Fuel/mileage tracking | Done | Not started | Backend Only |
| Drying logs | Done | Not started | Backend Only |

### CRM

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| CRM organizations | Done | Stub | Backend Only |
| CRM contacts | Done | Stub | Backend Only |
| Organization tags | Done | Not started | Backend Only |
| Contact tags | Done | Not started | Backend Only |
| Contact-org memberships | Done | Not started | Backend Only |
| Job-contact linking | Done | Not started | Backend Only |

### Inventory

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Consumable item catalog | Done | Stub | Backend Only |
| Purchase recording | Done | Not started | Backend Only |
| Stock level tracking | Done | Not started | Backend Only |
| Job material allocations | Done | Not started | Backend Only |

### Documents

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| File upload (images + docs) | Done | Stub | Backend Only |
| Image optimization + thumbnails | Done | Not started | Backend Only |
| Document search | Done | Not started | Backend Only |
| Document metadata editing | Done | Not started | Backend Only |
| Polymorphic entity attachment | Done | Not started | Backend Only |

### Workflows

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Workflow templates | Done | Stub | Backend Only |
| Template steps + ordering | Done | Not started | Backend Only |
| Gate conditions (8 types) | Done | Not started | Backend Only |
| Stamp workflow onto job | Done | Not started | Backend Only |
| Step progression + completion | Done | Not started | Backend Only |
| Gate evaluation | Done | Not started | Backend Only |
| Management overrides | Done | Not started | Backend Only |

### Accounting

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Per-job accounting summary | Done | Stub | Backend Only |
| Cross-job financial overview | Not started | Not started | Not Started |
| Invoice generation | Not started | Not started | Not Started |
| P&L reporting | Not started | Not started | Not Started |

### Reports

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Job status analytics | Not started | Stub | Not Started |
| Revenue tracking | Not started | Not started | Not Started |
| Equipment utilization | Not started | Not started | Not Started |
| Employee productivity | Not started | Not started | Not Started |

### Equipment (Future)

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Equipment registry (serial #) | Not started | Not started | Not Started |
| Deployment tracking (which job) | Not started | Not started | Not Started |
| Maintenance scheduling | Not started | Not started | Not Started |

### Scheduling (Future)

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Crew assignments | Not started | Not started | Not Started |
| Daily dispatch view | Not started | Not started | Not Started |
| Job scheduling calendar | Not started | Not started | Not Started |

---

## Cross-Cutting Features

| Feature | Status | Notes |
|---------|--------|-------|
| Mobile responsive layout | In Progress | Some pages, not all |
| Personal Bridge (tasks/notes → jobs) | Not Started | One-way link via apex_job_ref |
| Notification system | Not Started | In-app, push, email, SMS |
| Cross-linking infrastructure | Not Started | Generic links table for any-to-any entity |
| AI layer (optional assist) | Not Started | Manual-first, AI on top |

---

## Activity Log

| Date | Change | Section |
|------|--------|---------|
| 2026-02-28 | Created roadmap document | All |
| 2026-02-28 | Added Apex Restoration sidebar section | Sidebar |
| 2026-02-28 | Created stub pages for CRM, Inventory, Documents, Workflows, Accounting, Reports | Apex |
| 2026-02-27 | Bases module complete (CRUD, properties, records, views, groups, relations) | Bases |
| 2026-02-26 | Dashboard + sidebar implemented (react-grid-layout, contextual sections) | Core |
| 2026-02-26 | Jobs module complete (reference implementation) | Jobs |
```

**Step 2: Commit**

```bash
git add docs/ROADMAP.md
git commit -m "docs: create full app roadmap with feature tracking and activity log"
```

---

### Task 7: Update CLAUDE.md to reference the roadmap

**Files:**
- Modify: `CLAUDE.md` (worktree root)

**Step 1: Add roadmap reference to the Design Docs section**

In the `## Design Docs (Source of Truth)` section near the bottom of CLAUDE.md, add:

```markdown
- `docs/ROADMAP.md` — Full app roadmap: what's built, what's remaining, activity log. **UPDATE THIS FILE** each time a feature is worked on or completed.
```

**Step 2: Update the sidebar description in Architecture Rules**

In the `### 1. ONE Sidebar` section, update the sidebar structure description to reflect the new Apex section:

```markdown
The sidebar structure (top to bottom):
1. **Dashboard button** — Always visible, pinned at top
2. **Quick Capture** — Note, Task, Contact buttons (always visible, collapsible section)
3. **Apex Restoration** — Global section: Jobs, CRM, Inventory, Documents, Workflows, Accounting, Reports (always visible on all routes)
4. **Contextual sections** — Change per route via `getSectionsForRoute(pathname)` in `sidebarConfig.ts`
5. **Bottom bar** — Settings + user name + collapse toggle (always visible, pinned)
```

**Step 3: Update the "What's Built" section**

Add to the "App Shell (Done)" subsection:

```markdown
- Apex Restoration sidebar section with global visibility across all routes
- Stub pages for Apex CRM, Inventory, Documents, Workflows, Accounting, Reports
```

**Step 4: Update the route list**

In the router section or wherever routes are documented, add:

```markdown
- `/apex/crm` — ApexCrmPage (stub)
- `/apex/inventory` — ApexInventoryPage (stub)
- `/apex/documents` — ApexDocumentsPage (stub)
- `/apex/workflows` — ApexWorkflowsPage (stub)
- `/apex/accounting` — ApexAccountingPage (stub)
- `/apex/reports` — ApexReportsPage (stub)
```

**Step 5: Update the Renames table**

Update or clarify the renames table — "Apex" is NOT renamed to "Jobs". Jobs is one sub-section of the Apex Restoration area:

```markdown
## Renames (Applied Everywhere)

| Old | New | Notes |
|-----|-----|-------|
| Apex (as page name) | Jobs | The job management page is called "Jobs" |
| Apex (as sidebar group) | Apex Restoration | Sidebar header for all org-scoped tools |
| Areas of Focus | Areas | |
| TOOLS (sidebar section) | Three sections: Productivity, Tools, Resources | |
```

**Step 6: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with Apex sidebar architecture and roadmap reference"
```

---

### Task 8: Update auto-memory

**Files:**
- Modify: `~/.claude/projects/C--Users-jaker-Documents-Workspace-LyfeHub-v2/memory/MEMORY.md`

**Step 1: Update memory with sidebar and roadmap info**

Update the "Active Work" section to reflect:
- Apex Restoration sidebar section added
- Roadmap document created at `docs/ROADMAP.md`
- Clarify that "Apex" is the sidebar group name, "Jobs" is one item under it

**Step 2: Update Key Renames**

Clarify: Apex → Jobs rename only applies to the job management page title, not the sidebar group.
