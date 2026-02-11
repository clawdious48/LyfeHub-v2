# Phase 1: Schema & GPP Engine - Research

**Researched:** 2026-02-11
**Domain:** SQLite schema design for drying log data + IAPWS psychrometric GPP calculation engine
**Confidence:** HIGH

## Summary

Phase 1 is a pure backend/data-layer phase with no API routes or UI. It delivers two things: (1) a normalized SQLite schema for all drying log entities (logs, chambers, rooms, reference points, visits, atmospheric readings, moisture readings, equipment, baselines, visit notes), and (2) a server-side GPP calculation engine using the IAPWS saturation vapor pressure formula. The schema must integrate safely into the existing database via the codebase's try/catch ALTER TABLE migration pattern, and the GPP engine must produce values matching IICRC industry standards within +/- 1 GPP tolerance.

The IAPWS formula has been verified against the ASHRAE Fundamentals Handbook constants (from the Dayton ASHRAE psychrometric reference) and against the existing Python reference implementation in the codebase. The formula constants match exactly. A 15-pair validation table has been generated from the verified Python implementation and is included below for use during implementation verification.

**Primary recommendation:** Create a new `backend/src/db/dryingSchema.js` for table creation (following the `apexSchema.js` pattern) and a new `backend/src/db/dryingLogs.js` for prepared statements, CRUD functions, and the GPP calculation engine. Use normalized tables (NOT JSON blobs) for all drying data. The GPP function should be a pure JavaScript function exportable for both server-side storage computation and future client-side live preview.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
(No locked decisions from user -- all implementation decisions are at Claude's discretion)

### Claude's Discretion
- Table naming conventions and column types (follow existing codebase patterns in `db/schema.js` and `db/apexSchema.js`)
- Foreign key structure and cascade delete strategy
- GPP formula implementation approach (IAPWS saturation pressure calculation)
- Prepared statement organization and transaction boundaries
- Migration safety pattern (try/catch ALTER TABLE, consistent with existing schema.js approach)
- Dry-standard comparison storage (boolean flag, threshold math)
- Edge case handling for GPP calculation (missing inputs, out-of-range values)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core (Already Installed -- No New Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | ^11.7.0 | SQLite database driver | Already in use. Synchronous API, WAL mode enabled, prepared statements at module scope. |
| uuid | ^11.1.0 | UUID v4 generation for all record IDs | Already in use. All entities use TEXT PRIMARY KEY with UUIDs. |
| express | ^4.21.2 | HTTP server (not used directly in Phase 1 but db module is loaded at startup) | Already in use. |

### Supporting (Built-in)

| Capability | Implementation | Why No Library Needed |
|------------|----------------|----------------------|
| GPP Calculation | Pure JavaScript (`Math.exp`, `Math.log`, `Math.pow`) | IAPWS formula is ~20 lines of JS. No external dependency. Verified against Python reference and ASHRAE constants. |
| Input Validation | Simple range checks in JavaScript | Temperature 32-120F, RH 0-100%. Domain-specific, no validation library warranted. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Normalized drying tables | JSON blob in existing `apex_job_phases.drying_logs` column | JSON blobs cannot be queried per-reading, cannot be indexed, cause full-blob overwrites. Normalized tables are mandatory for time-series drying data. |
| IAPWS saturation pressure formula | Magnus-Tetens approximation | Magnus is simpler but less accurate at temperature extremes. IAPWS is the ASHRAE standard and matches industry psychrometric charts. Use IAPWS. |
| Separate `dryingSchema.js` file | Inline tables in `apexSchema.js` | `apexSchema.js` is already 454 lines. Adding ~10 tables with indexes would make it unwieldy. Separate file follows the pattern of `bases.js` being separate from `schema.js`. |

**Installation:**
```bash
# No new packages required for Phase 1
```

## Architecture Patterns

### Recommended File Structure

```
backend/src/db/
  schema.js              # (existing) Core tables, exports db instance
  apexSchema.js          # (existing) Apex job tables, requires schema.js
  dryingSchema.js        # (NEW) Drying log table creation + migrations
  dryingLogs.js          # (NEW) Prepared statements, CRUD, GPP engine
  apexJobs.js            # (existing) Apex job CRUD functions
```

### Pattern 1: Schema File (Table Creation + Migrations)

**What:** `dryingSchema.js` creates all `drying_*` tables and runs migrations, following the exact pattern of `apexSchema.js`.

**When to use:** Any new feature domain that adds multiple related tables.

**Key pattern elements:**
- `require('./schema')` to get the db instance (NOT `require('./apexSchema')` -- schema.js is the canonical db provider)
- Check if table exists before CREATE: `db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='...'").get()`
- Migrations use try/catch ALTER TABLE: `try { db.exec('ALTER TABLE ... ADD COLUMN ...'); } catch (e) { /* exists */ }`
- CREATE INDEX IF NOT EXISTS for all indexes
- `module.exports = db;` at the end (re-exports the db instance)

**Example:**
```javascript
// Source: existing pattern from apexSchema.js
const db = require('./schema');

const dryingLogsTable = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name='drying_logs'"
).get();
if (!dryingLogsTable) {
  console.log('Creating drying_logs table...');
  db.exec(`
    CREATE TABLE drying_logs (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL UNIQUE REFERENCES apex_jobs(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'complete')),
      next_ref_number INTEGER DEFAULT 1,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec('CREATE UNIQUE INDEX idx_drying_logs_job_id ON drying_logs(job_id)');
  console.log('Drying logs table created');
}

module.exports = db;
```

### Pattern 2: DB Module (Prepared Statements + CRUD Functions)

**What:** `dryingLogs.js` defines all prepared statements at module scope and exports named CRUD functions. Follows the `bases.js` and `apexJobs.js` pattern.

**When to use:** Any db module that needs complex queries, transactions, or computed fields.

**Key pattern elements:**
- `const db = require('./schema');` for the db instance
- `const { v4: uuidv4 } = require('uuid');` for ID generation
- Prepared statements defined at module scope (not inside functions)
- Transaction functions using `db.transaction()`
- Exported as an object of named functions: `module.exports = { createLog, getLog, ... }`

**Example:**
```javascript
// Source: existing pattern from apexJobs.js and bases.js
const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

// Prepared statements at module scope
const getLogByJobId = db.prepare(
  'SELECT * FROM drying_logs WHERE job_id = ?'
);
const insertLog = db.prepare(`
  INSERT INTO drying_logs (id, job_id, status, next_ref_number)
  VALUES (?, ?, 'active', 1)
`);

// Transaction example: bulk save moisture readings
const saveReadings = db.transaction((visitId, readings, baselines) => {
  // Delete existing and re-insert (bulk upsert pattern)
  db.prepare('DELETE FROM drying_moisture_readings WHERE visit_id = ?').run(visitId);
  const insert = db.prepare(`
    INSERT INTO drying_moisture_readings
      (id, visit_id, ref_point_id, reading_value, meets_dry_standard)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const r of readings) {
    const baseline = baselines[r.materialCode];
    const meetsDry = baseline != null
      ? (r.readingValue <= baseline + 4 ? 1 : 0) : 0;
    insert.run(uuidv4(), visitId, r.refPointId, r.readingValue, meetsDry);
  }
});

module.exports = { getLogByJobId, saveReadings, ... };
```

### Pattern 3: GPP Calculation as a Pure Function

**What:** A standalone `calculateGPP(tempF, rhPercent, pressurePsia)` function that computes GPP from temperature and humidity using the IAPWS formula. Pure function with no side effects, no database access, no external dependencies.

**When to use:** Called during atmospheric reading inserts/updates to compute and store the GPP value. Also exportable for future client-side use (same formula, same constants).

**Key insight:** GPP is computed server-side on write and stored in the row alongside temp/RH. This ensures the authoritative GPP value is always available without recalculation, while the inputs (temp, RH) remain stored for audit/recalculation if needed.

### Pattern 4: Dry-Standard Comparison on Write

**What:** When a moisture reading is inserted or updated, the server looks up the baseline for that material type and stores a `meets_dry_standard` boolean (INTEGER 0/1) on the reading row.

**When to use:** Called inside the bulk save transaction for moisture readings.

**Rule:** A reading meets dry standard when `reading_value <= baseline_value + 4` (within 4 percentage points per IICRC S500 Section 12.4.1.5).

### Anti-Patterns to Avoid

- **JSON blob for readings data:** The existing `apex_job_phases.drying_logs TEXT DEFAULT '[]'` column must be ignored/deprecated. All drying data goes into normalized tables. JSON blobs cannot be queried per-reading, cannot enforce referential integrity, and cause full-blob overwrites.
- **Per-room reference point numbering:** Reference points are numbered sequentially across the ENTIRE job (not per-room). Use `drying_logs.next_ref_number` as an atomic counter.
- **Storing GPP only client-side:** GPP must be computed and stored server-side as the authoritative value. Client-side GPP calculation is for live preview only (Phase 5+).
- **Individual INSERT per reading without transaction:** A visit with 30 reference points + atmospheric readings must be saved in a single `db.transaction()` call. Individual INSERTs without transaction wrapping are 25x slower in SQLite and lose atomicity.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation | Custom ID generator | `uuid.v4()` | Already in use across entire codebase. Consistent TEXT PRIMARY KEY pattern. |
| Saturation vapor pressure | Simplified Magnus approximation | IAPWS formula with ASHRAE constants | IAPWS matches industry psychrometric charts. Magnus diverges at temperature extremes. |
| Migration safety | Custom migration framework | try/catch ALTER TABLE pattern | Established pattern in schema.js and apexSchema.js. SQLite silently ignores "column already exists" errors. |
| Transaction management | Manual BEGIN/COMMIT | `db.transaction()` from better-sqlite3 | Automatic rollback on error, 25x faster than individual operations. |

**Key insight:** This phase has no external dependencies to add. Everything is built from existing patterns in the codebase + pure JavaScript math for GPP.

## Common Pitfalls

### Pitfall 1: Wrong IAPWS Constants

**What goes wrong:** Using the Magnus-Tetens approximation constants instead of the IAPWS constants, or transposing digits in the IAPWS coefficients. The GPP values are close but wrong by 2-5 GPP at temperature extremes.

**Why it happens:** Multiple GPP formulas exist online with different constants. Copy-paste errors in 10-digit coefficients are easy to miss.

**How to avoid:** Use exactly these IAPWS constants (verified against ASHRAE Fundamentals Handbook and Dayton ASHRAE reference):
- c8 = -10440.397
- c9 = -11.29465 (note: -11.29465, NOT -11.294650)
- c10 = -0.027022355
- c11 = 0.00001289036
- c12 = -0.0000000024780681
- c13 = 6.5459673

Validate the implementation against the 15-pair reference table in the Code Examples section below.

**Warning signs:** GPP values differ from the reference table by more than 0.1.

### Pitfall 2: Temperature Unit Confusion in Formula

**What goes wrong:** The IAPWS formula expects Rankine (Fahrenheit + 459.67), but developers pass Fahrenheit directly or convert to Celsius first.

**Why it happens:** Many online psychrometric formulas use Celsius. The IAPWS formula (as used in ASHRAE and the restoration industry) expects Rankine.

**How to avoid:** The FIRST line of the GPP function must be `const tempR = tempF + 459.67;`. All subsequent calculations use `tempR`. Never convert to Celsius.

### Pitfall 3: Cascade Delete Missing on Child Tables

**What goes wrong:** Deleting a drying log leaves orphaned chambers, rooms, reference points, visits, and readings in the database. Or deleting a chamber leaves orphaned rooms.

**Why it happens:** Forgetting `ON DELETE CASCADE` on foreign key definitions, or forgetting to enable foreign keys in SQLite.

**How to avoid:** Every child table's foreign key must include `ON DELETE CASCADE`. The existing codebase pattern (e.g., `apex_job_phases.job_id REFERENCES apex_jobs(id) ON DELETE CASCADE`) shows this. Note: SQLite requires `PRAGMA foreign_keys = ON` to enforce cascades -- the existing schema.js does NOT explicitly set this, but better-sqlite3 enables it by default in recent versions. Verify this works with a test: insert a log, insert a chamber, delete the log, verify the chamber is gone.

### Pitfall 4: next_ref_number Race Condition

**What goes wrong:** Two concurrent requests to add reference points both read `next_ref_number = 5`, both create RP #5, causing a duplicate number or UNIQUE constraint violation.

**Why it happens:** Read-then-write without transaction boundary.

**How to avoid:** Wrap the read-increment-insert in a `db.transaction()`. Within the transaction, read `next_ref_number`, use it for the new RP, then UPDATE to increment. Since better-sqlite3 is synchronous and single-threaded per Node process, this is safe. The UNIQUE constraint on `(log_id, ref_number)` provides a safety net.

### Pitfall 5: Dry Standard Comparison Off-by-One

**What goes wrong:** The dry standard rule is "within 4 percentage points of baseline," but the comparison is implemented as `reading < baseline + 4` (strictly less than) instead of `reading <= baseline + 4` (less than or equal).

**Why it happens:** Ambiguity in the word "within."

**How to avoid:** Per IICRC S500 and the vision doc: a reading of exactly baseline + 4 IS considered dry. Use `<=`. Example: baseline = 11%, reading of 15% = DRY (11 + 4 = 15, 15 <= 15). Reading of 16% = NOT DRY (16 > 15).

### Pitfall 6: Schema File Not Required at Startup

**What goes wrong:** The new `dryingSchema.js` creates tables on first `require()`, but if nothing requires it, the tables never get created. The server starts fine but drying features fail with "no such table" errors.

**Why it happens:** Unlike route files which are mounted by `index.js`, schema files must be explicitly required in the startup chain.

**How to avoid:** In `backend/src/index.js` or in `apexSchema.js`, add `require('./dryingSchema')` to ensure the schema file runs at startup. Follow the existing pattern where `apexSchema.js` requires `schema.js`, and `index.js` requires schema modules.

## Code Examples

### GPP Calculation Function (IAPWS Formula)

```javascript
// Source: IAPWS constants verified against ASHRAE Fundamentals Handbook
// via Dayton ASHRAE psychrometric reference
// (https://daytonashrae.org/psychrometrics/psychrometrics_imp.html)
// and project Python reference (calculate_gpp.py)

/**
 * Calculate GPP (Grains Per Pound) from temperature and relative humidity.
 * Uses IAPWS formula for saturation vapor pressure.
 *
 * @param {number} tempF - Temperature in Fahrenheit
 * @param {number} rhPercent - Relative humidity (0-100)
 * @param {number} [pressurePsia=14.696] - Atmospheric pressure in psia (sea level default)
 * @returns {number|null} GPP rounded to 1 decimal place, or null if inputs invalid
 */
function calculateGPP(tempF, rhPercent, pressurePsia = 14.696) {
  if (tempF == null || rhPercent == null) return null;
  if (isNaN(tempF) || isNaN(rhPercent)) return null;
  if (rhPercent < 0 || rhPercent > 100) return null;

  // Step 1: Convert to Rankine (absolute temperature)
  const tempR = tempF + 459.67;

  // Step 2: Saturation vapor pressure (IAPWS formula)
  const lnPws = -10440.397 / tempR
    - 11.29465
    - 0.027022355 * tempR
    + 0.00001289036 * Math.pow(tempR, 2)
    - 0.0000000024780681 * Math.pow(tempR, 3)
    + 6.5459673 * Math.log(tempR);
  const pws = Math.exp(lnPws);

  // Step 3: Actual vapor pressure
  const pw = (rhPercent / 100) * pws;

  // Step 4: Humidity ratio (lb water vapor / lb dry air)
  const w = 0.62198 * pw / (pressurePsia - pw);

  // Step 5: Convert to grains per pound (1 lb = 7000 grains)
  const gpp = w * 7000;

  // Round to 1 decimal place (industry standard)
  return Math.round(gpp * 10) / 10;
}
```

### GPP Validation Reference Table

These values were generated from the verified Python IAPWS implementation (`calculate_gpp.py`) and cross-checked against ASHRAE published values. The implementation MUST match these values exactly (same formula = identical output within floating-point rounding).

```javascript
// Source: Generated from verified IAPWS formula, P=14.696 psia (sea level)
const GPP_VALIDATION_PAIRS = [
  { tempF: 60,  rhPercent: 20, expectedGpp: 15.2 },
  { tempF: 60,  rhPercent: 50, expectedGpp: 38.3 },
  { tempF: 65,  rhPercent: 50, expectedGpp: 45.8 },
  { tempF: 70,  rhPercent: 30, expectedGpp: 32.5 },
  { tempF: 70,  rhPercent: 50, expectedGpp: 54.5 },   // ASHRAE ~54-55
  { tempF: 70,  rhPercent: 80, expectedGpp: 87.8 },
  { tempF: 75,  rhPercent: 40, expectedGpp: 51.6 },
  { tempF: 75,  rhPercent: 50, expectedGpp: 64.7 },
  { tempF: 75,  rhPercent: 60, expectedGpp: 77.8 },   // Matches psychrometric-formulas.md example
  { tempF: 80,  rhPercent: 50, expectedGpp: 76.5 },   // ASHRAE ~77
  { tempF: 80,  rhPercent: 60, expectedGpp: 92.1 },
  { tempF: 85,  rhPercent: 50, expectedGpp: 90.2 },
  { tempF: 90,  rhPercent: 40, expectedGpp: 84.4 },
  { tempF: 90,  rhPercent: 80, expectedGpp: 172.2 },
  { tempF: 100, rhPercent: 50, expectedGpp: 145.5 },
];
```

### Dry Standard Comparison

```javascript
// Source: IICRC S500 Section 12.4.1.5 + project vision doc
/**
 * Check if a moisture reading meets the dry standard.
 * Dry = within 4 percentage points of material baseline.
 *
 * @param {number} readingValue - Current moisture content (%)
 * @param {number|null} baselineValue - Material baseline moisture content (%)
 * @returns {boolean} True if reading meets dry standard
 */
function meetsDryStandard(readingValue, baselineValue) {
  if (readingValue == null || baselineValue == null) return false;
  return readingValue <= baselineValue + 4;
}
```

### Schema Creation with Migration Safety

```javascript
// Source: existing pattern from backend/src/db/apexSchema.js
const db = require('./schema');

// Table creation: check existence first
const table = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name='drying_logs'"
).get();
if (!table) {
  db.exec(`CREATE TABLE drying_logs (...)`);
  db.exec('CREATE INDEX ...');
}

// Column migration: try/catch pattern
try {
  db.exec("ALTER TABLE drying_logs ADD COLUMN some_new_col TEXT DEFAULT ''");
  console.log('Added some_new_col column');
} catch (e) {
  // Column already exists, ignore
}
```

### Transaction-Wrapped Bulk Insert

```javascript
// Source: existing pattern from backend/src/db/apexJobs.js createJob()
const saveReadings = db.transaction((visitId, readings) => {
  const insert = db.prepare(`
    INSERT INTO drying_moisture_readings
      (id, visit_id, ref_point_id, reading_value, meets_dry_standard)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const r of readings) {
    insert.run(uuidv4(), visitId, r.refPointId, r.readingValue, r.meetsDry);
  }
});
```

## Database Schema Design

### Entity Relationships

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
                                   |
                                   +-- 1:N -- drying_atmospheric_readings
                                   |
                                   +-- 1:N -- drying_moisture_readings
                                   |
                                   +-- 1:N -- drying_equipment
                                   |
                                   +-- 1:N -- drying_visit_notes
```

### Table Summary

| Table | Parent FK | Cascade From | Purpose |
|-------|-----------|--------------|---------|
| `drying_logs` | `apex_jobs(id)` | job delete | One per job, anchors all drying data |
| `drying_chambers` | `drying_logs(id)` | log delete | Named containment zones with colors |
| `drying_rooms` | `drying_chambers(id)` | chamber delete | Rooms within chambers |
| `drying_ref_points` | `drying_rooms(id)`, `drying_logs(id)` | room delete | Measurement locations with material type |
| `drying_baselines` | `drying_logs(id)` | log delete | Target moisture per material type |
| `drying_visits` | `drying_logs(id)` | log delete | Timestamped site visit records |
| `drying_atmospheric_readings` | `drying_visits(id)` | visit delete | Temp/RH/GPP per chamber per visit |
| `drying_moisture_readings` | `drying_visits(id)`, `drying_ref_points(id)` | visit delete | MC per reference point per visit |
| `drying_equipment` | `drying_visits(id)`, `drying_rooms(id)` | visit delete | Equipment snapshot per room per visit |
| `drying_visit_notes` | `drying_visits(id)` | visit delete | Text notes with optional photo paths |

### Column Naming Conventions (from codebase analysis)

| Convention | Examples from Existing Code | Apply to Drying Tables |
|-----------|---------------------------|----------------------|
| `id TEXT PRIMARY KEY` | All tables | All tables |
| `*_id TEXT REFERENCES ...` | `job_id`, `user_id`, `phase_id` | `log_id`, `chamber_id`, `room_id`, `visit_id`, `ref_point_id` |
| `created_at TEXT DEFAULT (datetime('now'))` | All tables | All tables |
| `updated_at TEXT DEFAULT (datetime('now'))` | Most tables | Tables that can be edited |
| `position INTEGER DEFAULT 0` | `base_properties`, `base_groups` | `drying_chambers`, `drying_rooms` |
| `status TEXT DEFAULT '...' CHECK(...)` | `apex_jobs.status`, `projects.status` | `drying_logs.status` |
| `TEXT DEFAULT ''` for optional strings | Throughout | Notes, labels |
| `REAL` for numeric values | `amount`, `hours`, `hourly_rate` | `temp_f`, `rh_percent`, `gpp`, `reading_value`, `baseline_value` |
| `INTEGER DEFAULT 0` for booleans | `urgent`, `billable`, `archived` | `meets_dry_standard`, `is_initial` |

### Key Schema Design Decisions

1. **`drying_ref_points` has BOTH `room_id` and `log_id`:** The `room_id` gives the room assignment. The `log_id` enables the unique constraint `UNIQUE(log_id, ref_number)` for job-wide sequential numbering without a join through chambers.

2. **`drying_atmospheric_readings.reading_type`:** Discriminates between `'chamber_intake'`, `'dehu_exhaust'`, `'unaffected'`, and `'outside'`. Chamber-level readings have `chamber_id` set; job-level readings (unaffected, outside) have `chamber_id = NULL`.

3. **`drying_atmospheric_readings.dehu_number`:** For `reading_type = 'dehu_exhaust'`, identifies which dehumidifier (1, 2, 3...). NULL for other reading types.

4. **`drying_equipment` is a per-visit snapshot:** Each visit stores the full equipment state for each room. This avoids complex date-range queries and matches the "auto-populate from prior visit" workflow in the vision doc. Equipment types: `'AM'`, `'DEHU'`, `'NAFAN'`, and custom types stored as text.

5. **`meets_dry_standard` stored on readings:** Computed on write using `readingValue <= baseline + 4`. Stored as INTEGER 0/1 to avoid re-computation on every read. Updated if baseline changes.

6. **`drying_logs.next_ref_number`:** Atomic counter for job-wide reference point numbering. Read-increment-insert within transaction.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Magnus-Tetens saturation pressure approximation | IAPWS formula with ASHRAE constants | Industry standard since ASHRAE Handbook adoption | More accurate across full temperature range. Must use IAPWS for insurance-grade documentation. |
| JSON blob for readings (`drying_logs TEXT DEFAULT '[]'` on phases table) | Normalized relational tables | Decision made during project research | Enables per-reading queries, indexing, referential integrity. Critical for trend analysis in later phases. |
| Client-side only GPP calculation | Server-side calculation on write with client-side preview | Decided per ROADMAP.md | Server is authoritative. Client provides live preview. Both use identical formula. |

**Deprecated/outdated:**
- The `apex_job_phases.drying_logs TEXT DEFAULT '[]'` column exists but should be ignored. All drying data goes into the new normalized tables. This column is not removed (migration safety) but is never read or written by the new drying log feature.

## Open Questions

1. **Foreign key enforcement in SQLite**
   - What we know: SQLite requires `PRAGMA foreign_keys = ON` to enforce FK constraints including cascades. The existing `schema.js` does NOT explicitly set this pragma.
   - What's unclear: Whether better-sqlite3 v11.7 enables foreign keys by default, or whether existing cascade behavior has been tested.
   - Recommendation: Explicitly add `db.pragma('foreign_keys = ON')` in the schema file (or verify it's already on). Test cascade behavior with a simple insert-delete cycle during implementation.

2. **Material type codes: enum vs. free-text**
   - What we know: The vision doc lists specific material codes (D, SF, FRM, CW, TK, I, PNL, C, TL, WF, CJST, FJST) and says "the system should allow adding custom types."
   - What's unclear: Whether to use a CHECK constraint for known types or allow completely free-text material codes.
   - Recommendation: Use a TEXT column without CHECK constraint to allow custom types. Store the standard codes as a constant array in the JS module for validation/autocomplete, but don't restrict at the database level. This matches the "never block the technician" design principle.

3. **Schema loading order**
   - What we know: `schema.js` is loaded first (creates core tables), then `apexSchema.js` (creates apex tables). Drying tables reference `apex_jobs(id)`.
   - What's unclear: Whether `dryingSchema.js` should be required from `apexSchema.js` or from `index.js`.
   - Recommendation: Require from `apexSchema.js` at the bottom (after apex tables exist) since drying tables have FKs to `apex_jobs`. This ensures load order: schema.js -> apexSchema.js -> dryingSchema.js.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `backend/src/db/schema.js` -- table creation patterns, migration patterns, db instance configuration
- Existing codebase: `backend/src/db/apexSchema.js` -- Apex table patterns, ON DELETE CASCADE usage, column migration patterns
- Existing codebase: `backend/src/db/bases.js` -- Prepared statement patterns, transaction patterns, module export patterns
- Existing codebase: `backend/src/db/apexJobs.js` -- CRUD function patterns, transaction usage, uuid generation
- Existing codebase: `.claude/skills/drying-report/scripts/calculate_gpp.py` -- Verified Python IAPWS implementation
- Existing codebase: `.claude/skills/drying-report/references/psychrometric-formulas.md` -- IAPWS formula documentation and GPP reference values
- [Dayton ASHRAE Psychrometric Reference](https://daytonashrae.org/psychrometrics/psychrometrics_imp.html) -- ASHRAE Fundamentals Handbook constants for saturation vapor pressure: c8=-10440.397, c9=-11.29465, c10=-0.027022355, c11=0.00001289036, c12=-0.0000000024780681, c13=6.5459673. **Exact match** with our IAPWS constants.
- [IICRC S500 Psychrometric Chart (PDF)](https://iicrc.org/wp-content/uploads/2024/04/US-Imperial-Psychrometric-Chart.pdf) -- Official IICRC chart used by restoration industry

### Secondary (MEDIUM confidence)
- [How to Calculate GPP - Pressure Calculator](https://pressure-calculator.com/how-to-calculate-gpp.php) -- Confirmed GPP = 7000 * W, W = 0.622 * Pw / (Patm - Pw)
- [Humidity Grains Per Pound Calculator - Calculator Academy](https://calculator.academy/humidity-grains-per-pound-calculator/) -- Confirmed formula structure
- [IICRC S500 Structural Drying in the Field](https://www.candrmagazine.com/structural-drying-in-the-field-bringing-chapter-12-of-the-s500-standard-to-life/) -- S500 Chapter 12 documentation requirements, dry standard methodology
- [What is Acceptable Dry - R&R Magazine](https://www.randrmagonline.com/articles/89445-what-is-acceptable-dry) -- Dry standard tolerance criteria (within 4 percentage points)

### Tertiary (LOW confidence)
- None -- all findings verified against primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- existing codebase, no new dependencies
- Architecture: HIGH -- follows established patterns from apexSchema.js, bases.js, apexJobs.js
- GPP formula: HIGH -- IAPWS constants verified against ASHRAE reference and Python implementation, 15-pair validation table generated
- Schema design: HIGH -- based on domain analysis from DRYING-LOGS-VISION.md + existing Apex table patterns
- Pitfalls: HIGH -- identified from codebase analysis and domain-specific knowledge

**Research date:** 2026-02-11
**Valid until:** Indefinite (SQLite patterns and IAPWS formula are stable; codebase patterns unlikely to change during this project)
