# Architecture

**Analysis Date:** 2026-02-11

## Pattern Overview

**Overall:** Tab-based SPA (Single Page Application) with REST API backend serving static frontend. Multi-module architecture where each major feature (Apex, Projects, Tasks, Bases, People, Calendar) operates as a self-contained module that can be toggled via UI tabs.

**Key Characteristics:**
- Loosely coupled frontend modules communicating through shared `api.js` HTTP client
- Express.js REST API with role-based access control (RBAC)
- SQLite database with prepared statements and transactions for data integrity
- Stateless API with JWT cookies + API key authentication
- No framework constraints on frontend; vanilla JavaScript with module objects

## Layers

**Frontend Presentation Layer:**
- Purpose: Render UI, handle user interaction, manage local view state
- Location: `frontend/js/` and `frontend/css/`
- Contains: Module objects (apex-jobs, tasks, dashboard, bases, people, calendar), view rendering, event binding, filter/sort logic
- Depends on: `api.js` for data fetching, CSS for styling
- Used by: Browser DOM, user interactions

**Frontend Data Access Layer:**
- Purpose: Encapsulate all HTTP communication with backend
- Location: `frontend/js/api.js`
- Contains: Authenticated fetch wrapper, request/response handling, auth error interception
- Pattern: Single `api` object with method groups (auth, tasks, apex-jobs, etc.)
- Depends on: Browser Fetch API, JWT cookies for auth

**Backend API Layer:**
- Purpose: Handle HTTP requests, validate input, enforce authorization, coordinate business logic
- Location: `backend/src/routes/` (10+ route files)
- Contains: Express route handlers with `authMiddleware` (all routes require it), `requireRole()` middleware for RBAC
- Key files: `auth.js`, `tasks.js`, `apexJobs.js`, `bases.js`, `users.js`, `people.js`, `calendars.js`
- Depends on: Database layer, middleware
- Used by: Frontend via HTTP, external systems via API keys

**Business Logic Layer:**
- Purpose: Database operations, domain logic, transactions, data transformation
- Location: `backend/src/db/` (separate file per entity or feature)
- Contains: Prepared statements, transaction management, JSON parsing/serialization for complex fields
- Key files: `schema.js` (core tables), `apexSchema.js` (Apex jobs), `bases.js` (Notion-style dbs), `apexJobs.js` (Apex CRUD), `queries.js` (task queries), `users.js` (user management)
- Pattern: Each module exports functions for domain operations. Minimal object instantiation; mostly pure functions
- Depends on: SQLite via `better-sqlite3`, uuid generation
- Used by: Route handlers

**Data Persistence Layer:**
- Purpose: SQLite database with WAL mode for concurrent access
- Location: `/data/kanban.db` (Docker volume mount)
- Schema: 25+ tables including users, tasks, apex_jobs, bases, people, calendars, api_keys, etc.
- Pattern: Prepared statements (all parameterized), transactions via `db.transaction()`, JSON-in-SQLite for complex fields
- Indexes: Foreign keys enabled, multiple indexes for common queries

**Middleware Layer:**
- Purpose: Cross-cutting concerns: authentication, authorization
- Location: `backend/src/middleware/`
- Key files:
  - `auth.js`: Validates JWT cookies or API keys, populates `req.user`
  - `permissions.js`: Role-based checks, entry edit time window validation, phase assignment checks

## Data Flow

**User Login Flow:**

1. Frontend: User submits email/password on `login.html`
2. API call: `POST /api/auth/login` via `api.login()`
3. Route handler (`auth.js`): Validates credentials, generates JWT, sets `kanban_session` cookie
4. Frontend: Stores user in `window.currentUser`, redirects to `index.html`
5. All subsequent requests: Cookie automatically sent by browser, `authMiddleware` decodes JWT and populates `req.user`

**Task Creation Flow (Example):**

