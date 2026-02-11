# Drying Logs — Feature Vision

## Overview

Drying Logs is a new feature within the Apex job management module of LyfeHub v2. It provides field technicians with a structured, manual data entry workflow for documenting the entire structural drying lifecycle on water mitigation jobs — from initial equipment setup through daily monitoring to drying completion.

This feature exists to produce insurance-grade documentation. Every reading, every equipment change, every demolished material is logged with timestamps and organized in a way that tells the full story of how a structure was dried. No AI, no automation of readings — just a clean, efficient interface for technicians in the field to capture what's happening on site.

---

## User Roles

### Office Admin / Project Coordinator
- Creates the Apex job using the existing "New Job" modal
- Enters client information, insurance details, and property/loss info
- Populates the **"Affected Rooms"** field in the Loss Info section (comma-separated room names)
- These room names become the initial room list in Drying Logs

### Field Technician
- Creates the drying log structure (chambers, reference points, baselines, equipment)
- Performs daily site visits and enters all readings
- Makes on-site decisions: chamber layout, equipment placement, demolition calls
- Completes the drying log when all materials reach dry standard and equipment is removed

---

## Where It Lives

Drying Logs is a **tab within each Apex job's detail view**. When a technician opens a job and clicks the "Drying Logs" tab, they see:

1. **Visit History** — a chronological list of all logged visits
2. **"Create Drying Logs" button** — visible when no drying log has been initialized for this job
3. **"Add Visit" button** — visible after the initial drying log has been created

---

## Data Hierarchy

```
Job
├── Drying Log
│   ├── Chambers (named, color-coded)
│   │   ├── Rooms (assigned to chamber)
│   │   │   ├── Reference Points (numbered per room)
│   │   │   │   ├── Material Type (D, SF, FRM, etc.)
│   │   │   │   ├── Baseline (per material type, job-wide)
│   │   │   │   ├── Daily Readings (one per visit)
│   │   │   │   └── Demo Status (date demolished, if applicable)
│   │   │   └── Equipment (per room, per visit)
│   │   │       ├── Air Movers (AM) — quantity
│   │   │       ├── Dehumidifiers (DHM) — quantity (room-level count)
│   │   │       ├── Air Scrubbers / NAFAN — quantity
│   │   │       └── Other Specialty Equipment
│   │   └── Atmospheric Readings (per chamber, per visit)
│   │       ├── Chamber Intake (Temp, RH, GPP)
│   │       └── Dehumidifier Exhaust (one reading per dehu: Temp, RH, GPP)
│   │           ├── Dehu 1 (Temp, RH, GPP)
│   │           ├── Dehu 2 (Temp, RH, GPP)
│   │           └── ... (as many as placed in the chamber)
│   └── Job-Level Atmospheric Readings (per visit)
│       ├── Outside Affected Area / Unaffected (Temp, RH, GPP)
│       └── Outside Weather (Temp, RH, GPP)
└── Visits (timestamped entries containing all readings for that day)
```

### Key Relationships

- **Chambers contain Rooms.** A room belongs to exactly one chamber. Chambers are physical containment zones created with plastic, tension poles, tape, and zippers to limit air volume for dehumidification.
- **Dehumidifiers are chamber-level equipment.** They're justified based on the chamber's air volume (PPD calculation). Each dehumidifier in a chamber gets its own exhaust reading line.
- **Air movers, air scrubbers (NAFAN), and specialty equipment are room-level.** They go into specific rooms within a chamber.
- **Baselines are per material type, job-wide.** If you enter a baseline of 11% for Drywall (D), that baseline applies to every drywall reference point in every room for the entire job. Baselines are entered once.
- **Reference points are numbered sequentially across the entire job.** Numbers are assigned in the order reference points are created, spanning all rooms. If Room 1 gets 2 reference points (1, 2), Room 2 gets 2 (3, 4), and Room 3 gets 2 (5, 6). Simple numbers only — no prefixes like "RP1". When a new reference point is added to any room, it gets the next number after the highest existing reference point in the job.

---

## Material Types

Each reference point is assigned a material type. The following are the standard types, though the system should allow adding custom types:

