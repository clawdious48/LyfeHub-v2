# Roadmap: Apex Drying Logs

## Overview

This roadmap delivers the Apex Drying Logs feature in 8 phases, progressing from database foundation through complete field data entry workflow to drying completion. The structure follows the natural dependency chain of the domain: you need tables before APIs, APIs before UI, structure before readings, and readings before completion logic. Each phase delivers a coherent, verifiable capability that builds on the previous one, culminating in a technician being able to document an entire drying lifecycle from Day 1 setup through verified drying completion.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Schema & GPP Engine** - Database tables and server-side psychrometric calculation
- [ ] **Phase 2: API Routes & Client Layer** - REST endpoints, client API methods, photo upload infrastructure
- [ ] **Phase 3: Tab Shell & Log Initialization** - Drying Logs tab in job detail, create action, room pre-population
- [ ] **Phase 4: Structure Management** - Chambers, rooms, reference points, baselines, equipment setup
- [ ] **Phase 5: Atmospheric Readings & GPP Display** - Visit modal atmospheric section with live GPP and prior day comparison
- [ ] **Phase 6: Moisture Readings & Room Workflow** - Reference point readings, equipment tracking, save validation, room tabs
- [ ] **Phase 7: Demolition & Visit Notes** - Demo button workflow, notes with photo attachments
- [ ] **Phase 8: Visit History & Drying Completion** - Past visit viewing/editing, completion gating logic

## Phase Details

### Phase 1: Schema & GPP Engine
**Goal**: A normalized, migration-safe database foundation exists for all drying log data, and GPP values are calculated accurately on the server
**Depends on**: Nothing (first phase)
**Requirements**: DB-01, DB-05, GPP-01, GPP-04, GPP-05
**Success Criteria** (what must be TRUE):
  1. All drying tables (logs, chambers, rooms, reference points, visits, atmospheric readings, moisture readings, equipment, visit notes) exist in SQLite with proper foreign keys and cascade deletes
  2. Inserting a temperature and relative humidity value into an atmospheric reading produces a correct GPP value (validated against 10+ IICRC reference pairs within +/- 1 GPP tolerance)
  3. GPP calculation uses sea level atmospheric pressure (14.696 psia) by default and rounds to 1 decimal place
  4. Writing a moisture reading triggers server-side comparison against material baseline and stores whether the reading meets dry standard (within 4 percentage points)
  5. Schema migrations run safely on existing databases without data loss (try/catch ALTER TABLE pattern)
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md -- Drying log database schema and migrations
- [x] 01-02-PLAN.md -- GPP calculation engine and dry-standard comparison logic

### Phase 2: API Routes & Client Layer
**Goal**: The backend exposes complete REST endpoints for all drying data, and the frontend can call every endpoint including photo uploads
**Depends on**: Phase 1
**Requirements**: DB-02, DB-03, DB-04, DB-06
**Success Criteria** (what must be TRUE):
  1. All CRUD endpoints exist under `/api/apex-jobs/:jobId/drying/*` and return correct JSON responses (testable via curl)
  2. Bulk save endpoints accept a full visit's worth of atmospheric + moisture + equipment data in a single transaction
  3. `api.request()` correctly handles FormData bodies (does not force Content-Type: application/json when body is FormData)
  4. Frontend `api.js` exposes methods for every drying endpoint (create log, CRUD chambers/rooms/points, save visit, upload photos)
  5. Photo uploads are processed server-side with sharp (resized, EXIF-normalized, thumbnails generated)
**Plans**: TBD

Plans:
- [ ] 02-01: Drying log REST API routes with bulk save
- [ ] 02-02: Client API layer and photo upload pipeline

### Phase 3: Tab Shell & Log Initialization
**Goal**: A technician can see the Drying Logs tab on any Apex job, create a new drying log, and see rooms pre-populated from the job's Affected Rooms field
**Depends on**: Phase 2
**Requirements**: TAB-01, SETUP-01, SETUP-02
**Success Criteria** (what must be TRUE):
  1. Drying Logs tab appears in the Apex job detail view tab bar alongside existing tabs (Phases, Notes, Estimates, etc.)
  2. When no drying log exists for a job, the tab shows a "Create Drying Logs" button
  3. Clicking "Create Drying Logs" initializes a drying log and pre-populates rooms from the job's Affected Rooms field
  4. Pre-populated rooms are editable, deletable, and the technician can add new rooms not in the original list
**Plans**: TBD

Plans:
- [ ] 03-01: Drying Logs tab integration with job detail view
- [ ] 03-02: Log initialization and room pre-population

### Phase 4: Structure Management
**Goal**: A technician can fully define the drying structure -- chambers with colors, rooms assigned to chambers, reference points with materials, baselines per material type, dehumidifiers per chamber, and equipment per room
**Depends on**: Phase 3
**Requirements**: SETUP-03, SETUP-04, SETUP-05, SETUP-06, SETUP-07, SETUP-08, SETUP-09
**Success Criteria** (what must be TRUE):
  1. Technician can create named chambers with color assignment, and the color visually distinguishes chamber groupings in the UI
  2. Technician can assign rooms to chambers, and each room belongs to exactly one chamber
  3. Technician can add reference points to rooms with material type selection, and reference points are numbered sequentially across the entire job (not per-room)
  4. Technician can enter a baseline moisture reading per material type once, and it applies to all reference points of that material type across all rooms
  5. Technician can add dehumidifiers to chambers (auto-named Dehu 1, Dehu 2, etc.) and equipment to rooms (AM, NAFAN, specialty) with quantities
**Plans**: TBD