1. Frontend: User fills modal form, clicks Save
2. API call: `POST /api/tasks` with task data
3. Middleware: `authMiddleware` validates token, `requireRole` checks permissions
4. Route handler: Validates input, calls `db.createTask()`
5. Database: Generates UUID, stores task with `user_id`, logs activity
6. Response: Returns created task with `id`, `created_at`, etc.
7. Frontend: Module adds task to local `tasks` array, re-renders view

**Apex Job Sync Flow:**

1. Frontend: Periodically calls `api.getApexJobs()`
2. Route handler (`apexJobs.js`): Merges data from two sources:
   - SQLite `apex_jobs` table (local jobs)
   - `/data/apex-jobs.json` file (Zoho CRM sync, external process)
3. Formatting: Each job transformed via `formatDbJob()` to match frontend shape
4. Response: Combined job list to frontend
5. Frontend: Module filters/sorts, renders in kanban/list/card views

**Base Relations Two-Way Sync:**

1. Frontend: User updates a relation property on a record
2. API call: `PATCH /api/bases/{baseId}/records/{recordId}`
3. Route handler: Calls `basesDb.updateRecord()`
4. Database:
   - Updates the forward relation field
   - Calls `syncReverseRelation()` to update target record's reverse property
   - Uses transaction for atomicity
5. Response: Updated record to frontend
6. Frontend: Re-renders affected records

**State Management:**

- **Frontend:** No centralized state. Each module maintains `this.tasks`, `this.jobs`, etc. as module properties. State updates on API response, UI re-renders.
- **Backend:** Stateless. All state in database. Session state in JWT (minimal: `sessionId`, `userId`, `email`).
- **Authentication State:** JWT cookie (`kanban_session`, expires 30d or 1d per rememberMe). API keys stored hashed in DB table.

## Key Abstractions

**Module Pattern (Frontend):**
- Purpose: Encapsulate feature logic without framework overhead
- Examples: `apexJobs`, `dashboard`, `basesModule`, `peopleModule`
- Pattern: Object with `init()`, `bindEvents()`, `load*()`, `render*()` methods. State as object properties.
- Advantages: Clear separation of concerns, no build step needed, easy to debug

**Prepared Statements (Backend):**
- Purpose: Prevent SQL injection, improve performance via statement caching
- Pattern: All SQL wrapped in `db.prepare()` calls defined at module scope
- Example: `const getAllTasks = db.prepare('SELECT * FROM tasks WHERE ...')`
- Guarantee: Every query is parameterized; no string concatenation with user input

**Transactions (Backend):**
- Purpose: Ensure data consistency across multi-step operations
- Pattern: `db.transaction(() => { ... })` for atomic updates
- Examples: Create apex job + phases, update record + reverse relations, delete user + cascade nullifications
- Used in: `apexJobs.createJob()`, `bases.updateRecord()`, `users.deleteUser()`

**JSON-in-SQLite:**
- Purpose: Store complex nested data (arrays, objects) in relational schema without normalization
- Pattern: Text column with JSON value, `JSON.parse()` on read, `JSON.stringify()` on write
- Examples:
  - `tasks.acceptance_criteria` (array of strings)
  - `apex_jobs.mitigation_pm` (array of user names/IDs)
  - `base_records.data` (object with dynamic properties per base schema)
- Trade-off: Easier frontend integration, simpler schema, worse query capability

**Role-Based Access Control (RBAC):**
- Purpose: Control what actions users can perform
- Roles: `management`, `office_coordinator`, `project_manager`, `mitigation_pm`, `estimator`, `field_tech`, `guest`
- Pattern: `req.user.roles` array (user can have multiple roles), checked via `requireRole()` middleware or `userHasRole()` frontend helper
- Examples:
  - Only `management` can delete apex job notes
  - Only `estimator` or `office_coordinator` can add apex estimates
  - `guest` role blocks Apex module entirely

**Entry Edit Window (Apex Notes):**
- Purpose: Allow users to edit their own entries for 5 minutes post-creation
- Pattern: Check `canEditEntry()` in permissions.js: `management` or `office_coordinator` always, otherwise author + < 5 min old
- Used in: Apex job notes, activity entries