### Wall & Ceiling Systems
| Material | Code |
|----------|------|
| Drywall / Sheetrock | D |
| Insulation | I |
| Paneling | PNL |

### Flooring Systems
| Material | Code |
|----------|------|
| Carpet | C |
| Tile | TL |
| Subfloor | SF |
| Hardwood Flooring | WF |

### Structural Components
| Material | Code |
|----------|------|
| Framing (Wood) | FRM |
| Joist (Ceiling) | CJST |
| Joist (Floor) | FJST |

### Cabinetry & Trim
| Material | Code |
|----------|------|
| Cabinetry | CW |
| Toe Kicks | TK |

### Baseline Values

Each material type has ONE baseline value for the entire job. The baseline is the moisture reading taken from **unaffected material of the same type** in the same structure. This is measured on-site by the technician.

When a technician enters a baseline for a material type (e.g., Drywall = 11%), it automatically applies to **all reference points of that material type across all rooms and all visits**. Baselines are entered once and do not change.

### Dry Standard Rule (IICRC S500, Section 12.4.1.5)

A reference point is considered **DRY** when its moisture reading is within **4 percentage points** of the baseline reading for that material type.

**Example:** Drywall baseline = 11%
- Reading of 15% or below = **DRY** (within 4 points)
- Reading of 16% or above = **NOT DRY** (more than 4 points above baseline)

---

## Workflow: Create Drying Logs (Initial Setup)

This is the **first-time setup** when a technician arrives on Day 1. It establishes the full structure that subsequent visits will use for data entry.

### Trigger
Technician opens the Drying Logs tab on a job and clicks **"Create Drying Logs"**.

### Step-by-Step Flow

**1. Rooms are pre-populated (as a convenience)**
- Room names from the job's "Affected Rooms" field (Loss Info section) are pre-loaded as a starting point
- These are purely a convenience — they may not reflect what the technician finds on-site
- Technician can **edit**, **delete**, or **ignore** any pre-populated room
- Technician can add entirely new rooms not in the original list
- The pre-populated list is a suggestion, not a requirement — the tech has full control over the final room list

**2. Create Chambers**
- Technician creates one or more named chambers (e.g., "Chamber A", "Kitchen Chamber", etc.)
- Each chamber is assigned a **color** (used for visual grouping in the UI)

**3. Assign Rooms to Chambers**
- Each room is assigned to a chamber
- A room belongs to exactly one chamber
- The room's tab in the visit modal will display in the chamber's color

**4. Add Dehumidifiers to Chambers**
- Technician specifies how many dehumidifiers are in each chamber
- Dehumidifiers are auto-named: "Dehu 1", "Dehu 2", etc.
- Each dehumidifier will get its own exhaust reading line in atmospheric readings
- *(Future enhancement: select specific dehu brands/models with PPD ratings)*

**5. Add Reference Points per Room**
- For each room, the technician adds numbered reference points
- Each reference point requires:
  - **Material Type** — selected from the list (D, SF, FRM, CW, TK, etc.)
  - This determines which baseline applies to this reference point

**6. Enter Baseline Readings**
- For each material type encountered on the job, the technician enters a baseline reading
- This is measured from unaffected material of the same type elsewhere in the structure
- **Entered once, applies everywhere** — all reference points of that material type across all rooms and visits use this baseline
- If a material type baseline has already been entered, it should show as pre-filled and editable

**7. Add Equipment per Room**
- For each room, the technician logs the initial equipment:
  - **Air Movers (AM)** — quantity
  - **Air Scrubbers / NAFAN** — quantity
  - **Other specialty equipment** — type and quantity
- *(Note: Dehumidifiers are logged at the chamber level, not room level)*

**8. Enter First Atmospheric Readings**
- **Per chamber:**
  - Chamber Intake: Temp (°F), RH (%) → GPP auto-calculated
  - Dehumidifier Exhaust (one line per dehu): Temp (°F), RH (%) → GPP auto-calculated
- **Per job (once):**
  - Outside Affected Area / Unaffected: Temp (°F), RH (%) → GPP auto-calculated
  - Outside Weather: Temp (°F), RH (%) → GPP auto-calculated

**9. Enter First Moisture Readings**
- For each reference point in each room, enter the moisture reading (percentage)
- This is the Day 1 reading that will be compared against the baseline going forward

