# Technology Stack

**Analysis Date:** 2026-02-11

## Languages

**Primary:**
- JavaScript (Node.js) - Backend API and database operations
- JavaScript (Vanilla) - Frontend without frameworks or transpilation

**Secondary:**
- HTML5 - Static page templates
- CSS3 - Styling (no preprocessor)

## Runtime

**Environment:**
- Node.js 20 (Alpine Linux)
- Specified in `Dockerfile` and `backend/package.json` engines field

**Package Manager:**
- npm (managed via `backend/package.json`)
- Lockfile: `backend/package-lock.json` (present)

## Frameworks

**Core:**
- Express 4.21.2 - REST API framework at `backend/src/index.js`
- Vanilla JS - No frontend framework; static SPA with tab-based routing in `frontend/`

**Database:**
- better-sqlite3 11.7.0 - SQLite client for synchronous DB operations
- Database initialization via `backend/src/db/schema.js`, `backend/src/db/bases.js`, `backend/src/db/apexSchema.js`

**Authentication:**
- jsonwebtoken 9.0.2 - JWT token signing/verification for session auth
- bcrypt 6.0.0 - Password hashing for user credentials
- Both used in `backend/src/middleware/auth.js` and `backend/src/routes/auth.js`

**Middleware:**
- cors 2.8.5 - Cross-origin resource sharing
- cookie-parser 1.4.7 - HTTP cookie parsing for session management
- express-rate-limit 7.5.0 - Rate limiting for auth endpoints in `backend/src/routes/auth.js`

**File Handling:**
- multer 2.0.2 - Multipart form data parsing for file uploads at `backend/src/routes/uploads.js`

**Utilities:**
- uuid 11.1.0 - UUID v4 generation for all record IDs throughout backend
- crypto (Node built-in) - SHA256 hashing for API key validation in `backend/src/db/apiKeys.js`

## Key Dependencies

**Critical:**
- better-sqlite3 11.7.0 - Single point of data persistence; all records depend on SQLite database at `/data/kanban.db`
- Express 4.21.2 - HTTP server; if unavailable, entire API becomes inaccessible
- jsonwebtoken 9.0.2 - Authentication mechanism; required for all protected routes
- bcrypt 6.0.0 - Password verification; login functionality depends on it

**Infrastructure:**
- express-rate-limit 7.5.0 - Protects auth endpoints from brute force
- multer 2.0.2 - Enables file upload feature for Apex jobs module

## Configuration

**Environment:**
- `.env` file (not in git; `.env.example` provided)
- Required vars: `JWT_SECRET`, `KANBAN_PASSWORD` (deprecated but checked), `KANBAN_API_KEY` (deprecated but checked)
- Optional: `PORT`, `NODE_ENV`, `DB_PATH`, `JWT_EXPIRY`, `COOKIE_SECURE`, `COOKIE_SAME_SITE`, `CORS_ORIGIN`
- Location: `C:\Users\jaker\Documents\Workspace\Dev\LyfeHub-v2\.env.example`

**Build:**
- No build step; Node runs JavaScript directly
- Multi-stage Docker build at `Dockerfile` (Node 20 Alpine builder + runtime)
- Docker Compose files for different environments: `docker-compose.yml` (preview), others for dev/prod/test

## Database Storage

**SQLite:**
- File: `/data/kanban.db` (default, configurable via `DB_PATH` env var)
- Connection: Via better-sqlite3 at `backend/src/db/schema.js`
- WAL mode enabled for concurrency: `db.pragma('journal_mode = WAL')`
- Tables created/migrated on startup:
  - Core: `users`, `tasks`, `task_items`, `calendars`, `task_item_calendars`, `people`, `people_groups`, `api_keys`, `organizations`, `notes`, `projects`, `tags`
  - Bases (Notion-style): `bases`, `base_properties`, `base_records`, `base_groups`, `base_views`
  - Apex jobs: `apex_jobs`, `apex_job_phases`, `apex_job_notes`, `apex_job_estimates`, `apex_job_payments`, `apex_job_labor`, `apex_job_receipts`, `apex_job_work_orders`, `apex_job_contacts`, `apex_job_activity`

**Uploads:**
- Local filesystem at `/data/uploads` (Docker volume mounted)
- Handled by multer in `backend/src/routes/uploads.js`
- Broad MIME type allowlist: images, videos, audio, PDFs, Office docs, text, CSV

## Frontend Assets

**JavaScript Modules:**
- `frontend/js/api.js` - HTTP client for all API calls
- `frontend/js/kanban.js` - Dashboard/kanban view logic
- `frontend/js/apex-jobs.js` - Apex job management UI
- `frontend/js/tasks.js` - Task list management
- `frontend/js/bases.js` - Notion-style database UI
- `frontend/js/people.js` - People/CRM module
- `frontend/js/calendar.js` - Calendar view
- `frontend/js/modal.js` - Task modal handling
- Other supporting modules: `drawer.js`, `dynamic-header.js`, `particles.js`, etc.

**CSS:**
- `frontend/css/style.css` - Main stylesheet
- `frontend/css/apex-theme.css`, `frontend/css/apex-jobs.css` - Apex-specific styling
- Responsive/mobile: `*-mobile.css`, `*-responsive.css` files
- Design system: CSS variables for neon palette (`--neon-purple`, `--neon-blue`, `--neon-cyan`, `--neon-pink`, `--neon-orange`, `--neon-green`)
- Dark mode: `#0a0a0f` background with glassmorphic blur effects

**External CDN:**
- marked.js (Markdown rendering) - `https://cdn.jsdelivr.net/npm/marked/marked.min.js` in `frontend/index.html`

## Platform Requirements

**Development:**
- Node 18+ (engines field specifies `>=18.0.0`)
- npm for dependency management
- Windows 11 (current dev environment)
- No TypeScript, transpiler, bundler, or linter configured
- No test suite; `npm test` outputs error

**Production:**
- Docker with Node 20 Alpine
- Exposed on port 3000 (configurable via `PORT` env var)
- Runs as non-root user `kanban` (UID 1001)
- Health check via `GET /api/health` endpoint
- Single-user deployment (not multi-tenant)

---

*Stack analysis: 2026-02-11*
