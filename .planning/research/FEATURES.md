# Feature Research

**Domain:** Structural drying documentation for water damage restoration
**Researched:** 2026-02-11
**Confidence:** MEDIUM — Based on competitor product pages, industry articles, and IICRC S500 standard references. No direct product demos or API documentation accessed; some features inferred from marketing materials.

## Feature Landscape

### Table Stakes (Users Expect These)

Features that any restoration technician or project manager would expect from drying documentation software. Missing these means the tool can't replace paper logs or existing software like Encircle Hydro, MICA/Mitigate, or DryTrack.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Daily moisture readings per reference point** | Core of drying documentation. IICRC S500 mandates at least daily MC measurements at consistent locations. Every competitor does this. | MEDIUM | Each reference point tracks material type, location description, and a time-series of readings across visits. Need to handle multiple material types per room (drywall, subfloor, baseboard, etc.). |
| **Atmospheric readings (4-point)** | IICRC S500 requires temp/RH at chamber intake, dehu exhaust, unaffected area, and outside. All serious tools capture these. | MEDIUM | Four reading locations per drying chamber per visit: chamber (affected area ambient), dehu exhaust/output, unaffected reference area, outside/exterior. Each captures temperature + relative humidity. |
| **Auto-calculated GPP (grains per pound)** | Restorers expect GPP auto-calculated from temp/RH — nobody wants to use a psychrometric chart manually. Encircle, MICA, DryTrack all do this. | LOW | Psychrometric formula converts temp + RH to GPP. Also derive grain depression (chamber GPP minus dehu exhaust GPP) and differential (affected vs unaffected GPP). Pure math — no external dependency. |
| **Dry standard / drying goal establishment** | IICRC S500 requires establishing target MC from unaffected similar materials. Adjusters will reject documentation without it. | LOW | Set per reference point or material type. Typically the MC of the same material in an unaffected area. Within-10% tolerance per S500. |
| **Drying completion detection** | Techs need to know when each material has reached dry standard. Encircle Hydro flags this with alerts. | LOW | Compare current MC reading to dry standard. Flag "dry" when reading is within tolerance (typically within 4 points or 10% of unaffected reference per S500). Should be per-reference-point. |
| **Equipment tracking per room/chamber** | Every competitor tracks equipment type, quantity, and placement. Required for billing justification and S500 compliance. | MEDIUM | Track equipment type (dehu, air mover, air scrubber, injectidry), quantity, serial numbers, placement location, hours/days on site. Equipment directly ties to billing. |
| **Room/chamber setup with material inventory** | Must define affected areas, rooms within drying chamber, and materials present. Foundation for all readings. | MEDIUM | Rooms contain reference points. Reference points have material type (drywall, carpet/pad, hardwood, concrete, etc.) and location description. This is the structural backbone of the entire drying log. |
| **Photo documentation per visit** | Time/date-stamped photos are expected for insurance proof. Encircle, Mitigate, and magicplan all emphasize this heavily. | LOW | Photos attached to visits with timestamps. Should support photos of meter readings, equipment placement, affected areas, and general job progress. |
| **Visit notes / daily log entries** | Every paper drying log has a notes section. Techs document what they did, what changed, decisions made. | LOW | Free-text per visit. Should capture observations, changes in scope, equipment adjustments, etc. |
| **PDF report generation** | Insurance adjusters require professional PDF documentation. Encircle offers 4 report types. This is non-negotiable for getting paid. | HIGH | Must include: job summary, room/chamber layout, moisture reading trends, atmospheric reading trends, equipment deployment summary, photos. See "Report Types" in notes below. |
| **Material demolition / removal tracking** | Materials get removed mid-job (wet drywall cut out, carpet pad pulled). Must stop tracking readings for removed materials and document the removal. | LOW | Mark reference point as "demolished" or "removed" with date. Stop requiring readings after removal. Document reason (contaminated, non-salvageable, etc.). |
| **Water damage classification** | IICRC S500 Category (1-3: clean to black water) and Class (1-4: extent of water absorption) are standard documentation requirements. | LOW | Set per job at intake. Category affects protocol. Class affects equipment sizing. Both appear on reports. |

