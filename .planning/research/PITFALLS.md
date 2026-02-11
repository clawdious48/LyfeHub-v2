# Pitfalls Research

**Domain:** Structural Drying Documentation (Drying Logs) for Water Damage Restoration
**Researched:** 2026-02-11
**Confidence:** HIGH (codebase-verified patterns + domain research + industry standards)

---

## Critical Pitfalls

### Pitfall 1: Storing Drying Log Data as JSON Blobs in Phase Columns

**What goes wrong:**
The existing `apex_job_phases` table has a `drying_logs TEXT DEFAULT '[]'` column. The temptation is to stuff all drying log data (visits, rooms, reference points, readings, equipment, notes, photos) into this single JSON blob. As data grows -- dozens of reference points across multiple rooms across 5-10 daily visits -- this blob becomes a multi-hundred-KB JSON string. Every save overwrites the entire blob, every read parses the entire blob, and concurrent edits from different tabs or devices silently overwrite each other (last-write-wins).

**Why it happens:**
The existing codebase uses JSON-in-SQLite extensively (e.g., `additional_clients TEXT DEFAULT '[]'`, `documents TEXT DEFAULT '[]'`). This works for small, infrequently-updated arrays. Developers naturally extend the pattern to drying logs because "it worked for contacts." But drying logs are fundamentally different: they are time-series data with nested hierarchies (visit > room > reading), frequently updated in the field, and must maintain data integrity for insurance documentation.

**How to avoid:**
Create normalized tables for the drying log hierarchy:
- `drying_visits` (id, phase_id, visit_number, visit_date, technician_id, atmospheric readings, notes)
- `drying_rooms` (id, phase_id, room_name, sort_order, dry_standard, material_type)
- `drying_readings` (id, visit_id, room_id, ref_point_number, material, location, moisture_value, dry_goal, is_dry)
- `drying_equipment` (id, phase_id, equipment_type, make_model, serial, room_placed, date_placed, date_removed, status)
- `drying_visit_photos` (id, visit_id, file_path, caption)

This allows granular CRUD (update one reading without touching others), efficient queries (get all readings for a room across visits for drying curves), and no JSON parse/stringify overhead.

**Warning signs:**
- Saving a drying log takes >200ms
- JSON blob exceeds 50KB
- Two technicians report "my readings disappeared" after saving at similar times
- The `better-sqlite3` write lock blocks the Express event loop during large JSON updates

**Phase to address:**
Phase 1 (Schema/Database Design) -- this is foundational; wrong schema choice here means full rewrite later.

---

### Pitfall 2: No Auto-Save / Draft Protection for Field Data Entry

**What goes wrong:**
A field technician spends 15 minutes entering moisture readings for 30+ reference points across 5 rooms on a mobile device. They accidentally navigate away, their phone locks and the browser tab gets killed, or they lose cellular signal mid-save. All data is lost. In the restoration industry, this means they must re-take all readings (some of which are destructive tests), or worse, they guess from memory and the documentation loses its insurance-grade integrity.

**Why it happens:**
The existing codebase pattern is "fill out form, click save, POST to server." This works for creating a job (one-time, 2-minute task at a desk). Drying logs are fundamentally different: extended data entry sessions in hostile conditions (crawl spaces, attics, rain-soaked buildings), on mobile devices with unreliable connectivity.

**How to avoid:**
Implement aggressive auto-save at the individual reading level:
1. **Per-cell auto-save:** Each reading input triggers a debounced (500ms) PATCH to save just that one reading to the server. No "save all" button needed for readings.
2. **localStorage draft backup:** Mirror the current form state to localStorage keyed by `drying-visit-{visitId}`. On page load, check for a draft and offer to restore it.
3. **Optimistic UI:** Mark the cell as saved (subtle green flash) or pending (yellow) or failed (red border with retry). Never block the user from entering the next reading while a save is in-flight.
4. **Save queue with retry:** If a save fails (offline, server error), queue it and retry with exponential backoff when connectivity returns.

**Warning signs:**
- Users report lost data after "the app crashed"
- No visual feedback on save status per reading
- The entire form has a single "Save" button at the bottom
- No localStorage backup exists

**Phase to address:**
Phase 2 (Frontend Core) -- build the auto-save infrastructure before building the full UI. This is a foundational UX decision, not an afterthought.

---

### Pitfall 3: GPP Calculation Precision and Formula Errors

