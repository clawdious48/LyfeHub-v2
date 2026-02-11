# External Integrations

**Analysis Date:** 2026-02-11

## APIs & External Services

**None Detected:**
- No third-party payment processing (Stripe, PayPal, etc.)
- No external cloud API integrations (AWS, GCP, Azure, etc.)
- No SaaS service integrations (Slack, Discord, Zapier, etc.)
- No calendar sync (Google Calendar, Outlook, etc.)
- No email service integration (SendGrid, Mailgun, etc.)
- This is a self-contained, single-user application

## Data Storage

**Databases:**
- SQLite only via better-sqlite3
  - Connection: Synchronous file-based at `/data/kanban.db`
  - Client: `better-sqlite3` v11.7.0 in `backend/src/db/schema.js`
  - ORM: None; raw SQL with prepared statements
  - Persistence: Docker volume mount at `/data` directory

**File Storage:**
- Local filesystem only at `/data/uploads`
- No cloud storage (S3, GCS, Azure Blob, etc.)
- Served locally via `backend/src/routes/uploads.js`
- Supported file types: Images (JPEG, PNG, GIF, WebP, SVG, BMP, TIFF), Videos (MP4, WebM, OGG, MOV, AVI, MKV, MPEG), Audio (MP3, OGG, WAV, WebM, AAC, FLAC, M4A), PDFs, Microsoft Office documents, text files, CSV

**Caching:**
- None detected
- No Redis, Memcached, or similar
- No HTTP caching headers configured (cache-control set to no-store for SPA)

## Authentication & Identity

**Auth Provider:**
- Custom implementation; not OAuth/OIDC
- Single-user app with password-based auth

**Session Auth (Browser):**
- Implementation: JWT tokens in httpOnly cookies
- Cookie name: `kanban_session` (defined in `backend/src/middleware/auth.js`)
- Token format: JWT signed with `JWT_SECRET` env var
- Token expiry: Default 7 days (`JWT_EXPIRY` env var), configurable via ms format
- Set in `backend/src/middleware/auth.js` `setSessionCookie()` function
- Used for web UI login at `backend/src/routes/auth.js`

**API Key Auth (Programmatic):**
- Implementation: Bearer token format `lh_live_*` prefixed keys
- Storage: Hashed in `api_keys` table via SHA256 in `backend/src/db/apiKeys.js`
- Validation: `validateApiKey()` checks hash and expiry
- Optional expiry support per key
- Last-used timestamp tracked automatically
- Managed via `/api/api-keys` routes in `backend/src/routes/apiKeys.js`
- Requires browser session (JWT) to create/manage keys; cannot be created via API key auth alone

**Password Hashing:**
- bcrypt v6.0.0 for user passwords
- Implementation: `backend/src/routes/auth.js` and `backend/src/db/users.js`

**Deprecated Auth (Legacy):**
- `KANBAN_PASSWORD` env var - Single password login (checking code shows migration to user-based auth)
- `KANBAN_API_KEY` env var - Bearer token (checking code shows migration to per-key API key system)
- Both still checked but deprecated in favor of user-scoped API keys

## Monitoring & Observability

**Error Tracking:**
- None detected; no Sentry, Rollbar, or similar integration

**Logs:**
- Console logging only
- Request logging in dev mode: `backend/src/index.js` logs `${timestamp} ${method} ${path}`
- Error logs to stderr via `console.error()`
- No structured logging (Winston, Bunyan, etc.)
- No centralized log aggregation

**Health Check:**
- Endpoint: `GET /api/health` in `backend/src/index.js`
- Returns: `{ status: 'ok', timestamp: '...' }`
- Used by Docker health check: `curl -f http://localhost:3000/health`

## CI/CD & Deployment

**Hosting:**
- Docker container deployment
- Container: Node 20 Alpine Linux
- Non-root execution: user `kanban` (UID 1001)
- Port: 3000 (exposed)
- Health check configured in Dockerfile

**CI Pipeline:**
- None detected; no GitHub Actions, GitLab CI, Jenkins, etc.
- No automated testing
- No build pipeline; runs Node directly

**Docker Compose:**
- Multiple compose files for different environments:
  - `docker-compose.yml` - Preview/development (port 4003)
  - `docker-compose.prod.yml` - Production (referenced in CLAUDE.md)
  - Additional test and mobile-preview variants mentioned in CLAUDE.md

## Environment Configuration

**Required env vars (for auth):**
- `JWT_SECRET` - Secret key for signing JWT tokens (must be set; uses dev default if not)
- Optional (legacy): `KANBAN_PASSWORD`, `KANBAN_API_KEY` - No longer required if using user-based auth

**Optional env vars:**
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (production/development)
- `DB_PATH` - SQLite database file path (default: `/data/kanban.db`)
- `JWT_EXPIRY` - Token lifetime (default: 7d, ms format)
- `COOKIE_SECURE` - Set Secure flag on cookies (true/false)
- `COOKIE_SAME_SITE` - SameSite cookie policy (strict/lax/none, default: lax)
- `CORS_ORIGIN` - CORS allowed origin (default: true = allow all)

**Secrets location:**
- `.env` file (environment variables)
- Not committed to git; `.env.example` provides template
- Production: Set via Docker environment or secrets management

## Webhooks & Callbacks

**Incoming:**
- None detected; no webhook receivers configured
- No external service callbacks

**Outgoing:**
- None detected; no outbound webhooks sent
- This is a pull-only architecture (no push integrations)

## API Consumption

**Frontend API Client:**
- File: `frontend/js/api.js`
- Method: Fetch API (native, no axios or other library)
- Base URL: `/api` (relative, served from same domain)
- Authentication: Cookies with `credentials: 'include'` for JWT
- Content-Type: `application/json`
- Error handling: Auto-redirect to login on 401
- No retry logic or exponential backoff

**API Endpoints (Internal REST):**
```
/api/auth        - Login, logout, user management
/api/tasks       - Kanban tasks (drag-and-drop board)
/api/task-items  - Personal todo items (My Day, Lists)
/api/task-lists  - Custom task list management
/api/users       - User profile, settings
/api/bases       - Notion-style database records
/api/calendars   - Calendar and scheduling
/api/people      - People/CRM records
/api/uploads     - File upload/download
/api/apex-jobs   - Restoration job management
/api/api-keys    - User API key management
/api/health      - Health check
```

## Data Format & Validation

**JSON-in-SQLite Pattern:**
- Arrays and objects stored as JSON strings in TEXT columns
- Examples: `acceptance_criteria`, `tags`, `subtasks`, `context_links`, `activity_log`, `review_state` in tasks
- Always `JSON.parse()` on read, `JSON.stringify()` on write
- No JSON schema validation; trusting client data

**ID Generation:**
- All record IDs: UUID v4 (via `uuid` package v11.1.0)
- Generated server-side in database operations
- Used across all modules: tasks, people, bases, apex jobs, etc.

**Prepared Statements:**
- All DB queries use better-sqlite3 prepared statements
- Defined at module scope for performance
- Protects against SQL injection

---

*Integration audit: 2026-02-11*