#### Report Types (Detail for PDF generation)

Based on Encircle's model (industry-leading reports), the following report variants exist:
1. **Full Drying Report** — Complete dry log with all readings, moisture maps, equipment info, reading photos, notes. For detail-oriented adjusters.
2. **Summary Report** — Condensed: first and last readings, key photos, equipment summary. For fast approvals.
3. **Equipment Report** — Equipment-focused: what was deployed, where, for how long, energy usage. For justifying equipment billing.

MVP can start with one comprehensive report and add variants later.

### Differentiators (Competitive Advantage)

Features that would set this apart from competitors. Since this is an internal tool for a single company, "differentiator" means features that save the company time, reduce errors, or improve insurance outcomes beyond what their current workflow achieves.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Integrated job management** | Unlike standalone tools (Encircle, DryTrack), drying logs live inside the existing Apex job — no separate app, no data re-entry, no syncing between systems. Encircle/MICA are standalone products that don't integrate with small company job management. | LOW | The job already exists in the system. Drying log is a new tab/section on the existing job detail view. This is the core architectural advantage. |
| **Auto-calculated grain depression and differential** | Show grain depression (chamber GPP - dehu exhaust GPP) and GPP differential (affected - unaffected) automatically. Highlights dehumidifier performance and drying progress at a glance. Some tools show this; many paper logs don't. | LOW | Pure derived calculation from existing atmospheric readings. Display prominently on the daily reading summary. |
| **Trend visualization (moisture + atmospheric)** | Line charts showing MC readings over time per reference point, GPP trends, and grain depression trends. Makes drying progress visible at a glance. Better than Encircle's tabular-only views in some report modes. | MEDIUM | Chart.js or similar in the frontend. One chart per reference point (MC over visits) and one per chamber (GPP/temp/RH over visits). Huge value for quickly spotting stalls or issues. |
| **Equipment sizing calculator** | Auto-calculate recommended air movers and dehumidifiers based on IICRC S500 formulas (room dimensions, material class, water category). Encircle Hydro does this; MICA sort of does; paper logs definitely don't. | MEDIUM | IICRC publishes formulas: air movers based on linear footage of affected surfaces, dehumidifiers based on cubic footage and chart factors. Helps techs right-size equipment from day one. |
| **Smart alerts for drying anomalies** | Flag when readings plateau (no progress for 2+ visits), when grain depression drops below threshold, or when atmospheric conditions aren't conducive to drying. Encircle has basic alerts; this could be more specific. | MEDIUM | Rule-based alerts: MC not decreasing, GPP rising instead of falling, grain depression below expected range, chamber temp outside optimal range. Prevents "just running equipment" without progress. |
| **Bulk reading entry optimized for field speed** | Purpose-built UI for entering a day's readings quickly on mobile: swipe through reference points, tap to enter MC, auto-advance to next point. Current competitors are clunky here — MICA is notoriously slow in the field. | MEDIUM | The UX design matters more than the code complexity. Minimize taps per reading. Show previous reading as reference. Allow "same as yesterday" shortcuts for stable readings. |
| **Per-job cost tracking tied to equipment days** | Calculate equipment rental/usage costs per day based on equipment deployment tracking. Tie directly to job financials. No competitor in this space integrates drying documentation with internal cost tracking. | MEDIUM | Equipment catalog with daily cost rates. Multiply by days deployed per room. Roll up to job-level cost. Feed into existing Apex job financial tracking. |
| **Template drying setups** | Pre-configured room/material templates for common scenarios (standard residential bathroom, kitchen, basement). Reduces job setup time significantly. | LOW | JSON templates with pre-defined reference points and material types. "Bathroom flood" template pre-populates: floor tile, subfloor, baseboard, wall drywall (4 walls), vanity area. |

### Anti-Features (Deliberately NOT Building)

