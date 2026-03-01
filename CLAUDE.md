# CLAUDE.md — Tech Stack Upgrade Worktree

This is the bible for the React frontend rebuild. Every design decision below is final and non-negotiable. If something here contradicts a task plan, follow THIS file.

## What This Worktree Is

A complete rewrite of the LyfeHub frontend from vanilla JS to React. The backend is unchanged. All work lives in `frontend-next/`. The vanilla `frontend/` still exists and runs on the Docker dev container at port 3000.

- **Branch:** `worktree-tech-stack-upgrade`
- **Frontend root:** `frontend-next/`
- **Dev server:** Vite on port 5174, proxies `/api/*` to backend on port 3000
- **Backend:** Docker containers `lyfehub-dev` (port 3000) + `lyfehub-dev-db` (PostgreSQL)

## Tech Stack

- React 19, TypeScript, Vite
- Tailwind CSS v4 with LyfeHub design tokens
- TanStack Query (React Query) for data fetching
- Zustand for client-side UI state
- shadcn/ui component library
- @dnd-kit for drag-and-drop (column reorder, group reorder, sidebar items — replaces old up/down arrow buttons)
- react-grid-layout for dashboard widget grid
- Lucide React for icons
- React Router for routing

---

## Product Philosophy (Non-Negotiable)

### LyfeHub = Personal, Apex/Jobs = Enterprise — Same App, Different Worlds

| | LyfeHub (Personal) | Jobs/Apex (Enterprise) |
|---|---|---|
| Data ownership | `user_id`-scoped | `org_id`-scoped |
| Audience | Individual productivity | Team-based business ops |
| Access model | Private to each user | Shared across org, role-gated |
| Intersection | One-way bridge: personal -> Jobs view only | Never leaks into LyfeHub |

### Core Principles

1. **Archive, never delete** — Soft-delete everything. No permanent destruction of user data.
2. **If it's not simple, it's wrong** — Minimal complexity. Don't over-engineer.
3. **Manual-first** — Everything works without AI. AI is a layer on top, not a dependency.
4. **Role-based everything on the Jobs/Apex side** — management, office_coordinator, project_manager, estimator, field_tech.
5. **Org-scoped data isolation** — Jobs data filtered by `org_id`, personal data by `user_id`.

### ADHD Design Principles (App-Wide UX)

These apply to every module, not just calendar:

1. **Default to Today** — Landing views show what matters now, not an overview.
2. **Progressive disclosure** — Show simple forms first, expand for details. Don't front-load complexity.
3. **Calm colors** — Blue/green/purple. Red ONLY for truly urgent. No anxiety-inducing design.
4. **No guilt mechanics** — No streaks, no shame for missed tasks. Gentle "reschedule?" nudges instead.
5. **Quick capture under 15 seconds** — Item creation must be fast. Quick Capture is always available in the sidebar.
6. **"Reschedule / Drop it" on overdue** — Two buttons, no judgment. Don't pile on guilt.
7. **Celebration on completion** — Small animation/feedback for completing items.
8. **Capacity awareness** — Don't let views get so full they cause overwhelm.

---

## Architecture Rules (Non-Negotiable)

### 1. ONE Sidebar — App-Level, Persistent, Contextual

There is ONE sidebar for the entire app. It lives in `layouts/Sidebar.tsx` and is rendered by `layouts/AppLayout.tsx`. It is persistent across all pages.

**Pages MUST NOT render their own sidebars.** A page component renders content only — it fills the `<Outlet />` inside AppLayout. If a page needs sidebar content (filters, sub-navigation, groups), that content goes into the sidebar's contextual section system via `layouts/sidebarConfig.ts`.

The sidebar structure (top to bottom):
1. **Dashboard button** — Always visible, pinned at top
2. **Quick Capture** — Note, Task, Contact buttons (always visible, collapsible section)
3. **Apex Restoration** — Global section: Jobs, CRM, Inventory, Documents, Workflows, Accounting, Reports (always visible on all routes, collapsible)
4. **Contextual sections** — Change per route via `getSectionsForRoute(pathname)` in `sidebarConfig.ts`
5. **Bottom bar** — Settings + user name + collapse toggle (always visible, pinned)