Plans:
- [ ] 04-01: Chamber and room management UI
- [ ] 04-02: Reference points, baselines, and sequential numbering
- [ ] 04-03: Dehumidifier and room equipment management

### Phase 5: Atmospheric Readings & GPP Display
**Goal**: A technician can open the Add Visit modal, enter all atmospheric readings (per-chamber and job-level), see GPP calculated in real-time, and compare against prior day values with change indicators
**Depends on**: Phase 4
**Requirements**: VISIT-01, VISIT-02, VISIT-03, VISIT-04, VISIT-05, VISIT-06, VISIT-07, GPP-02, GPP-03
**Success Criteria** (what must be TRUE):
  1. "Add Visit" button opens a modal with automatic date/time timestamp
  2. Technician can enter Temp/RH for chamber intake and each dehumidifier's exhaust, and GPP displays in real-time as values are typed
  3. Technician can enter Temp/RH for unaffected area and outside weather (once per visit), with GPP auto-calculated
  4. Grain depression is auto-calculated per dehumidifier (chamber intake GPP minus dehu exhaust GPP) and displayed alongside exhaust readings
  5. Prior visit atmospheric readings appear alongside today's entry fields, with day-over-day GPP change indicators (arrows with delta values)
**Plans**: TBD

Plans:
- [ ] 05-01: Add Visit modal shell and atmospheric readings layout
- [ ] 05-02: Client-side GPP calculation with real-time display
- [ ] 05-03: Prior day comparison and change indicators

### Phase 6: Moisture Readings & Room Workflow
**Goal**: A technician can navigate color-coded room tabs, enter moisture readings for every reference point with prior day context, manage equipment per room, and the Save button enforces completeness
**Depends on**: Phase 5
**Requirements**: VISIT-08, VISIT-09, VISIT-10, VISIT-12, VISIT-13, VISIT-14
**Success Criteria** (what must be TRUE):
  1. Color-coded room tabs grouped by chamber appear in the Add Visit modal, and clicking a tab shows that room's reference points and equipment
  2. Each reference point row shows prior day reading, today's entry field, and drying progress delta; cell background turns green when reading is within 4 points of material baseline
  3. Room equipment is auto-populated from the prior visit and editable (technician can change quantities, add new equipment, or set to 0 for removed)
  4. Save Visit button remains greyed out until all atmospheric readings and all active reference point readings are entered
  5. Technician can add new rooms, chambers, reference points, and equipment at any time during any visit without losing entered data
**Plans**: TBD

Plans:
- [ ] 06-01: Room tabs with chamber color coding
- [ ] 06-02: Moisture readings grid with dry-standard indicators
- [ ] 06-03: Equipment auto-population and Save Visit validation

### Phase 7: Demolition & Visit Notes
**Goal**: A technician can demolish reference points with proper tracking, add visit notes with photo attachments, and demolished points are handled correctly in all workflows
**Depends on**: Phase 6
**Requirements**: DEMO-01, DEMO-02, DEMO-03, DEMO-04, DEMO-05, VISIT-11
**Success Criteria** (what must be TRUE):
  1. Clicking Demo on a reference point marks it as demolished with the current visit date, and prompts "Add a new reference point?" (yes creates a new RP, no continues)
  2. Demolished reference points appear visually distinct (greyed out/struck through) with "Demolished on [date]" and no longer require readings on future visits
  3. Clicking Demo counts as the reference point being "updated" for Save Visit validation purposes
  4. Technician can add free-text visit notes with one or more photo attachments (camera capture or gallery selection)
  5. Notes and photos are saved with the visit and visible when reviewing past visits
**Plans**: TBD

Plans:
- [ ] 07-01: Demolition button workflow and tracking
- [ ] 07-02: Visit notes with photo attachments

### Phase 8: Visit History & Drying Completion
**Goal**: A technician can view the chronological visit history, review and edit past visits, and mark drying as complete when all conditions are met
**Depends on**: Phase 7
**Requirements**: TAB-02, TAB-03, TAB-04, COMP-01, COMP-02, COMP-03, COMP-04, COMP-05
**Success Criteria** (what must be TRUE):
  1. Visit history list shows timestamp and visit number for each entry in chronological order
  2. Clicking a past visit opens it in a read-only detail view showing all data that was entered
  3. Past visits can be switched to edit mode for corrections, and changes are saved correctly
  4. "Drying Complete" button is visible but greyed out on every visit, and unlocks only when all three conditions are met: all active RPs at dry standard, all demo'd RPs properly marked, all equipment removed from all rooms
  5. Clicking "Drying Complete" timestamps the completion, marks the drying log as complete, and prevents further visits without explicit reopening
**Plans**: TBD

Plans:
- [ ] 08-01: Visit history timeline and detail view
- [ ] 08-02: Past visit editing
- [ ] 08-03: Drying Complete gating and completion logic

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Schema & GPP Engine | 2/2 | ✓ Complete | 2026-02-11 |
| 2. API Routes & Client Layer | 0/2 | Not started | - |
| 3. Tab Shell & Log Initialization | 0/2 | Not started | - |
| 4. Structure Management | 0/3 | Not started | - |
| 5. Atmospheric Readings & GPP Display | 0/3 | Not started | - |
| 6. Moisture Readings & Room Workflow | 0/3 | Not started | - |
| 7. Demolition & Visit Notes | 0/2 | Not started | - |
| 8. Visit History & Drying Completion | 0/3 | Not started | - |

---
*Roadmap created: 2026-02-11*
*Last updated: 2026-02-11 — Phase 1 complete*