Features that seem valuable but would add complexity without proportional benefit for a single-company internal tool.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Bluetooth moisture meter integration** | Encircle integrates with Tramex Bluetooth meters for one-tap readings. Seems like a must-have. | Bluetooth Web APIs are unreliable, platform-specific, and require specific hardware (Tramex 5-series). Development cost is high for a single integration that may not match the company's actual meters. The Tramex SDK/API is not publicly documented. | Manual entry with photo-of-meter-reading support. Optimize the manual entry UX to be nearly as fast. Revisit if the company standardizes on Tramex 5-series meters and BLE Web API matures. |
| **Bluetooth dehumidifier integration (Dri-Eaz Command Hub)** | MICA integrates with Dri-Eaz Command Hub to pull temp/RH from dehumidifier Bluetooth directly. | Requires specific Dri-Eaz iSeries hardware. Bluetooth integration is complex (BLE pairing, device discovery, data parsing). Very narrow hardware dependency for a single company tool. | Manual atmospheric reading entry. The 4-point atmospheric reading workflow (chamber, dehu exhaust, unaffected, outside) is fast enough manually. |
| **LiDAR floor plan scanning** | Mitigate uses iOS LiDAR to auto-generate floor plans. Impressive demo feature. | Requires iOS devices with LiDAR (iPhone Pro / iPad Pro only). Significant development effort for 3D scanning integration. Floor plans aren't critical for an internal tool — the company already knows their job sites. | Simple room list with descriptive names. Optional sketch upload via photo. Floor plans are nice-to-have for reports but not critical for data capture. |
| **Insurance carrier-specific report formats** | MICA supports carrier-specific compliance rules and report formats. Some carriers mandate specific tools. | Single company, likely works with a manageable set of carriers. Building a carrier-format engine is massive scope. The few carriers that mandate MICA literally require MICA — you can't replace that with a custom tool. | Generate one clean, professional PDF report that meets IICRC S500 standards. This satisfies 90%+ of adjusters. For carriers that mandate MICA, use MICA for those specific jobs. |
| **Real-time multi-user collaborative editing** | Encircle supports multiple techs documenting simultaneously on the same job. | This is a single-company tool. Their jobs typically have 1-2 techs on site. Real-time sync (WebSocket/CRDT) is architecturally expensive for minimal benefit. | Sequential editing with simple refresh. If two techs need to work on the same job, one documents and the other assists. Lock-free optimistic concurrency is sufficient. |
| **Xactimate / estimating software integration** | Professional tools integrate with Xactimate for seamless estimate-to-documentation flow. | Xactimate API access is expensive and restricted. Integration scope is massive (mapping line items to drying documentation). Overkill for internal tool. | Export equipment days and room data in a format that makes manual Xactimate entry easy. CSV export of equipment summary is a reasonable compromise. |
| **Offline-first mobile app (native)** | Encircle works offline with full sync. Field connectivity is unreliable. | Building a native app or PWA with offline sync (IndexedDB + conflict resolution) is a major architectural investment. The existing app is a web app served from Docker. | Design the reading entry UI to be lightweight and fast-loading. Consider a simple "save draft locally" mechanism using localStorage as a safety net. Full offline-first is v2+ territory. |

## Feature Dependencies

```
[Room/Chamber Setup with Materials]
    |
    |--requires--> [Reference Points with Material Types]
    |                   |
    |                   |--enables--> [Daily Moisture Readings]
    |                   |                  |
    |                   |                  |--enables--> [Dry Standard Comparison]
    |                   |                  |                  |
    |                   |                  |                  |--enables--> [Drying Completion Detection]
    |                   |                  |
    |                   |                  |--enables--> [Trend Visualization (MC charts)]
    |                   |
    |                   |--enables--> [Material Demolition Tracking]
    |
    |--enables--> [Equipment Tracking per Room]
    |                   |
    |                   |--enables--> [Equipment Sizing Calculator]
    |                   |
    |                   |--enables--> [Per-Job Cost Tracking]
    |
    |--enables--> [Atmospheric Readings (4-point)]
                        |
                        |--enables--> [Auto-calculated GPP]
                        |                  |
                        |                  |--enables--> [Grain Depression / Differential]
                        |                  |
                        |                  |--enables--> [Trend Visualization (GPP charts)]
                        |
                        |--enables--> [Smart Drying Anomaly Alerts]

[Photo Documentation] --independent-- (attaches to visits, no dependencies)

[Visit Notes] --independent-- (attaches to visits, no dependencies)

[Water Damage Classification] --independent-- (set at job level, no dependencies)

[All of the above] --required-by--> [PDF Report Generation]
```

