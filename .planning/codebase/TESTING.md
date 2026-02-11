# Testing Patterns

**Analysis Date:** 2026-02-11

## Test Framework

**Status:** Not configured

**Runner:**
- Not detected
- No Jest, Vitest, Mocha, or other test runner configured
- `package.json` contains placeholder script: `"test": "echo \"Error: no test specified\" && exit 1"`

**Assertion Library:**
- Not applicable

**Run Commands:**
```bash
# No automated test suite
npm test                    # Returns error (placeholder)
```

## Test File Organization

**Status:** No unit tests in codebase

**File locations:**
- No `.test.js` or `.spec.js` files in `backend/src` or `frontend/js`
- No test directory structure (e.g., `__tests__`, `test/`)
- `test-mobile.js` is a standalone E2E test script (see below)

## Manual Testing

**Puppeteer E2E Test:**

Location: `test-mobile.js` (root directory)

Purpose: Browser automation testing for mobile responsive UI at 375px width (iPhone viewport)

Setup:
```javascript
const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3050';

async function testMobileResponsive() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
```

Test structure:
- Async/await pattern
- `sleep()` helper for waiting: `async function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }`
- Results collected in object: `const results = { E1_MobileNavigation: {}, E2_SidebarCollapse: {}, ... }`
- Page evaluation via `page.evaluate()` for client-side assertions
- Event simulation: `page.click('#hamburger-btn')`, `page.click('a[href="/tasks.html"]')`
- Screenshots captured: `await page.screenshot({ path: 'screenshots/...' })`
- Results JSON saved: `fs.writeFileSync('test-results.json', JSON.stringify(results, null, 2))`

Test categories (from `test-mobile.js`):
- **E1_MobileNavigation** - Hamburger menu, drawer opening, 5 tabs, Settings, Logout
- **E2_SidebarCollapse** - Sidebar toggle button visibility and collapse/expand
- **E3_TouchControls** - Drag-to-delete on kanban cards, swipe gestures
- **E4_TablesCards** - Card view rendering on mobile, swipe navigation
- **E5_Kanban** - Kanban board renders, can drag cards between columns
- **E7_Forms** - Modal forms display correctly, inputs clickable
- **E8_Header** - Header layout correct, buttons clickable

Example assertion pattern (from `test-mobile.js`):
```javascript
const hamburgerVisible = await page.evaluate(() => {
  const btn = document.getElementById('hamburger-btn');
  if (!btn) return false;
  const style = window.getComputedStyle(btn);
  return style.display !== 'none' && style.visibility !== 'hidden';
});
results.E1_MobileNavigation.hamburgerVisible = hamburgerVisible;
console.log(`  Hamburger menu icon visible: ${hamburgerVisible ? 'PASS' : 'FAIL'}`);
```

**Running E2E Tests:**
```bash
npm run dev                 # Start backend (required for test)
npm run test-mobile        # Run test-mobile.js with Puppeteer (on separate port 3050)
```

## Backend Testing Approach (Not Configured)

**Manual API testing:**
- cURL or Postman for endpoint validation (not documented in repo)
- No automated integration tests
- No database seeding scripts for test data

**Middleware validation:**
- Auth middleware tested implicitly: cookies/JWT tokens required for protected routes
- Role-based access tested via permission middleware: `requireRole()`, `requirePhaseAccess()`
- No explicit test cases

## Frontend Testing Approach (Not Configured)

**Manual UI testing:**
- Browser dev tools for layout/CSS debugging
- Mobile device testing via Chrome DevTools device emulation (375px width)
- Form submission tested via browser developer console
- API calls verified in Network tab

**Accessibility testing:**
- Not configured
- No axe-core, Lighthouse, or similar tools integrated

## What is NOT Tested Automatically

**Backend:**
- User registration and login flows
- Task CRUD operations (create, read, update, delete)
- Database schema migrations
- Permission enforcement (requireRole, canEditEntry)
- JWT token generation and validation
- API key validation and lifecycle
- Data transformation (e.g., JSON parsing in database layer)
- Business logic (e.g., bases relation sync, apex job phase sequencing)
- Error responses and edge cases
- Rate limiting (express-rate-limit configured but not tested)

**Frontend:**
- Form validation
- API error handling
- Modal open/close behavior
- Tab switching logic
- Filter/sort functionality
- Relation pickers and dropdowns
- Kanban drag-and-drop (partially covered by E5 in test-mobile.js)
- Data rendering and list/card/table views
- Local state management (currentView, filters, customOrder)

**Database:**
- Data integrity constraints
- Foreign key relationships
- Cascade deletes
- Transaction rollback behavior
- Index performance

## Coverage

**Requirements:** None enforced

**Current coverage:** Estimated <5% (only E2E mobile UI tests, no unit/integration tests)

**Gaps:**
- No backend API route coverage
- No database layer coverage
- No permission/role testing
- No error scenario testing
- No edge case handling

## Test Types Needed (Recommendations for Future)

**Unit Tests (Recommended First):**
- Database helpers: `findUserById()`, `createTask()`, `updateBase()` (test isolation with in-memory or test database)
- Permission functions: `requireRole()`, `canEditEntry()`, `requirePhaseAccess()`
- Utility functions: `ensureJsonString()`, `generateJobNumber()`, `parseRoles()`

**Integration Tests (Recommended Second):**
- Auth flows: signup, login, logout, token refresh
- Task CRUD with permissions
- Bases relations sync (complex two-way updates)
- Apex job creation with phases and assignments
- API key validation

**E2E Tests (Already Started):**
- Expand test-mobile.js to cover more UI interactions
- Add desktop browser tests (1920x1080)
- Add workflow tests (login → create task → update → view in list)
- Add performance tests (page load time, render latency)

## Common Patterns Observed

**Error Resilience in Parsed Data:**

JSON parsing uses silent fallback:
```javascript
// In database layer (apexJobs.js)
additional_clients: (() => { try { return JSON.parse(job.additional_clients || '[]'); } catch { return []; } })(),

// In routes (apexJobs.js)
const pmArr = JSON.parse(job.mitigation_pm || '[]');
ownerName = Array.isArray(pmArr) ? pmArr[0] || '' : '';
```

**Frontend Async Pattern:**

Modules use async init and load methods:
```javascript
async init() {
    try {
        const profileData = await api.getProfile();
        window.currentUser = profileData.user || {};
    } catch(e) {
        window.currentUser = {};
    }
    // Continue setup...
}
```

**Mock Data (Not Used):**
- No fixtures or factories
- Live API calls to backend in development
- Fallback to empty state on API errors

## Development Testing Workflow

**Current manual process:**

1. **Start backend:**
   ```bash
   cd backend && npm run dev
   ```
   - Runs Node with --watch on `src/index.js`
   - Auto-restarts on file changes

2. **Start frontend in browser:**
   - Open `http://localhost:3000` in browser
   - Dev tools open for console inspection

3. **Test a feature:**
   - Manually interact with UI
   - Observe Network tab for API calls
   - Check Console for errors
   - Verify database state via SQLite CLI or admin panel

4. **Run E2E tests (mobile only):**
   ```bash
   npm run test-mobile
   # Requires backend running on port 3050
   ```

**No CI/CD pipeline configured:**
- No GitHub Actions, GitLab CI, or similar
- No automated test runs on pull requests or commits
- Tests run manually before deployment

---

*Testing analysis: 2026-02-11*
