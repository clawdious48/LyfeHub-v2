# Coding Conventions

**Analysis Date:** 2026-02-11

## Naming Patterns

**Files:**
- Backend route files: PascalCase for complex features (`jobModal.js`), kebab-case for simple features (`api-keys.js`)
- Database module files: camelCase (`apexJobs.js`, `taskItems.js`)
- Frontend module files: camelCase with descriptive names (`apex-jobs.js`, `jobDetailTabs.js`)
- Database schema files: camelCase (`schema.js`, `apexSchema.js`)

**Functions:**
- camelCase for all functions: `getAllBases()`, `findUserById()`, `generateToken()`
- Getter functions: `getSafeUser()`, `getTasksForCalendar()`
- Permission/validation helpers: prefix with verb + purpose: `canEditEntry()`, `requireRole()`, `verifyPassword()`
- Database operation verbs: `create*`, `update*`, `delete*`, `get*`, `find*` (example: `createTask()`, `updateUser()`)
- Module initialization: `init()` or `initialize()`

**Variables:**
- camelCase for most variables: `userId`, `currentUser`, `taskSummary`
- Constants: UPPER_SNAKE_CASE: `BCRYPT_ROUNDS`, `COOKIE_NAME`, `JWT_SECRET`, `REFRESH_MS`
- Type code mappings: UPPER_SNAKE_CASE: `TYPE_CODES`, `VALID_ROLES`
- Boolean flags: descriptive names with is/has/can prefix: `isImportant`, `hasSettings`, `canEditJob`
- State objects: descriptive lowercase: `filters`, `sort`, `customOrder`, `relationDisplayNames`
- Query strings in prepared statements: typically inline in `db.prepare()`
- DOM element references: use element ID as variable name: `const el = document.getElementById('task-item-modal')`

**Types/Classes:**
- Not used. No TypeScript. SQLite data uses plain JSON objects.

## Code Style

**Formatting:**
- No formatter configured (no Prettier, no ESLint)
- Manual formatting observed:
  - 2-space indentation throughout
  - Opening braces on same line: `function foo() {`
  - Blank lines between logical sections in long files
  - Comments with equal signs separate major sections: `// ===========================`

**Linting:**
- No linter configured (no ESLint, no Node lint)
- Code quality relies on manual review

## Import Organization

**Order:** (Backend with CommonJS `require`)
1. Built-in Node modules: `const express = require('express')`
2. Third-party packages: `const bcrypt = require('bcrypt')`, `const { v4: uuidv4 } = require('uuid')`
3. Local database modules: `const db = require('./schema')`
4. Local middleware: `const { authMiddleware } = require('../middleware/auth')`
5. Local utilities: `const { requireRole } = require('../middleware/permissions')`

Example from `backend/src/routes/users.js`:
```javascript
const express = require('express');
const bcrypt = require('bcrypt');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/permissions');
const {
  findUserById,
  findUserByEmail,
  updateUser,
  // ... more named imports
  VALID_ROLES
} = require('../db/users');
```

**Path Aliases:**
- None used. Relative paths only: `require('./schema')`, `require('../db/bases')`

**Frontend:** (Vanilla JS, no modules)
- Global objects in window: `window.currentUser`, `window.location`
- Module pattern with self-invoking objects: `const api = { ... }`, `const dashboard = { ... }`
- Direct script includes in HTML via `<script>` tags (see `frontend/index.html`)

## Error Handling

**Patterns:**

Backend route handlers (Express):
- Try-catch blocks wrapping entire route logic
- Return JSON error responses with `error` and optional `code` fields
- Status codes follow REST conventions: 400 (validation), 401 (auth), 403 (permission), 404 (not found), 500 (server error)
- Errors logged to console before responding

Example from `backend/src/routes/users.js`:
```javascript
router.get('/me', (req, res) => {
  try {
    if (req.isSystemUser) {
      return res.status(400).json({
        error: 'System users do not have a profile',
        code: 'SYSTEM_USER'
      });
    }

    const user = findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({ user: getSafeUser(user) });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({
      error: 'Failed to fetch profile',
      code: 'INTERNAL_ERROR'
    });
  }
});
```

Database layer errors:
- Try-catch in helper functions that parse JSON: `try { JSON.parse(val); } catch { return defaultValue; }`
- Silent fallback on error (no throwing): returns sensible defaults like `[]` or `{}`
- Example from `backend/src/db/apexJobs.js`:
```javascript
function ensureJsonString(val) {
  if (Array.isArray(val)) return JSON.stringify(val);
  if (typeof val === 'string') {
    try { JSON.parse(val); return val; } catch { return JSON.stringify([val]); }
  }
  return '[]';
}
```

JWT and authentication errors:
- Specific error codes for JWT expiration: `TokenExpiredError` checked in `authMiddleware`
- Session cookies cleared on expiration before returning 401

Frontend API client (`frontend/js/api.js`):
- Fetch responses checked with `response.ok` and `response.status === 401`
- Error messages extracted from response JSON: `data.error || data.message`
- Authentication failures redirect to login: `window.location.href = '/login.html'`
- Async-await pattern with try-catch in calling code

