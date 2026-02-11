# Architecture Research: Structural Drying Documentation Feature

**Domain:** Structural drying logs for water damage restoration (Apex module extension)
**Researched:** 2026-02-11
**Confidence:** HIGH (internal codebase analysis; IICRC S500 domain patterns verified via web research)

## System Overview

```
+-----------------------------------------------------------------------+
|                          Frontend (Vanilla JS)                         |
|-----------------------------------------------------------------------|
|  apex-jobs.js       jobDetailTabs.js     NEW: dryingLog.js            |
|  (job list +        (tab renderers,      (drying tab UI,              |
|   detail view)       dispatches to        chambers/rooms/points,      |
|                      drying tab)          visit forms, GPP calc)      |
|-----------------------------------------------------------------------|
|  api.js (shared HTTP client - add drying log endpoint methods)        |
+-----------------------------+-----------------------------------------+
                              | REST JSON over /api/apex-jobs/:id/drying/*
+-----------------------------+-----------------------------------------+
|                       Backend (Express)                                |
|-----------------------------------------------------------------------|
|  routes/apexJobs.js (mount drying sub-routes)                          |
|       OR                                                              |
|  NEW: routes/dryingLogs.js  (dedicated route file, merged at mount)    |
|-----------------------------------------------------------------------|
|  NEW: db/dryingLogs.js      (prepared statements, CRUD, GPP calc)     |
|  db/apexSchema.js           (table creation for drying_* tables)      |
+-----------------------------+-----------------------------------------+
|                       SQLite (better-sqlite3)                          |
|-----------------------------------------------------------------------|
|  drying_logs          drying_chambers       drying_rooms               |
|  drying_ref_points    drying_visits         drying_atmospheric         |
|  drying_readings      drying_equipment      drying_baselines           |
|  drying_visit_notes                                                    |
+-----------------------------------------------------------------------+
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| `db/apexSchema.js` (extended) | CREATE TABLE statements for all `drying_*` tables, migration columns | SQLite database |
| `db/dryingLogs.js` (new) | Prepared statements, CRUD functions, GPP calculation, data assembly | `db/schema.js` (db instance), `db/apexJobs.js` (activity logging) |
| `routes/dryingLogs.js` (new) | Express router with REST endpoints for drying data, mounted under `/api/apex-jobs/:jobId/drying` | `db/dryingLogs.js`, `middleware/auth.js`, `middleware/permissions.js` |
| `routes/apexJobs.js` (extended) | Mount the drying sub-router | `routes/dryingLogs.js` |
| `frontend/js/api.js` (extended) | New methods: `getDryingLog()`, `createChamber()`, `addVisit()`, etc. | Backend REST API |
| `frontend/js/dryingLog.js` (new) | Full drying tab UI: chamber/room/point tree, visit timeline, readings forms, GPP display, baseline management | `api.js`, `jobDetailTabs.js` (called from renderDryingTab), `jobDetailModals.js` (modal infrastructure) |
| `frontend/js/jobDetailTabs.js` (extended) | `renderDryingTab()` delegates to `dryingLog.renderTab()` instead of returning placeholder HTML | `dryingLog.js` |

## Database Schema Design

### Entity Relationship Diagram

```
apex_jobs (existing)
    |
    +-- 1:1 -- drying_logs
                    |
                    +-- 1:N -- drying_chambers
                    |              |
                    |              +-- 1:N -- drying_rooms
                    |                            |
                    |                            +-- 1:N -- drying_ref_points
                    |
                    +-- 1:N -- drying_baselines  (one per material type per log)
                    |
                    +-- 1:N -- drying_visits
                    |              |
                    |              +-- 1:1 -- drying_atmospheric  (per visit)
                    |              |
                    |              +-- 1:N -- drying_readings     (per ref point per visit)
                    |              |
                    |              +-- 1:N -- drying_equipment    (equipment status snapshot)
                    |              |
                    |              +-- 1:N -- drying_visit_notes  (notes with optional photos)
                    |
                    +-- 1:N -- drying_equipment_inventory  (equipment placed on job)
