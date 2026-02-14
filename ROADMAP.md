# LyfeHub v2 — Product Roadmap

> **Last updated:** 2026-02-14  
> **Version:** 2.0  
> **Status:** Living document — updated as features ship

---

## Philosophy

**LyfeHub = personal, Apex = enterprise — same app, different worlds.**

| | LyfeHub (Personal) | Apex (Enterprise) |
|---|---|---|
| **Data ownership** | User owns their data (`user_id`) | Organization owns data (`org_id`) |
| **Audience** | Individual productivity | Team-based business operations |
| **Design goal** | Consumer-grade polish, zero friction | Enterprise-level detail and security |
| **Access model** | Private to each user | Shared across org, role-gated |
| **Intersection** | One-way bridge: personal → Apex view only | Never leaks into LyfeHub |

**Core principles:**
- Archive, never delete
- Role-based everything on the Apex side
- Org-scoped data isolation with RLS
- Manual-first — works without AI
- If it's not simple, it's wrong

---

## 🔥 Recently Completed

| Feature | Track | Date | Notes |
|---------|-------|------|-------|
| Organization model (orgs, members, roles) | Apex | Feb 2026 | `apex_organizations` + `apex_org_members` |
| Org-scoped data access | Apex | Feb 2026 | All job queries filter by `org_id` |
| Financial data filtering by role | Apex | Feb 2026 | Estimates/payments/accounting gated |
| Field tech read restrictions | Apex | Feb 2026 | Techs see only assigned jobs |
| CRM backend (orgs, contacts, tags, job linking) | Apex | Feb 2026 | Full API deployed |
| Inventory & consumables backend | Apex | Feb 2026 | Catalog, purchases, stock levels, job allocations |
| Enhanced job costing backend | Apex | Feb 2026 | Supplements, sub invoices, fuel/mileage |
| Document management backend | Apex | Feb 2026 | Upload, categorize, link to entities |

---

## Status Key

| Icon | Meaning |
|------|---------|
| ✅ | **Complete** — shipped and working |
| 🚧 | **In Progress** — actively being built |
| 📋 | **Planned** — designed/spec'd, not started |
| 💡 | **Future** — idea stage |

---

## Track 1: LyfeHub (Personal Productivity)

> Consumer-grade, polished, streamlined. Private to each user. Focus: enjoyable to use, zero friction.

### Core Platform

| Feature | Status | Notes |
|---------|--------|-------|
| Multi-user auth (login, signup, profiles) | ✅ | Email/username + password, JWT cookies |
| API key access | ✅ | `lh_live_*` prefix, for agents/integrations |
| Profile & settings page | ✅ | About Me + gear icon |
| Neon glassmorphic design system | ✅ | Consistent across all modules |
| Docker deployment | ✅ | Single container, SQLite, nginx reverse proxy |

### Tasks

| Feature | Status | Notes |
|---------|--------|-------|
| Task lists (custom user-created) | ✅ | Full CRUD |
| My Day (tasks due today) | ✅ | Auto-populates by due date |
| Important (starred tasks) | ✅ | Flag-based smart view |
| Scheduled (tasks with due dates) | ✅ | Smart view |
| Agenda (date range picker) | ✅ | Filterable date range |
| Subtasks (one level deep) | ✅ | Simple checklist |
| Markdown descriptions | ✅ | Read/edit toggle |
| Left sidebar navigation | ✅ | Smart views + custom lists |

### Calendar

| Feature | Status | Notes |
|---------|--------|-------|
| Day / 3-day / Week / Month views | ✅ | All shipped |
| Event CRUD with full details | ✅ | Title, description, location, time, duration |
| All-day events | ✅ | Distinguished from timed |
| Recurring events | ✅ | Daily, weekly, monthly, yearly, custom |
| Color coding / categories | ✅ | Per-event and per-calendar |
| Multiple calendars with toggles | ✅ | Personal, work, etc. |
| Quick event creation (click time slot) | ✅ | |
| Drag to reschedule | ✅ | |
| Drag to resize (change duration) | ✅ | |
| Reminders / notifications | ✅ | Configurable timing |
| Search events | ✅ | By title, description, metadata |
| Mini month navigation | ✅ | |

