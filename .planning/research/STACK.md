# Stack Research

**Domain:** Structural drying documentation feature (Drying Logs) for water damage restoration management
**Researched:** 2026-02-11
**Confidence:** HIGH

This research covers what libraries, patterns, and tools are needed to add the Drying Logs feature to the existing LyfeHub v2 stack (vanilla JS + Express 4.21 + SQLite via better-sqlite3). The scope is: GPP psychrometric calculation, complex multi-tab modal forms, photo capture/upload, real-time field validation, and time-series data storage for daily readings across multiple reference points.

---

## Recommended Stack

### Core Technologies (Already In Place)

| Technology | Version | Purpose | Notes |
|------------|---------|---------|-------|
| Express | 4.21.x | REST API server | Already installed. No changes needed. |
| better-sqlite3 | 11.7.x | SQLite database | Already installed. WAL mode enabled. |
| multer | 2.0.x | File upload middleware | Already installed and configured. Handles photo uploads. |
| uuid | 11.1.x | UUID generation | Already installed. Used for all record IDs. |

**No new backend dependencies are required for the core feature.**

### New Backend Library: sharp (Image Processing)

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| sharp | ^0.33.x | Server-side image resize/compression for photo uploads | Mobile camera photos are 3-12 MB each. A drying log with 5-10 photos per visit over 5 days = 250-600 MB of raw photos per job. sharp generates thumbnails for list views and compresses originals, cutting storage 60-80%. Already proven with multer (buffer storage mode). Node 20 compatible (requires >= 20.3.0, which the Docker image uses). |

**Confidence:** HIGH -- sharp is the standard Node.js image processing library, widely documented with multer integration patterns, and explicitly supports Node 20.

**Why not client-side compression only?** Client-side Canvas API compression (via `toBlob()`) is useful for reducing upload time on slow mobile connections, but server-side processing with sharp is still needed because: (a) you need consistent thumbnail sizes for the visit history view, (b) EXIF orientation varies wildly across mobile devices and sharp normalizes it automatically via `sharp().rotate()`, and (c) you want a predictable output format (WebP or JPEG at a controlled quality level) regardless of what the client sends.

**Recommendation: Do both.** Compress client-side before upload to save bandwidth, then process server-side with sharp for thumbnails and normalization. See "Client-Side Image Compression" section below.

### Supporting Libraries (No Install Needed)

These capabilities are already available through the existing stack or browser APIs:

| Capability | Implementation | Why No Library Needed |
|------------|----------------|----------------------|
| GPP Calculation | Pure JavaScript (Math.exp, Math.log) | IAPWS formula is ~15 lines of JS. No external dependency. Already implemented in Python reference (`calculate_gpp.py`). Port directly to JS. |
| Camera Capture | HTML `<input type="file" accept="image/*" capture="environment">` | Native browser/OS behavior on mobile. Opens camera directly. No JS library needed. |
| Gallery Selection | HTML `<input type="file" accept="image/*" multiple>` (without capture attr) | Browser file picker on mobile includes gallery. |
| Client-Side Image Compression | Canvas API (`toBlob()`) | Built into all modern browsers. ~20 lines of JS for resize + quality reduction. No npm package needed for this use case. |
| Real-Time Form Validation | DOM `input` event listeners + CSS classes | Existing pattern used in `jobModal.js`. No validation library needed for this form size. |
| Multi-Tab Modal | Vanilla JS tab switching + HTML template strings | Existing pattern used in `jobDetailTabs.js`. Tab rendering with `innerHTML` assignment. |
| UUID Generation (client-side) | Not needed -- IDs generated server-side | Matches existing pattern. All IDs come from `uuid` on the backend. |

---

## Decision: GPP Calculation -- Client-Side

**Recommendation:** Calculate GPP exclusively on the client side.
**Confidence:** HIGH

