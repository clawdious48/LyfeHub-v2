# New Job Modal — Design Document

**Approved:** 2026-03-01

**Goal:** Rebuild the React "Create Job" modal to match the main branch's full 3-column layout with all sections, plus improvements to team assignment and contact management.

**Context:** The current React modal is a narrow single-column form with ~24 fields. The main branch has a wide 3-column layout with ~50+ fields, multi-contact support, team assignment, and referral tracking. This design ports the full layout and adds a polished CRM-integrated contact picker.

---

## Modal Chrome

- **Width:** Full-width, max ~1400px (`sm:max-w-6xl`)
- **Height:** max-h-[90vh], scrollable body
- **Header:** "New Job"
- **Footer:** "* Required field" hint (left), Cancel + Create Job buttons (right)
- **Responsive:** 3 cols > 1280px, 2 cols > 640px, 1 col mobile

## Required Fields

1. Client Name (non-empty)
2. Client Phone (non-empty)
3. At least 1 Job Type selected

Submit button disabled until all 3 requirements met. Button text changes to "Creating..." during submission.

---

## Row 0: Job Setup (full width)

**Section Header:** "Job Setup" with icon + "* Required" hint

- 6 toggle buttons (multi-select, not radio buttons)
- Selected state: purple background, purple border, subtle glow
- Options:
  1. **Mitigation** (MIT)
  2. **Reconstruction** (RPR)
  3. **Remodel** (RMD)
  4. **Abatement** (ABT)
  5. **Remediation** (REM)
  6. **Fire** (FR)

---

## Row 1: Three Columns (Client | Insurance | Property)

### Column 1: Client Info

**Section Header:** "Client Info" with icon

Fields (2-column internal grid):
- **Name** * — text, full width, placeholder "Full name"
- **Phone** * — tel, placeholder "(555) 555-5555"
- **Email** — email, placeholder "email@example.com"
- **Street** — text, full width, placeholder "Street address"
- **Unit #** — text, placeholder "Apt, Suite, etc."
- **City** — text
- **State** — select dropdown (AZ, CA, CO, NM, NV, TX, UT)
- **Zip** — text, maxlength 10
- **"+ Add Client"** button — adds additional contact rows (Name, Phone, Email) with red X remove button

### Column 2: Insurance Info

**Section Header:** "Insurance Info" with icon

Fields (2-column internal grid):
- **Carrier** — text, full width, placeholder "Insurance company"
- **Claim #** — text, placeholder "Claim number"
- **Policy #** — text, placeholder "Policy number"
- **Deductible** — number, step 0.01, min 0, placeholder "0.00"

**"ADJUSTER" divider** (small caps, border-top)

- **Adjuster Name** — text, full width, placeholder "Full name"
- **Adjuster Phone** — tel, placeholder "(555) 555-5555"
- **Adjuster Email** — email, placeholder "adjuster@email.com"
- **"+ Add Adjuster"** button — adds additional adjuster rows (Name, Phone, Email) with red X remove

### Column 3: Property Info

**Section Header:** "Property Info" with icon + **"Same" toggle button** (top-right)

"Same as Client" behavior:
- Copies client address fields to property
- Disables property address fields (visual: grayed out, purple tint)
- Syncs in real-time when client fields change

Fields (2-column internal grid):
- **Year Built** — text, placeholder "e.g. 1998", maxlength 4
- **Property Type** — select (Residential, Commercial, Multi-Family, Industrial), default "Residential"
- **Street** — text, full width (synced if Same active)
- **Unit #** — text (synced if Same active)
- **City** — text (synced if Same active)
- **State** — select (same options as client)
- **Zip** — text, maxlength 10 (synced if Same active)
- **Access Info** — text, full width, placeholder "Gate code, lockbox, etc."

**"SITE CONTACTS" divider** (small caps, border-top)

- **Name** — text, full width
- **Phone** — tel
- **Email** — email
- **Relation** — select (Property Owner, Tenant, Property Manager, Insurance Agent, Other)
- **"+ Add Site Contact"** button — adds additional contact groups

---

## Row 2: Loss Info (full width)

**Section Header:** "Loss Info" with icon

**Header toggles** (right side of header, inline checkboxes):
- Extraction Required
- Ongoing Intrusion
- Drywall Debris
- Content Manipulation
- Cyan accent when checked

