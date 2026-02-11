# Codebase Structure

**Analysis Date:** 2026-02-11

## Directory Layout

```
LyfeHub-v2/
├── backend/                      # Node.js + Express API server
│   ├── src/
│   │   ├── index.js             # Express app entry point, route mounting, SPA fallback
│   │   ├── middleware/          # Auth, permissions, CORS
│   │   │   ├── auth.js          # JWT + API key validation
│   │   │   └── permissions.js   # RBAC helpers
│   │   ├── routes/              # 12+ REST endpoint modules
│   │   │   ├── auth.js          # POST login, signup, logout
│   │   │   ├── tasks.js         # GET/POST/PATCH tasks, status updates
│   │   │   ├── taskItems.js     # Personal todos (separate from project tasks)
│   │   │   ├── taskLists.js     # Task list collections
│   │   │   ├── apexJobs.js      # Water restoration job CRUD + detail views
│   │   │   ├── bases.js         # Notion-style database CRUD
│   │   │   ├── people.js        # CRM contact management
│   │   │   ├── calendars.js     # Calendar collections
│   │   │   ├── users.js         # User/employee management, role assignment
│   │   │   ├── apiKeys.js       # API key CRUD
│   │   │   └── uploads.js       # File upload endpoints
│   │   └── db/                  # Data access layer (prepared statements + transactions)
│   │       ├── schema.js        # Core tables: users, tasks, calendars, notes, projects, tags, api_keys
│   │       ├── apexSchema.js    # Apex job tables: apex_jobs, phases, estimates, payments, labor, receipts, work_orders, contacts, activity
│   │       ├── apexJobs.js      # Apex CRUD functions (createJob, updateJob, deleteJob, etc.)
│   │       ├── bases.js         # Bases + properties + records CRUD + relation sync
│   │       ├── coreBases.js     # Seed data for core Notion-style bases
│   │       ├── queries.js       # Task queries (getAllTasks, getTaskById, parseTask, activity logging)
│   │       ├── users.js         # User CRUD, password hashing, role management
│   │       ├── people.js        # CRM contact queries
│   │       ├── calendars.js     # Calendar operations
│   │       ├── notes.js         # Note queries
│   │       ├── organizations.js # Org/company records
│   │       ├── projects.js      # Project records
│   │       ├── tags.js          # Tag management
│   │       ├── apiKeys.js       # API key hashing + validation
│   │       ├── peopleGroups.js  # Contact grouping
│   │       └── taskLists.js     # Task list operations
│   ├── package.json             # Dependencies: express, better-sqlite3, bcrypt, jsonwebtoken, uuid, cors
│   └── node_modules/
├── frontend/                     # Vanilla JS SPA (no framework, no build step)
│   ├── index.html               # Main dashboard. Tab-based layout with 6 feature modules
│   ├── login.html               # Authentication page
│   ├── settings.html            # Legacy settings (partially migrated to dashboard)
│   ├── about.html               # About/info page
│   ├── js/                      # Module scripts (loaded in index.html)
│   │   ├── api.js               # HTTP client. Single api object with 50+ methods grouped by feature
│   │   ├── dashboard.js         # Dashboard greeting + 6 widgets (myDay, apex, people, projects, activity)
│   │   ├── kanban.js            # Projects tab: task kanban/list/card views, filters, auto-refresh
│   │   ├── modal.js             # Task creation/edit modal (legacy, being refactored)
│   │   ├── tasks.js             # Task module (older, larger; kanban.js taking over)
│   │   ├── apex-jobs.js         # Apex tab: job list + kanban views, filters, permissions
│   │   ├── jobModal.js          # New apex job creation modal (small, focused)
│   │   ├── jobDetailTabs.js     # Apex job detail tabs: Info, Contacts, Phases, Notes, Estimate, Payment
│   │   ├── jobDetailModals.js   # Modals for adding/editing notes, estimates, payments, labor entries
│   │   ├── bases.js             # Bases tab: Notion-style database UI (5000+ lines, largest module)
│   │   ├── people.js            # People tab: CRM contact list, groups, follow-ups
│   │   ├── calendar.js          # Calendar tab: month/week/day views, task scheduling
│   │   ├── drawer.js            # Mobile sidebar navigation drawer
│   │   ├── dynamic-header.js    # Header title updates per tab
│   │   ├── hamburger.js         # Mobile menu toggle
│   │   ├── sidebar-collapse.js  # Desktop sidebar collapse/expand
│   │   ├── kanban-mobile.js     # Mobile kanban view enhancements
│   │   ├── table-cards.js       # Responsive table → card transforms
│   │   ├── particles.js         # Background animation effects
│   │   ├── touch-actions.js     # Gesture handlers for mobile
│   │   └── mobile-utils.js      # Mobile-specific utility functions
│   └── css/                     # Styling (darkmode neon glassmorphic)
│       ├── style.css            # Main stylesheet (212KB, core layout + components)
│       ├── apex-theme.css       # Apex-specific color palette
│       ├── apex-jobs.css        # Apex jobs styling (79KB)
│       ├── dashboard.css        # Dashboard widgets styling
│       ├── calendar.css         # Calendar view styling
│       ├── table-cards.css      # Table + card responsive classes
│       ├── drawer.css           # Mobile sidebar styling
│       ├── auth.css             # Login/signup page styling
│       ├── hamburger.css        # Mobile menu button styling
│       ├── responsive.css       # Breakpoints + media queries
│       ├── sidebar-responsive.css # Desktop sidebar responsive
│       ├── header-mobile.css    # Mobile header overrides
│       ├── kanban-mobile.css    # Mobile kanban overrides
│       ├── forms-mobile.css     # Mobile form styling
│       ├── touch-friendly.css   # Touch target sizing
│       └── apex-theme.css       # Shared color system
├── docs/                        # Documentation
│   ├── plans/                   # Project plans, phase notes
│   └── ub3-schemas/             # Entity schema documentation
├── resources/                   # Reference materials
│   └── apex-integration/        # Apex feature docs
│       └── STYLE-GUIDE.md       # Neon glassmorphic design system (colors, spacing, effects)
├── .claude/                     # Claude Code project instructions + skills
│   ├── CLAUDE.md                # Project context for Claude
│   └── skills/                  # Custom Claude skills (drying-report, vps-manager)
├── .planning/                   # GSD codebase analysis documents
│   └── codebase/                # (Your output goes here)
│       ├── STACK.md             # Technology stack
│       ├── INTEGRATIONS.md      # External integrations
│       ├── ARCHITECTURE.md      # (Writing now)
│       └── STRUCTURE.md         # (Writing now)
├── docker-compose.yml           # Development compose file
├── docker-compose.prod.yml      # Production compose file
├── docker-compose.preview.yml   # Preview environment
├── docker-compose.test.yml      # Test environment
├── Dockerfile                   # Multi-stage build (Node 20 Alpine)
├── .env.example                 # Environment variable template
├── package.json                 # Root package.json (references backend)
├── CLAUDE.md                    # Project context (checked into git)
├── README.md                    # Project overview
├── SPEC.md                      # Original API spec
├── ROADMAP.md                   # Feature roadmap + design principles
└── RELATIONS-*.md               # Two-way relation implementation docs
```