**What goes wrong:**
Grains Per Pound (GPP) is calculated from Temperature and Relative Humidity using the psychrometric formula. The standard formula involves the Magnus-Tetens approximation for saturation vapor pressure, which uses exponential functions and floating-point division. Common mistakes: (a) using Celsius in a formula that expects Fahrenheit or vice versa, (b) truncating intermediate results causing compounding errors, (c) using an oversimplified formula that diverges at extreme temperatures, (d) not matching the values that industry-standard tools (Dri-Eaz, Phoenix, IICRC S500 charts) produce, causing technicians to distrust the software.

**Why it happens:**
There are multiple published GPP formulas with subtle differences. The restoration industry uses lookup tables from psychrometric charts, not direct calculation. A developer grabs a formula from a Stack Overflow answer or a grow room calculator, implements it, and the values are close but not exact matches to what technicians see on their Dri-Eaz DryBook or Phoenix DryLINK. Off-by-2-3 GPP at the margins erodes trust.

**How to avoid:**
1. Use the ASHRAE-standard Magnus formula for saturation vapor pressure: `e_s = 6.1078 * 10^((7.5 * T) / (237.3 + T))` (T in Celsius), then `GPP = 4354 * (RH/100 * e_s) / (atmospheric_pressure - RH/100 * e_s)`.
2. Build a validation test table: for known Temp/RH pairs (e.g., 70F/40%, 80F/60%, 90F/80%), compare calculated GPP against published IICRC S500 psychrometric chart values. Acceptable tolerance: +/- 1 GPP.
3. Default atmospheric pressure to 29.92 inHg (standard) but allow override for high-altitude jobs.
4. All calculations use `Number` (not string coercion) and preserve full floating-point precision until final display (round to 1 decimal for display).

**Warning signs:**
- Technicians say "the GPP doesn't match my meter"
- Different rooms at the same atmospheric conditions show different GPP
- Values go negative or NaN at edge cases (very low RH, very high temp)

**Phase to address:**
Phase 2 (Frontend Core) -- implement the calculation engine early and validate against a reference table before building UI around it.

---

### Pitfall 4: Sequential Reference Point Numbering Breaks Across Rooms

**What goes wrong:**
Reference points in a drying log are numbered sequentially across all rooms (Room A: points 1-8, Room B: points 9-15, Room C: points 16-22). When a technician adds or removes a room, or inserts a reference point between existing ones, the entire numbering must re-sequence. If numbering is stored as data rather than derived, the system shows duplicate numbers, gaps, or inconsistencies between the daily log and the final report.

**Why it happens:**
The natural impulse is to store `ref_point_number` as a column in the readings table. But reference point numbers are a display concern derived from room order + point order within room, not intrinsic data. Storing them couples data to presentation and makes reordering/inserting impossible without cascade updates.

**How to avoid:**
1. Store `sort_order` (integer) on both rooms and reference points within rooms. Use 10-increment spacing (10, 20, 30) so inserts don't require renumbering.
2. Derive the sequential reference point number at render time by iterating rooms in sort_order, then points within each room in sort_order.
3. When displaying a visit, compute the running total: Room A (sorted first) has points 1-N, Room B starts at N+1, etc.
4. Store a `label` field on reference points for human-friendly names ("Kitchen Wall South", "Subfloor NE Corner") separate from the auto-generated number.

**Warning signs:**
- Reference point numbers have gaps (1, 2, 5, 6)
- Adding a room in the middle causes numbering collisions
- Deleting a reference point leaves permanent gaps
- Reports show different reference point numbers than the data entry screen

**Phase to address:**
Phase 1 (Schema Design) -- this is a data modeling decision that must be correct before any UI is built.

---

### Pitfall 5: Mobile Photo Capture Crashes or Produces Unusable Images

**What goes wrong:**
Field technicians take photos in the drying log (moisture meter readings, equipment placement, affected areas). On mobile devices: (a) high-resolution camera photos (12+ MP, 5+ MB each) exhaust browser memory when multiple are held in-memory as Blobs, (b) EXIF orientation metadata is ignored causing rotated thumbnails, (c) HEIC format on iOS is not universally supported, (d) the upload fails silently on poor cellular connections, and (e) the technician believes the photo is attached but it was never actually uploaded.

**Why it happens:**
The existing upload system (`backend/src/routes/uploads.js`) has NO size or count limits ("per Jake's request"). This is fine for desktop office use but lethal on mobile where 10 uncompressed camera photos = 50+ MB in browser memory. The existing `api.request()` method also hardcodes `Content-Type: application/json` which breaks `FormData`/multipart uploads.

