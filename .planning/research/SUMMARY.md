# Project Research Summary

**Project:** Drying Logs - Structural Drying Documentation for Water Damage Restoration
**Domain:** Insurance-grade documentation tool for water damage restoration (Apex module extension)
**Researched:** 2026-02-11
**Confidence:** HIGH

## Executive Summary

This research covers building a structural drying documentation feature (Drying Logs) for the LyfeHub Apex job management module. The goal is to replace paper logs and legacy standalone tools (Encircle Hydro, MICA) with an integrated, mobile-first solution for tracking moisture readings, atmospheric conditions, equipment deployment, and drying progress across multi-day water damage restoration jobs. The deliverable is IICRC S500-compliant documentation with professional PDF reports suitable for insurance adjuster review.

The recommended approach builds on LyfeHub's existing vanilla JS + Express + SQLite stack with one new dependency (sharp for server-side image processing). The feature requires normalized relational tables for time-series drying data, aggressive mobile auto-save to prevent field data loss, and precise psychrometric calculations that match industry-standard tools. The biggest architectural advantage over competitors is deep integration with the existing Apex job system, eliminating the double data entry and context switching that plague standalone restoration documentation tools.

The critical risks are: (1) attempting to store complex time-series data as JSON blobs instead of normalized tables, (2) failing to protect field-entered data with auto-save on unreliable mobile connections, and (3) GPP calculation formula errors that erode trust when values don't match technicians' calibrated meters. All three are avoidable with careful schema design, field-optimized UX patterns, and formula validation against IICRC reference data.

## Key Findings

### Recommended Stack

The existing LyfeHub stack (Express 4.21, better-sqlite3, vanilla JS, Docker deployment) is sufficient for this feature with one addition: sharp for server-side image processing. No framework changes, no bundler, no major dependencies.

**Core technologies:**
- **Express 4.21 + better-sqlite3 11.7** — Already in place, handles time-series data well with WAL mode. Normalized tables with indexes support efficient trend queries across visits.
- **sharp 0.33** — Server-side image resize/thumbnail generation for mobile camera photos. Mobile photos are 5-12 MB each; sharp cuts storage 60-80% and normalizes EXIF orientation automatically.
- **Client-side Canvas API** — Pre-compress photos before upload to reduce cellular bandwidth, combined with sharp server-side for thumbnails and normalization.
- **Vanilla JS psychrometric calculation** — GPP calculation is pure math (IAPWS formula, ~15 lines of JS). Run client-side for real-time preview as technicians type. No external library needed.
- **HTML capture attribute** — Native mobile camera access via `<input type="file" accept="image/*" capture="environment">`. Zero JavaScript camera APIs needed; the OS handles everything.

