# CLAUDE.md — APM (Apex Project Management)

This is the bible for the APM React frontend. Every design decision below is final and non-negotiable.

## What This Is

APM is the React frontend for LyfeHub — a personal productivity and business operations platform with a neon glassmorphic dark-mode UI. It covers personal modules (Tasks, Calendar, Notes, People, Bases) and enterprise job management for Apex Restoration.

- **Dev server:** Vite on port 5174, proxies `/api/*` to backend on port 3000
- **Backend:** LyfeHub-v2 backend — Node/Express + PostgreSQL (separate repo, must be running for API calls)

## Tech Stack

- React 19, TypeScript, Vite
- Tailwind CSS v4 with LyfeHub design tokens
- TanStack Query (React Query) for data fetching
- Zustand for client-side UI state
- shadcn/ui component library
- @dnd-kit for drag-and-drop (column reorder, group reorder, tab reorder)
- react-grid-layout for dashboard widget grid
- framer-motion for header tab crossfade animations
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

1. **Default to Today** — Landing views show what matters now, not an overview.
2. **Progressive disclosure** — Show simple forms first, expand for details.
3. **Calm colors** — Blue/green/purple. Red ONLY for truly urgent.
4. **No guilt mechanics** — No streaks, no shame for missed tasks. Gentle "reschedule?" nudges.
5. **Quick capture under 15 seconds** — Item creation must be fast.
6. **"Reschedule / Drop it" on overdue** — Two buttons, no judgment.
7. **Celebration on completion** — Small animation/feedback for completing items.
8. **Capacity awareness** — Don't let views get so full they cause overwhelm.

---

## Architecture Rules (Non-Negotiable)

### 0. Bases Are the Data Layer — Module Pages Are Polished Views (MOST IMPORTANT)

**The Bases system IS the database for all personal data.** Every personal module page (Tasks, People, Notes, etc.) is a specialized, polished UI that reads and writes records from its corresponding default base. There are NO separate tables for these entities.

| Module Page | Reads/Writes From | Default Base |
|-------------|-------------------|--------------|
| Tasks (`/tasks`) | `base_records` via Bases API | "Tasks" base (21 properties) |
| People (`/people`) | `base_records` via Bases API | "People" base (25 properties) |
| Notes (`/notes`) | `base_records` via Bases API | "Notes" base (14 properties) |
| Projects | `base_records` via Bases API | "Projects" base (12 properties) |

**What this means in practice:**
- If you add a task in the Tasks page -> it creates a record in the Tasks base -> it appears in the Bases view
- **ONE source of truth** — the `base_records` table, accessed via `/api/bases/:id/records`
- Module pages use `useBase(id)` / `useDefaultBase('Tasks')` and base record mutation hooks
- Smart views (My Day, Important, Scheduled) are **client-side filters**, not separate backend queries

**Exception:** Calendar events are NOT base records — they live in `calendar_events` table (time-based with recurrence).
**Exception:** Jobs/Apex data is org-scoped and uses its own `apex_*` tables.

### 1. Persistent Header — Area Buttons, Module Tabs, Actions

The app has ONE persistent header with three zones:

**Left zone — Area buttons:** "Dashboard" (Personal tabs) and "Apex Restoration" (Apex tabs)
**Center zone — Module tabs:** Per-area tabs, drag-reorderable in edit mode, per-tab styling
**Right zone — Actions:** Quick Capture, display mode toggle, settings, theme toggle, user

**Pages MUST NOT render their own headers or navigation.**

### 1b. Contextual Sidebar — Page-Specific Content Only

The sidebar renders only on routes that have page-specific content:

| Route | Sidebar Content |
|-------|----------------|
| `/calendar` | Mini-calendar, calendar list, Google sync |
| `/tasks` | Smart views, my lists, task counts |
| `/mail` | Folders, labels |
| `/bases` | Base groups, base browser |

All other pages get full-width content with no sidebar.

### 2. Page Components Are Content Only

Every page component receives the full viewport minus header (and sidebar, if present). Pages render content only — no layout chrome.

```
AppLayout
├── Header (persistent)
├── Sidebar (contextual, only on some routes)
└── <Outlet /> ← Pages render HERE
```

### 3. Events and Tasks Are Separate Entities

- **Events** = things that HAPPEN at a time (meetings, appointments). Separate `calendar_events` table.
- **Tasks** = things you DO (have completion state). Live in the Tasks default base as `base_records`.

The calendar is a **unified time view** rendering both as different visual styles.

### 4. API Patterns

- **PUT, not PATCH** — Backend uses `router.put()` for updates. Always use `apiClient.put()`.
- **Records are embedded** — `GET /api/bases/:id` returns `{ ...base, properties, records }`.
- **Core bases API** — Default bases have dedicated routes: `/api/bases/core/:id`, `/api/bases/default/:name`.
- **Values, not data** — `BaseRecord.values` is the field data object (not `.data`).
- **Import extensions** — All imports use `.js` extensions: `import { Button } from '@/components/ui/button.js'`
- **Query key patterns** — Follow the factory pattern in each hooks file.
- **Auth** — Google OAuth via `@react-oauth/google`. JWT in httpOnly `kanban_session` cookie. API keys (`lh_live_*` prefix) for programmatic access.

