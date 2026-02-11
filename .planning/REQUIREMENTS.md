# Requirements: Apex Drying Logs

**Defined:** 2026-02-11
**Core Value:** Field technicians can efficiently log daily drying progress on any device, producing a complete and defensible record for insurance companies.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Database & Infrastructure

- [ ] **DB-01**: Normalized SQLite tables for drying data (logs, chambers, rooms, reference points, visits, readings, atmospheric, equipment, notes) with proper foreign keys and cascades
- [ ] **DB-02**: API routes mounted under `/api/apex-jobs/:jobId/drying/*` with full CRUD operations and bulk save endpoints
- [ ] **DB-03**: Fix `api.request()` Content-Type handling to support FormData for photo uploads
- [ ] **DB-04**: Frontend `api.js` extended with drying endpoint methods for all CRUD operations
- [ ] **DB-05**: Server-side GPP calculation and dry-goal comparison on write (authoritative values stored in DB)
- [ ] **DB-06**: Photo upload handling with server-side image processing (sharp) for compression and EXIF normalization

### Drying Log Setup

- [ ] **SETUP-01**: "Create Drying Logs" action initializes a drying log for an Apex job
- [ ] **SETUP-02**: Rooms pre-populated from job's Affected Rooms field as a convenience (editable, deletable, addable — tech has full control)
- [ ] **SETUP-03**: Named drying chambers with color assignment for visual grouping
- [ ] **SETUP-04**: Rooms assigned to chambers with chamber color applied to room tabs
- [ ] **SETUP-05**: Reference points per room with material type selection (D, SF, FRM, CW, TK, I, PNL, C, TL, WF, CJST, FJST)
- [ ] **SETUP-06**: Sequential reference point numbering across entire job (not per-room)
- [ ] **SETUP-07**: Baseline moisture reading per material type entered once, applied job-wide to all reference points of that type
- [ ] **SETUP-08**: Dehumidifiers added per chamber with auto-naming (Dehu 1, Dehu 2, etc.)
- [ ] **SETUP-09**: Room-level equipment added (AM, NAFAN, specialty equipment) with quantities

### Visit Recording

- [ ] **VISIT-01**: "Add Visit" button opens modal with automatic date/time timestamp
- [ ] **VISIT-02**: Per-chamber atmospheric readings: chamber intake (Temp °F, RH %) with auto-calculated GPP
- [ ] **VISIT-03**: Per-dehu exhaust readings: one line per dehumidifier in each chamber (Temp °F, RH %) with auto-calculated GPP
- [ ] **VISIT-04**: Job-level atmospheric readings entered once per visit: unaffected area and outside weather (Temp °F, RH %) with auto-calculated GPP
- [ ] **VISIT-05**: Grain depression auto-calculated per dehu (chamber intake GPP minus dehu exhaust GPP)
- [ ] **VISIT-06**: Prior day readings displayed alongside today's entry fields for both atmospheric and reference point readings
- [ ] **VISIT-07**: Day-over-day GPP change indicator displayed for all atmospheric readings
- [ ] **VISIT-08**: Moisture reading entry per reference point with prior day value and drying progress delta
- [ ] **VISIT-09**: Reading cell background turns green when reading is within 4 percentage points of material baseline
- [ ] **VISIT-10**: Room equipment auto-populated from prior visit values, editable for additions/removals
- [ ] **VISIT-11**: Free-text visit notes field with photo attachments via camera capture or gallery selection
- [ ] **VISIT-12**: Save Visit button greyed out until all atmospheric readings and all active reference point readings are entered
- [ ] **VISIT-13**: Ability to add new rooms, chambers, reference points, and equipment at any time during any visit
- [ ] **VISIT-14**: Color-coded room tabs grouped by chamber in the Add Visit modal

### Demolition

- [ ] **DEMO-01**: Demo button on each reference point marks material as demolished with current visit date
- [ ] **DEMO-02**: Demo prompts technician "Add a new reference point?" (yes/no)
- [ ] **DEMO-03**: Demo'd reference points no longer require readings on future visits
- [ ] **DEMO-04**: Demo'd reference points appear visually distinct (greyed out/struck through) with "Demolished on [date]"
- [ ] **DEMO-05**: Clicking Demo counts as reference point being "updated" for Save Visit validation

### Drying Completion

- [ ] **COMP-01**: "Drying Complete" button visible but greyed out on every visit
- [ ] **COMP-02**: Button unlocks when all active reference points have readings within 4 percentage points of their material baseline
- [ ] **COMP-03**: Button unlocks when all demolished reference points are properly marked
- [ ] **COMP-04**: Button unlocks when all equipment has been removed from all rooms (quantity = 0)
- [ ] **COMP-05**: Clicking "Drying Complete" timestamps completion and marks the drying log as complete

### GPP Calculation