**No new backend dependencies except sharp.** No validation library (domain-specific rules don't fit generic validators), no charting library (deferred to v2), no offline-first infrastructure (deferred), no Bluetooth integration (hardware-dependent, premature).

### Expected Features

**Must have (table stakes):**
- Daily moisture readings per reference point (core of drying documentation)
- Atmospheric readings (4-point: chamber intake, dehu exhaust, unaffected, outside) with auto-calculated GPP
- Dry standard establishment and drying completion detection (IICRC S500 requirement)
- Equipment tracking per room/chamber (required for billing justification)
- Photo documentation per visit (insurance proof)
- Visit notes and material demolition tracking
- Water damage classification (Category 1-3, Class 1-4)
- PDF report generation (non-negotiable for getting paid)

**Should have (competitive advantage):**
- Integrated job management (drying logs live inside Apex job, not a separate app)
- Auto-calculated grain depression and differential (highlights dehumidifier performance)
- Trend visualization (moisture + atmospheric charts for quick progress assessment)
- Bulk reading entry optimized for field speed (minimize taps per reading on mobile)
- Smart alerts for drying anomalies (plateau detection, grain depression thresholds)

**Defer (v2+):**
- Offline-first capability (requires service worker + IndexedDB + conflict resolution)
- Bluetooth moisture meter integration (hardware-specific, Web BLE reliability issues)
- Equipment sizing calculator (useful but not critical for MVP)
- Template drying setups (add after patterns emerge from real job data)

### Architecture Approach

The architecture extends the existing Apex module with new normalized tables (not JSON blobs), dedicated API routes mounted under `/api/apex-jobs/:jobId/drying/*`, and a new frontend module (`dryingLog.js`) that integrates with the existing job detail tab system. The drying log is lazily initialized (created on first access, not at job creation) because only mitigation phases need drying documentation.

**Major components:**
1. **Database layer (normalized tables)** — `drying_logs`, `drying_chambers`, `drying_rooms`, `drying_ref_points`, `drying_visits`, `drying_atmospheric`, `drying_readings`, `drying_equipment`, `drying_visit_notes`. Normalized relational tables with FK cascades enable efficient time-series queries and data integrity. Job-wide reference point numbering (RP-1, RP-2, ...) matches field practice.
2. **API routes (`routes/dryingLogs.js`)** — REST endpoints for CRUD operations on drying data, mounted as a sub-router under apexJobs. Bulk PUT pattern for visit data (atmospheric, readings, equipment) allows atomic save of all readings in a single transaction. Server-side GPP calculation and dry-goal comparison on write.
3. **Frontend module (`frontend/js/dryingLog.js`)** — Renders the drying tab with a two-column layout: structure tree (chambers/rooms/points) on the left, visit timeline/detail on the right. Follows existing vanilla JS module pattern, integrates with `jobDetailTabs.js` dispatcher and `jobDetailModals` infrastructure for forms. Client-side GPP calculation for live preview, aggressive auto-save per reading.

### Critical Pitfalls

1. **Storing drying data as JSON blobs** — The existing `apex_job_phases` table has a `drying_logs TEXT DEFAULT '[]'` column. DO NOT use it. Time-series data with nested hierarchies (visit > room > reading) must be normalized tables to support trend queries, prevent concurrent edit collisions, and maintain referential integrity. Recovery cost: HIGH (requires full data migration and API rewrite).

2. **No auto-save for field data entry** — Field technicians entering 30+ readings on mobile in hostile conditions (crawl spaces, unreliable connectivity) will lose data without per-cell auto-save. Implement debounced PATCH per reading (500ms), localStorage draft backup, and optimistic UI with save status indicators. A single "Save Visit" button at the bottom is a data loss time bomb. Address in Phase 2 (Frontend Core).

3. **GPP calculation formula errors** — Multiple GPP formulas exist; using the wrong one or making unit conversion errors produces values that don't match industry-standard tools (Dri-Eaz, IICRC S500 charts), eroding trust. Use ASHRAE-standard Magnus formula, validate against 10+ known Temp/RH/GPP reference pairs, preserve floating-point precision, round only for display. Address in Phase 2 (Frontend Core).

4. **Sequential reference point numbering breaks** — Reference points are numbered sequentially across all rooms (RP-1 through RP-N). Storing `ref_point_number` as data couples presentation to storage; adding/removing rooms breaks numbering. Store `sort_order` on rooms and points, derive sequential numbers at render time. Address in Phase 1 (Schema Design).

5. **Mobile photo capture crashes** — High-resolution camera photos (12 MP, 5+ MB) exhaust browser memory when held as Blobs. Client-side resize with Canvas API (max 1920px) before upload reduces to ~200KB. Server-side sharp generates thumbnails and normalizes EXIF orientation. Fix `api.request()` to not set `Content-Type: application/json` when body is FormData. Address in Phase 3 (Photo Integration) with Phase 1 API infrastructure fix.

6. **Equipment auto-population creates phantom equipment** — Naively copying equipment from the prior visit re-adds equipment that was removed. Track equipment at the phase level with `date_placed` and `date_removed`; filter by visit date when rendering. Address in Phase 1 (Schema Design).

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Schema, Database Layer, and API Routes
**Rationale:** The database schema is the foundation; wrong choices here require full rewrites. All normalized tables with proper FKs, cascades, and indexes must be in place before any UI. API routes tested independently (curl/Postman) before frontend development ensures the data model works.

**Delivers:**
- All `drying_*` tables in `apexSchema.js` with migrations
- Full DB layer in `db/dryingLogs.js` with prepared statements, CRUD functions, GPP calculation, bulk save transactions
- Complete API routes in `routes/dryingLogs.js` mounted under `/api/apex-jobs/:jobId/drying/*`
- Extended `api.js` client methods for all drying endpoints
- Fix: `api.request()` Content-Type handling for FormData uploads

**Addresses:**
- Normalized tables (avoids Pitfall 1: JSON blob schema)
- Job-wide reference point numbering via `next_ref_number` (avoids Pitfall 4)
- Equipment date-based tracking (avoids Pitfall 6)
- Bulk PUT endpoints for visit data (pattern for Phase 4)

**Avoids:**
- JSON blob technical debt (Pitfall 1)
- Equipment phantom data (Pitfall 6)
- API/DB coupling issues that require rewrite

**Research flag:** Standard patterns. Existing codebase (`apexJobs.js`, `apexSchema.js`, `db/apexJobs.js`) provides reference patterns. No additional research needed.

### Phase 2: Structure Management UI (Chambers, Rooms, Reference Points)
**Rationale:** Cannot record readings without rooms and reference points. This is the tree view that defines the drying log structure. Must work before visits are meaningful.

**Delivers:**
- `dryingLog.js` module skeleton with entry point (`renderTab()`)
- Structure panel (left side): chamber/room/point tree view with expand/collapse
- CRUD modals for chambers, rooms, reference points using `jobDetailModals` infrastructure
- Baseline management UI (set dry standard per material type)
- Equipment inventory management (add/remove equipment from job)
- Tab integration with `jobDetailTabs.js` dispatcher

**Implements:**
- Frontend component structure from ARCHITECTURE.md
- Existing modal pattern from `jobDetailModals.js`
- Chamber color-coding and visual grouping

**Addresses:**
- Room/chamber setup with materials (table stakes feature)
- Reference point creation with auto-numbering
- Dry standard establishment (table stakes feature)

**Research flag:** Standard patterns. Follows existing tab rendering and modal patterns from `jobDetailTabs.js`, `jobDetailModals.js`. No additional research needed.

### Phase 3: Visit Recording UI (Core Workflow)
**Rationale:** This is the core value — daily data entry by field technicians. Includes atmospheric readings, moisture readings, equipment status, notes. Largest UI phase. Requires Phase 2 (structure must exist) to have reference points to read.

**Delivers:**
- Visit timeline/list (right side of drying tab)
- "Add Visit" modal/form with:
  - Atmospheric readings per chamber (temp, RH) with client-side GPP calculation and live preview
  - Moisture readings grid (all reference points, current value, prior value, delta, meets-target indicator)
  - Equipment status checkboxes (auto-populated from inventory, mark running/stopped/removed)
  - Visit notes with photo attachment support
- Per-cell auto-save with debounce (500ms), optimistic UI, save status indicators
- localStorage draft backup keyed by visit ID
- Tab-to-next-cell navigation for fast mobile data entry
- Color-coded readings (green = meets dry goal, yellow = close, red = not dry)
- GPP live calculation as technician types temp/RH
- Visit detail view (read-only historical visits, edit mode for current visit)

**Uses:**
- sharp (server-side photo processing)
- Canvas API (client-side photo compression before upload)
- Psychrometric formula (client-side GPP calculation)
- Bulk PUT endpoints from Phase 1

**Addresses:**
- Daily moisture readings per reference point (table stakes)
- Atmospheric readings with auto-calculated GPP (table stakes)
- Photo documentation (table stakes)
- Visit notes (table stakes)
- Equipment tracking per room (table stakes)
- Drying completion detection (meets-target calculation)

**Avoids:**
- Data loss on mobile (Pitfall 2: auto-save + localStorage)
- GPP formula errors (Pitfall 3: validated formula, live preview)
- Mobile photo crashes (Pitfall 5: Canvas resize, sharp thumbnails)

**Research flag:** Needs validation. Mobile auto-save pattern, per-cell debounce, and offline draft backup are critical for field reliability. Consider `/gsd:research-phase` if implementation team lacks mobile-first field data entry experience. GPP formula must be validated against IICRC S500 reference table (10+ Temp/RH/GPP pairs) before shipping.

### Phase 4: Progress, Analysis, and PDF Reports
**Rationale:** The data entry workflow (Phase 3) delivers immediate field value. This phase adds the deliverables for insurance documentation and management visibility. PDF report generation is table stakes (required for payment), but can be built last because it consumes all prior data.

**Delivers:**
- Progress bar/summary at top of drying tab (X of Y reference points at target, days active, status)
- Trend visualization (moisture charts per reference point, atmospheric charts per chamber)
- Grain depression and differential display on atmospheric readings
- Smart drying anomaly alerts (plateau detection, grain depression thresholds)
- PDF report generation (full drying report with all readings, equipment, photos, GPP calculations)
- Report variants (summary report, equipment-only report) deferred to v2 unless needed for launch

**Addresses:**
- PDF report generation (table stakes)
- Trend visualization (differentiator)
- Auto-calculated grain depression/differential (differentiator)
- Smart anomaly alerts (differentiator)
- Material demolition tracking (table stakes, integrated into progress calc)

**Research flag:** PDF generation needs research. Evaluate PDF libraries (PDFKit, jsPDF, Puppeteer headless Chrome). Consider `/gsd:research-phase` to compare options and establish report layout. Trend visualization (Chart.js vs canvas-based custom) also needs library decision if not using a standard.

### Phase 5: Polish and Field Validation
**Rationale:** After core functionality is complete (Phases 1-4), field testing with real technicians on actual jobs will reveal UX friction and edge cases. This phase is iterative refinement based on real-world usage.

**Delivers:**
- Bulk reading entry UX optimization (swipe/shortcuts based on field feedback)
- Template drying setups (common room/material patterns, once patterns emerge)
- Mobile keyboard optimization (inputmode attributes, touch target sizes)
- Performance optimization (targeted DOM updates, debounced re-renders)
- Edge case handling (concurrent edits, offline resilience, data recovery)
- Accessibility improvements (ARIA labels, keyboard navigation)

**Research flag:** No research needed. This is iterative refinement based on user feedback. Defer to post-launch unless critical issues surface during Phase 3/4 development.

### Phase Ordering Rationale

- **Schema first (Phase 1)** — Database schema errors require full rewrites. Get this right before any UI.
- **Structure before visits (Phase 2 before 3)** — Cannot record readings without rooms and reference points defined.
- **Reports last (Phase 4)** — PDF generation consumes all prior data; build it after data capture is stable.
- **Defer offline-first to v2** — Complex architectural investment (service worker, IndexedDB, conflict resolution) not justified until online workflow is validated. localStorage draft backup (Phase 3) provides basic resilience.
- **Defer Bluetooth integration to v2** — Hardware-specific, Web BLE reliability issues, narrow use case. Optimize manual entry UX instead (Phase 3/5).
- **Defer equipment sizing calculator to v2** — Useful but not critical. Technicians already know equipment requirements from experience.

**Dependency chain:**
```
Phase 1 (Schema/API)
    └─> Phase 2 (Structure UI)
            └─> Phase 3 (Visit Recording UI)
                    └─> Phase 4 (Reports/Analysis)
                            └─> Phase 5 (Polish)
```

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 3 (Visit Recording UI)** — Mobile auto-save pattern and field data entry UX are critical for success. If team lacks experience with aggressive auto-save, localStorage drafts, and optimistic UI on unreliable connections, run `/gsd:research-phase` to establish patterns before implementation.
- **Phase 4 (PDF Reports)** — PDF library selection (PDFKit vs jsPDF vs Puppeteer) needs evaluation. Report layout must meet insurance adjuster expectations (IICRC S500 format, professional appearance). Run `/gsd:research-phase` to compare libraries and prototype report structure.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Schema/API)** — Existing codebase provides clear patterns (`apexSchema.js` table creation, `apexJobs.js` route structure, `db/apexJobs.js` prepared statements). High confidence.
- **Phase 2 (Structure UI)** — Existing tab and modal patterns (`jobDetailTabs.js`, `jobDetailModals.js`) apply directly. High confidence.
- **Phase 5 (Polish)** — Iterative refinement based on user feedback. No upfront research needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing stack (Express + SQLite + vanilla JS) is proven for this use case. sharp is the standard Node image library. GPP formula verified against IICRC reference data. Client-side Canvas API and HTML capture attribute are battle-tested mobile patterns. |
| Features | MEDIUM | Based on competitor product pages and IICRC S500 standard references. No direct access to Encircle/MICA demos or API docs; some features inferred from marketing materials. MVP feature set (table stakes) is well-defined. Differentiators (trend viz, alerts) need validation with actual users. |
| Architecture | HIGH | Internal codebase analysis provides clear patterns. Normalized table design matches time-series best practices. API route structure follows existing Apex patterns. Frontend module pattern is consistent with entire codebase. Build order dependencies are clear. |
| Pitfalls | HIGH | Codebase analysis reveals JSON blob pattern used elsewhere (risk of extending it incorrectly). Mobile data entry and photo capture pitfalls are well-documented with known solutions. GPP formula errors are preventable with validation. All pitfalls have clear prevention strategies. |

