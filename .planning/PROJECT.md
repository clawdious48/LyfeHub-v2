# Apex Drying Logs

## What This Is

A structural drying documentation feature within the Apex job management module of LyfeHub v2. It gives field technicians a manual data entry workflow for recording the full drying lifecycle on water mitigation jobs — from initial equipment setup and chamber creation through daily moisture monitoring to verified drying completion. Every reading, equipment change, and field note is timestamped and organized for insurance-grade documentation.

## Core Value

Field technicians can efficiently log daily drying progress (moisture readings, atmospheric readings, equipment status, and notes with photos) on any device, producing a complete and defensible record for insurance companies.

## Requirements

### Validated

<!-- Existing Apex job infrastructure that this feature builds on -->

- ✓ Apex job management with kanban/list/card views — existing
- ✓ New Job modal with Loss Info section and Affected Rooms field — existing
- ✓ Job detail view with tab-based navigation — existing
- ✓ Role-based access control (management, office_coordinator, field_tech, etc.) — existing
- ✓ File upload infrastructure (multer, /data/uploads) — existing
- ✓ SQLite database with prepared statements and transactions — existing
- ✓ JWT cookie authentication for browser sessions — existing

### Active

<!-- Drying Logs feature — see .planning/DRYING-LOGS-VISION.md for full detail -->

- [ ] Drying Logs tab within Apex job detail view showing visit history
- [ ] Create Drying Logs initial setup flow (chambers, rooms, reference points, baselines, equipment)
- [ ] Rooms pre-populated from job's Affected Rooms field (editable, deletable — convenience only)
- [ ] Named drying chambers with color coding for visual grouping
- [ ] Reference points with material type selection and sequential numbering across entire job
- [ ] Baseline moisture readings per material type (entered once, applies job-wide)
- [ ] Add Visit modal with timestamped daily data entry
- [ ] Atmospheric readings: chamber intake + dehu exhaust (per chamber), unaffected + outside (per visit)
- [ ] One exhaust reading line per dehumidifier in each chamber (Dehu 1, Dehu 2, etc.)
- [ ] GPP auto-calculation from Temp/RH using IAPWS psychrometric formula
- [ ] Grain depression auto-calculated per dehu (chamber intake GPP - dehu exhaust GPP)
- [ ] Prior day readings shown alongside today's entry fields (atmospheric and reference points)
- [ ] Day-over-day change indicators (GPP delta for atmospheric, moisture delta for reference points)
- [ ] Color-coded room tabs grouped by chamber in the Add Visit modal
- [ ] Equipment per room (AM, NAFAN, specialty) auto-populated from prior visit, editable
- [ ] Demo button on reference points (marks demolished, prompts for new RP, counts as updated)
- [ ] Visit notes with photo attachments (camera or gallery) for insurance documentation
- [ ] Save Visit greyed out until all atmospheric and reference point readings entered
- [ ] Drying Complete button greyed out until all RPs at dry standard or demo'd AND all equipment removed
- [ ] Flexibility to add rooms, chambers, reference points, equipment at any time during any visit
- [ ] Past visits viewable and editable for corrections

### Out of Scope

- PDF/CSV report generation — deferred until core data entry workflow is proven through to Drying Complete
- Dehumidifier brands/models with PPD ratings — future enhancement after basic workflow is established
- PPD calculation from chamber volume — deferred with dehu brands/models
- Altitude-adjusted GPP calculation — sea level default sufficient for initial build
- AI-powered features — explicitly excluded; this is manual data entry for field technicians
- Mobile-optimized layout — core functionality first, then optimize for phone/tablet

## Context

- LyfeHub v2 is an existing vanilla JS + Express + SQLite application with a neon glassmorphic dark-mode UI
- The Apex module already manages water damage restoration jobs with phases, notes, estimates, payments, labor, receipts, and contacts
- The existing "New Job" modal already collects Affected Rooms as comma-separated values in the Loss Info section
- File uploads are already supported via multer with storage at /data/uploads
- The drying-report Claude skill (.claude/skills/drying-report/) contains extensive domain reference material including GPP formulas, material codes, validation ranges, and CSV/PDF report templates
- IICRC S500 (2021, 5th Edition) is the governing industry standard; the 4-point tolerance rule is codified in Section 12.4.1.5
- Material codes (D, SF, FRM, etc.) are not industry-standardized — we define our own
- Full feature vision documented in .planning/DRYING-LOGS-VISION.md

## Constraints

- **Tech stack**: Must use existing stack — vanilla JS frontend, Express backend, SQLite via better-sqlite3. No frameworks, no TypeScript, no build step.
- **UI consistency**: Must follow existing neon glassmorphic dark-mode design system (CSS variables, blur effects, card patterns)
- **Auth**: All new API routes must use existing authMiddleware. Role-based access via requireRole().
- **Database**: New tables follow existing patterns — UUID primary keys, prepared statements, JSON-in-SQLite for complex fields, try/catch ALTER TABLE for migrations
- **Execution**: Must be executed using agent teams for parallel development
- **No AI**: Feature is purely manual data entry with auto-calculated GPP as the only "smart" behavior

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| IAPWS formula for GPP calculation | Scientifically sound, already documented in drying-report skill, within acceptable tolerance of Hyland-Wexler | — Pending |
| Sea level atmospheric pressure default (14.696 psia) | Sufficient for most restoration jobs; altitude adjustment deferred | — Pending |
| Sequential reference point numbering across entire job | Matches industry convention for drying logs — each RP has a unique number regardless of room | — Pending |
| Baselines per material type (not per reference point) | Single baseline entry applies to all RPs of that type — major usability win for field techs | — Pending |
| Dehu naming as "Dehu 1", "Dehu 2" | Simple placeholder; future enhancement will add brand/model/PPD | — Pending |
| Agent teams for execution | Parallel development across backend/frontend/database work for faster delivery | — Pending |

---
*Last updated: 2026-02-11 after initialization*