Fields (4-column grid, responsive):
- **Source of Loss** — text, placeholder "e.g. Supply line break, roof leak..."
- **Date of Loss** — date input
- **Water Category** — select (Cat 1 - Clean Water, Cat 2 - Gray Water, Cat 3 - Black Water)
- **Damage Class** — select (Class 1 - Minimal, Class 2 - Significant, Class 3 - Extensive, Class 4 - Specialty)
- **Areas Affected** — text, span 2 cols, placeholder "Kitchen, basement, etc."
- **Hazards** — text, span 2 cols, placeholder "Asbestos, lead, etc."
- **Description** — textarea, full width, 2 rows, placeholder "Brief description of the loss..."

---

## Row 3: Team (full width header, 2 columns)

**Section Header:** "Team" with icon

### Left Column: Internal Members

Role-based employee pickers. Each picker is a searchable multi-select dropdown that shows org members filtered by eligible roles. Shows member name + current job count.

- **Mitigation PM** — eligible: management, project_manager
- **Reconstruction PM** — eligible: management, project_manager
- **Estimator** — eligible: management, estimator
- **Project Coordinator** — eligible: management, office_coordinator
- **Mitigation Techs** — eligible: management, field_tech (full width within column)

### Right Column: External Members

CRM-powered contact assignment.

**Search bar** — searches `apex_crm_contacts` by name, phone, email. Shows results as a dropdown with name, organization, phone.

**"+ Create Contact" button** — opens a mini modal with fields:
- Organization (text or search existing CRM orgs)
- First Name
- Last Name
- Phone
- Ext
- Alt Phone
- Alt Ext
- Email

On save: creates the contact in `apex_crm_contacts` and immediately adds them to the job.

**Job role assignment** — when adding a contact (from search or creation), pick their role on this job:
- Adjuster
- Client Representative
- Vendor
- Subcontractor
- Insurance Agent
- Property Manager
- Other

**Added contacts list** — shows each contact with:
- Name + Organization
- Job role badge
- Phone (clickable)
- Remove button (X)

---

## Row 4: Referral & Tracking (full width)

**Section Header:** "Referral & Tracking" with icon

Fields (2-column grid + full width textarea):
- **Referral Source** — select dropdown:
  - Insurance Company
  - Insurance Agent
  - Past Client
  - Google Search
  - Facebook
  - Nextdoor
  - Thumbtack
  - Yelp
  - Word of Mouth
  - Other
- **Referred By** — text, placeholder "Marketer or person name" (for bonus attribution)
- **How They Heard** — text, placeholder "Details..."
- **Internal Notes** — textarea, full width, 2 rows, placeholder "Private notes for the team..."

---

## Data Submission

The form collects and sends to `POST /api/apex-jobs`:

**Single-value fields:** All text, email, tel, date, select values
**Multi-value arrays:**
- `job_types` — array of selected type objects `[{ job_type_code: 'MIT', job_type: 'mitigation' }]`
- `additional_clients` — array of `{ name, phone, email }`
- `additional_adjusters` — array of `{ name, phone, email }`
- `site_contacts` — array of `{ name, phone, email, relation }`
- `mitigation_pm`, `reconstruction_pm`, `estimator`, `project_coordinator`, `mitigation_techs` — arrays of user IDs or names
**Boolean flags:**
- `same_as_client`, `extraction_required`, `ongoing_intrusion`, `drywall_debris`, `content_manipulation`
**Contact assignments:**
- Array of `{ contact_id, job_role }` — linked after job creation via `POST /api/apex/crm/jobs/:jobId/contacts`
**Referral:**
- `referral_source`, `referred_by`, `how_heard`, `internal_notes`

**Job name auto-generated:** `"{client_name} - {JOB_TYPE_CODES}"` (e.g., "John Doe - MIT/RPR")

---

## Responsive Breakpoints

- **Desktop (>1280px):** 3 columns for Row 1, 4-column grid for Loss Info, 2 columns for Team
- **Tablet (<=1280px):** 2 columns for Row 1 (Property goes full-width), 2-column Loss Info, 2 columns for Team
- **Mobile (<=640px):** 1 column everything stacked

---

## Backend Changes Needed

1. **Add `referred_by` field** to `apex_jobs` table — text column for marketer attribution
2. **Add `fire` job type** — ensure FR/Fire is in the job type codes (check if backend already supports it)
3. **CRM contact creation endpoint** — already exists at `POST /api/apex/crm/contacts`
4. **Job contact linking endpoint** — already exists at `POST /api/apex/crm/jobs/:jobId/contacts`
5. **Org members list endpoint** — already exists at `GET /api/apex/orgs/:id/members`

---

## Naming Decisions

- Sidebar: "CRM" renamed to **"Contacts"** (for external people)
- New sidebar item: **"Team"** (for internal employees/org members)
- Job form bottom section header: **"Team"** with sub-headers "Internal Members" and "External Members"