When a page needs its own sidebar content (e.g., Bases showing groups/base list, Jobs showing filters):
- Add a new route key to `sidebarSections` in `layouts/sidebarConfig.ts`
- The sidebar reads `useLocation().pathname` and renders the matching config
- Fallback: if no config exists for a route, show the Dashboard sections

**WRONG:** `<BasesPage>` renders `<BasesSidebar>` inside itself
**RIGHT:** `sidebarConfig.ts` has a `/bases` key with bases-specific sections, rendered by the app-level Sidebar

### Sidebar Collapse Behavior

- Toggle button collapses to icon-only mode (48px wide, `w-12`)
- Expanded width: 224px (`w-56`)
- Collapse state persisted to localStorage
- Smooth CSS transition: `transition-[width] duration-300 ease-in-out`
- Collapsed state shows only icons with `title` attribute tooltips on hover
- Section collapse states persisted independently

### 2. Page Components Are Content Only

Every page component (`pages/*.tsx`) receives the full viewport minus the sidebar and header. Pages render their content into this space. They do not manage layout chrome (sidebar, header, nav).

```
AppLayout
├── Sidebar (app-level, persistent, contextual)
├── Header (app-level, persistent)
└── <Outlet /> ← Pages render HERE and only here
```

### 3. Events and Tasks Are Separate Entities

Calendar events and tasks are fundamentally different things:

- **Events** = things that HAPPEN at a time (meetings, appointments, birthdays). Separate `calendar_events` table with location, RRULE recurrence, external sync IDs.
- **Tasks** = things you DO (have completion state). Live in `tasks` / `task_items` table.

The calendar is a **unified time view** that renders both:
- Events as solid colored blocks (fixed commitments)
- Scheduled tasks as dashed/striped blocks (flexible, can be rescheduled)

Do NOT merge events into tasks or vice versa. A dentist appointment is not a task. Your daughter's birthday is not a task. Keep the data models clean.

### 4. API Patterns

- **PUT, not PATCH** — The backend uses `router.put()` for all updates. Always use `apiClient.put()`.
- **Records are embedded** — `GET /api/bases/:id` returns `{ ...base, properties: [...], records: [...] }`. There is no separate records endpoint. Use `useBase(id)` and extract `.records` from the response.
- **Values, not data** — `BaseRecord.values` is the field data object (not `.data`). When mutating records, send `{ values: { ... } }`.
- **Import extensions** — All imports use `.js` extensions: `import { Button } from '@/components/ui/button.js'`
- **Query key patterns** — Follow the factory pattern in each hooks file (e.g., `baseKeys.detail(id)`, `dashboardKeys.layout()`)
- **Auth** — Email + password, JWT in httpOnly cookie. API keys (`lh_live_*` prefix) for programmatic access. No OAuth, no magic links.

### 5. Module File Organization

Each module follows this structure (see Jobs as the reference implementation):

```
pages/
  {Module}Page.tsx              ← Top-level page, manages selectedId state
  {module}/
    components/
      list/                     ← List/grid view components
      detail/                   ← Detail view components
        cells/                  ← (Bases only) cell renderers/editors
      modals/                   ← All modal dialogs for this module
    utils/
      {module}Constants.ts      ← Icons, types, colors, enums
      {module}Helpers.ts        ← Pure functions (formatting, filtering, sorting)
```

There is NO `sidebar/` directory under a module. Module-specific sidebar content goes in `layouts/sidebarConfig.ts`.

### 6. Zustand Store Conventions

- One store per module for transient UI state (e.g., `stores/basesUiStore.ts`)
- Persist only what survives page refresh (display preferences like cardSize, displayMode)
- Ephemeral state (editingCellKey, filters, sort) resets on navigation
- Use `persist` middleware with a `lyfehub-{module}-ui` localStorage key
- Sidebar store (`stores/sidebarStore.ts`) manages collapse + section toggle state globally

### 7. Component Patterns

- Use shadcn/ui primitives (Dialog, Button, Input, Table, Select, etc.) — don't build custom versions
- Optimistic updates via React Query `onMutate` for instant UX on mutations
- Modals are controlled by parent state (`open` + `onOpenChange` props)
- Cell editing uses Zustand store to track active cell (`editingCellKey`)
- Drag-and-drop via @dnd-kit/sortable for any reorderable list (columns, groups, view configs) — NOT up/down arrow buttons