#### Calendar — Future Differentiators

| Feature | Status | Notes |
|---------|--------|-------|
| Task ↔ Calendar deep integration | 📋 | Drag unscheduled tasks onto calendar for time blocking |
| Smart buffer time | 💡 | Auto-insert breaks between back-to-back events |
| Cross-calendar blocking | 💡 | Event on Calendar A auto-blocks time on Calendar B |
| Natural language parsing | 💡 | "Dentist next Tuesday at 2pm" → event |
| ICS import/export | 💡 | Standard format interop |
| External calendar sync (Google, Outlook) | 💡 | Sync, not replace |

### Bases / PKM (Custom Databases)

| Feature | Status | Notes |
|---------|--------|-------|
| Flexible database system | ✅ | Create custom tables with typed columns |
| Column types (text, number, date, boolean, select, multi-select, URL, relation) | ✅ | |
| Table view with sort/filter | ✅ | |
| Custom views (column visibility, sort order, saved filters) | ✅ | |
| Pre-built bases: People, Notes | ✅ | Ship by default |
| Pre-built bases: Organizations | ✅ | |
| Pre-built base: Trade KB | ✅ | Estimating knowledge base |
| Visual search across bases | ✅ | |

### Notes

| Feature | Status | Notes |
|---------|--------|-------|
| Note CRUD | ✅ | Full create/read/update/archive |
| Markdown editor | ✅ | Read/edit toggle |

### People & Organizations

| Feature | Status | Notes |
|---------|--------|-------|
| People (personal contacts) | ✅ | Part of Bases |
| Organizations | ✅ | Part of Bases |

### Cross-Linking Infrastructure

| Feature | Status | Notes |
|---------|--------|-------|
| Generic `links` table (any-to-any) | 📋 | Note→Task, Task→Project, Contact→Project, etc. |
| Link UI in modals (edit + read modes) | 📋 | Search/select to link, expandable sections to view |

### Future Ideas (LyfeHub)

| Feature | Status | Notes |
|---------|--------|-------|
| Books base (reading tracker) | 💡 | Pre-built base |
| Recipes base | 💡 | Pre-built base |
| AI-powered calendar suggestions | 💡 | Pattern detection, focus time |
| Mobile app (PWA) | 💡 | Progressive web app for mobile access |

---

## Track 2: Apex (Enterprise Business Platform)

> Enterprise-level detail and security. Org-based, shared across team members, role-gated. Built for restoration industry operations.

### Organization & Access Control

| Feature | Status | Notes |
|---------|--------|-------|
| Organization model (`apex_organizations`) | ✅ | Tenant-level data isolation |
| Org membership + roles (`apex_org_members`) | ✅ | management, office_coordinator, project_manager, estimator, field_tech |
| Org-aware middleware (`requireOrgMember`, `requireOrgRole`) | ✅ | All Apex routes org-gated |
| Data migration (existing jobs → org-scoped) | ✅ | Backward compatible |
| Org management API (members, roles) | ✅ | Add/remove members, change roles |
| Conditional Apex tab (only for org members) | ✅ | Non-members don't see Apex |
| Frontend permission helpers (org role) | ✅ | UI buttons gated by role |
| Financial UI hidden for unauthorized roles | ✅ | Field techs see no financial data |
| Team assignment dropdowns (org members) | ✅ | Filtered by role |
| API key auth compatibility | ✅ | API key users need org membership |

#### Role Permission Matrix