**How to avoid:**
1. **Client-side resize before upload:** Use Canvas API to resize photos to max 1920px on the longest edge before uploading. This typically reduces 5MB to ~200KB with minimal quality loss for documentation purposes.
2. **EXIF orientation handling:** Read EXIF data before resize and apply rotation correction on the canvas (or use the CSS `image-orientation: from-image` property).
3. **Upload status per photo:** Show upload progress, success checkmark, or failure with retry button individually per photo.
4. **Separate upload API call:** Do not embed photos as base64 in the drying log JSON. Upload photos via the existing `/api/uploads` endpoint, store the returned path in the reading/visit record.
5. **Revoke object URLs:** Call `URL.revokeObjectURL()` after thumbnails are displayed to free memory.
6. **Override the Content-Type header:** The `api.request()` method must not set `Content-Type: application/json` when the body is a `FormData` object (let the browser set the multipart boundary).

**Warning signs:**
- Browser tab crashes on mobile after adding 3+ photos
- Photos appear rotated 90 degrees
- Upload spinner hangs indefinitely with no error
- Memory usage in mobile browser exceeds 200MB

**Phase to address:**
Phase 3 (Photo Integration) -- but the `api.request()` Content-Type fix should be addressed in Phase 1 as infrastructure.

---

### Pitfall 6: Equipment Auto-Population Logic Creates Phantom Equipment

**What goes wrong:**
When creating a new visit (Day 3), the system auto-populates equipment from the prior visit (Day 2). If the technician removed 2 dehumidifiers on Day 2 but forgot to update the system, Day 3 starts with those phantom dehumidifiers. The technician either doesn't notice (inaccurate documentation) or has to manually delete them every visit (defeats the purpose of auto-population). Over a 5-7 day drying job, equipment discrepancies compound.

**Why it happens:**
Auto-population is a naive copy: "take everything from last visit and put it in this visit." It doesn't account for equipment with a `date_removed` set, or equipment whose status changed to `picked_up`. The logic copies all equipment regardless of state.

**How to avoid:**
1. Track equipment at the phase level (not per-visit). Equipment has `date_placed`, `date_removed`, and `status` (active/removed/picked_up).
2. When rendering a visit, show equipment where `date_placed <= visit_date AND (date_removed IS NULL OR date_removed >= visit_date)`.
3. The visit form allows marking equipment as removed (sets `date_removed = visit_date`) or adding new equipment (sets `date_placed = visit_date`).
4. No copy/clone of equipment between visits -- it is a live view filtered by date.

**Warning signs:**
- Equipment counts differ between the daily log and the equipment tracking tab
- Removed equipment reappears on the next visit
- Technicians stop using the equipment tracking feature because "it's always wrong"

