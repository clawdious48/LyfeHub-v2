# New Job Modal Reference - Apex.Dev

> Complete analysis of the New Job modal for recreation in LyfeHub.

---

## 1. Modal Overview

**Purpose:** Create one or more new restoration jobs with client, property, damage, and insurance information.

**Key Feature:** Can create multiple related jobs at once (e.g., Mitigation + Reconstruction for same property).

**File Location:** `frontend/src/components/projects/modals/NewJobModal.tsx` (~660 lines)

---

## 2. Visual Layout

```
┌────────────────────────────────────────────────────────────────┐
│  New Job                                                    ✕  │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Job Type(s) *                                                 │
│  ┌──────────────┐ ┌──────────────────┐ ┌────────────┐         │
│  │Mitigation    │ │Reconstruction    │ │Remodel     │         │
│  │(MIT)         │ │(RPR)             │ │(RMD)       │         │
│  └──────────────┘ └──────────────────┘ └────────────┘         │
│  ┌──────────────┐ ┌──────────────────┐                        │
│  │Abatement     │ │Remediation       │                        │
│  │(ABT)         │ │(REM)             │                        │
│  └──────────────┘ └──────────────────┘                        │
│                                                                 │
│  ─────────────────────────────────────────────────────────     │
│                                                                 │
│  CLIENT INFORMATION                                            │
│                                                                 │
│  Client Name                                                   │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ Property owner name                                   │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                 │
│  Phone                                                         │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ (801) 555-1234                                        │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                 │
│  Email                                                         │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ client@email.com                                      │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                 │
│  ─────────────────────────────────────────────────────────     │
│                                                                 │
│  PROPERTY ADDRESS                                              │
│                                                                 │
│  Street Address                                                │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ 123 Main St                                           │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                 │
│  City                     State           ZIP                  │
│  ┌──────────────────┐    ┌──────┐       ┌──────────┐          │
│  │ Salt Lake City   │    │ UT   │       │ 84101    │          │
│  └──────────────────┘    └──────┘       └──────────┘          │
│                                                                 │
│  ─────────────────────────────────────────────────────────     │
│                                                                 │
│  DAMAGE INFORMATION                                            │
│                                                                 │
│  Damage Source                                                 │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ Select source...                                    ▼ │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                 │
│  Date of Loss                                                  │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ 📅                                                    │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                 │
│  Water Category                    Damage Class                │
│  ┌──────────────────────┐        ┌──────────────────────┐     │
│  │ Select category... ▼ │        │ Select class...    ▼ │     │
│  └──────────────────────┘        └──────────────────────┘     │
│                                                                 │
│  ─────────────────────────────────────────────────────────     │
│                                                                 │
│  INSURANCE INFORMATION                                         │
│                                                                 │
│  Insurance Carrier                                             │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ Select carrier...                                   ▼ │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                 │
│  Claim Number                      Policy Number               │
│  ┌──────────────────────┐        ┌──────────────────────┐     │
│  │ Claim #              │        │ Policy #             │     │
│  └──────────────────────┘        └──────────────────────┘     │
│                                                                 │
│  Deductible                                                    │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ $                                                     │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                 │
│  ─────────────────────────────────────────────────────────     │
│                                                                 │
│  ADJUSTER INFORMATION                                          │
│                                                                 │
│  Adjuster Name                                                 │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ John Smith                                            │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                 │
│  Adjuster Phone                    Adjuster Email              │
│  ┌──────────────────────┐        ┌──────────────────────┐     │
│  │ (801) 555-1234       │        │ adjuster@carrier.com │     │
│  └──────────────────────┘        └──────────────────────┘     │
│                                                                 │
│  ─────────────────────────────────────────────────────────     │
│                                                                 │
│  ASSIGN CONTACTS TO JOB                                        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ 🔍 Search contacts...                                 │     │
│  └──────────────────────────────────────────────────────┘     │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ No contacts found                                     │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Create Job (disabled)] │
└────────────────────────────────────────────────────────────────┘
```

---

## 3. Form Sections & Fields

### Section 1: Job Type Selection ⭐ REQUIRED

| Field | Type | Required | Default |
|-------|------|----------|---------|
| Job Type(s) | Multi-select toggle buttons | ✅ YES | None |

**Options:**
| Value | Display | Code |
|-------|---------|------|
| mitigation | Mitigation (MIT) | MIT |
| reconstruction | Reconstruction (RPR) | RPR |
| remodel | Remodel (RMD) | RMD |
| abatement | Abatement (ABT) | ABT |
| remediation | Remediation (REM) | REM |

**Behavior:** 
- Multiple can be selected
- Each selected type creates a SEPARATE project
- Button style: Toggle on/off with visual active state

### Section 2: Job Number(s) ⭐ REQUIRED (conditional)

| Field | Type | Required | Default |
|-------|------|----------|---------|
| Job Number | Text input per type | ✅ YES | Empty |

**Appears only when** job types are selected. One input per selected type.

**Auto-Generate Feature:**
- Button: "Generate" (wand icon)
- API Call: `GET /api/projects/next-job-number?job_type=TYPE`
- Format: `YYYYMM-###-TYPE` (e.g., `202602-001-MIT`)

---

### Section 3: Client Information

| Field | Type | Required | Placeholder | Notes |
|-------|------|----------|-------------|-------|
| Client Name | text | ❌ | "Property owner name" | Triggers auto-client creation |
| Phone | tel | ❌ | "(801) 555-1234" | |
| Email | email | ❌ | "client@email.com" | |

---

### Section 4: Property Address