## Directory Purposes

**`backend/src/`:**
- Purpose: All server-side logic
- Contains: Express app, route handlers, database queries, middleware
- Key files: `index.js` (entry), `middleware/auth.js`, `db/schema.js`, 12 route modules

**`backend/src/middleware/`:**
- Purpose: Cross-cutting concerns
- `auth.js`: Validates JWT cookies or API keys (`lh_live_*` prefix)
- `permissions.js`: Role checking, entry edit window, phase assignment verification

**`backend/src/routes/`:**
- Purpose: HTTP endpoint handlers
- Pattern: Each file exports Express router with routes for one entity/feature
- All routes protected by `authMiddleware` at module entry point
- No business logic; delegates to `db/` layer via prepared statements

**`backend/src/db/`:**
- Purpose: Data access, business logic, transactions
- Pattern: Each file exports functions for domain operations on 1-3 related tables
- All SQL via prepared statements, all mutations via `db.transaction()`
- JSON parsing/serialization for complex fields (tasks, apex jobs, bases data)
- Examples:
  - `schema.js`: Table schema + core queries
  - `apexJobs.js`: 40KB, handles apex job CRUD + phase creation
  - `bases.js`: 33KB, handles record CRUD + two-way relation sync
  - `users.js`: User lifecycle + password management

