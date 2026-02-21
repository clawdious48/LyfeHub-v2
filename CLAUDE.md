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
- **Database:** SQLite via `better-sqlite3`, stored at `/data/kanban.db` (Docker volume)
- **Entry point:** `backend/src/index.js` — mounts all route modules and serves the frontend as static files with SPA fallback
- **Auth:** Dual auth in `middleware/auth.js` — JWT cookies for browser sessions, `lh_live_*` prefixed API keys (hashed in DB) for programmatic access. No legacy `KANBAN_API_KEY` bearer tokens; all API auth now goes through user-scoped API keys validated against the `api_keys` table.

### Database Schema (`backend/src/db/`)
- **`schema.js`** — Creates/migrates core tables: `users`, `tasks` (kanban), `task_items` (personal todos), `calendars`, `task_item_calendars`, `people`, `people_groups`, `api_keys`, `organizations`, `notes`, `projects`, `tags`. Exports the `db` instance.
- **`bases.js`** — Notion-style databases: `bases`, `base_properties`, `base_records`, `base_groups`, `base_views`. Contains all relation helpers (two-way sync, reverse relations, cascade cleanup). This is the most complex DB module.
- **`apexSchema.js`** — Apex restoration job management: `apex_jobs`, `apex_job_phases`, `apex_job_notes`, `apex_job_estimates`, `apex_job_payments`, `apex_job_labor`, `apex_job_receipts`, `apex_job_work_orders`, `apex_job_contacts`, `apex_job_activity`.
- Schema migrations use try/catch `ALTER TABLE ADD COLUMN` pattern (SQLite ignores if column exists).

### API Routes (`backend/src/routes/`)
All routes are REST, JSON-based, and require auth via `authMiddleware`. Key route files: `tasks.js`, `taskItems.js`, `taskLists.js`, `bases.js`, `people.js`, `apexJobs.js`, `calendars.js`, `uploads.js`, `apiKeys.js`, `users.js`.

### Frontend (`frontend/`)
- **Vanilla JS** — No framework, no bundler, no transpilation
- **Pages:** `index.html` (main dashboard), `login.html`, `settings.html`, `about.html`
- **Tab-based SPA:** Header tabs switch between modules: Apex, Projects, Tasks, Bases, People, Calendar
- **JS modules** (`frontend/js/`): Each tab/feature has its own JS file (e.g., `apex-jobs.js`, `tasks.js`, `people.js`, `bases.js`, `calendar.js`). `api.js` is the shared HTTP client. `kanban.js` handles the dashboard/kanban view. `modal.js` handles task modals.
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
- **JSON-in-SQLite:** Array/object fields stored as JSON text (e.g., `acceptance_criteria`, `tags`, `subtasks`, property `options`). Always `JSON.parse()` on read, `JSON.stringify()` on write.
- **Bases relations:** Properties of type `relation` store arrays of record IDs. Two-way sync is handled by `syncReverseRelation()` in `db/bases.js` — when a relation value changes, the reverse property on the target record is automatically updated.
- **Prepared statements:** All DB queries use `better-sqlite3` prepared statements defined at module scope. Transactions use `db.transaction()`.

## Environment Variables

Required: `JWT_SECRET`. See `.env.example` for all options. Database path defaults to `/data/kanban.db`.

## Docker

Multi-stage Dockerfile: Node 20 Alpine builder + runtime. Runs as non-root `kanban` user. Multiple compose files exist for different environments (dev, prod, preview, test, mobile-preview).

## Reference Docs

- `SPEC.md` — Original project spec and API schema
- `ROADMAP.md` — Feature roadmap and design principles
- `resources/apex-integration/STYLE-GUIDE.md` — Full neon glassmorphic design system
- `resources/apex-integration/APEX-DEV-REFERENCE.md` — Apex module development reference
- `docs/ub3-schemas/` — Schema documentation for each entity type