### 8. Direct Function Binding — No Daisy-Chaining

Every UI button/action MUST call its logic function directly. Never have a handler that programmatically clicks another element.

**WRONG:** `document.querySelector('#some-btn').click()`
**RIGHT:** `someFunction()` — call the actual function

When the same action triggers from multiple places, extract the function and call it from both.

---

## Renames (Applied Everywhere)

| Old | New | Notes |
|-----|-----|-------|
| Apex (as page name) | Jobs | The job management page is called "Jobs" |
| Apex (as sidebar group) | Apex Restoration | Sidebar header for all org-scoped tools |
| Areas of Focus | Areas | |
| TOOLS (sidebar section) | Three sections: Productivity, Tools, Resources | |

---

## Dashboard Design

- **No greeting** — jump straight to widget grid
- react-grid-layout with 12-column responsive grid
- Breakpoints: `{ lg: 1200, md: 996, sm: 768, xs: 480 }`
- Columns: `{ lg: 12, md: 12, sm: 6, xs: 1 }`
- Row height: 80px
- Edit button (top-right) toggles customization mode
- Edit mode: widgets get drag handles + resize handles + red X remove button + "+ Add Widget" picker
- Widget registry pattern (`widgets/registry.ts`) maps type strings to components
- Layout saved/loaded via `GET/PUT /api/dashboard/layout`
- `isDraggable` / `isResizable` only when editing

Default widgets:
| Widget | Position | Source |
|--------|----------|--------|
| My Day | x:0 y:0 w:6 h:4 | Tasks + calendar events for today |
| This Week | x:6 y:0 w:6 h:3 | Week calendar strip with navigation |
| Quick Notes | x:0 y:4 w:6 h:3 | Recent notes list |
| Inbox | x:6 y:3 w:6 h:4 | Unified inbox (tasks + notes + people) |
| Areas | x:0 y:7 w:12 h:3 | Tags base filtered by Type="Area" |

---

## Bases Module Design

### Relations

- Relation properties store arrays of record UUIDs
- Two-way sync via `syncReverseRelation()` in `db/bases.js` — changing a relation value automatically updates the reverse property on the target record
- Filtering relations must resolve UUIDs to display names (search "Mike" not raw UUIDs)
- Relation cache should be preloaded when opening a base

### Base Groups

- Groups are collapsible folders that organize bases
- Three ways to assign a base to a group: drag-and-drop, checkboxes on group creation, dropdown in edit base modal
- Groups have customizable icons, positions, and per-user collapse state persisted in DB
- Deleting a group **ungroups** its bases — does NOT delete them (archive, never delete)
- Drag handles visible on hover, visual feedback with dashed border on drop targets
- Groups belong in the sidebar contextual section for `/bases`, not in the page itself

### Views

- Column reordering uses @dnd-kit/sortable drag-and-drop (NOT up/down arrow buttons)
- Same drag-and-drop pattern for filters and sorts lists in the view config modal
- Smooth animation during drag

### Cell Editing

- Click any cell to enter edit mode (except checkbox which toggles directly, and relation/files which open modals)
- `basesUiStore.editingCellKey` tracks the active cell (`{ recordId, propertyId }`)
- Enter/blur saves, Escape cancels
- Optimistic updates via React Query cache manipulation

---

## Calendar Design

### Architecture

- Separate `calendar_events` table for standalone events (meetings, appointments, birthdays)
- Events have: title, description, location, start/end date+time, all-day flag, timezone, RRULE recurrence, external sync fields
- Tasks have scheduling fields: `scheduled_date`, `scheduled_start`, `scheduled_end`, `is_all_day`
- Calendar renders BOTH as a unified time view

### Visual Distinction