**`frontend/`:**
- Purpose: User interface served as static files
- No build step, no bundler, no TypeScript
- HTML files are entry points; JS loaded in `<script>` tags

**`frontend/js/`:**
- Purpose: Feature modules
- Pattern: Each module is an object with methods, initialized on page load or tab switch
- Size gradient: `bases.js` (5034 lines, largest) → `drawer.js` (500 lines, smallest)
- No dependencies between modules except `api.js` for HTTP
- Special modules:
  - `api.js`: Shared HTTP client, **all** frontend requests go through this
  - `dashboard.js`: Home tab with greeting + 6 widgets
  - `kanban.js`: Task kanban/list views (takes over from older `tasks.js`)
  - `apex-jobs.js`: Apex job list + views
  - `jobDetailModals.js`: Large modal for apex job details (modal-driven)

**`frontend/css/`:**
- Purpose: Styling (dark mode, neon, glassmorphic)
- Pattern: Modular CSS files per feature/breakpoint
- Main colors defined as CSS variables in `style.css`:
  - `--neon-purple`, `--neon-blue`, `--neon-cyan`, `--neon-pink`, `--neon-orange`, `--neon-green`
- Mobile-first: responsive classes in `responsive.css`, overrides in `*-mobile.css`

## Key File Locations

**Entry Points:**

| File | Purpose | Startup? |
|------|---------|----------|
| `backend/src/index.js` | Express app, route mounting, SPA fallback | Yes (npm run dev) |
| `frontend/index.html` | Main dashboard, tabs, modules | Yes (SPA entry) |
| `frontend/login.html` | Auth form, redirects to index on success | Yes (if not logged in) |

**Configuration:**

| File | Purpose |
|------|---------|
| `backend/package.json` | Dependencies (express, better-sqlite3, uuid, bcrypt, jsonwebtoken) |
| `.env.example` | Template for env vars (JWT_SECRET, CORS_ORIGIN, etc.) |
| `Dockerfile` | Multi-stage build, Node 20 Alpine, non-root user |
| `docker-compose.yml` | Dev environment (volume mount for `/data`) |
| `docker-compose.prod.yml` | Production (no volume, persistent data) |

**Core Logic:**

| File | Purpose |
|------|---------|
| `backend/src/db/schema.js` | Database initialization, table migrations |
| `backend/src/db/apexSchema.js` | Apex job schema (phases, payments, labor, work orders) |
| `backend/src/db/bases.js` | Notion-style database schema + record operations |
| `backend/src/db/apexJobs.js` | Apex job CRUD, job numbering, transaction coordination |
| `backend/src/db/users.js` | User management, password hashing, role assignment |
| `backend/src/routes/apexJobs.js` | Apex job endpoints (merged DB + Zoho sync) |
| `frontend/js/api.js` | HTTP client with 50+ methods, auth handling |
| `frontend/js/bases.js` | Largest module (5034 lines): full Notion-style DB UI |

**Testing & Docs:**

| File | Purpose |
|------|---------|
| `docs/ub3-schemas/` | Entity documentation (Apex job, task, base record) |
| `SPEC.md` | Original API schema |
| `ROADMAP.md` | Feature roadmap + design principles |
| `RELATIONS-*.md` | Two-way relation implementation details |

## Naming Conventions

**Files:**
- Backend: `camelCase.js` (e.g., `apexSchema.js`, `apexJobs.js`, `taskItems.js`)
- Frontend: `kebab-case.js` (e.g., `apex-jobs.js`, `dynamic-header.js`, `sidebar-collapse.js`)
- CSS: `kebab-case.css` with scope suffix (e.g., `apex-jobs.css`, `header-mobile.css`, `kanban-mobile.css`)
- HTML: `kebab-case.html` (login.html, settings.html, index.html)

**Directories:**
- Lowercase, plural for collections: `routes/`, `middleware/`, `db/`, `css/`, `js/`

**Database Tables:**
- Lowercase, plural: `users`, `tasks`, `apex_jobs`, `base_records`, `api_keys`
- Foreign key relationships use underscore: `user_id`, `base_id`, `job_id`

**API Routes:**
- kebab-case paths: `/api/apex-jobs`, `/api/task-items`, `/api/api-keys`
- Methods: GET (list/fetch), POST (create), PATCH (update), DELETE (delete)
- Query params: `?status=active`, `?expandRelations=true`, `?userId=<id>`

