# Phase 3: Tab Shell & Log Initialization - Research

**Researched:** 2026-02-11
**Domain:** Frontend tab integration, drying log initialization workflow, room pre-population from job data
**Confidence:** HIGH

## Summary

Phase 3 is a frontend-focused integration phase that replaces the existing placeholder `renderDryingTab()` in `jobDetailTabs.js` with a functional drying log initialization workflow, and adds the backend logic to create a log with pre-populated rooms from the job's `areas_affected` field. The existing codebase provides every building block needed: the tab already exists in the tab bar (it is the 6th tab rendered by `renderContentTabs()` in `apex-jobs.js`), the API client already has `api.getDryingLog()` and `api.createDryingLog()`, and the backend drying routes (`POST /log`, `POST /chambers`, `POST /rooms`) are fully implemented. The primary work is replacing the static placeholder HTML in `renderDryingTab()` with a dynamic renderer that checks for log existence, wiring up a "Create Drying Logs" button that calls the backend, and adding server-side room pre-population logic that parses the job's `areas_affected` text field.

The `areas_affected` field is a free-text `TEXT DEFAULT ''` column in `apex_jobs` that stores comma-separated room names (e.g., "Kitchen, basement, etc." per the input placeholder). The frontend job creation form and edit modal both expose it as a plain text input. When creating a drying log, the backend should parse this field, create a default chamber (the drying_rooms table requires a parent chamber_id), and create one room per parsed area. The rooms are just convenience pre-population -- the technician has full control to rename, delete, or add rooms.

**Primary recommendation:** Replace the placeholder `renderDryingTab()` in `jobDetailTabs.js` with a stateful renderer that fetches the drying log on tab activation, shows a "Create Drying Logs" button if none exists, and displays the room list with CRUD controls after creation. Extend `POST /drying/log` on the backend to accept an optional `areas_affected` parameter that triggers room pre-population within a transaction.

## Standard Stack

### Core (Already in Place)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla JS | N/A | Frontend rendering, event handling | Existing codebase pattern -- no framework |
| Express | ^4.21.2 | Backend HTTP routes | Already mounted, drying sub-router exists |
| better-sqlite3 | ^11.7.0 | SQLite transactions for atomic log+chamber+room creation | Already used for all drying CRUD |
| uuid | ^11.1.0 | ID generation for log, chamber, room records | Already used everywhere |

### No New Dependencies

This phase requires zero new npm packages. All frontend work is vanilla JS. All backend work uses existing Express routes and better-sqlite3 functions that were built in Phases 1 and 2.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Server-side room pre-population | Client-side sequential API calls (create log, then create chamber, then create N rooms) | Client-side approach requires N+2 HTTP requests and has no atomicity -- if the 4th room creation fails, the first 3 exist in a broken state. Server-side transaction is the right choice. |
| Parsing `areas_affected` on the backend | Parsing on the frontend and sending structured room data | Backend parsing is safer (single source of truth) and the field is already available via `getJobById()`. Frontend doesn't need to know the parsing rules. |
| Extending existing `POST /log` route | Creating a new `POST /log/init` route | Extending the existing route with optional `areas_affected` body parameter is simpler and maintains backward compatibility (existing route still works without the parameter). |

## Architecture Patterns

### Existing File Structure (No New Files for Frontend)

```
frontend/js/
  jobDetailTabs.js       # (MODIFY) Replace renderDryingTab() placeholder with real implementation
  api.js                 # (ALREADY DONE) getDryingLog(), createDryingLog(), CRUD chambers/rooms already exist
  apex-jobs.js           # (SMALL MODIFY) May need to fetch drying log status during openJobDetail() for tab badge

backend/src/
  routes/drying.js       # (MODIFY) Extend POST /log to accept areas_affected and pre-populate rooms
  db/dryingLogs.js       # (MODIFY) Add createDryingLogWithRooms() transaction function
```

### Pattern 1: Tab Content Rendering (Existing Pattern)