**Why client-side:**
1. **Real-time display is the primary use case.** The vision doc specifies GPP auto-calculates as the technician types Temp and RH. This must be instant -- no network round-trip.
2. **The formula is deterministic and small.** The IAPWS formula is pure math with no external data dependencies. It produces identical results regardless of where it runs.
3. **The existing Python reference implementation confirms the formula.** The exact same constants and steps from `calculate_gpp.py` translate 1:1 to JavaScript.
4. **No server validation needed for GPP itself.** GPP is a derived value stored alongside its inputs (Temp, RH). If someone replays the calculation server-side later (e.g., for PDF report generation), they will get the same result from the stored Temp and RH.

**Why NOT server-side:**
- Adds unnecessary latency for a real-time UI operation
- Requires API calls for every keystroke (wasteful)
- The calculation has no secrets, no access control, no database interaction

**Implementation:**

```javascript
/**
 * Calculate GPP (Grains Per Pound) from temperature and relative humidity.
 * IAPWS formula for saturation vapor pressure.
 *
 * @param {number} tempF - Temperature in Fahrenheit
 * @param {number} rhPercent - Relative humidity (0-100)
 * @param {number} [pressurePsia=14.696] - Atmospheric pressure in psia
 * @returns {number|null} GPP rounded to 1 decimal, or null if inputs invalid
 */
function calculateGPP(tempF, rhPercent, pressurePsia = 14.696) {
    if (tempF == null || rhPercent == null) return null;
    if (rhPercent < 0 || rhPercent > 100) return null;

    // Step 1: Convert to Rankine
    const tempR = tempF + 459.67;

    // Step 2: Saturation vapor pressure (IAPWS)
    const lnPws = -10440.397 / tempR
        - 11.29465
        - 0.027022355 * tempR
        + 0.00001289036 * Math.pow(tempR, 2)
        - 0.0000000024780681 * Math.pow(tempR, 3)
        + 6.5459673 * Math.log(tempR);
    const pws = Math.exp(lnPws);

    // Step 3: Actual vapor pressure
    const pw = (rhPercent / 100) * pws;

    // Step 4: Humidity ratio
    const w = 0.62198 * pw / (pressurePsia - pw);

    // Step 5: Grains per pound
    return Math.round(w * 7000 * 10) / 10;
}
```

This should live in a shared utility file (`frontend/js/drying-utils.js`) and be loaded on the page. It can also be duplicated into a backend utility if report generation needs it later.

---

## Decision: Photo Capture on Mobile

**Recommendation:** Use the HTML `capture` attribute for camera access, with a fallback file input for gallery selection.
**Confidence:** HIGH

**Why the `capture` attribute (not `getUserMedia`):**
1. **Simplest possible implementation.** A single `<input>` element handles camera access across iOS and Android with zero JavaScript. The OS handles the camera UI, permissions, and image file creation.
2. **Works offline-first.** No streaming video, no WebRTC dependencies, no canvas frame capture. The OS takes the photo and returns a File object.
3. **Battle-tested on mobile browsers.** This is the standard approach for native-feeling camera capture in web apps. Supported in Chrome Android, Safari iOS, and all modern mobile browsers.
4. **No library needed.** The `getUserMedia` API would require significant JavaScript for camera preview, capture button, canvas rendering, and permission handling -- all of which the `capture` attribute does for free.

**Implementation pattern:**

```html
<!-- Take a photo with the rear camera -->
<input type="file" accept="image/*" capture="environment"
       id="drying-photo-capture" style="display:none">

<!-- Choose from gallery (no capture attr = OS shows file picker) -->
<input type="file" accept="image/*" multiple
       id="drying-photo-gallery" style="display:none">

<!-- UI buttons that trigger the hidden inputs -->
<button onclick="document.getElementById('drying-photo-capture').click()">
    Take Photo
</button>
<button onclick="document.getElementById('drying-photo-gallery').click()">
    Choose from Gallery
</button>
```

**Client-side processing before upload:**

```javascript
async function compressImage(file, maxWidth = 1920, quality = 0.8) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = Math.min(1, maxWidth / img.width);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(resolve, 'image/jpeg', quality);
        };
        img.src = URL.createObjectURL(file);
    });
}
```

**Server-side processing with sharp:**