```

### Table Definitions

#### `drying_logs` (one per job, created on first access)

```sql
CREATE TABLE drying_logs (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL UNIQUE REFERENCES apex_jobs(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'complete', 'archived')),
    target_gpp REAL,                    -- optional target GPP for the job
    next_ref_number INTEGER DEFAULT 1,  -- auto-increment counter for ref point numbering
    started_at TEXT,                     -- when drying started
    completed_at TEXT,                   -- when drying was declared complete
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_drying_logs_job_id ON drying_logs(job_id);
```

**Rationale:** One-to-one with `apex_jobs`. The `next_ref_number` field provides sequential numbering across the entire job (not per room), matching how restorers number reference points in the field (RP-1, RP-2, ... across all rooms).

#### `drying_chambers` (named, colored groupings)

```sql
CREATE TABLE drying_chambers (
    id TEXT PRIMARY KEY,
    log_id TEXT NOT NULL REFERENCES drying_logs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                 -- e.g., "Chamber A", "Upstairs", "Unit 204"
    color TEXT DEFAULT '#00aaff',       -- hex color for UI grouping
    position INTEGER DEFAULT 0,        -- display ordering
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_drying_chambers_log_id ON drying_chambers(log_id);
```

**Rationale:** Chambers are a logical grouping used by restorers to define drying zones that share atmospheric conditions. A chamber might be a floor, a wing, or even a single contained space. Color coding helps the UI visually distinguish chambers.

#### `drying_rooms` (within chambers)

```sql
CREATE TABLE drying_rooms (
    id TEXT PRIMARY KEY,
    chamber_id TEXT NOT NULL REFERENCES drying_chambers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                 -- e.g., "Kitchen", "Master Bedroom"
    position INTEGER DEFAULT 0,        -- display ordering within chamber
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_drying_rooms_chamber_id ON drying_rooms(chamber_id);
```

#### `drying_ref_points` (specific measurement locations)

```sql
CREATE TABLE drying_ref_points (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES drying_rooms(id) ON DELETE CASCADE,
    log_id TEXT NOT NULL REFERENCES drying_logs(id) ON DELETE CASCADE,
    ref_number INTEGER NOT NULL,        -- sequential across entire job: RP-1, RP-2, etc.
    label TEXT DEFAULT '',              -- optional user label, e.g., "Under sink"
    material_type TEXT NOT NULL CHECK(material_type IN (
        'drywall', 'baseboard', 'hardwood', 'subfloor', 'carpet',
        'pad', 'concrete', 'plaster', 'tile_substrate', 'cabinet',
        'framing', 'insulation', 'other'
    )),
    location_detail TEXT DEFAULT '',    -- e.g., "North wall, 24in from floor"
    is_dry_standard INTEGER DEFAULT 0, -- 1 = this is the dry standard reference for its material type
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_drying_ref_points_room_id ON drying_ref_points(room_id);
CREATE INDEX idx_drying_ref_points_log_id ON drying_ref_points(log_id);
CREATE UNIQUE INDEX idx_drying_ref_points_number ON drying_ref_points(log_id, ref_number);
```

**Rationale:** Reference points are the core measurement unit. Each has a material type because moisture meters read differently per material. The `ref_number` is unique across the log (not per room) because field technicians carry a single numbered list across all rooms. The `is_dry_standard` flag identifies readings taken from unaffected areas to establish baseline targets (per IICRC S500).

#### `drying_baselines` (dry standard targets per material type)

```sql
CREATE TABLE drying_baselines (
    id TEXT PRIMARY KEY,
    log_id TEXT NOT NULL REFERENCES drying_logs(id) ON DELETE CASCADE,
    material_type TEXT NOT NULL,
    target_mc REAL NOT NULL,            -- moisture content target (%)
    source TEXT DEFAULT 'measured' CHECK(source IN ('measured', 'historical', 'manual')),
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(log_id, material_type)
);
CREATE INDEX idx_drying_baselines_log_id ON drying_baselines(log_id);
```

**Rationale:** IICRC S500 requires establishing dry standards per material. A single job-wide baseline per material type is the standard practice. Can be set from an actual dry-standard reference point measurement, from historical regional data, or manually entered.

#### `drying_visits` (site visits with timestamps)

```sql
CREATE TABLE drying_visits (
    id TEXT PRIMARY KEY,
    log_id TEXT NOT NULL REFERENCES drying_logs(id) ON DELETE CASCADE,
    visit_number INTEGER NOT NULL,      -- sequential visit count for this log
    visit_date TEXT NOT NULL,           -- ISO date
    visit_time TEXT,                    -- ISO time (optional)
    technician_id TEXT,                 -- user who recorded this visit
    technician_name TEXT DEFAULT '',    -- denormalized for display
    is_initial INTEGER DEFAULT 0,      -- first visit (baseline readings)
    is_final INTEGER DEFAULT 0,        -- final confirmation visit
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_drying_visits_log_id ON drying_visits(log_id);
CREATE UNIQUE INDEX idx_drying_visits_number ON drying_visits(log_id, visit_number);
```

#### `drying_atmospheric` (one per visit per chamber -- atmospheric conditions)

```sql
CREATE TABLE drying_atmospheric (
    id TEXT PRIMARY KEY,
    visit_id TEXT NOT NULL REFERENCES drying_visits(id) ON DELETE CASCADE,
    chamber_id TEXT REFERENCES drying_chambers(id) ON DELETE SET NULL,
    location TEXT DEFAULT 'indoor',     -- 'indoor', 'outdoor', or chamber-specific
    temperature REAL,                   -- degrees F
    relative_humidity REAL,             -- percentage (0-100)
    gpp REAL,                           -- grains per pound (computed or overridden)
    dew_point REAL,                     -- computed from temp/RH
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_drying_atmospheric_visit_id ON drying_atmospheric(visit_id);
CREATE INDEX idx_drying_atmospheric_chamber_id ON drying_atmospheric(chamber_id);
```

**Rationale:** Atmospheric readings are per-chamber per-visit because each drying chamber has its own environmental conditions. Outdoor readings are also captured per visit for comparison. GPP is computed server-side from temp/RH but stored for quick access and to allow manual override when a calibrated psychrometer is used.

#### `drying_readings` (moisture readings per reference point per visit)

```sql
CREATE TABLE drying_readings (
    id TEXT PRIMARY KEY,
    visit_id TEXT NOT NULL REFERENCES drying_visits(id) ON DELETE CASCADE,
    ref_point_id TEXT NOT NULL REFERENCES drying_ref_points(id) ON DELETE CASCADE,
    moisture_content REAL,              -- MC percentage or pin meter reading
    meter_type TEXT DEFAULT 'pin' CHECK(meter_type IN ('pin', 'pinless', 'thermo_hygrometer', 'calcium_chloride')),
    meter_model TEXT DEFAULT '',        -- brand/model per IICRC requirement
    meets_target INTEGER DEFAULT 0,    -- 1 = reading meets or exceeds drying goal
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_drying_readings_visit_id ON drying_readings(visit_id);
CREATE INDEX idx_drying_readings_ref_point_id ON drying_readings(ref_point_id);
CREATE UNIQUE INDEX idx_drying_readings_unique ON drying_readings(visit_id, ref_point_id);
```

**Rationale:** One reading per reference point per visit. The unique constraint prevents duplicate entries. `meets_target` is computed on write by comparing against the baseline for this material type, but stored for fast UI rendering. The `meter_model` field satisfies IICRC S500 documentation requirements.

#### `drying_equipment_inventory` (equipment placed on job, persistent)

```sql
CREATE TABLE drying_equipment_inventory (
    id TEXT PRIMARY KEY,
    log_id TEXT NOT NULL REFERENCES drying_logs(id) ON DELETE CASCADE,
    chamber_id TEXT REFERENCES drying_chambers(id) ON DELETE SET NULL,
    equipment_type TEXT NOT NULL CHECK(equipment_type IN (
        'air_mover', 'dehumidifier', 'air_scrubber',
        'heater', 'desiccant', 'injectidry', 'other'
    )),
    brand TEXT DEFAULT '',
    model TEXT DEFAULT '',
    serial_number TEXT DEFAULT '',
    quantity INTEGER DEFAULT 1,
    placed_date TEXT,
    removed_date TEXT,
    status TEXT DEFAULT 'placed' CHECK(status IN ('placed', 'running', 'removed')),
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_drying_equipment_inv_log_id ON drying_equipment_inventory(log_id);
CREATE INDEX idx_drying_equipment_inv_chamber_id ON drying_equipment_inventory(chamber_id);
```

#### `drying_equipment` (equipment status snapshot per visit)

```sql
CREATE TABLE drying_equipment (
    id TEXT PRIMARY KEY,
    visit_id TEXT NOT NULL REFERENCES drying_visits(id) ON DELETE CASCADE,
    equipment_id TEXT NOT NULL REFERENCES drying_equipment_inventory(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'running' CHECK(status IN ('running', 'stopped', 'removed', 'replaced', 'adjusted')),
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_drying_equipment_visit_id ON drying_equipment(visit_id);
```

**Rationale:** Equipment inventory is job-persistent (placed once, tracked across visits). Equipment status is snapshotted each visit to record what was running, stopped, or adjusted. This separation avoids duplicating equipment data on every visit while still tracking per-visit status changes.

#### `drying_visit_notes` (notes with optional photo paths)

```sql
CREATE TABLE drying_visit_notes (
    id TEXT PRIMARY KEY,
    visit_id TEXT NOT NULL REFERENCES drying_visits(id) ON DELETE CASCADE,
    content TEXT DEFAULT '',
    photo_path TEXT DEFAULT '',         -- uploaded photo file path
    author_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_drying_visit_notes_visit_id ON drying_visit_notes(visit_id);
```

### Key Schema Design Decisions

1. **Separate tables (not JSON-in-SQLite):** Unlike some existing Apex fields that use JSON arrays, drying data uses normalized tables because: the data is queried across visits (trend analysis), individual readings need indexing, and the nested structure (chamber > room > point > reading) has genuine relational integrity needs.

2. **Job-wide reference point numbering:** `drying_logs.next_ref_number` is incremented atomically when creating new reference points. This matches field practice where RP-1 through RP-N span all rooms.

3. **GPP computed server-side, stored in row:** The GPP calculation uses the Magnus formula approximation. Computing it on insert avoids repeated client-side computation and ensures consistency. The formula: `GPP = 4354 * (10^((7.5 * T) / (237.3 + T))) * RH / (100 * (T + 459.67))` where T is in Fahrenheit (converted to Celsius for the Magnus exponent).

4. **`meets_target` denormalized onto readings:** Comparing each reading against its material baseline on every render would require joins. Pre-computing on write and storing the boolean keeps the visit-detail query simple.

## API Route Structure

All drying routes mount under the existing Apex jobs path: `/api/apex-jobs/:jobId/drying/...`

### Endpoints

| Method | Path | Purpose | Role Required |
|--------|------|---------|---------------|
| `GET` | `/drying` | Get full drying log for job (log + chambers + rooms + points + baselines + equipment inventory) | any non-guest |
| `POST` | `/drying` | Initialize drying log for job (idempotent -- returns existing if already created) | management, field_tech, project_manager |
| `PATCH` | `/drying` | Update log-level fields (status, target_gpp, started_at, completed_at) | management, field_tech, project_manager |
| **Chambers** | | | |
| `POST` | `/drying/chambers` | Create chamber | management, field_tech, project_manager |
| `PATCH` | `/drying/chambers/:chamberId` | Update chamber (name, color, position) | management, field_tech, project_manager |
| `DELETE` | `/drying/chambers/:chamberId` | Delete chamber (cascades rooms, points) | management |
| **Rooms** | | | |
| `POST` | `/drying/chambers/:chamberId/rooms` | Create room in chamber | management, field_tech, project_manager |
| `PATCH` | `/drying/rooms/:roomId` | Update room | management, field_tech, project_manager |
| `DELETE` | `/drying/rooms/:roomId` | Delete room (cascades points) | management |
| **Reference Points** | | | |
| `POST` | `/drying/rooms/:roomId/points` | Create reference point (auto-numbers) | management, field_tech, project_manager |
| `PATCH` | `/drying/points/:pointId` | Update point metadata | management, field_tech, project_manager |
| `DELETE` | `/drying/points/:pointId` | Delete reference point | management |
| **Baselines** | | | |
| `GET` | `/drying/baselines` | Get all baselines for this log | any non-guest |
| `PUT` | `/drying/baselines/:materialType` | Set/update baseline for material type (upsert) | management, field_tech, project_manager |
| **Equipment Inventory** | | | |
| `POST` | `/drying/equipment` | Add equipment to job | management, field_tech, project_manager |
| `PATCH` | `/drying/equipment/:equipId` | Update equipment | management, field_tech, project_manager |
| `DELETE` | `/drying/equipment/:equipId` | Remove equipment | management |
| **Visits** | | | |
| `GET` | `/drying/visits` | List all visits (summary: date, technician, reading counts) | any non-guest |
| `GET` | `/drying/visits/:visitId` | Get full visit (atmospheric + readings + equipment status + notes) | any non-guest |
| `POST` | `/drying/visits` | Create new visit (auto-numbers, creates atmospheric/readings shell) | management, field_tech, project_manager |
| `PATCH` | `/drying/visits/:visitId` | Update visit metadata | management, field_tech, project_manager |
| `DELETE` | `/drying/visits/:visitId` | Delete visit | management |
| **Visit Sub-data** | | | |
| `PUT` | `/drying/visits/:visitId/atmospheric` | Save atmospheric readings for visit (bulk upsert) | management, field_tech, project_manager |
| `PUT` | `/drying/visits/:visitId/readings` | Save moisture readings for visit (bulk upsert) | management, field_tech, project_manager |
| `PUT` | `/drying/visits/:visitId/equipment` | Save equipment status snapshot (bulk upsert) | management, field_tech, project_manager |
| `POST` | `/drying/visits/:visitId/notes` | Add visit note (with optional photo) | management, field_tech, project_manager |
| `DELETE` | `/drying/visits/:visitId/notes/:noteId` | Delete visit note | management |

### Bulk PUT Pattern

The `PUT` endpoints for atmospheric, readings, and equipment status accept arrays and perform upserts within a transaction. This matches the typical field workflow: a technician fills out all readings for a visit at once, then saves. The backend:

1. Deletes existing records for this visit
2. Inserts the new array
3. Computes `meets_target` for each reading by looking up the baseline
4. Computes `gpp` for each atmospheric entry from temp/RH
5. Wraps everything in `db.transaction()`

This is simpler and safer than individual PATCH endpoints for each reading.

### Route Mounting Strategy

Two options, recommendation is Option B:

**Option A: Inline in `apexJobs.js`** -- Mount drying routes directly in the existing file. Rejected because `apexJobs.js` is already 600+ lines and drying adds significant complexity.

**Option B: Separate `routes/dryingLogs.js`** -- Create a dedicated route file, then mount it from `apexJobs.js`:
```javascript
// In routes/apexJobs.js
const dryingRoutes = require('./dryingLogs');
router.use('/:id/drying', dryingRoutes);
```

This follows the existing pattern where sub-resources have their own logic, and keeps the main apexJobs.js manageable. The `:id` param is available as `req.params.id` in the child router (using `{ mergeParams: true }`).

## Frontend Component Structure

### File: `frontend/js/dryingLog.js`

This file owns all drying tab UI. It follows the existing module pattern (object with methods, assigned to `window.dryingLog`).

```
dryingLog = {
    // State
    currentLog: null,
    currentVisitId: null,
    expandedChambers: new Set(),

    // Entry point (called from jobDetailTabs.renderDryingTab)
    renderTab(job, phaseId, panel),

    // Data loading
    async loadDryingLog(jobId),
    async loadVisitDetail(jobId, visitId),
    async initializeDryingLog(jobId),

    // Structure management UI
    renderStructurePanel(log),          -- chamber/room/point tree
    renderChamberCard(chamber),
    renderRoomSection(room),
    renderRefPointRow(point),

    // Visit timeline UI
    renderVisitTimeline(visits),         -- vertical timeline of all visits
    renderVisitSummaryCard(visit),

    // Visit detail UI (the main working area)
    renderVisitDetail(visit),
    renderAtmosphericForm(visit),        -- temp/RH/GPP per chamber
    renderReadingsForm(visit),           -- moisture readings grid
    renderEquipmentStatus(visit),        -- equipment checkboxes
    renderVisitNotes(visit),

    // Progress & analysis
    renderProgressSummary(log),          -- overall drying progress bar
    renderMoistureChart(readings),       -- per-point trend (uses <canvas> or simple bars)

    // Forms and modals (use jobDetailModals infrastructure)
    openAddChamberModal(logId),
    openAddRoomModal(chamberId),
    openAddRefPointModal(roomId, logId),
    openAddVisitModal(logId),
    openSetBaselineModal(logId, materialType),
    openAddEquipmentModal(logId),

    // Save handlers
    async saveAtmosphericReadings(jobId, visitId, data),
    async saveMoistureReadings(jobId, visitId, data),
    async saveEquipmentStatus(jobId, visitId, data),

    // GPP calculation (client-side for live preview)
    calculateGPP(tempF, rhPercent),
    calculateDewPoint(tempF, rhPercent),

    // Utilities
    getMaterialLabel(type),
    getEquipmentLabel(type),
    formatReading(mc, materialType),
}
```

### Tab Layout (inside the "Drying" tab panel)

```
+------------------------------------------------------------------+
|  [Initialize Drying Log] button (only shown if no log exists)     |
+------------------------------------------------------------------+

Once initialized:

+------------------------------------------------------------------+
|  PROGRESS BAR: 15 of 22 reference points at target (68%)         |
|  Status: Active | Started: Feb 5 | Days: 6                       |
+------------------------------------------------------------------+
|                                                                   |
|  LEFT COLUMN (40%)          |  RIGHT COLUMN (60%)                 |
|  +-----------------------+  |  +-------------------------------+  |
|  | STRUCTURE TREE        |  |  | VISIT TIMELINE / DETAIL       |  |
|  |                       |  |  |                               |  |
|  | [+ Chamber]           |  |  | [+ New Visit]                 |  |
|  |                       |  |  |                               |  |
|  | v Chamber A (#0af)    |  |  | Visit #3 - Feb 11             |  |
|  |   Kitchen             |  |  |   (selected / expanded)       |  |
|  |     RP-1 Drywall      |  |  |                               |  |
|  |     RP-2 Baseboard    |  |  | +---------------------------+ |  |
|  |     RP-3 Subfloor     |  |  | | ATMOSPHERIC READINGS      | |  |
|  |   Hallway             |  |  | | Chamber A: 74F  42% 52GPP | |  |
|  |     RP-4 Drywall      |  |  | | Outdoor:   68F  35% 38GPP | |  |
|  |                       |  |  | +---------------------------+ |  |
|  | v Chamber B (#f0a)    |  |  |                               |  |
|  |   Master Bedroom      |  |  | +---------------------------+ |  |
|  |     RP-5 Drywall      |  |  | | MOISTURE READINGS         | |  |
|  |     RP-6 Carpet        |  |  | | RP-1 Drywall   12% [!]   | |  |
|  |     RP-7 Pad           |  |  | | RP-2 Baseboard  8% [OK]  | |  |
|  |   Bathroom             |  |  | | RP-3 Subfloor  15% [!]   | |  |
|  |     RP-8 Tile sub      |  |  | | ...                       | |  |
|  |                       |  |  | +---------------------------+ |  |
|  | EQUIPMENT             |  |  |                               |  |
|  |   3x Air Mover        |  |  | +---------------------------+ |  |
|  |   1x LGR Dehu         |  |  | | EQUIPMENT STATUS           | |  |
|  |   [+ Equipment]       |  |  | | Air Mover x3: Running     | |  |
|  |                       |  |  | | LGR Dehu x1:  Running     | |  |
|  | BASELINES             |  |  | +---------------------------+ |  |
|  |   Drywall: 12%        |  |  |                               |  |
|  |   Baseboard: 10%      |  |  | +---------------------------+ |  |
|  |   [Set Baseline]      |  |  | | NOTES                     | |  |
|  +-----------------------+  |  | | "Moved 2 air movers..."   | |  |
|                              |  | +---------------------------+ |  |
|                              |  +-------------------------------+  |
+------------------------------------------------------------------+
```

### Integration with Existing UI

The drying tab is already registered in `apex-jobs.js` `renderContentTabs()` (line 728) and has a placeholder in `jobDetailTabs.js` `renderDryingTab()` (line 477). The integration is:

1. `jobDetailTabs.renderDryingTab()` checks if `window.dryingLog` exists
2. If yes, it calls `dryingLog.renderTab(job, phaseId, panel)` -- the new module takes over
3. If no, it falls back to the existing placeholder HTML
4. `dryingLog.renderTab()` is the entry point that loads data and renders the full UI into the panel

This is exactly how the existing tab system works -- `jobDetailTabs.renderTab()` dispatches, the renderer returns HTML or modifies the panel directly.

### Modal Forms

Drying modals reuse the existing `jobDetailModals._ensureOverlay()` and `jobDetailModals.openModal()` infrastructure. Each modal follows the same pattern as labor/receipt/work-order modals:

1. Build HTML string with form fields
2. Call `jobDetailModals.openModal(title, html)` to display
3. Wire save button to an async handler that calls `api.*`, closes modal, and re-renders

## Data Flow: "Add Visit" Action

This is the most complex flow. Step by step:

```
1. USER clicks [+ New Visit] in the visit timeline

2. FRONTEND (dryingLog.js)
   a. Opens "New Visit" modal via jobDetailModals.openModal()
   b. Pre-fills date = today, technician = current user
   c. Shows atmospheric form per chamber + outdoor
   d. Shows readings grid (all reference points, empty values)
   e. Shows equipment status checkboxes (pre-filled from inventory)

3. USER fills in:
   - Atmospheric: Temp & RH for each chamber + outdoor
     -> GPP auto-calculates client-side for live preview
   - Moisture readings for each reference point
   - Equipment status toggles
   - Optional notes

4. USER clicks [Save Visit]

5. FRONTEND
   a. Collects all data into structured payload:
      {
        visit_date: "2026-02-11",
        visit_time: "14:30",
        is_initial: false,
        atmospheric: [
          { chamber_id: "...", temperature: 74, relative_humidity: 42 },
          { location: "outdoor", temperature: 68, relative_humidity: 35 }
        ],
        readings: [
          { ref_point_id: "...", moisture_content: 12, meter_type: "pin" },
          ...
        ],
        equipment: [
          { equipment_id: "...", status: "running" },
          ...
        ],
        notes: [
          { content: "Moved 2 air movers to hallway" }
        ]
      }
   b. Calls api.createDryingVisit(jobId, payload)

6. BACKEND (routes/dryingLogs.js -> POST /visits)
   a. authMiddleware validates JWT/API key
   b. Verifies job ownership (standard pattern from apexJobs.js)
   c. Verifies drying log exists for this job
   d. Begins db.transaction():
      i.   Generate visit_number (MAX + 1)
      ii.  INSERT into drying_visits
      iii. For each atmospheric entry:
           - Calculate GPP from temp/RH using Magnus formula
           - Calculate dew_point
           - INSERT into drying_atmospheric
      iv.  For each reading:
           - Look up baseline for this point's material_type
           - Set meets_target = (reading <= baseline)
           - INSERT into drying_readings
      v.   For each equipment status:
           - INSERT into drying_equipment
      vi.  For each note:
           - INSERT into drying_visit_notes
      vii. Log activity via apexJobsDb.logActivity()
   e. Commit transaction
   f. Fetch and return the complete visit with computed fields

7. FRONTEND receives response
   a. Adds visit to local state
   b. Re-renders visit timeline (new visit appears at top)
   c. Selects the new visit and renders its detail
   d. Closes modal
   e. Updates progress bar (recalculates % at target)
```

## Architectural Patterns

### Pattern 1: Bulk Upsert for Visit Data

**What:** Visit sub-data (atmospheric, readings, equipment) uses PUT with bulk arrays instead of individual CRUD per reading.

**When to use:** When the user edits an existing visit's readings after the fact.

**Trade-offs:**
- Pro: Single request, atomic transaction, simpler client-side state management
- Pro: Matches the field workflow (record everything, then save)
- Con: Entire set is replaced on save (no partial update) -- acceptable because visit data is a cohesive snapshot

**Example:**
```javascript
// db/dryingLogs.js
const saveReadings = db.transaction((visitId, readings, baselines) => {
    db.prepare('DELETE FROM drying_readings WHERE visit_id = ?').run(visitId);
    const insert = db.prepare(`
        INSERT INTO drying_readings (id, visit_id, ref_point_id, moisture_content,
            meter_type, meter_model, meets_target)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const r of readings) {
        const baseline = baselines[r.material_type];
        const meetsTarget = baseline ? (r.moisture_content <= baseline.target_mc ? 1 : 0) : 0;
        insert.run(uuidv4(), visitId, r.ref_point_id, r.moisture_content,
            r.meter_type || 'pin', r.meter_model || '', meetsTarget);
    }
});
```

### Pattern 2: Lazy Log Initialization

**What:** The drying log is not created when the job is created. It is created on first access (when the user clicks "Initialize Drying Log" or the first API call to `/drying`).

**When to use:** Not every job needs drying documentation. Only mitigation phases need it.

**Trade-offs:**
- Pro: No empty drying logs cluttering the database
- Pro: The POST endpoint is idempotent -- calling it when a log already exists returns the existing log
- Con: One extra existence check on every drying API call -- negligible with indexed UNIQUE constraint

### Pattern 3: Server-Side GPP Computation with Client-Side Preview

**What:** GPP is calculated both client-side (for live preview as user types temp/RH) and server-side (for authoritative storage).

**When to use:** Any computed field that the user needs to see immediately but that must be canonical in the database.

**Formula (Magnus approximation):**
```javascript
function calculateGPP(tempF, rhPercent) {
    const tempC = (tempF - 32) * 5 / 9;
    // Saturation vapor pressure (hPa) via Magnus formula
    const es = 6.1078 * Math.pow(10, (7.5 * tempC) / (237.3 + tempC));
    // Actual vapor pressure
    const ea = es * (rhPercent / 100);
    // Convert to grains per pound (1 hPa = ~0.4353 grains/lb at standard atmosphere)
    const gpp = ea * 4354 / (tempF + 459.67);
    return Math.round(gpp * 10) / 10;
}
```

### Pattern 4: Existing Module Pattern Extension

**What:** New JS file follows the `const moduleName = { ... }; window.moduleName = moduleName;` pattern.

**When to use:** Always, for consistency with `apexJobs`, `jobDetailTabs`, `jobDetailModals`, `jobModal`, etc.

**Trade-offs:**
- Pro: Zero tooling changes, consistent with entire codebase
- Con: No ES modules, no import/export -- acceptable for this app's architecture

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing All Readings as JSON in a Single Column

**What people do:** Put all moisture readings into a JSON array on the `drying_visits` row.

**Why it's wrong:** Cannot query trends per reference point across visits. Cannot index. Cannot enforce referential integrity. Breaks when you need "show me all readings for RP-3 over time" -- would need to parse JSON in every visit row.

**Do this instead:** Normalized `drying_readings` table with `(visit_id, ref_point_id)` composite key.

### Anti-Pattern 2: Per-Room Reference Point Numbering

**What people do:** Number reference points within each room (Kitchen RP-1, Bedroom RP-1).

**Why it's wrong:** Field technicians use a single sequential list across the entire job. "RP-1" means one specific location, period. Per-room numbering creates confusion and doesn't match industry practice.

**Do this instead:** Job-wide sequential numbering via `drying_logs.next_ref_number`, with `UNIQUE(log_id, ref_number)` constraint.

### Anti-Pattern 3: Creating All Visit Sub-Records Individually

**What people do:** Separate POST endpoints for each atmospheric reading, each moisture reading, each equipment status update within a visit.

**Why it's wrong:** N+1 request problem (a visit with 20 reference points + 3 chambers + 4 equipment items = 27+ API calls). Also loses atomicity -- partial saves leave inconsistent state.

**Do this instead:** Bulk PUT pattern -- one request per data type per visit, wrapped in a transaction.

### Anti-Pattern 4: Coupling Drying to a Specific Phase

**What people do:** Store drying data on the `apex_job_phases` row for the MIT phase.

**Why it's wrong:** The current schema already has a `drying_logs TEXT DEFAULT '[]'` JSON column on phases. This cannot scale to the nested data structure needed. Drying is conceptually per-job (not per-phase), because reference points span the entire property regardless of which phase they belong to.

**Do this instead:** Drying log references `job_id` directly. The existing `drying_logs` JSON column on phases can be ignored or deprecated.

## Build Order (Dependencies)

The feature should be built in this order because each layer depends on the one before it.

### Phase 1: Schema + DB Layer
**Build:** `apexSchema.js` table creation, `db/dryingLogs.js` CRUD functions
**Depends on:** Existing `db/schema.js` (db instance), `uuid` package
**Enables:** All subsequent phases
**Notes:** Build and test the full DB layer independently before any routes or UI. Use the REPL or simple scripts to verify CRUD.

### Phase 2: API Routes
**Build:** `routes/dryingLogs.js`, mount in `routes/apexJobs.js`, add `api.js` client methods
**Depends on:** Phase 1 (DB layer)
**Enables:** Frontend development
**Notes:** Test with curl/Postman before building UI. The bulk PUT endpoints are the most complex -- test thoroughly.

### Phase 3: Structure Management UI (Chambers/Rooms/Points)
**Build:** `dryingLog.js` structure panel, chamber/room/point CRUD modals
**Depends on:** Phase 2 (API), existing modal infrastructure
**Enables:** Visit recording (cannot record readings without reference points)
**Notes:** This is the tree view on the left side. Must work before visits can be meaningful.

### Phase 4: Visit Recording UI
**Build:** Visit creation form, atmospheric readings form, moisture readings grid, equipment status
**Depends on:** Phase 3 (structure must exist to have reference points to read)
**Enables:** The core workflow
**Notes:** This is the largest UI phase. The readings grid is a dynamic form with one row per reference point.

### Phase 5: Progress, Analysis, and Polish
**Build:** Progress bar, trend display, baseline management, GPP live preview, drying completion workflow
**Depends on:** Phase 4 (need visits with readings to analyze)
**Notes:** Can be delivered incrementally. Progress bar is highest priority; trend charts can follow.

### Critical Path

```
Schema -> DB Layer -> Routes -> Structure UI -> Visit UI -> Analysis
  (1)       (1)        (2)        (3)           (4)         (5)
```

Phases 1 and 2 are purely backend. Phase 3 is the first visible UI. Phase 4 is the core value. Phase 5 is polish.

### What Can Be Parallelized

- CSS styling can be built alongside Phase 3/4 (separate file: `drying.css` or add to `apex-jobs.css`)
- Equipment inventory management (Phase 3) is independent of visit recording (Phase 4) -- they only connect at Phase 4 when equipment status is snapshotted per visit
- Baseline management can be built at Phase 3 or Phase 5 -- it's needed for `meets_target` computation but the system works without it (just shows raw readings)

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Drying Log <-> Apex Jobs | `job_id` FK, mounted as sub-router | Drying log is accessed only through job context |
| Drying Readings <-> Baselines | DB lookup during bulk save | Server computes `meets_target` by joining readings with baselines |
| Drying Tab <-> Job Detail | `jobDetailTabs.renderDryingTab()` delegates to `dryingLog.renderTab()` | Clean handoff; drying module owns the panel once invoked |
| Drying Modals <-> Modal Infrastructure | Uses `jobDetailModals.openModal()` / `closeModal()` | No new modal system needed |
| Activity Logging | Drying events logged via `apexJobsDb.logActivity()` | Visits show in the job's activity sidebar |

### Existing Code Touch Points

Files that need modification (beyond the new files):

1. **`backend/src/db/apexSchema.js`** -- Add `CREATE TABLE` statements for all `drying_*` tables
2. **`backend/src/routes/apexJobs.js`** -- Add 1 line: `router.use('/:id/drying', require('./dryingLogs'));`
3. **`backend/src/index.js`** -- No change needed (drying routes mount through apexJobs)
4. **`frontend/js/api.js`** -- Add ~15 new methods for drying endpoints
5. **`frontend/js/jobDetailTabs.js`** -- Modify `renderDryingTab()` to delegate to `dryingLog.js`
6. **`frontend/index.html`** -- Add `<script src="js/dryingLog.js"></script>` tag
7. **`frontend/css/style.css`** or new `frontend/css/drying.css` -- Styles for structure tree, readings grid, progress bar

## Sources

- Existing codebase analysis (all files in `backend/src/` and `frontend/js/`)
- [IICRC S500 Standard](https://iicrc.org/s500/) -- Documentation requirements for structural drying
- [GPP/Psychrometric Calculator](https://learntorestore.com/psycrometric-calculator/) -- GPP calculation methodology
- [Humidity Grains Per Pound Calculator](https://calculator.academy/humidity-grains-per-pound-calculator/) -- Formula verification
- [IICRC S500 Drying Targets](https://www.accuserve.com/blog/setting-drying-targets-utilizing-the-new-s500) -- Baseline/dry standard methodology
- [WRT/ASD Study Guide](https://reetsdryingacademy.com/wp-content/uploads/2016/07/Study-Guide-New-WRT-ASD.pdf) -- Reference point and documentation practices

---
*Architecture research for: Structural Drying Documentation (LyfeHub Apex Module)*
*Researched: 2026-02-11*