### 5. Module File Organization

```
pages/
  {Module}Page.tsx              ← Top-level page, manages selectedId state
  {module}/
    components/
      list/                     ← List/grid view components
      detail/                   ← Detail view components
        cells/                  ← (Bases only) cell renderers/editors
      modals/                   ← All modal dialogs
    utils/
      {module}Constants.ts      ← Icons, types, colors, enums
      {module}Helpers.ts        ← Pure functions
```

### 6. Zustand Store Conventions

- One store per module for transient UI state
- Persist only what survives page refresh (display preferences)
- Ephemeral state resets on navigation
- Use `persist` middleware with `lyfehub-{module}-ui` localStorage key

### 7. Component Patterns

- Use shadcn/ui primitives — don't build custom versions
- Optimistic updates via React Query `onMutate`
- Modals controlled by parent state (`open` + `onOpenChange`)
- Drag-and-drop via @dnd-kit/sortable for reorderable lists

### 8. Direct Function Binding — No Daisy-Chaining

Every UI button MUST call its logic function directly. Never programmatically click another element.

---

## Naming Conventions

- TypeScript types: `PascalCase` -> `BaseRecord`, `JobPhase`
- Components: `PascalCase` -> `BaseCell.tsx`
- Hooks: `camelCase` with `use` prefix -> `useBases()`
- Stores: `camelCase` with `use` prefix -> `useBasesUiStore`
- Utils/constants: `camelCase` -> `baseHelpers.ts`
- DB/API fields: `snake_case` -> `base_id`, `created_at`
- DB/API types: `snake_case` -> `multi_select` NOT `multi-select`
- CSS classes: Tailwind utilities (no custom CSS classes)

## Design System

- Dark mode default (`#0a0a0f` background)
- Neon glassmorphic aesthetic: blur effects, glass cards, neon accent colors
- Tailwind tokens: `text-text-primary`, `bg-bg-app`, `bg-bg-surface`, `border-border`, `text-accent`, `bg-accent-light`
- Neon palette: purple, blue, cyan, pink, orange, green (via CSS variables)
- Primary accent: `#FF8C00` (orange) for active states
- Glassmorphism cards: `backdrop-filter: blur(12px)`, subtle shadows, rounded corners

---

## Renames (Applied Everywhere)

| Old | New |
|-----|-----|
| Apex (as page name) | Jobs |
| Apex (as area/group) | Apex Restoration |
| Areas of Focus | Areas |

---

## Key Backend Endpoints

The backend is a separate repo. All endpoints require auth. Backend uses PUT for updates (not PATCH).

- **Auth:** `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/check`
- **Users:** `GET /api/users/me`, `PATCH /api/users/me`
- **Bases:** `GET/POST /api/bases`, `GET/PUT/DELETE /api/bases/:id`
- **Base Records:** `POST /api/bases/:id/records`, `PUT/DELETE /api/bases/:baseId/records/:recId`
- **Base Views:** `GET/POST /api/bases/:id/views`, `PUT/DELETE /api/bases/:baseId/views/:viewId`
- **Base Groups:** `GET/POST /api/base-groups`, `PUT/DELETE /api/base-groups/:id`
- **Dashboard:** `GET/PUT /api/dashboard/layout`
- **Jobs:** `GET/POST /api/apex-jobs`, `GET/PUT/DELETE /api/apex-jobs/:id`, plus sub-resources
- **Calendar:** `GET/POST /api/calendars`, `GET/POST /api/calendar-events`, `GET/PUT/DELETE /api/calendar-events/:id`
- **Tasks:** `GET/POST /api/tasks`, `GET/PUT/DELETE /api/tasks/:id`
- **Task Lists:** `GET/POST /api/task-lists`, `GET/PUT/DELETE /api/task-lists/:id`
- **People:** `GET/POST /api/people`, `GET/PUT/DELETE /api/people/:id`

---

## What's Built

### Infrastructure
- Vite + React 19 + TypeScript, Tailwind CSS v4, TanStack Query, React Router, Zustand
- shadcn/ui components, API client, Auth system, Theme system

### App Shell
- AppLayout with persistent Header, contextual Sidebar, DashboardSpringboard
- Header: area buttons, animated tab bar with drag reorder and per-tab styling
- Quick capture modals, display mode toggle

### Modules
- **Dashboard** — react-grid-layout widget grid (My Day, Week Calendar, Quick Notes, Inbox, Areas)
- **Jobs** — Full list/detail with card/table/kanban views, financial tabs, 8 modals (reference implementation)
- **Bases** — Full list/detail with inline cell editing, views, filters, 15 cell types, 15 modals
- **Calendar** — 5 views (Month/Week/3-Day/Day/Agenda), click-drag creation, Google Calendar sync
- **Tasks** — Smart views, 4 display modes (list/cards/board/focus), task detail modal, inline add

### Placeholder Pages
- People, Apex CRM, Inventory, Documents, Workflows, Accounting, Reports

---

## Development

```bash
npm run dev          # Vite on port 5174
npx tsc --noEmit     # Type check
npm run build        # Production build
```

Backend must be running on port 3000 for API calls.

## Plans Directory

All plans created by superpowers skills MUST be saved to `docs/plans/`.
