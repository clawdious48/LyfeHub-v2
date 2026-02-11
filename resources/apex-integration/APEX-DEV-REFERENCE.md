# Apex.Dev Application Reference

> Detailed documentation of Apex.Dev's structure, layout, and functionality for recreation in LyfeHub.

---

## 1. Application Overview

**Purpose:** AI-powered job management for Apex Restoration LLC (property damage restoration)

**Tech Stack:**
- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 + CSS Variables
- **State:** Zustand (UI) + React Query (data)
- **Backend:** FastAPI (Python)
- **Database:** SQLite (apex_operations.db)
- **Auth:** JWT tokens

**URL:** http://82.180.136.224:8000

---

## 2. Layout Architecture

### Overall Structure
```
┌─────────────────────────────────────────────────────────────┐
│                        TOP NAV (h-16)                        │
│  [Logo]  [Jobs Tab]                    🔔  ⚙️  [User Menu]  │
├──────────────┬──────────────────────────────────────────────┤
│              │                                               │
│   SIDEBAR    │              MAIN CONTENT                     │
│   (w-64)     │              (flex-1)                         │
│              │                                               │
│  - Search    │   Renders based on route:                     │
│  - Filters   │   - /jobs → Job list grid                     │
│  - Job List  │   - /jobs/:id → Job detail page               │
│              │   - /settings → Settings panels               │
│              │                                               │
├──────────────┴──────────────────────────────────────────────┤
│                      [+] FAB (Quick Capture)                 │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy
```
<App>
  <AuthProvider>
    <Routes>
      <Route element={<AppLayout />}>     ← Shell with nav + sidebar
        <Route path="/jobs" element={<ProjectsPage />} />
        <Route path="/jobs/:id" element={<ProjectDetailPage />} />
        <Route path="/settings" element={<SettingsLayout />} />
      </Route>
    </Routes>
  </AuthProvider>
</App>
```

---

## 3. Top Navigation

### Structure
- Left side: Logo + Main nav links (Jobs, future: Tasks, Calendar)
- Right side: Notification bell, Settings gear, User menu
- Height: 64px (h-16)
- Background: Semi-transparent with backdrop blur
- Border: Subtle bottom border

### Nav Link States
- **Default:** Muted text color
- **Hover:** White text, subtle background
- **Active:** Primary color, accent underline

---

## 4. Sidebar (JobsSidebar)

### Layout
```
┌────────────────────────┐
│  🔍 Search jobs...     │  ← Search input
├────────────────────────┤
│ [All][Active][Pending] │  ← Status filter pills
│ [Lead][Complete]       │
├────────────────────────┤
│                        │
│  💧 Murphy Water       │  ← Job list (scrollable)
│  🔥 Smith Fire         │
│  💧 Johnson Water      │
│  ...                   │
│                        │
├────────────────────────┤
│  [+ New Job]           │  ← Action button (optional)
└────────────────────────┘
```

### Features

**1. Search Input**
- Filters job list by name/client
- Real-time filtering (no submit required)
- Placeholder: "Search jobs..."

**2. Status Filter Pills**
- Horizontal row of toggleable buttons
- Options: All | Active | Pending | Lead | Complete
- Single select (clicking one deselects others)
- Pills use status-specific colors

**3. Job List Items**
- Icon based on damage type:
  - 💧 Water
  - 🔥 Fire  
  - 🦠 Mold
  - ⛈️ Storm
- Job name format: "Client - Loss Type"
- Clicking navigates to /jobs/:id
- Active job has highlighted background + left border accent

### Sidebar Dimensions
- Width: 256px (w-64)
- Full height of content area
- Fixed position (doesn't scroll with content)

---

## 5. Jobs List Page (/jobs)

### Layout
- Header with title "Jobs" and "+ New Job" button
- Grid of job cards (auto-fill, responsive columns)
- Cards are clickable → navigate to detail

### Job Card Content
```
┌────────────────────────────────────┐
│ 💧  Murphy Residence - Water       │  ← Icon + Title
│ ─────────────────────────────────  │
│ Status: [Active]                   │  ← Status badge
│ Client: Phil Murphy                │
│ Address: 123 Main St, SLC          │
│ Created: Jan 15, 2026              │
└────────────────────────────────────┘
```

---

## 6. Job Detail Page (/jobs/:id)

### Overall Layout
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back    Murphy Residence - Water Loss    [Actions ▼]    │
│            [Active]                                         │
├─────────────────────────────────────────────────────────────┤
│  [Overview] [Dates] [Tasks] [Estimates] [Payments] [Docs]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   TAB CONTENT AREA                                          │
│   (varies by selected tab)                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Header Section
- **Back button:** Returns to /jobs
- **Title:** Job name (gradient text in LyfeHub style)
- **Status badge:** Colored pill with glow
- **Actions dropdown:** Edit, Archive, Delete

### Tab Navigation
| Tab | Content |
|-----|---------|
| **Overview** | Info cards grid (client, insurance, job details) |
| **Dates** | Key dates and milestones |
| **Tasks** | Task list for this job |
| **Estimates** | Estimate versions with status |
| **Payments** | Payment records |
| **Docs** | Photos, documents, files |
| **Notes** | Job notes/comments |
| **Activity** | Event log/history |

---

## 7. Info Cards Pattern

Used extensively on Overview tab and throughout.

### Structure
```
┌─────────────────────────────────────┐
│  CLIENT INFORMATION                 │  ← Section header (uppercase, muted)
│                                     │
│  Name          Phil Murphy          │  ← Label : Value rows
│  Phone         801-555-1234  📞     │  ← With action icons
│  Email         phil@email.com  ✉️   │
│  Address       123 Main St, SLC     │
└─────────────────────────────────────┘
```

### Info Cards on Overview Tab

**1. Client Information**
- Name
- Phone (clickable → tel:)
- Email (clickable → mailto:)
- Address

**2. Insurance Information**
- Carrier
- Claim #
- Adjuster Name
- Adjuster Phone
- Adjuster Email

**3. Job Details**
- Job Number
- Loss Type
- Loss Date
- Status
- Mitigation Job #
- Repair Job #

**4. Accounting Summary**
- Total Estimated
- Total Paid
- Balance Due

---

## 8. Modal Patterns

### Modal Types
| Modal | Trigger | Purpose |
|-------|---------|---------|
| NewJobModal | "+ New Job" button | Create new job |
| EditJobModal | Edit action | Modify job details |
| AddContactModal | Add contact button | Link contact to job |
| AddEstimateModal | Add estimate button | Create estimate |
| AddPaymentModal | Add payment button | Record payment |
| UploadMediaModal | Upload button | Add photos/docs |
| ConfirmDeleteModal | Delete action | Confirm deletion |

### Modal Structure
- Backdrop: Dark overlay with blur
- Content: Centered card with header, body, footer
- Header: Title + close button
- Body: Form content
- Footer: Cancel + Primary action buttons

---

## 9. Data Models

### Project (Job)
```
id: string
job_number: string              // "202601-001-MIT"