**JavaScript Functions/Variables:**
- `camelCase` throughout (backend + frontend)
- Module objects: `PascalCase` or lowercase singleton (e.g., `apexJobs`, `dashboard`, `basesModule`)
- Event handlers: `on<Action>` or `handle<Action>` (e.g., `onTabClick`, `handleSubmit`)
- Async/await: functions prefixed with `async`, promises unwrapped with `await`

**CSS Classes:**
- Namespace by module: `.apex-job-card`, `.task-modal`, `.dashboard-widget`
- Modifiers: `--` (e.g., `.apex-job-card--selected`)
- States: `.is-active`, `.is-loading`, `.is-error`
- Responsive: `.mobile-only`, `.desktop-only`, `@media (max-width: 768px)`

## Where to Add New Code

**New Feature (e.g., "Inventory Tracking"):**

1. **Backend:**
   - Create `backend/src/db/inventory.js` with CRUD functions
   - Add schema to `backend/src/db/schema.js` (or separate `inventorySchema.js` if complex)
   - Create `backend/src/routes/inventory.js` with route handlers
   - Mount router in `backend/src/index.js`: `app.use('/api/inventory', inventoryRoutes)`
   - Example pattern (see `apexJobs.js` for full example)

2. **Frontend:**
   - Create `frontend/js/inventory.js` module with `init()`, `load()`, `render()` methods
   - Add tab button to `frontend/index.html` navbar: `<button class="tab" data-tab="inventory">`
   - Create `frontend/css/inventory.css` for styling
   - Add `<main class="tab-content" data-tab="inventory">...</main>` to index.html
   - Wire up tab switching in `kanban.js` via event delegation on `.tab` buttons

**New Component/Modal:**
- Location: `frontend/js/` (one file per modal or component group)
- Pattern: Object with `init(parentEl)`, `open()`, `close()`, `render()` methods
- Example: `jobModal.js` (652 lines, new apex job creation modal)

**New Utility/Helper:**
- Backend: Add to relevant `db/*.js` file or create new module if reusable
- Frontend: Create `frontend/js/utils-<name>.js` and import as `<script src="..."></script>`

**New API Endpoint:**
- Create route handler in appropriate `routes/*.js` file
- Use pattern: `router.post('/path', authMiddleware, async (req, res) => { ... })`
- Add role checks if needed: `router.post('/admin', authMiddleware, requireRole('management'), async (req, res) => { ... })`
- Call database functions from `db/*.js`

## Special Directories

**`backend/src/db/` (Database Layer):**
- Purpose: All data access
- Generated: No (hand-written)
- Committed: Yes
- Pattern: Each file is a module exporting functions. No classes, minimal OOP.
- Transaction usage: Wrap multi-step mutations in `db.transaction(() => { ... })`
- JSON handling: Always `JSON.parse()` on read, `JSON.stringify()` on write for complex fields

**`frontend/js/` (Frontend Modules):**
- Purpose: Feature logic + UI rendering
- Generated: No
- Committed: Yes
- Files loaded in `<script>` tags in `index.html` (order matters for dependencies)
- Largest files: `bases.js` (5034), `calendar.js` (2782), `tasks.js` (2277), `apex-jobs.js` (1339)
- Smallest files: drawer.js, hamburger.js, mobile-utils.js (< 600 lines)

**`frontend/css/` (Styling):**
- Purpose: Dark mode, neon glassmorphic design
- Generated: No
- Committed: Yes
- Single main file: `style.css` (212KB, core layout)
- Feature-specific overrides: `apex-jobs.css` (79KB), `calendar.css` (35KB)
- Mobile overrides: `*-mobile.css` files per component

**`/data/` (Runtime Data):**
- Purpose: SQLite database + external sync files
- Generated: Yes (created by app on first run)
- Committed: No (mounted as Docker volume)
- Contains:
  - `kanban.db`: Main database (SQLite WAL mode)
  - `kanban.db-shm`, `kanban.db-wal`: WAL mode support files
  - `apex-jobs.json`: Zoho CRM sync data (populated by external process)

**`.planning/codebase/` (GSD Documents):**
- Purpose: Analysis documents for future Claude instances
- Generated: Yes (by GSD mapper)
- Committed: Yes
- Contains: STACK.md, INTEGRATIONS.md, ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md

---

*Structure analysis: 2026-02-11*
