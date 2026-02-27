# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

LyfeHub is a personal productivity web app with a neon glassmorphic dark-mode UI. It started as a kanban board and has evolved into a multi-module platform covering Projects, Tasks, Calendar, People/CRM, Bases (Notion-style databases), and Apex job management (water damage restoration business). Single-user app deployed via Docker.

## Development Commands

```bash
# Local development (no Docker)
cd backend && npm install && npm run dev   # Node --watch on src/index.js (port 3000)

# Docker development
docker-compose up -d --build               # Build and run
docker-compose logs -f                     # Tail logs

# Production deployment
docker-compose -f docker-compose.prod.yml up -d --build
```

There is no test suite, linter, or build step configured. The frontend is vanilla JS served as static files.

## Architecture

### Backend (`backend/`)
- **Runtime:** Node 20 + Express, no TypeScript, CommonJS modules
- **Database:** PostgreSQL via `pg` (connection pool in `db/pool.js`)
- **Entry point:** `backend/src/index.js` — mounts all route modules and serves the frontend as static files with SPA fallback
- **Auth:** Dual auth in `middleware/auth.js` — JWT cookies for browser sessions, `lh_live_*` prefixed API keys (hashed in DB) for programmatic access. All API auth goes through user-scoped API keys validated against the `api_keys` table.

### Database Schema (`backend/src/db/`)
- **`schema.js`** — Creates/migrates core tables: `users`, `tasks`, `calendars`, `people`, `people_groups`, `api_keys`, `notes`, `projects`, `tags`, `goals`, `milestones`, `work_sessions`, `inbox`. Exports init function.
- **`bases.js`** — Notion-style databases: `bases`, `base_properties`, `base_records`, `base_groups`, `base_views`. Contains all relation helpers (two-way sync, reverse relations, cascade cleanup). This is the most complex DB module.
- **`apexSchema.js`** — Apex restoration job management: `apex_jobs`, `apex_job_phases`, `apex_job_notes`, `apex_job_estimates`, `apex_job_payments`, `apex_job_labor`, `apex_job_receipts`, `apex_job_work_orders`, `apex_job_contacts`, `apex_job_activity`.
- Schema migrations use PostgreSQL `IF NOT EXISTS` / `DO $$ ... END $$` patterns.

### API Routes (`backend/src/routes/`)
All routes are REST, JSON-based, and require auth via `authMiddleware`. Key route files: `tasks.js`, `taskLists.js`, `bases.js`, `base-views.js`, `people.js`, `apexJobs.js`, `apexCrm.js`, `apexDocuments.js`, `apexInventory.js`, `apexOrgs.js`, `apexWorkflows.js`, `calendars.js`, `calendarEvents.js`, `goals.js`, `milestones.js`, `workSessions.js`, `inbox.js`, `dashboard.js`, `uploads.js`, `apiKeys.js`, `users.js`, `admin.js`, `audit.js`, `roles.js`, `system.js`.

### Frontend (`frontend/`)
- **Vanilla JS** — No framework, no bundler, no transpilation
- **Pages:** `index.html` (main dashboard), `login.html`, `settings.html`, `about.html`
- **Tab-based SPA:** Header tabs switch between modules: Apex, Projects, Tasks, Bases, People, Calendar
- **JS modules** (`frontend/js/`): Each tab/feature has its own JS file (e.g., `apex-jobs.js`, `tasks.js`, `people.js`, `bases.js`, `calendar.js`). `api.js` is the shared HTTP client. `dashboard-controller.js` handles the dashboard view. `modal.js` handles task modals.
- **CSS** (`frontend/css/`): `style.css` is the main stylesheet. `apex-theme.css` + `apex-jobs.css` for Apex styling. Multiple `*-mobile.css` and `*-responsive.css` files for mobile support.
- **Design system:** Dark mode (#0a0a0f background), neon glassmorphic cards with blur effects, CSS variables for neon palette (`--neon-purple`, `--neon-blue`, `--neon-cyan`, `--neon-pink`, `--neon-orange`, `--neon-green`). See `resources/apex-integration/STYLE-GUIDE.md` for full color system.

## Design Principles (Non-Negotiable)

### Direct Function Binding — NO Daisy-Chaining
**Every UI button/action MUST call its logic function directly.** Never have a button that programmatically `.click()`s another button in the DOM.

❌ **WRONG:** `document.querySelector('#some-other-btn').click()`
✅ **RIGHT:** `someFunction()` — call the actual function

When the same action needs to be triggered from multiple places (e.g., desktop sidebar AND mobile context sheet), **expose the function globally** (`window.myFunction = myFunction`) and call it from both places. This prevents:
- Silent breakage when the target button is renamed/removed
- Tight coupling between unrelated UI components
- Debugging nightmares where button A breaks because button B changed

### Naming Conventions
- DB/API types: `snake_case` → `multi_select` NOT `multi-select`
- API JSON fields: `snake_case` → `base_id` NOT `baseId`
- CSS classes: `kebab-case` → `.job-card`
- JS variables: `camelCase` → `activeTab`

## Key Patterns

- **IDs:** UUID v4 for all records (generated server-side via `uuid` package)
- **JSON-in-DB:** Array/object fields stored as JSON text (e.g., `acceptance_criteria`, `tags`, `subtasks`, property `options`). Always `JSON.parse()` on read, `JSON.stringify()` on write.
- **Bases relations:** Properties of type `relation` store arrays of record IDs. Two-way sync is handled by `syncReverseRelation()` in `db/bases.js` — when a relation value changes, the reverse property on the target record is automatically updated.
- **Parameterized queries:** PostgreSQL parameterized queries via `db/pool.js` helpers (`query`, `getOne`, `run`, `exec`).

## Environment Variables

Required: `JWT_SECRET`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`. See `.env.example` for all options.

## Docker

Dockerfile: Node 20 Alpine multi-stage build. Runs as non-root `lyfehub` user. Two compose files: `docker-compose.yml` (development) and `docker-compose.prod.yml` (production).

## Reference Docs

- `ROADMAP.md` — Feature roadmap and design principles
- `resources/apex-integration/STYLE-GUIDE.md` — Full neon glassmorphic design system
- `resources/apex-integration/APEX-DEV-REFERENCE.md` — Apex module development reference
- `docs/ub3-schemas/` — Schema documentation for each entity type
