# LyfeHub v2 — Product Roadmap

A living document tracking feature status across the entire LyfeHub platform. Update this file whenever features are started, completed, or re-scoped.

**Last updated:** 2026-03-01

---

## Status Legend

| Status | Meaning |
|--------|---------|
| Done | Backend + frontend complete and working |
| Backend Only | API/DB exists, frontend not yet built |
| Stub | Route/page exists as placeholder, no real functionality |
| Not Started | No work done yet |
| In Progress | Actively being built |

---

## Core Platform

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Auth (email + password, JWT cookies) | Done | Done | Done |
| API key auth (`lh_live_*` prefix) | Done | -- | Done |
| User profiles (`/api/users/me`) | Done | Not started | Backend Only |
| Theme system (dark/light toggle) | -- | Done | Done |
| Design tokens (neon glassmorphic palette) | -- | Done | Done |
| shadcn/ui component library | -- | Done | Done |
| App layout (sidebar + header + outlet) | -- | Done | Done |
| Sidebar (contextual sections, collapse, Quick Capture) | -- | Done | Done |
| Dashboard (react-grid-layout, 5 widgets, edit mode) | Done | Done | Done |
| Quick Capture (note, task, contact) | Done | Done | Done |
| Settings page | Done | Not started | Backend Only |
| Notification system | Not started | Not started | Not Started |
| Mobile responsive | -- | Not started | Not Started |

---

## LyfeHub Personal (`user_id`-scoped)

### Tasks

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Task CRUD | Done | Stub | Stub |
| Task lists | Done | Not started | Backend Only |
| Subtasks (JSON-in-DB) | Done | Not started | Backend Only |
| Smart views (My Day, Important, Scheduled, All) | Not started | Not started | Not Started |
| Task modal (create/edit with full fields) | Done | Not started | Backend Only |
| Kanban view by status | Done | Not started | Backend Only |
| Drag-and-drop reorder | Not started | Not started | Not Started |
| Task scheduling (date, start/end time) | Done | Not started | Backend Only |
| Tags | Done | Not started | Backend Only |
| Acceptance criteria | Done | Not started | Backend Only |

### Calendar

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Calendar CRUD | Done | Done | Done |
| Calendar events CRUD | Done | Done | Done |
| Month view | -- | Done | Done |
| Week view | -- | Done | Done |
| 3-Day view | -- | Done | Done |
| Day view | -- | Done | Done |
| Agenda view | -- | Done | Done |
| Unified view (events + scheduled tasks) | Done | Done | Done |
| Click-drag to create time blocks | -- | Done | Done |
| Google Calendar sync | Done | Done | Done |
| Drag to move/resize events | Not started | Not started | Not Started |
| Recurring events (RRULE) | Not started | Not started | Not Started |
| Reminders / notifications | Not started | Not started | Not Started |
| Task drag from sidebar to grid | Not started | Not started | Not Started |

### Mail (Gmail Integration)

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Gmail OAuth connection | Done | Done | Done |
| Token encryption (AES-256-GCM) | Done | -- | Done |
| Message list (inbox, labels, search) | Done | Done | Done |
| Message reading pane | Done | Done | Done |
| Thread view (collapsible accordion) | Done | Done | Done |
| Compose with Tiptap rich text | Done | Done | Done |
| Reply / Reply All / Forward | Done | Done | Done |
| File attachments (send + download) | Done | Done | Done |
| Contact autocomplete (People API) | Done | Done | Done |
| Labels (list, create, delete, apply) | Done | Done | Done |
| Gmail filters (list, create, delete) | Done | Done | Done |
| Keyboard shortcuts (customizable) | Done | Done | Done |
| Sidebar integration (contextual labels) | -- | Done | Done |
| Responsive layout (desktop/tablet/mobile) | -- | Done | Done |
| Auto-refresh (60s interval) | -- | Done | Done |
| Batch operations (multi-select) | Not started | Not started | Not Started |
| Email signatures | Not started | Not started | Not Started |
| Snooze | Not started | Not started | Not Started |

### Notes

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Note CRUD | Done | Not started | Backend Only |
| Markdown editor | Not started | Not started | Not Started |
| Notes page + route | Not started | Not started | Not Started |
| Archive / soft-delete | Done | Not started | Backend Only |

### People

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| People CRUD | Done | Stub | Stub |
| People groups | Done | Not started | Backend Only |
| Contact detail view | Done | Not started | Backend Only |
| People list (table + card views) | Done | Not started | Backend Only |
| Search + filter | Done | Not started | Backend Only |

### Bases (Notion-style databases)

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Base CRUD | Done | Done | Done |
| Properties (15 types) | Done | Done | Done |
| Records CRUD + inline editing | Done | Done | Done |
| Views (filters, sorts, column visibility) | Done | Done | Done |
| Groups (collapsible folders, drag-and-drop) | Done | Done | Done |
| Relations (two-way sync, UUID resolution) | Done | Done | Done |
| File/image attachments | Done | Done | Done |
| Sidebar browser (bases + groups tree) | Done | Done | Done |
| Column reorder (drag-and-drop) | Done | Done | Done |
| Default bases (Tasks, Projects, Notes, Tags, People) | Done | Done | Done |
| Default base seeding (idempotent, first-login) | Done | -- | Done |
| Default base protection (no delete on is_default) | Done | Done | Done |
| Record pages (open record as full page) | Not started | Not started | Not Started |
| View-scoped page templates (different layouts per view) | Not started | Not started | Not Started |
| Custom page layouts (drag-and-drop sections, widgets) | Not started | Not started | Not Started |

---

## Apex Restoration (`org_id`-scoped)

