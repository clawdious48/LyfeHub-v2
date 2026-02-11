# Phase 1: Schema & GPP Engine - Context

**Gathered:** 2026-02-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Normalized, migration-safe SQLite database schema for all drying log data (logs, chambers, rooms, reference points, visits, atmospheric readings, moisture readings, equipment, visit notes), plus a server-side GPP calculation engine using the IAPWS formula with sea level default pressure. No API routes, no UI — pure data layer and calculation logic.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
- Table naming conventions and column types (follow existing codebase patterns in `db/schema.js` and `db/apexSchema.js`)
- Foreign key structure and cascade delete strategy
- GPP formula implementation approach (IAPWS saturation pressure calculation)
- Prepared statement organization and transaction boundaries
- Migration safety pattern (try/catch ALTER TABLE, consistent with existing schema.js approach)
- Dry-standard comparison storage (boolean flag, threshold math)
- Edge case handling for GPP calculation (missing inputs, out-of-range values)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — follow existing codebase patterns and IICRC S500 standards. Success criteria from ROADMAP.md are definitive:
- IAPWS formula, sea level atmospheric pressure (14.696 psia), 1 decimal place rounding
- Validated against 10+ IICRC reference pairs within +/- 1 GPP tolerance
- Dry standard = within 4 percentage points of material baseline
- Migrations safe on existing databases

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-schema-gpp-engine*
*Context gathered: 2026-02-11*