**Phase to address:**
Phase 2 (Frontend Core) and Phase 1 (Schema Design) -- the equipment model must be phase-scoped, not visit-scoped.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store all drying data as JSON blob in `drying_logs` column | Zero schema changes, fast to prototype | Impossible to query individual readings, full-blob overwrites, performance degrades at scale, no referential integrity | Never for production; acceptable only for a 1-day spike/prototype |
| Skip client-side photo compression | Simpler upload code | Mobile crashes, slow uploads on cellular, storage bloat | Never -- mobile photo capture without resize is a hard crash risk |
| Single "Save Visit" button instead of per-reading auto-save | Simpler save logic | Data loss in field conditions; hours of technician time wasted | Only for MVP if combined with localStorage draft backup as safety net |
| Hardcode GPP formula without validation table | Faster initial implementation | Wrong values discovered months later after insurance disputes | Never -- validate against 10 known Temp/RH/GPP reference values before shipping |
| Inline `onclick` handlers in HTML strings (existing codebase pattern) | Fast to add interactivity | Memory leaks from duplicated handlers on re-render, hard to debug, no cleanup | Acceptable for static elements; never for dynamically re-rendered lists like readings tables |
| Use `innerHTML` for the entire drying log table on every keystroke | Simplest rendering approach | Input focus lost on re-render, scroll position reset, terrible performance with 30+ rows x 10+ visits | Never -- use targeted DOM updates or at minimum only re-render the changed cell |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Existing upload system (`/api/uploads`) | Calling `api.request()` with `FormData` body -- it force-sets `Content-Type: application/json`, breaking multipart | Detect when body is `FormData`, skip the Content-Type header, let the browser set it with the multipart boundary |
| Existing `apexJobs.renderActiveTabContent()` | Re-rendering the entire tab panel HTML destroys input focus and scroll position | For the drying tab, use targeted DOM updates; only re-render changed cells/sections |
| Existing `jobDetailTabs.renderTab()` dispatch | Returns HTML string, expects `panel.innerHTML = render()` | Drying tab needs a persistent state (current visit, current room tab, unsaved changes). Either make it stateful or manage state externally in `apexJobs.currentJob` |
| `better-sqlite3` synchronous writes | Saving 30 readings in a loop fires 30 sequential `UPDATE` statements | Wrap bulk saves in `db.transaction()` -- the existing pattern (see `createJob`) already demonstrates this |
| Existing activity logging (`logActivity`) | Logging every individual reading save floods the activity timeline | Log at the visit level ("Drying visit #3 recorded: 28 readings"), not per-reading |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Rendering a 30-row x 10-column readings table with `innerHTML` on every input change | UI freezes, input lag >100ms, cursor jumps | Debounce re-renders to 300ms, use targeted cell updates, only re-render the GPP/status column when temp/RH changes | >20 reference points visible simultaneously |
| Loading all visits with all readings in a single API call on job detail open | 2-5 second load time, large JSON payload | Paginate: load visit list first, load full readings only for the selected visit | >5 visits with >20 reference points each |
| Re-calculating GPP for all visible cells on every keystroke | Visible lag when entering temperature | Only recalculate GPP for the row being edited; use `requestAnimationFrame` for batch UI updates | >15 reference points visible |
| Storing full-size photos as base64 in the database | SQLite database grows to GB+, backup times skyrocket | Store photos on filesystem via existing upload system, store only the file path in the database | >50 photos across all drying visits |
| No indexes on `drying_readings(visit_id)` and `drying_readings(room_id)` | Full table scans when loading a visit's readings | Add indexes at table creation | >500 total readings across all jobs |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Allowing any user to view/edit any job's drying logs without ownership check | Field techs could see/modify other companies' insurance-grade data | Maintain the existing pattern: all drying log routes must verify `job.user_id = req.user.id` via JOIN, consistent with existing `apexJobs.js` patterns |
| Not validating reading values server-side | A malicious or buggy client could store negative moisture readings, NaN GPP values, or readings with future dates | Server-side validation: moisture 0-100%, temperature -20 to 200F, RH 0-100%, date not in future |
| Photo uploads without file type validation for drying log context | Generic upload endpoint accepts any MIME type; drying log photos should only be images | Add a `context` parameter to uploads; when context is `drying_photo`, restrict to image MIME types only |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Requiring tap-save after every reading on mobile | Technician must tap input, type value, tap save, repeat 30+ times; fatigue and errors increase | Tab-to-next-cell navigation: entering a value and pressing Tab/Enter moves to the next cell; auto-save fires on blur |
| Showing all visits side-by-side in a wide table | Horizontal scrolling on mobile makes it unusable; technicians are on phones in the field | Default to single-visit view on mobile; show only the current visit's readings. Provide a "compare" view for desktop |
| No color coding for dry/not-dry readings | Technician must mentally compare each reading to the dry standard for that material | Green cell background when reading <= dry goal; yellow when within 10% of dry goal; red when significantly above |
| Forcing room setup before readings can be entered | Technician arrives on site, wants to start recording readings immediately, but must first configure rooms and reference points | Allow "quick add" mode: enter readings first, assign to rooms/reference points after. Pre-populate rooms from job's `areas_affected` field |
| Tiny touch targets for input fields on mobile | Fat-finger errors, missed taps, frustration | Minimum 44px touch targets (Apple HIG); use `inputmode="decimal"` for numeric fields to invoke the numeric keyboard; larger font size (16px minimum to prevent iOS zoom) |
| Modal-within-modal for drying log entry | The job detail is already a full-page view; opening a modal on top for drying entry feels claustrophobic on mobile | Make the drying log a full-page view (not a modal) accessible via the existing tab system; the current `renderDryingTab()` approach is correct |

## "Looks Done But Isn't" Checklist