- [ ] **GPP-01**: Auto-calculate GPP from Temperature (°F) and Relative Humidity (%) using IAPWS psychrometric formula
- [ ] **GPP-02**: GPP displays in real-time as technician enters Temp and RH values
- [ ] **GPP-03**: GPP field is read-only (computed value, not user-editable)
- [ ] **GPP-04**: Default atmospheric pressure of 14.696 psia (sea level)
- [ ] **GPP-05**: GPP rounded to 1 decimal place (industry standard precision)

### Drying Logs Tab & History

- [ ] **TAB-01**: Drying Logs tab visible in Apex job detail view
- [ ] **TAB-02**: Visit history list displaying timestamp and visit number for each entry
- [ ] **TAB-03**: Past visits viewable in read-only detail view
- [ ] **TAB-04**: Past visits editable for corrections

## v2 Requirements (Future Additions)

Deferred to future releases. Tracked for future planning.

### Reporting & Export
- **RPT-01**: PDF report generation from drying log data for insurance companies
- **RPT-02**: CSV export of drying log data
- **RPT-03**: Photos included in printed reports alongside visit notes

### Enhanced Equipment
- **EQUIP-01**: Dehumidifier brands and models with PPD ratings
- **EQUIP-02**: PPD calculation from chamber volume
- **EQUIP-03**: Equipment sizing calculator (air movers per linear footage, dehus per cubic footage)

### Visualization & Analytics
- **VIZ-01**: Trend visualization (moisture charts per reference point, atmospheric charts per chamber)
- **VIZ-02**: Smart drying anomaly alerts (plateau detection, grain depression thresholds)
- **VIZ-03**: Progress summary dashboard (X of Y reference points at target, days active)

### Mobile & Connectivity
- **MOB-01**: Mobile-optimized layout refinement for phone/tablet field use
- **MOB-02**: Offline-first capability (Service Worker + IndexedDB + sync)
- **MOB-03**: Per-cell auto-save with debounce for unreliable connections

### Advanced Calculation
- **CALC-01**: Altitude-adjusted GPP calculation (custom atmospheric pressure input)

### Integrations & Automation
- **INT-01**: AI-powered features (analysis, recommendations, anomaly detection)
- **INT-02**: Bluetooth moisture meter integration (Tramex, Delmhorst)
- **INT-03**: Carrier-specific report formats for major insurance companies
- **INT-04**: Xactimate integration for estimate data
- **INT-05**: LiDAR floor plan scanning for room layout
- **INT-06**: Real-time multi-user editing for concurrent technicians on same job

## Out of Scope

No features are permanently excluded. All potential future additions are tracked in v2 Requirements above.

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DB-01 | Phase 1 | Pending |
| DB-02 | Phase 1 | Pending |
| DB-03 | Phase 1 | Pending |
| DB-04 | Phase 1 | Pending |
| DB-05 | Phase 1 | Pending |
| DB-06 | Phase 1 | Pending |
| SETUP-01 | Phase 2 | Pending |
| SETUP-02 | Phase 2 | Pending |
| SETUP-03 | Phase 2 | Pending |
| SETUP-04 | Phase 2 | Pending |
| SETUP-05 | Phase 2 | Pending |
| SETUP-06 | Phase 2 | Pending |
| SETUP-07 | Phase 2 | Pending |
| SETUP-08 | Phase 2 | Pending |
| SETUP-09 | Phase 2 | Pending |
| VISIT-01 | Phase 3 | Pending |
| VISIT-02 | Phase 3 | Pending |
| VISIT-03 | Phase 3 | Pending |
| VISIT-04 | Phase 3 | Pending |
| VISIT-05 | Phase 3 | Pending |
| VISIT-06 | Phase 3 | Pending |
| VISIT-07 | Phase 3 | Pending |
| VISIT-08 | Phase 3 | Pending |
| VISIT-09 | Phase 3 | Pending |
| VISIT-10 | Phase 3 | Pending |
| VISIT-11 | Phase 3 | Pending |
| VISIT-12 | Phase 3 | Pending |
| VISIT-13 | Phase 3 | Pending |
| VISIT-14 | Phase 3 | Pending |
| DEMO-01 | Phase 3 | Pending |
| DEMO-02 | Phase 3 | Pending |
| DEMO-03 | Phase 3 | Pending |
| DEMO-04 | Phase 3 | Pending |
| DEMO-05 | Phase 3 | Pending |
| COMP-01 | Phase 4 | Pending |
| COMP-02 | Phase 4 | Pending |
| COMP-03 | Phase 4 | Pending |
| COMP-04 | Phase 4 | Pending |
| COMP-05 | Phase 4 | Pending |
| GPP-01 | Phase 1 | Pending |
| GPP-02 | Phase 3 | Pending |
| GPP-03 | Phase 3 | Pending |
| GPP-04 | Phase 1 | Pending |
| GPP-05 | Phase 1 | Pending |
| TAB-01 | Phase 2 | Pending |
| TAB-02 | Phase 3 | Pending |
| TAB-03 | Phase 3 | Pending |
| TAB-04 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 44 total
- Mapped to phases: 44
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-11*
*Last updated: 2026-02-11 after initial definition*