| Field | Type | Required | Default | Placeholder |
|-------|------|----------|---------|-------------|
| Street Address | text | ❌ | '' | "123 Main St" |
| City | text | ❌ | '' | "Salt Lake City" |
| State | text | ❌ | 'UT' | maxLength=2 |
| ZIP | text | ❌ | '' | "84101" |

**Note:** State defaults to "UT" (Utah)

---

### Section 5: Damage Information

| Field | Type | Required | Options |
|-------|------|----------|---------|
| Damage Source | select | ❌ | water, fire, smoke, mold, sewage, flood, storm, other |
| Date of Loss | date | ❌ | Browser date picker |
| Water Category | select | ❌ | Cat 1 (Clean), Cat 2 (Gray), Cat 3 (Black) |
| Damage Class | select | ❌ | Class 1-4 (Minimal to Specialty) |

**Dropdown Options:**

**Damage Source:**
- Select source...
- Water
- Fire
- Smoke
- Mold
- Sewage
- Flood
- Storm
- Other

**Water Category:**
- Select category...
- Cat 1 - Clean Water
- Cat 2 - Gray Water
- Cat 3 - Black Water

**Damage Class:**
- Select class...
- Class 1 - Minimal
- Class 2 - Significant
- Class 3 - Extensive
- Class 4 - Specialty

---

### Section 6: Insurance Information

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Insurance Carrier | select | ❌ | Populated from database |
| Claim Number | text | ❌ | |
| Policy Number | text | ❌ | |
| Deductible | number | ❌ | Currency input, step=0.01 |

---

### Section 7: Adjuster Information

| Field | Type | Required | Placeholder |
|-------|------|----------|-------------|
| Adjuster Name | text | ❌ | "John Smith" |
| Adjuster Phone | tel | ❌ | "(801) 555-1234" |
| Adjuster Email | email | ❌ | "adjuster@carrier.com" |

⚠️ **NOTE:** In Apex.Dev, these fields are captured in the form but NOT sent to the API (bug). In LyfeHub, we should handle adjuster as a linked contact.

---

### Section 8: Assign Contacts to Job

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Contact Search | text | ❌ | Filters contact list |
| Selected Contacts | multi-select list | ❌ | Checkbox list of contacts |

**Behavior:**
- Search box filters contacts by name or organization
- Contacts are assigned AFTER project creation
- Same contacts assigned to ALL created projects (if multi-type)

---

## 4. Validation Rules

```
Required:
✅ At least one job type must be selected
✅ Job number required for each selected type

Optional:
❌ All other fields are optional
```

**Create Job button is DISABLED until:**
1. At least one job type is selected
2. All selected job types have a job number entered

---

## 5. Submission Flow

```
User clicks "Create Job"
       │
       ▼
┌──────────────────────────────────────────────────┐
│  FOR EACH selected job type:                     │
│                                                  │
│  1. POST /api/projects                           │
│     - job_number: entered or generated           │
│     - status: 'lead' (default)                   │
│     - client info (auto-creates client if name)  │
│     - address info                               │
│     - damage info                                │
│     - insurance info                             │
│                                                  │
│  2. Store created project ID                     │
└──────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│  FOR EACH created project:                       │
│    FOR EACH selected contact:                    │
│      POST /api/projects/{id}/contacts            │
└──────────────────────────────────────────────────┘
       │
       ▼
   Close modal, refresh job list
```

---

## 6. Data Sent to API

```json
{
  "job_number": "202602-001-MIT",
  "status": "lead",
  
  "client_name": "Phil Murphy",
  "client_phone": "801-555-1234",
  "client_email": "phil@email.com",
  
  "address": "123 Main St",
  "city": "Salt Lake City",
  "state": "UT",
  "zip": "84101",
  
  "damage_source": "water",
  "damage_category": "cat2",
  "damage_class": "class2",
  "date_of_loss": "2026-02-01",
  
  "insurance_org_id": 5,
  "claim_number": "CLM-123456",
  "policy_number": "POL-789012",
  "deductible": 1000.00
}
```

---

## 7. Special Features to Replicate

### 7.1 Multi-Type Job Creation
- User can select multiple job types (MIT + RPR)
- Creates separate project for each
- Useful for paired jobs (mitigation first, then reconstruction)

### 7.2 Auto-Generate Job Number
- Button with wand icon
- Calls API to get next available number
- Format: `YYYYMM-###-TYPE`

### 7.3 Auto-Client Creation
- If client_name is provided without client_id
- Backend automatically creates client record
- Links to project

### 7.4 Contact Assignment
- Search and select existing contacts
- Assigns after project creation
- Same contacts to all projects in batch

---

## 8. Styling Notes

### Section Headers
- Text: Uppercase
- Color: Muted/secondary
- Size: Small (text-xs)
- Spacing: margin-bottom

### Form Fields
- Full width inputs
- Placeholder text for guidance
- Grid layout for side-by-side fields (City/State/ZIP)

### Toggle Buttons (Job Types)
- Pill-shaped buttons
- Toggle on/off
- Active state: different background + border

### Action Buttons
- Cancel: Secondary style (left)
- Create Job: Primary style (right)
- Disabled state when validation fails

---

## 9. LyfeHub Implementation Notes

### What to Keep
- Section organization
- Field structure
- Multi-type job creation
- Auto-generate job number feature
- Contact assignment

### What to Adapt
- Use LyfeHub glass card styling for modal
- Use neon accent colors for active states
- Use LyfeHub form input styling
- Add proper adjuster handling (link as contact)

### Suggested Changes
- Consider making client name required (leads need identification)
- Add adjuster to contacts table and link properly
- Consider inline validation with error messages

---

*Generated for Jake Rogers | Apex Restoration | 2026-02-06*