```javascript
// In the upload route, after multer saves the file:
const sharp = require('sharp');

async function processPhoto(inputPath, outputDir, fileId) {
    // Generate thumbnail (300px wide, preserve aspect ratio)
    await sharp(inputPath)
        .rotate()           // Auto-fix EXIF orientation
        .resize(300, null, { fit: 'inside' })
        .jpeg({ quality: 70 })
        .toFile(path.join(outputDir, `${fileId}-thumb.jpg`));

    // Optimize original (cap at 1920px, compress)
    await sharp(inputPath)
        .rotate()           // Auto-fix EXIF orientation
        .resize(1920, null, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(path.join(outputDir, `${fileId}-full.jpg`));
}
```

**Why `capture="environment"` (not `"user"`):** Restoration technicians photograph structures, equipment, and materials -- they use the rear (environment-facing) camera, not the selfie camera.

---

## Decision: Multi-Tab Modal Forms in Vanilla JS

**Recommendation:** Follow the existing `jobDetailTabs.js` pattern with render functions that return HTML strings, extended with tab-specific state management.
**Confidence:** HIGH

**Why this pattern works for the Drying Logs modal:**

The existing codebase already solves multi-tab modals. `jobDetailTabs.js` has a `renderTab()` dispatcher that calls per-tab render functions (`renderDatesTab`, `renderNotesTab`, `renderExpensesTab`, etc.) and injects HTML into a panel element via `innerHTML`. The Drying Logs modal needs the same pattern but with more complexity:

1. **Top section (always visible):** Atmospheric readings (job-level + per-chamber)
2. **Tab row:** One tab per room, color-coded by chamber
3. **Tab content:** Reference point table + equipment section per room
4. **Bottom section (always visible):** Notes + photos + save/complete buttons

**Pattern to follow:**

```javascript
const dryingModal = {
    // State
    currentRoomTab: null,
    visitData: {},       // Collects all form data before save
    priorVisitData: {},  // Read-only reference data from last visit

    open(jobId, dryingLog) {
        // Render the full modal structure
        // Atmospheric readings at top (always visible)
        // Room tabs in middle
        // Notes/photos at bottom
    },

    renderAtmosphericSection(chambers, priorVisit) {
        // Returns HTML string for the atmospheric readings grid
        // Each row: label | prior values | input fields | GPP auto | delta
    },

    renderRoomTab(room, referencePoints, equipment, priorVisit) {
        // Returns HTML string for one room's content
        // Reference point table + equipment section
    },

    switchRoomTab(roomId) {
        // Update active tab styling
        // Re-render tab content panel
    },

    // Event delegation for all inputs in the modal
    handleInput(e) {
        // Temp/RH inputs -> recalculate GPP in real-time
        // Moisture reading inputs -> check against baseline for green highlight
        // Equipment quantity inputs -> update state
    },

    collectVisitData() {
        // Gather all input values into a structured object for API submission
    },

    validateForSave() {
        // Check: all atmospheric readings filled?
        // Check: all active reference points have readings or were demo'd?
        // Check: equipment confirmed?
        // Enable/disable Save button accordingly
    }
};
```

**Key patterns from the existing codebase to reuse:**
- **Event delegation on the form container** (`this.form.addEventListener("input", ...)` from `jobModal.js`) rather than binding listeners per-element
- **HTML template strings** with `${esc(value)}` escaping (from `jobDetailTabs.js`)
- **Collapsible sections** with `_toggleSection()` (from the Expenses tab)
- **Inline editing** with display/input swap (from the Dates tab)
- **Hidden form elements** for multi-value state (from `teamSelect` in `jobModal.js`)

**File organization:**
- `frontend/js/drying-utils.js` -- GPP calculation, validation helpers, formatting
- `frontend/js/drying-modal.js` -- The visit entry modal (create + add visit)
- `frontend/js/drying-tab.js` -- The Drying tab renderer within job detail (visit history, create button)
- `frontend/css/drying.css` -- All drying-specific styles

---

## Decision: SQLite Schema for Time-Series Drying Data