### Dependency Notes

- **Room/Chamber Setup is the foundation:** Everything flows from defining the drying chamber, its rooms, and the reference points within those rooms. This must be built first and designed carefully — changing the data model later breaks everything downstream.
- **Atmospheric readings and moisture readings are parallel tracks:** They share a visit/date concept but don't depend on each other directly. Can be built in either order.
- **PDF Report Generation depends on everything:** It consumes all data types (readings, equipment, photos, notes, classifications). Build it last, after all data capture features are stable.
- **GPP calculation is a pure derivation:** No storage needed beyond the temp/RH inputs. Can be calculated on read. Zero dependency risk.
- **Trend visualization enhances but doesn't block:** Charts can be added after readings are working. Don't let charting complexity delay the core data entry workflow.

## MVP Definition

### Launch With (v1)

Minimum viable drying log — what's needed to replace paper logs and capture compliant documentation for a single job.

- [ ] **Room/chamber setup with reference points and material types** — The structural foundation. Without this, nothing else works.
- [ ] **Daily moisture readings per reference point** — The core data. This is literally what a "drying log" is.
- [ ] **Atmospheric readings (4-point) with auto-calculated GPP** — Required for S500 compliance and insurance documentation. GPP calculation is trivial to add.
- [ ] **Dry standard establishment and completion detection** — Techs need to know when they're done. Adjusters need to see target vs. actual.
- [ ] **Equipment tracking per room** — Required for billing and S500 equipment justification.
- [ ] **Visit notes and photo documentation** — Low-cost, high-value documentation that rounds out each daily visit.
- [ ] **Water damage classification (Category + Class)** — Simple dropdown, set once per job. Required on every drying report.
- [ ] **Material demolition tracking** — Materials get removed mid-job. Must handle this or the log becomes inaccurate.
- [ ] **Basic PDF report (full drying report)** — The deliverable. Without a professional PDF, the documentation has no external value.

### Add After Validation (v1.x)

Features to add once the core drying log is working and being used on real jobs.

- [ ] **Trend visualization (MC + GPP charts)** — Add when techs/PMs say they want to see progress at a glance rather than scanning tables
- [ ] **Grain depression and differential display** — Add alongside trend visualization for atmospheric insight
- [ ] **Smart drying anomaly alerts** — Add when enough jobs have been documented to understand normal patterns
- [ ] **Equipment sizing calculator** — Add when the team asks for help right-sizing equipment at job setup
- [ ] **Summary and equipment-only report variants** — Add when adjusters request different report formats
- [ ] **Bulk reading entry optimization** — Refine the UX after watching real techs use the tool on actual jobs
- [ ] **Template drying setups** — Add after common patterns emerge from real job data

### Future Consideration (v2+)

Features to defer until the core tool has proven its value.