## Logging

**Framework:** Built-in `console` object

**Patterns:**
- Debug log to console.log: `console.log('Creating users table...')` during startup
- Error log to console.error: `console.error('Error fetching tasks:', err)` in catch blocks
- ISO timestamp for request logging in development: `console.log(\`${new Date().toISOString()} ${req.method} ${req.path}\`)`
- Environment-gated logging: only in non-production mode
```javascript
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}
```

Frontend: minimal logging, mainly for debug/trace:
```javascript
console.log('=== E1 - Mobile Navigation ===');
console.log(`  Hamburger menu icon visible: ${hamburgerVisible ? 'PASS' : 'FAIL'}`);
```

## Comments

**When to Comment:**
- Database schema creation steps: initial table creation and migrations marked with comment blocks
- Section separators in long files: `// ============================================`
- JSDoc-style comments above exported functions (light use)
- Inline comments explaining non-obvious logic, especially around date/time or cryptic transformations
- Business logic notes: `// Restore all jobs back to 'active' status on fresh sync`

Example from `backend/src/db/schema.js`:
```javascript
// ============================================
// USERS TABLE
// ============================================
const usersTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
if (!usersTable) {
  console.log('Creating users table...');
```

**JSDoc/TSDoc:**
- Light use in database modules for critical functions
- Simple one-line JSDoc above function signatures
- No full param/return documentation (not consistently applied)
- Example from `backend/src/db/users.js`:
```javascript
/**
 * Find user by email
 */
function findUserByEmail(email) {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email.toLowerCase());
}
```

Frontend: minimal JSDoc, mainly block comments describing modules:
```javascript
/**
 * API Client for Kanban Board
 * Handles all HTTP requests with authentication
 */
const api = {
    baseUrl: '/api',
```

## Function Design

**Size:**
- Database query functions: 1-10 lines (simple SELECT/INSERT/UPDATE wrappers)
- Route handlers: 10-50 lines (including validation and error handling)
- Complex logic (like bases relation sync): 50-150 lines
- Frontend UI functions: 20-100 lines (DOM manipulation + event handling)

**Parameters:**
- Prefer individual parameters for simple cases: `createTask(title, description, userId)`
- Use object parameter for many options: `createJob(data, userId)` where `data = { client_name, ... }`
- Database queries: use `db.prepare()` for parameterized statements, pass values as positional args
- Callback functions in event handlers: often accept event object: `addEventListener('click', (e) => { ... })`

**Return Values:**
- Database functions return raw objects from DB: `{ id, name, created_at, ... }`
- Route handlers return JSON via `res.json()` or `res.status(code).json()`
- Helper functions return objects, arrays, or primitives
- Silent fallbacks preferred over errors: return empty array `[]` or empty object `{}` on parse error
- User-facing functions filtered: `getSafeUser()` strips `password_hash` before returning

## Module Design

**Exports:**

Backend CommonJS:
- Database modules: `module.exports = { functionName1, functionName2, ... }`
- Route files: `module.exports = router` (Express router object)
- Middleware: `module.exports = { middleware1, middleware2, ... }`

Example from `backend/src/middleware/auth.js`:
```javascript
module.exports = { authMiddleware, generateToken, setSessionCookie, clearSessionCookie, COOKIE_NAME };
```

Example from `backend/src/routes/apexJobs.js`:
```javascript
module.exports = router;
```

**Barrel Files:**
- Not used. Each module imports what it needs directly

Frontend (Vanilla JS, no modules):
- Single global object per feature: `const api = { ... }`, `const dashboard = { ... }`, `const apexJobs = { ... }`
- Methods on the object are the public API
- Initialize by calling `moduleObject.init()`
- State is stored as properties on the module object: `this.tasks`, `this.filters`, `this.sort`

## Naming Consistency: Database/JSON Fields

**SQLite Table Columns:**
- snake_case: `created_at`, `user_id`, `client_name`, `mitigation_pm`, `is_complete`
- ID columns: `id` (primary key), `user_id`, `base_id` (foreign keys)
- Status/enum fields: lowercase values: `status = 'active'`, `type = 'text'`

**JSON Arrays in SQLite:**
- Array fields stored as JSON text: `acceptance_criteria TEXT DEFAULT '[]'`
- Parsed on read with `JSON.parse()`, stringified on write with `JSON.stringify()`
- Examples: `context_links`, `subtasks`, `tags`, `additional_clients`, `mitigation_techs`

**JavaScript Objects:**
- API responses: camelCase: `{ userId, clientName, createdAt, acceptanceCriteria }`
- Frontend state: camelCase: `this.currentUser`, `this.filters`, `this.selectedProjectId`
- Transformation between snake_case (DB) and camelCase (API) handled implicitly in route handlers

Example transformation from `backend/src/routes/apexJobs.js`:
```javascript
// DB returns: { id, client_name, created_at, ... }
// Route response builds: { clientName, createdAt, ... }
return {
  id: job.id,
  clientName: job.client_name,
  createdAt: job.created_at
};
```

---

*Convention analysis: 2026-02-11*