**Recommendation:** Normalized relational tables with foreign keys and ON DELETE CASCADE, following the existing `apex_job_*` pattern. Do NOT use JSON-in-SQLite for readings data.
**Confidence:** HIGH

**Why normalized tables (not JSON blobs):**

The existing codebase uses JSON-in-SQLite for simple array data (tags, assignment lists). But drying log data is different:
1. **Queryable time-series data.** You need to query "show me all readings for reference point #3 across all visits" or "what was the max GPP for Chamber A." JSON blobs require parsing every row.
2. **Volume.** A 5-day job with 3 chambers, 8 rooms, 30 reference points generates ~150 moisture readings per visit, ~750 total. This is relational data, not a settings blob.
3. **Concurrent data entry.** Multiple visits should not lock each other out. Row-level inserts to normalized tables avoid read-modify-write races on JSON blobs.
4. **Report generation.** The deferred PDF report feature will need to aggregate, filter, and format this data. SQL queries on normalized tables are dramatically simpler than parsing JSON.

**Schema design:**

```sql
-- Parent: one drying log per job (MIT phase)
CREATE TABLE drying_logs (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES apex_jobs(id) ON DELETE CASCADE,
    phase_id TEXT REFERENCES apex_job_phases(id),
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'complete')),
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Chambers: containment zones
CREATE TABLE drying_chambers (
    id TEXT PRIMARY KEY,
    drying_log_id TEXT NOT NULL REFERENCES drying_logs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#00aaff',
    dehu_count INTEGER DEFAULT 1,
    position INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Rooms: assigned to chambers
CREATE TABLE drying_rooms (
    id TEXT PRIMARY KEY,
    drying_log_id TEXT NOT NULL REFERENCES drying_logs(id) ON DELETE CASCADE,
    chamber_id TEXT NOT NULL REFERENCES drying_chambers(id),
    name TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Reference points: numbered across job, assigned to rooms
CREATE TABLE drying_reference_points (
    id TEXT PRIMARY KEY,
    drying_log_id TEXT NOT NULL REFERENCES drying_logs(id) ON DELETE CASCADE,
    room_id TEXT NOT NULL REFERENCES drying_rooms(id),
    point_number INTEGER NOT NULL,
    material_code TEXT NOT NULL,
    demo_date TEXT,
    demo_visit_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Material baselines: one per material type per drying log
CREATE TABLE drying_baselines (
    id TEXT PRIMARY KEY,
    drying_log_id TEXT NOT NULL REFERENCES drying_logs(id) ON DELETE CASCADE,
    material_code TEXT NOT NULL,
    baseline_value REAL NOT NULL,
    UNIQUE(drying_log_id, material_code)
);

-- Visits: timestamped entry sessions
CREATE TABLE drying_visits (
    id TEXT PRIMARY KEY,
    drying_log_id TEXT NOT NULL REFERENCES drying_logs(id) ON DELETE CASCADE,
    visit_number INTEGER NOT NULL,
    notes TEXT DEFAULT '',
    author_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Atmospheric readings: per chamber + job-level per visit
CREATE TABLE drying_atmospheric_readings (
    id TEXT PRIMARY KEY,
    visit_id TEXT NOT NULL REFERENCES drying_visits(id) ON DELETE CASCADE,
    chamber_id TEXT REFERENCES drying_chambers(id),
    reading_type TEXT NOT NULL CHECK(reading_type IN (
        'chamber_intake', 'dehu_exhaust', 'unaffected', 'outside'
    )),
    dehu_number INTEGER,
    temp_f REAL,
    rh_percent REAL,
    gpp REAL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Moisture readings: per reference point per visit
CREATE TABLE drying_moisture_readings (
    id TEXT PRIMARY KEY,
    visit_id TEXT NOT NULL REFERENCES drying_visits(id) ON DELETE CASCADE,
    reference_point_id TEXT NOT NULL REFERENCES drying_reference_points(id),
    reading_value REAL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Equipment per room per visit
CREATE TABLE drying_equipment (
    id TEXT PRIMARY KEY,
    visit_id TEXT NOT NULL REFERENCES drying_visits(id) ON DELETE CASCADE,
    room_id TEXT NOT NULL REFERENCES drying_rooms(id),
    equipment_type TEXT NOT NULL,
    quantity INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Photos attached to visits
CREATE TABLE drying_photos (
    id TEXT PRIMARY KEY,
    visit_id TEXT NOT NULL REFERENCES drying_visits(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    thumbnail_path TEXT DEFAULT '',
    original_name TEXT DEFAULT '',
    caption TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);
```