**Overall confidence:** HIGH

The existing codebase provides strong architectural patterns, the technology stack is proven for this domain, and the critical pitfalls are avoidable with careful schema design and field-optimized UX. The main uncertainty is feature prioritization (MEDIUM confidence) — which differentiators deliver the most value can only be validated with real users on real jobs. The recommended approach is to build the MVP (Phases 1-4) quickly and iterate based on field feedback (Phase 5).

### Gaps to Address

- **GPP formula validation** — The IAPWS/Magnus formula is documented, but must be validated against 10+ IICRC S500 psychrometric reference pairs during Phase 2 implementation. Build an automated test suite that compares calculated GPP to reference values; acceptable tolerance is +/- 1 GPP.

- **PDF report layout** — Research identified that reports must meet insurance adjuster expectations, but exact layout requirements are not documented. During Phase 4 planning, obtain sample drying reports from competitors (Encircle, MICA) or industry examples to ensure the generated PDF matches professional standards. Consider user research with adjusters if available.

- **Mobile field testing environment** — The feature is designed for mobile use in the field (crawl spaces, attics, job sites with poor connectivity). Standard desktop testing will not catch mobile-specific issues (touch targets, keyboard types, photo orientation, offline resilience). Establish a mobile testing protocol during Phase 3: test on actual iOS/Android devices, simulate poor connectivity (throttled network, airplane mode), and test in realistic field conditions before launch.