### Organization and Auth

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Organizations CRUD | Done | Not started | Backend Only |
| Org members + invitations | Done | Not started | Backend Only |
| 5 roles (management, office_coordinator, project_manager, estimator, field_tech) | Done | Not started | Backend Only |
| Role-based middleware (`requireOrgRole`) | Done | -- | Done |
| Phase assignments per role | Done | Not started | Backend Only |
| API scope middleware (`requireScope`) | Done | -- | Done |

### Jobs

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Job CRUD | Done | Done | Done |
| Job phases + phase bar | Done | Done | Done |
| List views (card grid, table, kanban) | Done | Done | Done |
| Job detail view | Done | Done | Done |
| Job filters | Done | Done | Done |
| Notes tab | Done | Done | Done |
| Estimates | Done | Done | Done |
| Payments | Done | Done | Done |
| Labor entries | Done | Done | Done |
| Receipts | Done | Done | Done |
| Work orders | Done | Done | Done |
| Contacts | Done | Done | Done |
| Activity log | Done | Done | Done |
| Accounting summary sidebar | Done | Done | Done |
| Dates tab | Done | Done | Done |
| Documents tab | Done | Done | Done |
| Tasks tab | Done | Done | Done |
| Supplements | Done | Not started | Backend Only |
| Sub invoices | Done | Not started | Backend Only |
| Fuel / mileage | Done | Not started | Backend Only |
| Drying logs | Done | Not started | Backend Only |

### Team (Employee Management)

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Org members roster | Done | Not started | Backend Only |
| Role management | Done | Not started | Backend Only |
| Employee profiles / workload view | Not started | Not started | Not Started |

### Contacts (formerly CRM)

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Contact organizations CRUD | Done | Stub | Stub |
| Contacts CRUD | Done | Not started | Backend Only |
| Organization tags | Done | Not started | Backend Only |
| Contact tags | Done | Not started | Backend Only |
| Memberships (contact-to-org) | Done | Not started | Backend Only |
| Job linking | Done | Not started | Backend Only |
| Search + filters | Done | Not started | Backend Only |
| Saved views (Adjusters, Vendors, Subs, etc.) | Not started | Not started | Not Started |
| Inline contact creation from job form | Not started | Not started | Not Started |

### Inventory

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Item catalog CRUD | Done | Stub | Stub |
| Purchase recording | Done | Not started | Backend Only |
| Stock levels / tracking | Done | Not started | Backend Only |
| Job allocations | Done | Not started | Backend Only |

### Documents

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Document upload | Done | Stub | Stub |
| Image optimization | Done | Not started | Backend Only |
| Document search | Done | Not started | Backend Only |
| Metadata management | Done | Not started | Backend Only |
| Polymorphic attachment (link to any entity) | Done | Not started | Backend Only |

### Workflows

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Workflow templates CRUD | Done | Stub | Stub |
| Steps + gates | Done | Not started | Backend Only |
| Stamp workflow onto job | Done | Not started | Backend Only |
| Step progression + evaluation | Done | Not started | Backend Only |
| Admin overrides | Done | Not started | Backend Only |

### Accounting

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Per-job financial summary | Done | Done (sidebar) | Done |
| Cross-job overview / P&L | Not started | Stub | Stub |
| Invoice generation | Not started | Not started | Not Started |

### Reports

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Job analytics | Not started | Stub | Stub |
| Revenue reporting | Not started | Not started | Not Started |
| Equipment utilization | Not started | Not started | Not Started |
| Employee productivity | Not started | Not started | Not Started |

### Equipment — Future

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Equipment registry | Not started | Not started | Not Started |
| Deployment tracking | Not started | Not started | Not Started |
| Maintenance scheduling | Not started | Not started | Not Started |

### Scheduling — Future

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Crew assignments | Not started | Not started | Not Started |
| Dispatch board | Not started | Not started | Not Started |
| Job scheduling / calendar | Not started | Not started | Not Started |

---

## Cross-Cutting Features

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Mobile responsive layout | -- | Not started | Not Started |
| Personal Bridge (LyfeHub notes/tasks on job detail) | Not started | Not started | Not Started |
| Notification system (in-app, push, email) | Not started | Not started | Not Started |
| Cross-linking (generic `links` table, any-to-any) | Not started | Not started | Not Started |
| AI layer (smart suggestions, natural language) | Not started | Not started | Not Started |
| PWA support | Not started | Not started | Not Started |

---

## Activity Log

| Date | Change | Section |
|------|--------|---------|
| 2026-03-01 | Calendar feature complete — 5 views (Month/Week/3-Day/Day/Agenda), event CRUD, unified events+tasks rendering, click-drag time block creation, Google Calendar two-way sync, quick-create popover, framer-motion animations | Calendar |
| 2026-03-01 | Mail (Gmail Integration) module complete — OAuth, threads, compose, labels, filters, hotkeys, responsive layout, auto-refresh | LyfeHub Personal |
| 2026-03-01 | Default bases seeded (Tasks, Projects, Notes, Tags, People) with 15 property types, is_default protection, auto-timestamps | Bases |
| 2026-02-28 | Created roadmap document | All |
| 2026-02-28 | Added Apex sidebar section with CRM, Inventory, Documents, Workflows, Accounting, Reports stubs | Apex Restoration |
| 2026-02-27 | Bases module complete (CRUD, 15 cell types, inline editing, views, groups, relations, sidebar browser) | Bases |
| 2026-02-26 | Dashboard + sidebar implemented (react-grid-layout, 5 widgets, contextual sidebar, Quick Capture) | Core Platform |
| 2026-02-26 | Jobs module complete (list/detail/modals, all tabs, accounting sidebar — reference implementation) | Apex Restoration |