**Key indexes:**

```sql
CREATE INDEX idx_drying_logs_job_id ON drying_logs(job_id);
CREATE INDEX idx_drying_chambers_log_id ON drying_chambers(drying_log_id);
CREATE INDEX idx_drying_rooms_log_id ON drying_rooms(drying_log_id);
CREATE INDEX idx_drying_rooms_chamber_id ON drying_rooms(chamber_id);
CREATE INDEX idx_drying_reference_points_room_id ON drying_reference_points(room_id);
CREATE INDEX idx_drying_visits_log_id ON drying_visits(drying_log_id);
CREATE INDEX idx_drying_atmospheric_visit_id ON drying_atmospheric_readings(visit_id);
CREATE INDEX idx_drying_moisture_visit_id ON drying_moisture_readings(visit_id);
CREATE INDEX idx_drying_moisture_ref_point ON drying_moisture_readings(reference_point_id);
CREATE INDEX idx_drying_equipment_visit_id ON drying_equipment(visit_id);
CREATE INDEX idx_drying_photos_visit_id ON drying_photos(visit_id);
```

**Why this schema structure:**
- **`drying_logs`**: One-to-one with the job's MIT phase. Anchors all drying data.
- **`drying_visits`**: Each site visit is a row. Visit number is sequential. All readings for a visit reference back to it.
- **`drying_moisture_readings`**: The core time-series table. One row per reference point per visit. Query "all readings for point #3" = `WHERE reference_point_id = ? ORDER BY visit_id`.
- **`drying_atmospheric_readings`**: Separate from moisture because the cardinality is different (per-chamber, not per-room). `reading_type` discriminates chamber intake, dehu exhaust, unaffected, and outside readings. `dehu_number` identifies which dehumidifier for exhaust readings.
- **`drying_equipment`**: Snapshot per room per visit. Not a delta -- stores the full equipment state at each visit so you never have to reconstruct from changes.
- **`drying_photos`**: References the uploads system. `file_path` stores the path returned by the existing `/api/uploads` endpoint. `thumbnail_path` stores the sharp-generated thumbnail.
- **Cascade deletes**: If a drying log is deleted, everything under it is cleaned up. Matches the existing `apex_job_*` cascade pattern.

---

## Decision: Real-Time Field Validation

**Recommendation:** Event delegation on the modal container with CSS class-based visual feedback. No validation library.
**Confidence:** HIGH

**Why no validation library:**
1. The existing codebase uses no validation library. `jobModal.js` validates with a `validateForm()` method that checks required fields and enables/disables the submit button.
2. The Drying Logs validation rules are domain-specific (temp range 32-120F, RH 0-100%, GPP auto-calculated, all reference points need readings or demo). A generic validation library would still need custom rules for all of these.
3. The validation logic is tightly coupled to the GPP calculation and baseline comparison (green cell highlighting). A library would add indirection without simplifying anything.

**Validation pattern:**