- **Competitor feature gaps** — Feature research is based on public product pages and marketing materials. Actual hands-on competitor analysis (Encircle Hydro demo, MICA trial) would reveal UX patterns and edge case handling that inform Phase 3 UX design. Consider a 1-week competitor trial during Phase 2 if budget allows.

- **Equipment sizing formulas** — IICRC S500 publishes equipment sizing formulas (air movers per linear footage, dehumidifiers per cubic footage). These are deferred to v2 but would be valuable differentiators. If client requests equipment sizing calculator during roadmap refinement, run `/gsd:research-phase` to extract IICRC formulas and build calculator logic.

## Sources

### Primary (HIGH confidence)
- **Internal codebase analysis** — `apexSchema.js`, `apexJobs.js`, `jobDetailTabs.js`, `jobDetailModals.js`, `uploads.js`, `api.js` (existing patterns for schema, routes, UI, modals, uploads)
- **IICRC S500 Standard** — Documentation requirements, dry standard methodology, 4-point atmospheric readings (industry standard for structural drying)
- **sharp npm documentation** — Node 20 compatibility, multer integration patterns, EXIF orientation handling
- **MDN Web Docs** — HTML capture attribute, Canvas API toBlob, FormData multipart uploads
- **Psychrometric formula references** — IAPWS formula constants verified across Calculator Hub, Pressure Calculator, and existing project reference at `.claude/skills/drying-report/references/psychrometric-formulas.md`

### Secondary (MEDIUM confidence)
- **Encircle Hydro product pages** — Feature set, report types, BLE meter integration, equipment calculator (marketing materials, not API docs)
- **MICA/Mitigate product pages** — Competitor features, carrier-specific formats, Dri-Eaz Command Hub integration
- **DryTrack, RocketDry, magicplan** — Alternative restoration documentation tools for competitive feature analysis
- **Industry articles** — R&R Magazine, C&R Magazine (drying chamber best practices, S500 field application, dry standard criteria)
- **better-sqlite3 performance docs** — WAL mode, transaction patterns, bulk insert optimization

### Tertiary (LOW confidence)
- **Competitor pricing/reviews** — Capterra, GetApp (per-user costs, user complaints about MICA field UX)
- **BLE integration feasibility** — PR announcements for Encircle+Tramex, MICA+Dri-Eaz (confirms integration exists, but no technical details on Web BLE reliability or SDK access)

---
*Research completed: 2026-02-11*
*Ready for roadmap: yes*