## Entry Points

**Backend Entry Point:**
- Location: `backend/src/index.js`
- Triggers: `npm run dev` or Docker startup
- Responsibilities:
  1. Initializes database schema (creates tables if not exist)
  2. Mounts all route modules on `/api/*`
  3. Serves frontend static files with SPA fallback (all non-API routes → `index.html`)
  4. Attaches CORS, JSON body parsing, cookie parsing middleware
  5. Listens on port 3000 (or `$PORT` env var)

**Frontend Entry Points:**
- `frontend/index.html`: Main dashboard (tab-based SPA). Loaded via SPA fallback on any route except `/login.html`, `/about.html`, `/settings.html`
- `frontend/login.html`: Login form. Redirects to index on successful auth
- `frontend/settings.html`: Legacy settings page (partially replaced by dashboard widget)

**Frontend Module Initialization:**
- Dashboard: `kanban.init()` called on page load, switches tabs dynamically
- Each tab: Module-specific `init()` called on tab switch
  - `apexJobs.init()` → `apexJobs.loadJobs()` → renders current view
  - `tasks.init()` → loads and renders task list
  - Similar for bases, people, calendar
- Apex detail views: `jobDetailTabs.init()` and `jobDetailModals.init()` initialize when job detail modal opens

## Error Handling

**Strategy:** Fail gracefully with user-facing messages. No silent failures.

**Patterns:**

**Frontend (api.js):**
- HTTP 401 errors → redirect to login (unless already on auth page)
- HTTP 404/5xx errors → throw Error with response message
- Fetch failures → rethrow Error with context
- Module-level try/catch in `init()` and `load*()` methods → log to console, show toast/alert if critical

**Backend (routes):**
- Missing required fields → 400 with `{ error: 'Field required', code: 'VALIDATION_ERROR' }`
- Unauthorized (no token) → 401 with `{ error: 'Authentication required', code: 'AUTH_REQUIRED' }`
- Forbidden (lacks role) → 403 with `{ error: 'Insufficient permissions' }`
- Not found (invalid ID) → 404 with `{ error: 'Resource not found' }`
- Database errors → 500 with generic `{ error: 'Internal server error', code: 'INTERNAL_ERROR' }`
- Global error handler at bottom of `index.js` catches unhandled exceptions

**Database (db modules):**
- Prepared statement failures → logged, error propagates to route handler
- Transaction rollback on error → automatic via `db.transaction()` semantics
- Schema migration (ALTER TABLE) → try/catch with graceful skip if column exists

## Cross-Cutting Concerns

**Logging:**
- Backend: `console.log/error` to stdout. Captured by Docker logs.
  - Schema migrations logged on startup
  - Request logging in dev mode (timestamp, method, path)
  - Database errors logged with stack trace
- Frontend: `console.log/error` to browser console. No persistent log storage.

**Validation:**
- Frontend: Form fields validated before send. No backend bypass possible (all routes require auth + role check).
- Backend: Every route validates input shape/types:
  - Task status must be one of: `planned`, `ready`, `in_progress`, `blocked`, `review`, `done`
  - Apex job properties (client name, loss type, etc.) required or default to empty string
  - Base property types restricted to: `text`, `number`, `select`, `multi_select`, `date`, `checkbox`, `url`, `relation`
- Database: `CHECK` constraints on status enums, integer ranges

**Authentication:**
- JWT cookies + API keys (see `auth.js` for dual support)
- JWT secret from `$JWT_SECRET` env var (defaults to `dev-secret-change-in-production` if not set)
- API key format: `lh_live_*` prefix, hashed in DB via bcrypt, validated on each request
- Session expiry: 30 days (remember me) or 1 day (session only)

**CORS:**
- Configured in `index.js` middleware: `origin: process.env.CORS_ORIGIN || true` (all origins in dev, specific origin in prod)
- `credentials: true` to allow cookie transmission

---

*Architecture analysis: 2026-02-11*