```javascript
// Atmospheric reading validation (per-input)
function validateAtmosphericInput(input) {
    const val = parseFloat(input.value);
    const type = input.dataset.type; // 'temp' or 'rh'

    if (type === 'temp') {
        if (val < 32 || val > 120) {
            input.classList.add('drying-input-warning');
            // Show warning but don't block -- field conditions can be unusual
        } else {
            input.classList.remove('drying-input-warning');
        }
    } else if (type === 'rh') {
        if (val < 0 || val > 100) {
            input.classList.add('drying-input-error');
            // Block -- physically impossible
        } else {
            input.classList.remove('drying-input-error');
        }
    }
}

// Moisture reading validation (per-input)
function validateMoistureReading(input, baseline) {
    const val = parseFloat(input.value);
    const cell = input.closest('.drying-reading-cell');

    if (!isNaN(val) && baseline != null) {
        if (val <= baseline + 4) {
            cell.classList.add('drying-reading-dry');    // Green background
        } else {
            cell.classList.remove('drying-reading-dry');
        }
    }
}

// Save button enable/disable (whole-form validation)
function validateVisitForSave(modal) {
    const allAtmosphericFilled = /* check all temp + RH inputs have values */;
    const allReadingsFilled = /* check all active ref points have readings or demo'd */;
    const saveBtn = modal.querySelector('.drying-save-btn');
    saveBtn.disabled = !(allAtmosphericFilled && allReadingsFilled);
}
```

**Visual feedback classes:**
- `.drying-input-warning` -- Yellow border, tooltip with range info (but still accepts value)
- `.drying-input-error` -- Red border, physically impossible value
- `.drying-reading-dry` -- Green background on the cell (within 4 points of baseline)

---

## Installation

```bash
# One new dependency (backend only)
cd backend && npm install sharp
```

No other installations needed. No frontend build tools, no bundler changes, no new dev dependencies.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Client-side GPP calculation | Server-side GPP API endpoint | Only if you need GPP calculation from a non-browser client (e.g., a future mobile app). For the web UI, client-side is strictly better. |
| HTML `capture` attribute | `getUserMedia()` API | Only if you need a live camera preview embedded in the page (e.g., barcode scanning, augmented reality overlays). For simple "take a photo" workflow, the capture attribute is simpler and more reliable across devices. |
| sharp (server-side image processing) | Client-side only compression via Canvas API | Only if you never need thumbnails and don't care about EXIF orientation consistency. In practice, you need both -- client-side to reduce upload size, server-side for thumbnails and normalization. |
| Normalized SQL tables for readings | JSON blob in `drying_logs` column | Only if the data is rarely queried independently (like tags or settings). Drying readings are the core queryable data of this feature -- they need SQL indexing. |
| Vanilla JS tab pattern | A tab library (e.g., tabby.js) | Never for this project. Adding a library for something the codebase already does well would be inconsistent and add a dependency for no benefit. |
| No validation library | formvalidation.io, pristinejs | Only if the forms were generic CRUD with standard field types. Drying forms have domain-specific validation (GPP ranges, baseline comparisons) that no generic library handles. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| React, Vue, Svelte, or any framework | Project is explicitly vanilla JS. Adding a framework for one feature creates a maintenance bifurcation. | Vanilla JS with the existing `innerHTML` template pattern. |
| Chart.js or D3 for drying progress visualization | Deferred per vision doc. Adding charting now creates premature complexity. | Simple HTML/CSS indicators (green cells, delta arrows). Add charting only if/when the vision doc expands to include it. |
| IndexedDB for offline caching | Premature optimization. The initial build should validate the online workflow first. | Standard fetch-based API calls. Offline support is a future enhancement. |
| Socket.IO / WebSockets for real-time sync | Single-user app. No multi-user collaboration. GPP calculation is client-side. | Standard REST API with fetch. |
| EXIF.js library for client-side EXIF reading | sharp handles EXIF orientation server-side with `.rotate()`. Client-side EXIF parsing adds complexity for no benefit since the server normalizes anyway. | Let sharp handle EXIF on the server. |
| browser-image-compression npm package | The Canvas API `toBlob()` approach is ~20 lines of code and has no dependencies. The npm package adds 3.5KB+ for functionality you can write inline. | Native Canvas API compression. |

---

## Stack Patterns by Feature Area

**If implementing the "Create Drying Logs" initial setup modal:**
- Use a wizard/stepper pattern (Step 1: Chambers, Step 2: Rooms, Step 3: Reference Points, etc.)
- Each step validates before advancing
- Final step saves all data in a single `db.transaction()` call
- Because this pattern does not exist in the codebase yet, follow the "prior/next" button approach with step indicators rather than trying to cram everything into tabs