| Capability | Owner/Admin | Office Coord | Project Mgr | Estimator | Field Tech |
|------------|:-----------:|:------------:|:-----------:|:---------:|:----------:|
| View all jobs | ✅ | ✅ | ✅ | ✅ | Assigned only |
| Create/edit jobs | ✅ | ✅ | ❌ | ❌ | ❌ |
| Estimates | ✅ | ✅ | ❌ | ✅ | ❌ |
| Payments | ✅ | ✅ | ❌ | ❌ | ❌ |
| Accounting/P&L | ✅ | ✅ | View only | View only | ❌ |
| Labor logging | ✅ | ✅ | ✅ | ❌ | ✅ |
| Work orders | ✅ | ✅ | ✅ | ❌ | ❌ |
| CRM | Full | Full | View | View | View |
| Inventory | Full | Full | Full | ❌ | Use only |
| Org settings | ✅ | ❌ | ❌ | ❌ | ❌ |

### Job Management

| Feature | Status | Notes |
|---------|--------|-------|
| Job CRUD with auto-naming | ✅ | `{client} - {address}` |
| Multi-phase jobs (MIT, RPR, RMD, ABT, REM, FR) | ✅ | Each phase gets unique job number `YYYYMM-SEQ-TYPE` |
| Job detail view (full-page) | ✅ | Main panel + sidebar layout |
| Kanban view (Active / Pending Insurance / Complete) | ✅ | Drag-and-drop columns |
| List view (sortable table) | ✅ | Transforms to cards on mobile |
| Card view (grid) | ✅ | Progress bars, phase badges |
| Milestone dates (7 fields) | ✅ | Inline click-to-edit |
| Status management | ✅ | active, pending_insurance, complete, archived |
| Job assignment fields | ✅ | PM, estimator, coordinator, techs |
| Mobile responsive (drawer, swipe, FAB) | ✅ | Full mobile UI |
| Zoho Projects integration (read-only merge) | ✅ | Synced every 10 min via cron |

### Financial Tracking

| Feature | Status | Notes |
|---------|--------|-------|
| Estimates with versioning | ✅ | Auto-versioned per type, status workflow |
| Payments tracking | ✅ | Check, ACH, credit, cash; linked to estimates |
| Labor logging | ✅ | Hours × rate, work categories, billable flag |
| Receipts/materials | ✅ | Expense categories, vendor tracking |
| Work orders | ✅ | Draft → approved → in_progress → completed |
| Accounting sidebar with P&L | ✅ | Per-phase breakdown, GP margin |
| Ready-to-invoice toggle | ✅ | |

### Notes & Activity

| Feature | Status | Notes |
|---------|--------|-------|
| Job notes (general, call, email, site_visit, documentation) | ✅ | Type badges, author tracking |
| Activity/audit logging | ✅ | All mutations logged with actor |
| Activity timeline (filterable) | ✅ | In sidebar |

### Drying Logs Subsystem

| Feature | Status | Notes |
|---------|--------|-------|
| Structure setup (chambers → rooms → ref points) | ✅ | Full hierarchy |
| Baselines (target MC per material) | ✅ | IICRC S500 standard |
| Site visits with atmospheric readings | ✅ | Temp/RH/GPP auto-calculated |
| Moisture content readings | ✅ | Per ref point, dry standard check |
| Equipment tracking per room per visit | ✅ | Air movers, dehus, etc. |
| Visit notes with photos | ✅ | Upload, process, thumbnail generation |
| IICRC GPP calculation (IAPWS formula) | ✅ | Scientifically accurate |
| Meets-dry-standard auto-check | ✅ | `reading ≤ baseline + 4` |
| Photo processing (HEIC, EXIF rotation, thumbnails) | ✅ | Sharp pipeline |

### CRM (Customer Relationship Management)