// Client
client_name: string
client_phone: string (optional)
client_email: string (optional)
property_address: string

// Status
status: 'lead' | 'pending' | 'active' | 'complete' | 'closed'

// Damage
damage_type: 'water' | 'fire' | 'mold' | 'storm' | 'other'
damage_description: string (optional)
loss_date: string (optional)

// Insurance
insurance_carrier: string (optional)
claim_number: string (optional)
adjuster_name: string (optional)
adjuster_phone: string (optional)
adjuster_email: string (optional)

// Job Numbers
mitigation_job_number: string (optional)
repair_job_number: string (optional)

// Dates
created_at: string
updated_at: string

// Financials (computed)
total_estimated: number (optional)
total_paid: number (optional)
balance_due: number (optional)
```

### Estimate
```
id: string
project_id: string
version: number
amount: number
status: 'draft' | 'submitted' | 'approved' | 'revision_requested' | 'denied'
notes: string (optional)
created_at: string
```

### Payment
```
id: string
project_id: string
amount: number
payment_type: 'check' | 'ach' | 'credit_card' | 'cash'
payment_date: string
reference: string (optional)
notes: string (optional)
```

---

## 10. API Endpoints

### Projects
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/projects | List all projects |
| POST | /api/projects | Create project |
| GET | /api/projects/:id | Get project details |
| PATCH | /api/projects/:id | Update project |
| DELETE | /api/projects/:id | Delete project |
| GET | /api/projects/:id/full | Get project + all related data |

### Project Sub-resources
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET/POST | /api/projects/:id/contacts | Manage contacts |
| GET/POST | /api/projects/:id/estimates | Manage estimates |
| GET/POST | /api/projects/:id/payments | Manage payments |
| GET/POST | /api/projects/:id/notes | Manage notes |
| GET/POST | /api/projects/:id/media | Manage files |
| GET | /api/projects/:id/activity-log | Get event history |
| GET | /api/projects/:id/accounting-summary | Get financials |

---

## 11. Feature Checklist for LyfeHub Integration

### Must Have (MVP)
- [ ] Sidebar with job list
- [ ] Search/filter in sidebar
- [ ] Status filter pills
- [ ] Job cards in grid view (or use existing Kanban/List/Cards)
- [ ] Job detail modal/page
- [ ] Overview tab with info cards
- [ ] Client, Insurance, Job Details sections

### Should Have
- [ ] Dates tab
- [ ] Tasks tab
- [ ] Estimates tab
- [ ] Payments tab
- [ ] Activity log

### Nice to Have
- [ ] Documents/Media tab
- [ ] Notes tab
- [ ] Quick actions dropdown
- [ ] Keyboard shortcuts

---

## 12. Damage Type Icons

| Type | Icon | Color |
|------|------|-------|
| Water | 💧 | --neon-blue |
| Fire | 🔥 | --neon-orange |
| Mold | 🦠 | --neon-green |
| Storm | ⛈️ | --neon-purple |
| Other | 🔧 | --text-muted |

---

## 13. Status Colors

| Status | Background | Text | Glow |
|--------|------------|------|------|
| Lead | rgba(0, 170, 255, 0.15) | --neon-blue | subtle |
| Pending | rgba(255, 230, 109, 0.15) | --neon-yellow | subtle |
| Active | rgba(5, 255, 161, 0.15) | --neon-green | medium |
| Complete | rgba(191, 90, 242, 0.15) | --neon-purple | subtle |
| Closed | rgba(255, 255, 255, 0.1) | --text-muted | none |

---

## 14. File Reference

### Key Frontend Files (Apex.Dev)
| File | Purpose |
|------|---------|
| src/components/layout/AppLayout.tsx | Main shell |
| src/components/layout/TopNav.tsx | Top navigation |
| src/components/layout/JobsSidebar.tsx | Jobs sidebar |
| src/pages/ProjectsPage.tsx | Jobs list page |
| src/pages/ProjectDetailPage.tsx | Job detail page |
| src/components/projects/InfoCard.tsx | Info card component |
| src/components/projects/tabs/*.tsx | Tab content components |
| src/components/projects/modals/*.tsx | Modal components |

### Key Backend Files (Apex.Dev)
| File | Purpose |
|------|---------|
| api/routes/projects.py | Project API routes |
| api/routes/auth.py | Authentication |
| database/operations_apex.py | Database operations |
| database/models.py | Pydantic schemas |

---

*Generated for Jake Rogers | Apex Restoration | 2026-02-06*