**If implementing the "Add Visit" daily entry modal:**
- Use the existing tab pattern from `jobDetailTabs.js`
- Atmospheric readings are a fixed section above the tabs (always visible)
- Room tabs below, color-coded by chamber
- Save button at the bottom validates everything
- State collected in a JS object, submitted as a single POST

**If implementing photo upload in the visit modal:**
- Two hidden `<input type="file">` elements (one with `capture`, one without)
- On file selection, compress client-side via Canvas, show preview thumbnail
- On "Save Visit", upload all photos via the existing `/api/uploads` endpoint
- Store returned file paths in the `drying_photos` table alongside the visit
- Use sharp server-side to generate thumbnails for the visit history list

**If implementing the visit history list on the Drying tab:**
- Follow the existing Notes tab pattern (`renderNotesTab` in `jobDetailTabs.js`)
- Chronological list of visits with summary data (date, visit number, key metrics)
- Clicking a visit opens it in read-only mode in the same modal structure
- "Edit" button switches to edit mode (re-enables inputs)

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| sharp@0.33.x | Node >= 20.3.0 | Docker image uses Node 20 Alpine. Verify exact minor version in Dockerfile. Latest sharp requires Node >= 20.9.0. |
| sharp@0.33.x | multer@2.0.x | Use multer's memory storage (`multer.memoryStorage()`) to pipe buffers directly to sharp, or disk storage with sharp reading from the saved file path. Either works. |
| better-sqlite3@11.7.x | Node 20 | Already running. No changes needed. |
| Canvas API (toBlob) | All modern mobile browsers | Chrome Android 50+, Safari iOS 11+. Not an issue for 2026. |
| `capture` attribute | Chrome Android, Safari iOS | Fully supported. Firefox Android shows file picker instead of direct camera -- acceptable fallback. |

---

## Sources

- IAPWS psychrometric formula -- Verified against existing project reference at `.claude/skills/drying-report/references/psychrometric-formulas.md` (HIGH confidence)
- IICRC S500 dry standard (4% above baseline) -- Verified against existing project vision at `.planning/DRYING-LOGS-VISION.md` (HIGH confidence)
- GPP formula constants (6.112, 17.67, 243.5 for Magnus; IAPWS constants for project use) -- Verified against [Calculator Hub](https://calculatorshub.net/environmental/humidity-grains-per-pound-calculator/) and [Pressure Calculator](https://pressure-calculator.com/how-to-calculate-gpp.php) (MEDIUM confidence, formula is well-documented across multiple sources)
- HTML capture attribute -- Verified against [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/capture) and [web.dev](https://web.dev/articles/media-capturing-images) (HIGH confidence)
- sharp library Node.js compatibility -- Verified against [sharp npm page](https://www.npmjs.com/package/sharp) and [sharp installation docs](https://sharp.pixelplumbing.com/install/) (HIGH confidence)
- multer + sharp integration pattern -- Multiple tutorials confirm the buffer/disk storage approach: [Codemzy blog](https://www.codemzy.com/blog/sharp-with-multer-reduce-image-sizes), [BezKoder tutorial](https://www.bezkoder.com/node-js-upload-resize-multiple-images/) (MEDIUM confidence)
- Client-side Canvas compression -- Verified against [Cloudinary guide](https://cloudinary.com/guides/image-effects/best-ways-to-compress-images-before-upload-in-javascript) and [PQINA blog](https://pqina.nl/blog/compress-image-before-upload/) (HIGH confidence)
- SQLite time-series patterns -- Verified against [MoldStud guide](https://moldstud.com/articles/p-handling-time-series-data-in-sqlite-best-practices) and existing `apex_job_*` schema patterns in the codebase (HIGH confidence)
- Existing codebase patterns -- Direct code analysis of `jobModal.js`, `jobDetailTabs.js`, `uploads.js`, `apexSchema.js` (HIGH confidence)

---
*Stack research for: Drying Logs feature in LyfeHub v2 Apex module*
*Researched: 2026-02-11*