**What:** Each tab in `jobDetailTabs.js` is a pure function that receives the job object and returns an HTML string. The dispatch function `renderTab()` maps tab names to renderers.

**When to use:** Always -- this is the established pattern for all 6 tabs.

**Example (from existing codebase):**
```javascript
// Source: frontend/js/jobDetailTabs.js lines 513-529
jobDetailTabs.renderTab = function(tabName, job, phaseId, panel) {
    const renderers = {
        dates:     () => this.renderDatesTab(job),
        documents: () => this.renderDocumentsTab(job, phaseId),
        tasks:     () => this.renderTasksTab(job, phaseId),
        notes:     () => this.renderNotesTab(job, phaseId),
        expenses:  () => this.renderExpensesTab(job, phaseId),
        drying:    () => this.renderDryingTab(job, phaseId)
    };

    const render = renderers[tabName];
    if (render) {
        panel.innerHTML = render();
    }
};
```

**Key insight:** The renderers return HTML strings. For the drying tab, we need to break from the pure-return pattern slightly because we need an async check (does the log exist?). The pattern used by `renderNotesTab` and its `_submitNote` async helper shows how to handle this: render an initial state synchronously, then use `onclick` handlers that call async methods which re-render the panel content.

### Pattern 2: Async Data Fetch on Tab Activation (Existing Pattern in Notes Tab)

**What:** The notes tab renders an initial state from job data, but its save/delete handlers fetch fresh data and re-render the panel.

**Example (from existing codebase):**
```javascript
// Source: frontend/js/jobDetailTabs.js lines 295-313
async _submitNote(jobId) {
    // ... save note via API ...
    const notes = await api.getApexJobNotes(jobId);
    if (window.apexJobs && window.apexJobs.currentJob) {
        window.apexJobs.currentJob.notes = notes;
        const container = document.getElementById('job-detail-tab-panel');
        if (container) container.innerHTML = jobDetailTabs.renderNotesTab(window.apexJobs.currentJob, phase_id);
    }
}
```

**Applied to drying tab:** The drying tab renderer will show a loading state, then async-fetch the drying log status via `api.getDryingLog(jobId)`, then re-render the panel with either the "Create" button (no log) or the room list (log exists).

### Pattern 3: Room Pre-Population via Server Transaction

**What:** When creating a drying log, the backend parses `areas_affected` from the job, creates a default chamber, and creates rooms within a single transaction.

**Data flow:**
```
1. Frontend clicks "Create Drying Logs"
2. Frontend calls api.createDryingLog(jobId) -- POST /api/apex-jobs/:id/drying/log
3. Backend reads job.areas_affected from DB
4. Backend parses comma-separated areas into room names
5. Within a transaction:
   a. Create drying_logs row
   b. Create one drying_chambers row ("Default Chamber")
   c. For each parsed room name: create drying_rooms row linked to chamber
6. Return the created log + chambers + rooms
```

**Why transaction:** Atomicity -- if room creation fails, the log shouldn't exist either. The existing `db.transaction()` pattern from `dryingLogs.js` (see `addRefPoint`, `saveMoistureReadings`) is exactly the pattern to follow.

### Anti-Patterns to Avoid

- **Creating a separate JS file for drying tab:** The existing pattern is that all tab renderers live in `jobDetailTabs.js`. Adding a `dryingTab.js` would break the established single-file-per-concern pattern. Keep the drying tab renderer in `jobDetailTabs.js`.
- **Client-side sequential room creation:** Don't make the frontend call `createDryingLog`, then `createDryingChamber`, then `createDryingRoom` x N. This is fragile and slow. Do it all server-side in one transaction.
- **Blocking the tab bar:** Don't prevent the user from switching to the drying tab. Always show the tab and handle empty/loading states gracefully.
- **Parsing `areas_affected` on the frontend:** The frontend doesn't own the data format. Let the backend parse it -- this keeps the logic in one place and handles edge cases (empty string, extra commas, whitespace) consistently.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Comma-separated text parsing | Custom regex parser | Simple `split(',').map(s => s.trim()).filter(Boolean)` | Standard JS string methods handle all edge cases for this use case. No regex needed. |
| Room list with CRUD UI | Custom drag-drop sortable list | Simple editable list with rename/delete buttons | Phase 3 only needs basic CRUD. Sorting/reordering is Phase 4's concern. Keep it minimal. |
| Tab state management | Custom state machine | Simple boolean flags + DOM re-render | The existing tab system uses `activeTab` string + `panel.innerHTML` re-render. Follow the same pattern. |