- [ ] **GPP Calculation:** Validate against 10+ known Temp/RH/GPP reference pairs from IICRC S500 psychrometric tables -- off by 2+ GPP is a failure
- [ ] **Auto-save:** Kill the browser tab mid-entry and reopen -- does the draft restore? If not, auto-save is not working
- [ ] **Mobile photo capture:** Test on actual iOS device with HEIC camera format, verify photos display correctly without rotation artifacts
- [ ] **Equipment tracking:** Remove equipment on Day 3, verify it does not appear on Day 4 visit; verify it DOES appear on Day 1 and Day 2 historical views
- [ ] **Reference point numbering:** Add a room between two existing rooms, verify all reference point numbers re-sequence correctly
- [ ] **Offline resilience:** Toggle airplane mode, enter 5 readings, restore connectivity -- do all 5 readings appear on the server?
- [ ] **Print/export report:** Generate a drying log PDF from 5 visits of data -- does it include all readings, equipment, photos, GPP calculations, and atmospheric data? Insurance adjusters review these.
- [ ] **Mobile keyboard:** Tap a moisture reading input on iOS -- does the numeric keyboard appear (not full QWERTY)?
- [ ] **Concurrent edit safety:** Two users editing the same visit simultaneously -- does the second save overwrite the first, or do both sets of readings persist?
- [ ] **Empty state:** A job with a MIT phase but no drying data -- does the UI clearly guide the user to create their first visit?

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| JSON blob schema (Pitfall 1) | HIGH | Write migration script to parse JSON blobs into normalized tables; map old blob structure to new table columns; update all API endpoints and frontend code; risky data migration on production |
| Lost field data (Pitfall 2) | HIGH | Data is gone forever; technician must return to the site and re-take readings (may be impossible if building is occupied/drying is complete) |
| Wrong GPP formula (Pitfall 3) | MEDIUM | Fix formula, recalculate all stored GPP values via migration script, regenerate any exported reports |
| Broken reference numbering (Pitfall 4) | MEDIUM | Add `sort_order` column via migration, backfill from existing `ref_point_number` values, update rendering logic |
| Photo issues (Pitfall 5) | LOW | Add client-side resize retroactively; existing photos work but are oversized; no data loss |
| Equipment phantom data (Pitfall 6) | MEDIUM | Restructure equipment model from per-visit to per-phase with date ranges; migrate existing data; complex if visits already have inconsistent equipment lists |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| JSON blob schema | Phase 1: Schema Design | Query a single reading by ID returns in <1ms; updating one reading does not touch other readings |
| No auto-save | Phase 2: Frontend Core | Kill browser mid-entry, reopen, draft restores; no "Save" button for individual readings |
| GPP formula errors | Phase 2: Frontend Core | Automated validation against 10+ reference pairs; all pass within +/- 1 GPP tolerance |
| Reference point numbering | Phase 1: Schema Design | Insert room in middle, all downstream numbers increment; delete room, numbers close gap |
| Mobile photo issues | Phase 3: Photo Integration | Capture 10 photos on iPhone, all upload successfully, display correctly, browser memory stays under 150MB |
| Equipment auto-population | Phase 1: Schema Design + Phase 2: Frontend | Remove equipment on visit N, confirm absent from visit N+1 but present in visit N-1 |
| `api.request()` Content-Type for FormData | Phase 1: Infrastructure | Upload a photo via `api.request()` with FormData body, verify multipart encoding works |
| `innerHTML` re-render performance | Phase 2: Frontend Core | Enter 30 readings with no visible input lag or cursor jumping |
| Activity log flooding | Phase 1: API Design | Create a visit with 25 readings, verify exactly 1 activity log entry (not 25) |

## Sources

- Codebase analysis: `backend/src/db/apexSchema.js` (existing `drying_logs TEXT DEFAULT '[]'` column pattern)
- Codebase analysis: `backend/src/db/apexJobs.js` (transaction patterns, JSON handling, activity logging)
- Codebase analysis: `backend/src/routes/uploads.js` (no size limits, multer configuration)
- Codebase analysis: `frontend/js/api.js` (hardcoded Content-Type: application/json)
- Codebase analysis: `frontend/js/jobDetailTabs.js` (existing `renderDryingTab()` placeholder, innerHTML rendering pattern)
- Codebase analysis: `backend/src/db/schema.js` (WAL mode enabled, better-sqlite3 configuration)
- [Humidity Grains Per Pound Calculator - Calculator Academy](https://calculator.academy/humidity-grains-per-pound-calculator/) -- GPP formula reference
- [Encircle Water Damage Documentation Software](https://www.getencircle.com/water-damage-restoration) -- industry-standard documentation tool patterns
- [Structural Drying in the Field: S500 Standard](https://www.candrmagazine.com/structural-drying-in-the-field-bringing-chapter-12-of-the-s500-standard-to-life/) -- IICRC documentation requirements
- [better-sqlite3 performance documentation](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/performance.md) -- WAL mode and transaction patterns
- [Building offline-first web applications](https://borstch.com/blog/building-offline-first-web-applications) -- offline-first patterns
- [MDN: ImageCapture.takePhoto()](https://developer.mozilla.org/en-US/docs/Web/API/ImageCapture/takePhoto) -- mobile camera API reference

---
*Pitfalls research for: Structural Drying Documentation (Drying Logs)*
*Researched: 2026-02-11*