- Events = solid colored blocks (fixed commitments, use their calendar's color)
- Scheduled tasks = dashed/striped blocks (flexible time blocks)
- Current time indicator: red line showing "now" on week/day views

### Interaction

- "Create Event" button must be obvious and discoverable (not hidden behind click-drag)
- Click-drag on empty time slots creates new time blocks
- Month view click on date cell creates event
- Overlapping events use column-splitting layout (like Google Calendar)
- Touch support required for all drag operations

### Future Phases (Not Now)

- RRULE recurring events (daily, weekly, monthly, yearly + custom)
- Google Calendar OAuth sync (read + write)
- Reminders/notifications
- Natural language event creation ("Dentist tomorrow 3pm")

---

## Two-Track Product Architecture

```
LyfeHub v2
├── Core Platform (auth, profiles, API keys, design system)
├── LyfeHub Personal (user_id-scoped)
│   ├── Tasks (lists, smart views, subtasks, My Day, Important, Scheduled)
│   ├── Calendar (unified events + scheduled tasks, 4 views, drag-and-drop)
│   ├── Bases/PKM (custom databases, typed columns, views, relations, groups)
│   ├── Notes (markdown, archive)
│   └── People & Organizations (contacts, CRM-lite)
│
└── Jobs/Apex Enterprise (org_id-scoped)
    ├── Organization layer (orgs, members, 5 roles, middleware)
    ├── Job Management (CRUD, multi-phase, kanban/list/card views)
    ├── Financial (estimates, payments, labor, receipts, work orders, P&L)
    ├── Drying Logs (chambers, visits, readings, IICRC GPP calculations)
    ├── CRM (organizations, contacts, tags, job linking)
    ├── Inventory (catalog, purchases, stock levels, job allocations)
    ├── Enhanced Job Costing (supplements, sub invoices, fuel/mileage)
    ├── Documents (upload, categorize, link to entities)
    ├── Compliance Workflows (templates, steps, gates — in progress)
    └── Personal Bridge (one-way: LyfeHub → Jobs view only)
```

Personal Bridge: LyfeHub notes/tasks can reference a job via `apex_job_ref`, viewable on job detail as read-only widgets. No data copied, no cross-linking in the other direction.

---

## Design System

- Dark mode default (`#0a0a0f` background)
- Neon glassmorphic aesthetic: blur effects, glass cards, neon accent colors
- Tailwind tokens: `text-text-primary`, `text-text-secondary`, `text-text-muted`, `bg-bg-app`, `bg-bg-surface`, `bg-bg-hover`, `border-border`, `text-accent`, `bg-accent-light`
- Neon palette: purple, blue, cyan, pink, orange, green (via CSS variables)
- Primary accent: `#FF8C00` (orange) for active states, highlights, checkboxes
- Glassmorphism cards: `backdrop-filter: blur(12px)`, subtle shadows, rounded corners
- Hover states with slight elevation
- See `resources/apex-integration/STYLE-GUIDE.md` for full system

---

## Naming Conventions

- TypeScript types: `PascalCase` → `BaseRecord`, `JobPhase`
- Components: `PascalCase` → `BaseCell.tsx`, `JobCard.tsx`
- Hooks: `camelCase` with `use` prefix → `useBases()`, `useUpdateBaseRecord()`
- Stores: `camelCase` with `use` prefix → `useBasesUiStore`
- Utils/constants: `camelCase` → `baseHelpers.ts`, `jobConstants.ts`
- DB/API fields: `snake_case` → `base_id`, `created_at`
- DB/API types: `snake_case` → `multi_select` NOT `multi-select`
- CSS classes: Tailwind utilities (no custom CSS classes)

---

## Backend Reference

The backend is unchanged. All endpoints require auth. Backend uses PUT for updates (not PATCH).

### Key Endpoints

- **Auth:** `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/check`
- **Users:** `GET /api/users/me`, `PATCH /api/users/me`, `PUT /api/users/me/password`
- **Bases:** `GET/POST /api/bases`, `GET/PUT/DELETE /api/bases/:id`
- **Base Properties:** `POST /api/bases/:id/properties`, `PUT/DELETE /api/bases/:baseId/properties/:propId`, `PUT /api/bases/:id/properties/reorder`
- **Base Records:** `POST /api/bases/:id/records`, `PUT/DELETE /api/bases/:baseId/records/:recId`
- **Base Views:** `GET/POST /api/bases/:id/views`, `PUT/DELETE /api/bases/:baseId/views/:viewId`
- **Base Groups:** `GET/POST /api/base-groups`, `PUT/DELETE /api/base-groups/:id`, `PUT /api/base-groups/:id/toggle-collapse`, `POST /api/base-groups/collapse-all`, `POST /api/base-groups/expand-all`, `PUT /api/base-groups/reorder`, `PUT /api/bases/:id/assign-group`
- **Dashboard:** `GET/PUT /api/dashboard/layout`
- **Inbox:** `GET /api/inbox`, `GET /api/inbox/count`, `POST /api/inbox/:id/archive`, `POST /api/inbox/capture`
- **Jobs:** `GET/POST /api/apex-jobs`, `GET/PUT/DELETE /api/apex-jobs/:id`, plus sub-resources (phases, notes, estimates, payments, labor, receipts, work orders, contacts, activity)
- **Tasks:** `GET/POST /api/tasks`, `GET/PUT/DELETE /api/tasks/:id`
- **Task Lists:** `GET/POST /api/task-lists`, `GET/PUT/DELETE /api/task-lists/:id`
- **Calendar:** `GET/POST /api/calendars`, `GET/POST /api/calendar-events`, `GET/PUT/DELETE /api/calendar-events/:id`
- **People:** `GET/POST /api/people`, `GET/PUT/DELETE /api/people/:id`
- **Notes:** `GET/POST /api/notes`, `GET/PUT/DELETE /api/notes/:id`
- **Uploads:** `POST /api/uploads`
- **Drying:** `GET/POST /api/apex-jobs/:jobId/drying/*` (logs, chambers, rooms, points, visits, readings)

### Database

- PostgreSQL via `pg` connection pool (`db/pool.js`)
- Async query helpers: `query`, `getOne`, `getAll`, `run`, `exec`, `transaction`
- Parameterized queries with `$1, $2, $3` placeholders
- JSON stored as TEXT, parsed in JS (not Postgres JSONB)
- UUIDs for all record IDs (generated server-side)
- Schema in `db/init.sql`, migrations use `IF NOT EXISTS` / `DO $$ ... END $$` patterns

### Role Permission Matrix (Jobs/Apex)

| Capability | Owner/Admin | Office Coord | Project Mgr | Estimator | Field Tech |
|------------|:-----------:|:------------:|:-----------:|:---------:|:----------:|
| View all jobs | Yes | Yes | Yes | Yes | Assigned only |
| Create/edit jobs | Yes | Yes | No | No | No |
| Estimates | Yes | Yes | No | Yes | No |
| Payments | Yes | Yes | No | No | No |
| Accounting/P&L | Yes | Yes | View only | View only | No |
| Labor logging | Yes | Yes | Yes | No | Yes |
| CRM | Full | Full | View | View | View |
| Inventory | Full | Full | Full | No | Use only |

---

## What's Built

### Infrastructure (Done)
- Vite + React 19 + TypeScript scaffolding
- Tailwind CSS v4 with design tokens (light/dark via `[data-theme="dark"]`)
- TanStack Query, React Router, Zustand
- shadcn/ui components: Button, Card, Dialog, Input, Badge, Table, Select, Checkbox, Label, Separator, Tabs, Textarea, DropdownMenu
- API client (`api/client.ts`) with typed fetch wrapper, 401 redirect, FormData support
- Auth system (`hooks/useAuth.ts` Zustand store + `LoginPage.tsx`)
- Theme system (`contexts/ThemeContext.tsx` — dark/light, localStorage persist, system preference fallback)
- Path alias `@/` → `src/`

### App Shell (Done)
- `App.tsx`, `router.tsx` with auth guards
- `layouts/AppLayout.tsx` — sidebar + header + outlet (correct architecture)
- `layouts/Sidebar.tsx` — persistent app-level sidebar with Quick Capture modal, contextual sections, collapse toggle
- `layouts/sidebarConfig.ts` — route-aware section config with global Apex Restoration section prepended to all routes
- `stores/sidebarStore.ts` — collapse/section state with localStorage persistence
- `layouts/Header.tsx` — theme toggle, user menu, logout
- Apex Restoration sidebar section with global visibility across all routes
- Stub pages for Apex CRM, Inventory, Documents, Workflows, Accounting, Reports

### Dashboard (Done)
- `pages/DashboardPage.tsx` — react-grid-layout widget grid with edit mode
- `widgets/registry.ts`, `WidgetWrapper.tsx`, `AddWidgetDialog.tsx`
- 5 widgets: MyDayWidget, WeekCalWidget, QuickNotesWidget, InboxWidget, AreasWidget
- `api/hooks/useDashboard.ts` — layout + inbox hooks

### Jobs Module (Done — Reference Implementation)
- `pages/JobsPage.tsx` — list/detail toggle
- Full list view: card grid, table, kanban, filters
- Full detail view: header, info cards, phase bar, tabs (dates, notes, expenses, documents, tasks)
- Detail sidebar panels: accounting, activity, contacts
- 8 modal dialogs
- `api/hooks/useJobs.ts`
- `pages/jobs/utils/` — jobConstants.ts, jobFormatters.ts

### Bases Module (Built, Needs Sidebar Fix)
- `pages/BasesPage.tsx` — list/detail toggle (BasesSidebar removed, needs contextual sidebar wired via sidebarConfig.ts)
- Full list view: card grid, table, empty state, toolbar
- Full detail view: table with inline editing, views, filters, column management, property management
- 15 cell renderers + editors
- 15 modal dialogs (create/edit base, create/edit group, add/edit property, add filter, column visibility, view config, relation picker, file upload)
- `api/hooks/useBases.ts` — 26 hooks
- `stores/basesUiStore.ts`
- `pages/bases/utils/` — baseConstants.ts, baseHelpers.ts
- **TODO:** Wire bases group/nav content into `sidebarConfig.ts` as `/bases` route key

### Placeholder Pages
- CalendarPage, TasksPage, PeoplePage — stub components

---

## Future Features (Do Not Build Yet)

- **User Profile page** — Facebook-style social feed, linked from sidebar user name
- **Areas widget content** — Populate Tags base with Area records
- **Per-page sidebar configs** — Define contextual sections for Tasks, Jobs, People, Calendar, Bases
- **Resources section** — Show Base Views as quick-access links in sidebar
- **Mobile bottom sheet** — Tap-again on active nav item opens context sheet with section-specific content (filters, views, etc.). iPad landscape renders as sidebar panel instead of sheet.
- **Task-Calendar deep integration** — Drag unscheduled tasks onto calendar for time blocking
- **Cross-linking infrastructure** — Generic `links` table for any-to-any entity references (Note→Task, Task→Project, etc.)
- **Personal Bridge** — `apex_job_ref` on notes/tasks, "My Notes"/"My Tasks" widgets on job detail
- **External calendar sync** — Google Calendar OAuth
- **Drying Logs React UI** — phases 3-8 of drying log feature (backend/API already built)
- **CRM frontend** — Organizations, contacts, tags, job linking
- **Document management frontend** — Drag-and-drop upload, grouped display, photo gallery
- **Inventory frontend** — Catalog, stock levels, purchase recording
- **Compliance workflow UI** — Template builder + job progress view
- **Notification system** — In-app, push, email, SMS

---

## Development

```bash
# Start dev server (from frontend-next/)
npm run dev                    # Vite on port 5174

# Type check
npx tsc --noEmit

# Build
npm run build

# Backend (Docker, must be running for API calls)
docker start lyfehub-dev lyfehub-dev-db
```

---

## Design Docs (Source of Truth)

These documents contain the original design discussions and decisions. This CLAUDE.md is the consolidated reference — if in doubt, check the source doc.

- `docs/plans/2026-02-26-sidebar-dashboard-design.md` — Approved sidebar + dashboard design
- `docs/plans/2026-02-26-sidebar-dashboard-plan.md` — Implementation plan for sidebar + dashboard
- `docs/ROADMAP.md` — Full app roadmap: what's built, what's remaining, activity log. **UPDATE THIS FILE** each time a feature is worked on or completed.
- `CALENDAR-WORKING-DOC.md` — Calendar architecture (events vs tasks decision, ADHD principles)
- `GROUPS-IMPLEMENTATION.md` — Base groups design (drag-and-drop, collapsible, three assignment methods)
- `RELATIONS-ANALYSIS.md` — Relation property design (two-way sync, UUID resolution)
- `MIGRATION-GUIDE.md` — SQLite → PostgreSQL patterns (already applied)