**Key insight:** This phase is intentionally small-scoped. Resist adding features from Phase 4 (chambers, ref points, equipment). The success criteria only ask for: (1) tab visible, (2) create button when no log, (3) pre-populated rooms, (4) rooms are editable/deletable/addable.

## Common Pitfalls

### Pitfall 1: Race Condition on Tab Switch During Async Fetch

**What goes wrong:** User clicks Drying tab, async fetch starts. User quickly clicks Notes tab. Async fetch completes and overwrites the Notes tab panel with drying content.

**Why it happens:** The `renderDryingTab` function does an async fetch after being called, then writes to `#job-detail-tab-panel`. If the user switched tabs during the fetch, the panel now belongs to a different tab.

**How to avoid:** Before writing to the panel after async completion, verify `apexJobs.activeTab === 'drying'`. If not, discard the result.

```javascript
async _loadDryingState(jobId) {
    // ... fetch log ...
    // Guard: user may have switched tabs during fetch
    if (apexJobs.activeTab !== 'drying') return;
    // Safe to update panel
}
```

**Warning signs:** Content flickering when switching between tabs quickly.

### Pitfall 2: `areas_affected` Format Assumptions

**What goes wrong:** The `areas_affected` field is free-text. Assuming it is always comma-separated (e.g., "Kitchen, Basement, Hall Bathroom") fails when users enter semicolons, newlines, "and" conjunctions, or single-room entries without commas.

**Why it happens:** The HTML input placeholder says "Kitchen, basement, etc." but there is no validation enforcing comma separation.

**How to avoid:** Parse with a generous splitter that handles commas, semicolons, and newlines. Trim whitespace. Filter empty strings. If the result is empty or the field is empty, create the log with zero pre-populated rooms (the default chamber still gets created so the user can add rooms manually).

```javascript
function parseAreasAffected(text) {
    if (!text || !text.trim()) return [];
    return text.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
}
```

**Warning signs:** Users see rooms with leading/trailing whitespace, empty room names, or a single room that contains commas in its name.

### Pitfall 3: Double-Click on "Create Drying Logs" Button

**What goes wrong:** The technician double-clicks the button. Two `POST /log` requests fire. The first succeeds, the second hits the 409 conflict check. The frontend may show an error or confusing state.

**Why it happens:** No client-side click debouncing on the create button.

**How to avoid:** Disable the button immediately on click (set `disabled` attribute and update text to "Creating..."). Re-enable on error. The 409 response from the server is a safety net, but the UX should prevent it from being needed.

### Pitfall 4: Not Returning Rooms in the Create Response

**What goes wrong:** Backend creates the log and rooms but only returns the `drying_logs` row. Frontend has to make 2 more API calls (get chambers, get rooms) to display the created rooms. This creates a flash of empty state.

**Why it happens:** The existing `POST /log` route only returns the log row.

**How to avoid:** Extend the `POST /log` response to include the created chambers and rooms when pre-population occurs. Return a composite response: `{ log, chambers, rooms }`.

### Pitfall 5: Missing MIT Phase Check (Or Being Too Strict)

**What goes wrong (option A):** The current placeholder `renderDryingTab()` restricts drying to MIT phases only. But some jobs have drying needs without a MIT phase. The user sees "only available for Mitigation phases" and can't create a drying log.

**What goes wrong (option B):** Removing the MIT check entirely means the drying tab appears for reconstruction-only jobs where it makes no sense, confusing the user.