**10. Save**
- All fields must be completed before saving
- Timestamp is automatically recorded (date and time)
- This creates the first entry in the Visit History

---

## Workflow: Add Visit (Daily Monitoring)

This is the streamlined daily workflow for subsequent visits after the initial setup.

### Trigger
Technician opens the Drying Logs tab and clicks **"Add Visit"**.

### What Happens

A **modal** opens with the following structure:

#### Top Section: Atmospheric Readings

**Job-Level Readings (entered once per visit):**
- Outside Affected Area / Unaffected: Temp (°F), RH (%) → GPP auto-calculated
- Outside Weather: Temp (°F), RH (%) → GPP auto-calculated

**Per-Chamber Readings:**
- For each chamber:
  - Chamber Intake: Temp (°F), RH (%) → GPP auto-calculated
  - Dehumidifier Exhaust lines (one per dehu in the chamber):
    - Dehu 1: Temp (°F), RH (%) → GPP auto-calculated
    - Dehu 2: Temp (°F), RH (%) → GPP auto-calculated
    - *(as many lines as there are dehumidifiers in the chamber)*
  - **Grain Depression** (auto-calculated per dehu): Chamber Intake GPP minus that dehu's Exhaust GPP. This measures how effectively each dehumidifier is removing moisture from the air. Higher grain depression = better dehu performance.

**Prior Day Comparison (all atmospheric readings):**
- Each atmospheric reading line shows **the prior visit's readings** alongside today's entry fields
- To the right of today's GPP, a **day-over-day GPP change** is displayed (e.g., ↓5.7 GPP or ↑2.3 GPP)
- This lets the technician instantly see whether atmospheric conditions are improving, stable, or worsening compared to the previous visit

**Layout per atmospheric reading line:**
```
                    | Prior Visit       | Today's Entry     | Change   |
Reading Label       | Temp | RH  | GPP  | Temp | RH  | GPP  | GPP Δ    |
────────────────────|──────|─────|──────|──────|─────|──────|──────────|
Chamber Intake      | 76   | 72  |114.4 | [  ] | [  ]| auto | ↓ 5.7   |
Dehu 1 Exhaust      | 89   | 33  | 79.3 | [  ] | [  ]| auto | ↓ 2.5   |
Grain Depression    |      |     | 35.1 |      |     | auto |          |
Unaffected          | 72   | 44  | 49.1 | [  ] | [  ]| auto | ↓ 1.1   |
Outside Weather     | 91   | 13  | 32.9 | [  ] | [  ]| auto | ↑ 3.2   |
```

#### Middle Section: Room Tabs

Below the atmospheric readings, a row of **tabs** appears — one for each affected room.

**Chamber color-coding:** Each tab displays in the color of the chamber that room belongs to. This provides an instant visual grouping so the technician knows which rooms share a drying chamber.

**Clicking a room tab shows:**

1. **Reference Points Table**
   - Lists all reference points for that room
   - Each row shows:
     - Reference point number (sequential across job, not per-room)
     - Material type code (D, SF, FRM, etc.)
     - **Prior day reading** (read-only, from previous visit — gives the tech context)
     - **Reading field** — where the technician enters today's moisture reading
     - **Drying progress** — auto-calculated difference between today's reading and the prior day's reading (e.g., ↓17 means the material lost 17 moisture points since last visit)
     - **Demo button** — marks this reference point as demolished
   - Baseline values are **not repeated per row** — they are set once per material type and the app uses them behind the scenes to determine when to turn cells green

   **Dry standard visual indicator:** When a reading is entered that is within 4 percentage points of that material's baseline, the **cell background turns green**. No separate "Dry?" column — the green cell is the indicator.

   **Layout per reference point row:**
   ```
   #  | Code | Prior Day | Today  | Progress | Actions |
   ───|──────|───────────|────────|──────────|─────────|
   1  | D    | 79        | [ 62 ] | ↓ 17     | [Demo]  |
   2  | D    | 92        | [ 85 ] | ↓ 7      | [Demo]  |
   7  | FRM  | 38        | [ 22 ] | ↓ 16     | [Demo]  |
   8  | D    | -         | -      | -        | Demo'd Day 3 |
   ```
   *(Note: reading cells turn green when within 4 points of baseline)*