| Feature | Status | Notes |
|---------|--------|-------|
| CRM organizations (insurance carriers, subs, vendors) | ✅ Backend | Full CRUD API with org scoping |
| CRM org tags (multi-tag, type classification) | ✅ Backend | Tag management + assignment |
| CRM contacts (clients, adjusters, agents, sub contacts) | ✅ Backend | Full CRUD with search |
| Contact tags | ✅ Backend | Independent tag system |
| Contact ↔ CRM org memberships (many-to-many with roles) | ✅ Backend | Role at each org |
| Job ↔ contact linking (role on job) | ✅ Backend | Replaces old junction table |
| **CRM organizations & contacts UI** | 📋 | Management page with search, tags, detail panels |
| **CRM contact picker on job detail** | 📋 | Replace old contacts section |

### Inventory & Consumables

| Feature | Status | Notes |
|---------|--------|-------|
| Consumable items catalog | ✅ Backend | Name, category, unit, cost; unique per org |
| Inventory purchases | ✅ Backend | Auto-updates stock levels |
| Inventory levels tracking | ✅ Backend | Quantity on hand per item |
| Job material allocations | ✅ Backend | Decrements stock, tracks cost per job |
| **Inventory management UI** | 📋 | Catalog, stock levels, purchase recording |
| **Material allocation on job expenses tab** | 📋 | Item picker, quantity, phase, auto-cost |
| Low stock alerts | 💡 | Configurable reorder thresholds |

### Enhanced Job Costing

| Feature | Status | Notes |
|---------|--------|-------|
| Supplements (additional scope changes) | ✅ Backend | Auto-numbered, status workflow |
| Sub invoices (subcontractor invoices) | ✅ Backend | Payment tracking, retainage, CRM org linking |
| Fuel & mileage tracking | ✅ Backend | IRS rate or actual fuel cost |
| Enhanced P&L (all cost categories) | ✅ Backend | Revenue: estimates + supplements; Costs: labor + receipts + materials + subs + fuel |
| **Supplements UI (Expenses tab)** | 📋 | List, add, status management |
| **Sub invoices UI (Expenses tab)** | 📋 | CRM org picker, retainage, payment tracking |
| **Fuel/mileage UI (Expenses tab)** | 📋 | Type toggle, IRS rate default, running total |
| **Enhanced accounting sidebar** | 📋 | All new cost categories in P&L display |

### Document Management

| Feature | Status | Notes |
|---------|--------|-------|
| Universal document table | ✅ Backend | Type-classified, entity-linkable |
| File upload API (multer, 25MB max) | ✅ Backend | PDF, images, Office docs |
| Document download/serve | ✅ Backend | Correct MIME types |
| **Document upload UI (drag & drop)** | 📋 | On job detail Documents tab |
| **Document list grouped by type** | 📋 | Estimates, photos, contracts, receipts |
| **Photo gallery with lightbox** | 📋 | Thumbnail grid, click to expand |

### Compliance Workflow Engine

| Feature | Status | Notes |
|---------|--------|-------|
| Workflow templates (blueprint definitions) | 🚧 | Draft → published → archived |
| Template steps (ordered, role-assigned) | 🚧 | Sequence-based with estimated duration |
| Step gates (preconditions) | 🚧 | 10 gate types: previous_step, document_exists, manual_approval, drying_standard_met, etc. |
| Job workflow instances (stamp from template) | 🚧 | Copied at stamp time, in-flight jobs unaffected by template edits |
| Job workflow steps (status lifecycle) | 🚧 | locked → available → in_progress → complete/skipped/overridden |
| Gate evaluation engine | 🚧 | Auto-re-evaluate downstream gates on step completion |
| **Compliance workflow builder UI** | 📋 | Create/edit templates, define steps and gates |
| **Compliance workflow job view** | 📋 | Visual step progress, gate status, override controls |

### Notification System

| Feature | Status | Notes |
|---------|--------|-------|
| Job assignment alerts | 📋 | Notify on assignment to job/phase |
| Workflow step alerts | 📋 | Notify when step becomes available |
| In-app notification center | 📋 | Bell icon, unread count, notification list |
| Push notifications | 💡 | Browser push API |
| Email notifications | 💡 | SMTP delivery |
| SMS notifications | 💡 | Twilio or similar |