**How to avoid:** Show the drying tab for all jobs (it is already in the tab bar unconditionally). Allow drying log creation for any job -- the backend has no MIT restriction. Remove the MIT-only message from the current placeholder. The drying log's existence (or lack thereof) is the state indicator, not the phase type.

## Code Examples

### Example 1: Replacement renderDryingTab() Structure

```javascript
// Source: Pattern derived from existing renderNotesTab() + renderTasksTab() patterns
renderDryingTab(job, phaseId) {
    const esc = apexJobs.escapeHtml;

    // Render a loading/placeholder, then async-load real state
    // Return immediate HTML, then trigger async load
    setTimeout(() => jobDetailTabs._loadDryingState(job.id), 0);

    return `
        <div class="apex-modal-section" id="drying-tab-content">
            <h3 class="apex-section-title">Structural Drying</h3>
            <div class="apex-empty-state">Loading drying log status...</div>
        </div>
    `;
},
```

### Example 2: Async State Loader

```javascript
async _loadDryingState(jobId) {
    if (apexJobs.activeTab !== 'drying') return;

    const container = document.getElementById('drying-tab-content');
    if (!container) return;

    try {
        const log = await api.getDryingLog(jobId);
        // Log exists -- render room management UI
        if (apexJobs.activeTab !== 'drying') return;
        container.innerHTML = jobDetailTabs._renderDryingLogView(log, jobId);
    } catch (err) {
        if (err.message === 'Not Found' || err.status === 404) {
            // No log exists -- render create button
            if (apexJobs.activeTab !== 'drying') return;
            container.innerHTML = jobDetailTabs._renderCreateDryingButton(jobId);
        } else {
            container.innerHTML = '<div class="apex-empty-state">Failed to load drying log</div>';
        }
    }
},
```

### Example 3: Server-Side Room Pre-Population Transaction

```javascript
// Source: Pattern from existing createDryingLog() + insertChamber() + insertRoom() in dryingLogs.js
const createDryingLogWithRooms = db.transaction((jobId, roomNames) => {
    const logId = uuidv4();
    insertLog.run(logId, jobId, 'active', 1);

    // Always create a default chamber (rooms need a parent)
    const chamberId = uuidv4();
    insertChamber.run(chamberId, logId, 'Default', '', 0);

    // Pre-populate rooms from areas_affected
    const rooms = [];
    roomNames.forEach((name, i) => {
        const roomId = uuidv4();
        insertRoom.run(roomId, chamberId, name, i);
        rooms.push({ id: roomId, chamber_id: chamberId, name, position: i });
    });

    const log = getLogByJobId.get(jobId);
    return {
        log,
        chambers: [{ id: chamberId, log_id: logId, name: 'Default', color: '', position: 0 }],
        rooms
    };
});
```

### Example 4: Parsing areas_affected on the Backend Route

```javascript
// In POST /log route handler
router.post('/log', (req, res) => {
    const existing = requireLog(req.params.id);
    if (existing) return res.status(409).json({ error: 'Drying log already exists', log: existing });

    // Read job to get areas_affected
    const job = db.prepare('SELECT areas_affected FROM apex_jobs WHERE id = ?').get(req.params.id);
    const areasText = job?.areas_affected || '';
    const roomNames = areasText.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);

    const result = dryingLogs.createDryingLogWithRooms(req.params.id, roomNames);
    res.status(201).json(result);
});
```

### Example 5: Room Management UI HTML Pattern