2. **Equipment Section**
   - Shows equipment for this room
   - **Auto-populated from the previous visit's values**
   - Technician can edit quantities if equipment was added or removed
   - Equipment types: AM (Air Mover), NAFAN (Air Scrubber), and any specialty equipment
   - To show equipment as **removed**, set quantity to 0

3. **Add Reference Point** — button to add new reference points at any time
4. **Add Equipment** — button to add new equipment types

#### Demo Button Behavior

When a technician clicks the **"Demo"** button on a reference point:

1. The reference point is marked as **demolished** with the current visit's date
2. A prompt appears: **"Add a new reference point?"** (Yes / No)
   - **Yes:** Opens the new reference point form (e.g., framing exposed behind demolished drywall)
   - **No:** Continues without adding
3. The demolished reference point **no longer requires a reading** on future visits
4. Clicking Demo **counts as that reference point being "updated"** for Save validation purposes
5. On future visits, the demolished reference point should appear visually distinct (greyed out, struck through, or similar) with a "Demolished on [date]" indicator

#### Adding New Structures Mid-Job

At any point during a visit, the technician can:

- **Add a new room** (e.g., water migration discovered in adjacent room)
- **Add a new chamber** (e.g., separate containment needed for newly affected area)
- **Add reference points** to any room
- **Add equipment** to any room
- **Add dehumidifiers** to any chamber

The system should never prevent a technician from logging relevant information.

#### Visit Notes

At the bottom of the Add Visit modal (below the room tabs, above the Save button), there is a **free-text notes field** where the technician can document anything relevant to the drying effort for that visit.

**Purpose:** These notes provide critical context for insurance documentation. They explain anomalies, setbacks, or unusual conditions that affect drying timelines and justify equipment being on-site longer than expected.

**Examples of what gets logged here:**
- "Arrived on site — all equipment had been unplugged and moved to a different room by the homeowner. Materials still saturated. Repositioned equipment and restarted drying."
- "Discovered water migration into adjacent hallway. Set up additional containment and added equipment."
- "Homeowner opened containment zippers and left them open overnight. Chamber readings elevated. Re-sealed containment."
- "Power outage overnight per homeowner — equipment was off for approximately 8 hours."
- "Plumber completed leak repair today. Source of water intrusion resolved."

**Photo Attachments:**
- Each note can have one or more **photos attached** directly to it
- Technician can either:
  - **Take a photo** — opens the device camera to capture a photo on the spot
  - **Choose from gallery** — select existing photos from the device
- Photos are tied to the specific note/visit they were added on
- When the drying report is eventually generated, photos will be included alongside the notes they relate to — giving the insurance company visual evidence of documented events (e.g., a photo of equipment that was unplugged, water migration into a new area, demolished material, etc.)

**Behavior:**
- Optional field — not required for Save Visit validation (a visit may have nothing noteworthy)
- Notes and photos are saved with the visit and visible in the Visit History when reviewing past visits
- Notes should be timestamped with the visit they belong to

#### Save Visit

The **"Save Visit"** button is **greyed out / disabled** until:

- All atmospheric reading fields are filled (Temp and RH for every entry)
- All active reference points have a reading entered (or have been Demo'd on this visit)
- Equipment quantities are confirmed (auto-populated counts from prior visit satisfy this unless modified)

Once all validation passes, the button becomes active. Clicking it:

- Saves all readings with an automatic timestamp (date and time)
- Adds the visit to the Visit History
- Returns to the Drying Logs tab showing the updated history

#### Drying Complete

A **"Drying Complete"** button is **visible but greyed out** on every visit. It unlocks when **all three conditions** are met:

1. **All active reference points** have readings within 4 percentage points of their material baseline
2. **All demolished reference points** have been properly marked via the Demo button
3. **All equipment** has been removed from all rooms (quantity = 0 across all rooms for all equipment types)

When the technician clicks "Drying Complete":
- The drying log is marked as complete
- The completion is timestamped
- No further visits can be added (or a confirmation is required to reopen)
- This serves as the official record that the structure has been dried to standard

---

## GPP Auto-Calculation

Every atmospheric reading entry consists of two input fields: **Temperature (°F)** and **Relative Humidity (%)**. The app automatically calculates and displays the **GPP (Grains Per Pound)** value using the IAPWS psychrometric formula:

### Calculation Steps

1. **Convert to Rankine:** `T_R = T_F + 459.67`
2. **Saturation vapor pressure:** `ln(Pws) = -10440.397/T_R - 11.29465 - 0.027022355 * T_R + 0.00001289036 * T_R² - 0.0000000024780681 * T_R³ + 6.5459673 * ln(T_R)`
3. **Actual vapor pressure:** `Pw = (RH / 100) * Pws`
4. **Humidity ratio:** `W = 0.62198 * Pw / (P - Pw)` where P = 14.696 psia (sea level default)
5. **GPP:** `GPP = W * 7000` (rounded to 1 decimal place)

### Display Behavior

- GPP calculates and displays in real-time as the technician enters Temp and RH
- GPP field is **read-only** — it's a computed value, not user-editable
- If either Temp or RH is missing, GPP shows as empty/blank

### Validation

- Temperature: 32-120°F (valid range for indoor/outdoor restoration readings)
- Relative Humidity: 0-100%
- Values outside these ranges should show a warning but not block entry (field conditions can be unusual)

---

## Visit History

The Drying Logs tab displays a chronological list of all visits. Design should be sensible and iterable — the initial implementation should show at minimum:

- **Visit date and time** (timestamp)
- **Visit number** (Visit 1, Visit 2, etc.)
- **Summary indicators** — enough info at a glance to understand the state of drying at that visit
- **Clickable** — tapping a past visit opens it in a read-only view showing all the data that was entered
- **Editable** — technicians should be able to correct mistakes on past visits if needed

The exact layout and summary indicators will be refined through iteration based on user feedback.

---

## Integration with Existing Apex Job Structure

### Room Names from "New Job" Modal

The existing "New Job" modal has a Loss Info section with an "Affected Rooms" field. Currently, room names are entered as comma-separated values. These room names are used to **pre-populate the initial room list** when a technician creates the drying logs.

The field technician has full control over this list:
- Edit or rename any pre-populated room
- Delete rooms that aren't actually affected
- Add entirely new rooms not in the original list
- Start from scratch if the pre-populated list doesn't match field conditions
- The original "Affected Rooms" field in the job remains unchanged — it's just the seed data

### Drying Logs Tab

Drying Logs appears as a tab within the Apex job detail view, alongside existing tabs for job phases, notes, estimates, payments, labor, receipts, etc.

---

## Future Enhancements (Out of Scope for Initial Build)

These features are acknowledged but explicitly deferred:

| Feature | Reason for Deferral |
|---------|-------------------|
| **PDF/CSV Report Generation** | Build after core data entry workflow is proven and all data logging is confirmed working correctly through to "Drying Complete" |
| **Dehumidifier Brands & Models** | Build after basic workflow is established; will include PPD ratings per model |
| **PPD Calculation** | Tied to chamber volume and dehu model specs; deferred with dehu brands/models |
| **Altitude-Adjusted GPP** | Sea level default is sufficient for most jobs; can add altitude input later |
| **Grain Depression Display** | Auto-calculated difference between chamber intake GPP and dehu exhaust GPP; useful but not essential for initial build |
| **Drying Progress Indicators** | Visual trend arrows, progress bars, day-over-day comparisons; enhance after core is solid |
| **Mobile-Optimized Layout** | Core functionality first, then optimize the visit modal for phone/tablet use in the field |

---

## Design Principles

1. **Field-first** — This is used by technicians on job sites. Speed and simplicity of data entry matter more than visual richness.
2. **Insurance-grade documentation** — Every piece of data logged here may be submitted to an insurance company. Accuracy, completeness, and timestamps are non-negotiable.
3. **No AI** — This is a manual data entry tool. The only "smart" behavior is auto-calculating GPP from Temp/RH and auto-populating equipment from the prior visit.
4. **Never block the technician** — The system should always allow adding rooms, reference points, equipment, and chambers. Field conditions are unpredictable.
5. **Prove it works first** — Get the data entry workflow right before adding reporting, analytics, or visual enhancements.