- [ ] **Offline-first capability** — Requires significant architectural investment (service worker, IndexedDB, sync engine). Defer until connectivity is proven to be a real blocker.
- [ ] **Bluetooth meter integration** — Defer until hardware standardization and Web BLE maturity make this viable.
- [ ] **Per-job cost tracking tied to equipment** — Defer until the financial tracking needs are better understood.
- [ ] **CSV/data export for Xactimate** — Defer until the team articulates exactly what data format they need.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Room/chamber setup with materials | HIGH | MEDIUM | P1 |
| Daily moisture readings | HIGH | MEDIUM | P1 |
| Atmospheric readings + GPP calc | HIGH | MEDIUM | P1 |
| Dry standard + completion detection | HIGH | LOW | P1 |
| Equipment tracking per room | HIGH | MEDIUM | P1 |
| Photo documentation | HIGH | LOW | P1 |
| Visit notes | MEDIUM | LOW | P1 |
| Water damage classification | MEDIUM | LOW | P1 |
| Material demolition tracking | MEDIUM | LOW | P1 |
| PDF report generation (full) | HIGH | HIGH | P1 |
| Trend visualization (charts) | HIGH | MEDIUM | P2 |
| Grain depression / differential | MEDIUM | LOW | P2 |
| Smart anomaly alerts | MEDIUM | MEDIUM | P2 |
| Equipment sizing calculator | MEDIUM | MEDIUM | P2 |
| Report variants (summary, equipment) | MEDIUM | MEDIUM | P2 |
| Bulk reading entry UX optimization | HIGH | MEDIUM | P2 |
| Template drying setups | MEDIUM | LOW | P2 |
| Per-job cost tracking | MEDIUM | MEDIUM | P3 |
| Offline capability | HIGH | HIGH | P3 |
| Bluetooth meter integration | MEDIUM | HIGH | P3 |
| CSV export for Xactimate | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for launch — the tool is unusable without these
- P2: Should have, add after core is validated on real jobs
- P3: Nice to have, future consideration based on proven need

## Competitor Feature Analysis

| Feature | Encircle Hydro | MICA / Mitigate | DryTrack | RocketDry | magicplan | Our Approach |
|---------|---------------|-----------------|----------|-----------|-----------|--------------|
| Moisture readings | Per-point with Tramex BLE | Per-point, manual + Dri-Eaz BLE | Per-point, guided workflow | Basic per-room | Per-point on floor plan | Per reference point, manual entry, photo-of-meter support |
| Atmospheric readings | 4-point with auto GPP | Flexible atmospheric logging | All atmospheric + dry standards | Basic temp/humidity | Not a focus | 4-point (chamber, dehu, unaffected, outside) with auto GPP |
| Equipment tracking | Calculator + placement map | Log with Dri-Eaz integration | Equipment reminders | Real-time tracking | Equipment objects on plan | Per-room tracking with type, quantity, serial, days on site |
| Drying completion | Alerts when readings meet standard | Compliance checking | Guided by S500 | Not detailed | Not a focus | Auto-detect per reference point within S500 tolerance |
| PDF reports | 4 report types (Full, Summary, Equipment, Carrier) | Carrier-specific formats | Basic moisture report | Basic report | Photo-annotated report | Single comprehensive report (v1), variants later |
| Moisture mapping | Interactive visual map | Visual map | Not prominent | Not detailed | Floor plan annotations | Not in v1 — room/reference point list with descriptions |
| Offline support | Full offline + sync | Limited | Not documented | Not documented | Full offline + sync | Not in v1 — localStorage draft safety net only |
| BLE meter integration | Tramex 5-series | Dri-Eaz Command Hub | No | No | Tramex | Not in v1 — manual entry optimized for speed |
| Floor plan creation | Manual sketch | LiDAR auto-scan (iOS) | No | No | LiDAR + manual | Not building — room list with descriptions sufficient |
| Job management integration | Standalone (no job mgmt) | Standalone (DASH is separate) | Integrated with DASH | Part of RocketPlan | Standalone | Fully integrated into existing Apex job — key advantage |
| Multi-user collab | Real-time multi-user | Single user at a time | Not documented | Not documented | Not documented | Sequential editing (single company, 1-2 techs per job) |
| Pricing | Per-user subscription | Per-user, carrier-mandated | Bundled with DASH | Bundled with RocketPlan | Per-user subscription | Internal tool — no per-user cost, no vendor lock-in |

### Key Competitive Insight