```javascript
_renderDryingLogView(log, jobId) {
    // Fetch rooms data, then render an editable list
    // Pattern: similar to renderTasksTab() checkbox list
    return `
        <h3 class="apex-section-title">Structural Drying</h3>
        <div class="drying-status-badge">${log.status === 'active' ? 'Active' : 'Complete'}</div>
        <div class="drying-rooms-section">
            <h4 class="apex-phase-section-title">Rooms</h4>
            <div id="drying-rooms-list">Loading rooms...</div>
            <button class="jdt-add-btn" onclick="jobDetailTabs._addRoom('${jobId}')">+ Add Room</button>
        </div>
    `;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static placeholder HTML in drying tab | Async-loading dynamic content | Phase 3 (this phase) | Tab becomes functional instead of showing "No equipment tracked yet" placeholder |
| No drying log exists on job | Backend creates log + default chamber + rooms atomically | Phase 3 (this phase) | One-click setup instead of manual multi-step configuration |
| MIT-only restriction on drying tab | Available for all jobs | Phase 3 (this phase) | Any job that needs drying documentation can use it |

**Deprecated/outdated:**
- The current `renderDryingTab()` in `jobDetailTabs.js` (lines 477-509) is a static placeholder that returns hardcoded HTML with "No equipment tracked yet" messages. It also has a `isMit` check that restricts drying to MIT phases only. Both of these should be replaced entirely.

## Open Questions

1. **Default Chamber Naming**
   - What we know: The `drying_chambers` table requires a `name`. When pre-populating rooms, we need at least one chamber.
   - What's unclear: Should the default chamber be named "Default", "Chamber 1", "Containment Zone 1", or something else?
   - Recommendation: Use "Default" as the name. Phase 4 (Structure Management) will give the user full control to rename chambers, so the exact name is not critical. The important thing is that rooms have a valid parent.

2. **Should the Create Action Be Idempotent?**
   - What we know: The `POST /log` route already returns 409 if a log exists with the existing log data. This is correct.
   - What's unclear: If the user somehow sees the "Create" button after a log was already created (race condition, stale tab), should clicking it silently redirect to the existing log view?
   - Recommendation: Yes. On 409 response, treat it as success -- the log exists, so fetch and display it. Don't show an error to the user.

3. **Room Display After Creation: Inline vs. Fetch**
   - What we know: The server can return the created rooms in the POST response (recommended approach).
   - What's unclear: After creation, should the UI immediately render from the POST response data, or should it re-fetch everything?
   - Recommendation: Use the POST response directly for immediate display. No need for an extra roundtrip. The data is authoritative since it was just created.

## Sources

### Primary (HIGH confidence)
- `frontend/js/jobDetailTabs.js` (lines 477-531) -- Current renderDryingTab() placeholder and renderTab() dispatch. Verified by direct file read.
- `frontend/js/apex-jobs.js` (lines 468-528, 721-741) -- openJobDetail() data flow and renderContentTabs() tab definitions. Verified by direct file read.
- `frontend/js/api.js` (lines 714-942) -- All drying API client methods already implemented. Verified by direct file read.
- `backend/src/routes/drying.js` (lines 65-89) -- Existing POST /log route, GET /log route. Verified by direct file read.
- `backend/src/db/dryingLogs.js` (lines 160-164, 249-359) -- createDryingLog function, insertChamber/insertRoom exports. Verified by direct file read.
- `backend/src/db/apexSchema.js` (line 48) -- `areas_affected TEXT DEFAULT ''` column definition. Verified by direct file read.
- `backend/src/db/apexJobs.js` (lines 157-168) -- getJobById returns SELECT * (includes areas_affected). Verified by direct file read.

### Secondary (MEDIUM confidence)
- `frontend/index.html` (line 2103) -- areas_affected input placeholder: "Kitchen, basement, etc." suggesting comma-separated format. Verified by direct file read.
- `frontend/js/jobDetailModals.js` (line 266) -- Edit modal shows areas_affected as plain text input. Verified by grep search.
- `.planning/research/PITFALLS.md` (line 212) -- Pre-populate rooms from areas_affected recommendation. Verified by direct file read.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new dependencies. All tools exist in the codebase.
- Architecture: HIGH -- The tab system, API routes, and DB functions are all verified by direct code reading. The integration points are clear and well-documented in existing code.
- Pitfalls: HIGH -- Race conditions and parsing edge cases are standard frontend concerns. The double-click and 409 handling are verified against existing route behavior.

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (stable -- no external dependencies, all codebase-internal patterns)