### Personal Bridge

> One-way: personal LyfeHub data viewable from Apex job dashboard. No data copied, no cross-linking.

| Feature | Status | Notes |
|---------|--------|-------|
| `apex_job_ref` column on LyfeHub notes/tasks | 📋 | Soft reference (no FK) |
| Notes/tasks API: filter by job ref | 📋 | `GET /api/notes?apex_job_ref=<jobId>` |
| "My Notes" widget on job detail | 📋 | Current user's tagged notes, read-only in Apex context |
| "My Tasks" widget on job detail | 📋 | Current user's tagged tasks, checkbox toggle |

### Future Ideas (Apex)

| Feature | Status | Notes |
|---------|--------|-------|
| Reporting dashboard | 💡 | Company-wide metrics, job profitability trends, team utilization |
| Time clock / attendance | 💡 | Clock in/out, timesheet approval |
| Client portal | 💡 | Clients view job progress, documents, photos |
| Mobile app (React Native or PWA) | 💡 | Field-optimized: photos, readings, time logging |
| QuickBooks/Xero integration | 💡 | Company-level accounting sync |
| Zoho two-way sync | 💡 | Write back to Zoho Projects |
| Equipment tracking (non-consumable) | 💡 | Dehumidifiers, air movers — assignment, maintenance, depreciation |
| Multi-org support | 💡 | Org switcher for users in multiple organizations |

---

## Implementation Priority

### Now (Active Development)

1. **Compliance workflow engine** — backend tables + API (🚧 in progress)
2. **CRM frontend UI** — organizations, contacts, tags, job linking
3. **Document upload frontend** — drag & drop, grouped display, photo gallery

### Next

4. **Inventory management frontend** — catalog, stock levels, purchases
5. **Job costing frontend enhancements** — supplements, sub invoices, fuel/mileage tabs
6. **Enhanced accounting sidebar** — all cost categories in P&L
7. **CRM contact picker on job detail** — replace old contacts section

### After That

8. **Compliance workflow builder UI** — template editor
9. **Compliance workflow job view** — visual progress
10. **Personal bridge** — `apex_job_ref`, widgets on job dashboard
11. **Notification system** — assignment alerts, workflow step alerts
12. **Task ↔ Calendar integration** — drag tasks to time-block

### Later

13. Cross-linking infrastructure (any-to-any)
14. Reporting dashboard
15. Client portal
16. Mobile app

---

## Architecture Reference

```
LyfeHub v2
├── Core Platform (auth, profiles, API keys, design system)
├── LyfeHub Personal (user-owned)
│   ├── Tasks (lists, smart views, subtasks)
│   ├── Calendar (views, events, recurring, drag/drop)
│   ├── Bases/PKM (custom databases, typed columns, views)
│   ├── Notes (markdown, archive)
│   └── People & Organizations (contacts)
│
└── Apex Enterprise (org-owned)
    ├── Organization layer (orgs, members, roles, middleware)
    ├── Job Management (CRUD, phases, views, assignments)
    ├── Financial (estimates, payments, labor, receipts, work orders)
    ├── Drying Logs (chambers, visits, readings, IICRC calculations)
    ├── CRM (organizations, contacts, tags, job linking)
    ├── Inventory (catalog, purchases, levels, job allocations)
    ├── Enhanced Job Costing (supplements, sub invoices, fuel/mileage)
    ├── Documents (upload, categorize, link to entities)
    ├── Compliance Workflows (templates, steps, gates, instances)
    ├── Notifications (planned)
    └── Personal Bridge (one-way: LyfeHub → Apex view)
```

```
Data Ownership:
  LyfeHub tables → WHERE user_id = ?
  Apex tables    → WHERE org_id = ?
  Bridge         → Runtime query only, no data copy
```

---

*This roadmap is updated as features ship. For implementation details, see `/docs/apex-enterprise-plan.md` and `/docs/apex-vision-and-data-model.md`.*