The single biggest advantage of building this internally is **integration with the existing Apex job management system**. Every commercial tool in this space is either standalone (Encircle, MICA) or part of a different job management platform (DryTrack/DASH, RocketDry/RocketPlan). For a company already running their jobs in LyfeHub's Apex module, having drying documentation live inside the same job record eliminates:
- Double data entry (job info, contacts, addresses)
- Context switching between apps
- Data synchronization issues
- Per-user licensing costs ($50-150/user/month for Encircle, MICA)

The trade-off is giving up BLE meter integration, LiDAR scanning, and the polish of purpose-built native apps. For a small to mid-size restoration company, this trade-off is worth it.

## Sources

- [Encircle Hydro — Water Damage Restoration](https://www.getencircle.com/water-damage-restoration) — Product feature page
- [Encircle Hydro Equipment Update](https://www.getencircle.com/blog/product-update-hydro-equipment) — Equipment calculator and moisture map features
- [Encircle Hydro vs MICA](https://www.getencircle.com/mica-vs-encircle-hydro) — Feature comparison
- [Encircle Report Types](https://www.getencircle.com/blog/which-moisture-report-is-right-for-you) — 4 report variants
- [3 Key Reports Every Restorer Needs](https://www.getencircle.com/blog/3-key-reports-every-restorer-needs) — Report contents and purposes
- [MICA Water Mitigation Software](https://www.nextgearsolutions.com/solutions/inspection-and-scoping/mica/) — MICA feature overview
- [CoreLogic Mitigate](https://www.nextgearsolutions.com/solutions/inspection-and-scoping/mitigate/) — Mitigate (MICA successor) features
- [Cotality Mitigate](https://www.cotality.com/products/restoration-mitigate) — Additional Mitigate details
- [DryTrack — R&R Magazine](https://www.randrmagonline.com/articles/86638-drytrack-helps-streamline-moisture-mitigation-management-process) — DryTrack feature overview
- [DASH Restoration Software](https://www.cotality.com/products/dash) — DASH platform overview
- [RocketDry](https://rocketplantech.com/rocketdry/) — RocketDry features
- [magicplan Water Mitigation](https://www.magicplan.app/water-mitigation) — magicplan restoration features
- [Dryout Logs](https://dryoutlogs.com/) — Dryout Logs features
- [MICA + Dri-Eaz Command Hub Integration](https://www.prnewswire.com/news-releases/mica-by-next-gear-solutions-now-integrated-with-dri-eaz-command-hub-301237919.html) — BLE dehumidifier integration details
- [Encircle + Tramex Integration](https://www.getencircle.com/blog/encircle-tramex-error-free-moisture-data) — BLE moisture meter integration
- [Drying Chamber Guide — Next Gear](https://www.nextgearsolutions.com/blog/best-practices/the-essential-guide-to-drying-chambers-in-water-damage-restoration/) — Drying chamber definition and setup
- [IICRC S500 Structural Drying in the Field](https://www.candrmagazine.com/structural-drying-in-the-field-bringing-chapter-12-of-the-s500-standard-to-life/) — S500 Chapter 12 documentation requirements
- [What is Acceptable Dry — R&R Magazine](https://www.randrmagonline.com/articles/89445-what-is-acceptable-dry) — Dry standard tolerance criteria
- [Setting Drying Targets — S500](https://www.accuserve.com/blog/setting-drying-targets-utilizing-the-new-s500) — Drying goal hierarchy
- [IICRC Approved Calculation Sheets](https://iicrc.org/approved-calculations-sheets/) — Official equipment sizing formulas
- [Docusketch Drying Log Guide](https://www.docusketch.com/post/water-damage-drying-log) — Drying log required fields and best practices
- [DASH Software Pricing — Capterra](https://www.capterra.com/p/149523/DASH/) — DASH reviews and features
- [Encircle Pricing — GetApp](https://www.getapp.com/healthcare-pharmaceuticals-software/a/encircle/) — Encircle reviews

---
*Feature research for: Structural drying documentation — water damage restoration*
*Researched: 2026-02-11*
