# New Job Modal — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the React "Create Job" modal from a narrow single-column form (~24 fields) to a full-width 3-column layout (~50+ fields) with team assignment, CRM contact integration, multi-contact support, and referral tracking.

**Architecture:** The modal is split into isolated section components that receive form state via props from a centralized `useCreateJobForm` hook. Each section maps to a row in the design doc. The Team section uses two new API hook modules (org members + CRM contacts) to power its employee picker and contact search. A mini modal handles inline CRM contact creation. Backend needs one migration (`referred_by` column).

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query, Lucide React

**Design Doc:** `docs/plans/2026-03-01-new-job-modal-design.md`

---

## Dependency Graph

```
Task 1 (Backend migration)  ──────────────────────────────────┐
Task 2 (TypeScript types)   ──┬── Task 5 (Form hook) ──┬──── Task 7 (Assemble modal)
Task 3 (Constants)          ──┘                         │         │
Task 4 (API hooks)          ────────────────────────────┤    Task 8 (Visual test)
                                                        │
                                          Task 6a-6h (Sections) ──┘
                                          (6a-6h are parallel)
```

**Parallelizable groups:**
- **Wave 1:** Tasks 1, 2, 3, 4 (all independent of each other)
- **Wave 2:** Task 5 (depends on 2 + 3)
- **Wave 3:** Tasks 6a through 6h (all depend on 5, but independent of each other)
- **Wave 4:** Task 7 (depends on all of 6)
- **Wave 5:** Task 8 (depends on 7)

---

## Task 1: Backend Migration — Add `referred_by` Column

**Files:**
- Modify: `backend/src/db/init.sql`
- Modify: `backend/src/db/apexJobs.js` (createJob + updateJob functions)

**Context:** The `referred_by` field tracks which marketer referred a job (for bonus attribution). The backend already has `referral_source`, `how_heard`, and `internal_notes` but is missing `referred_by`. All other fields in the design doc already exist in the schema.

**Step 1: Add column to schema**

In `backend/src/db/init.sql`, find the `apex_jobs` table definition. After the `referral_source` column (around line 576), add:

```sql
referred_by TEXT DEFAULT '',
```

Also add the migration block near the bottom of the file (in the `DO $$ ... END $$` migration section):

```sql
-- Add referred_by to apex_jobs
IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'apex_jobs' AND column_name = 'referred_by') THEN
  ALTER TABLE apex_jobs ADD COLUMN referred_by TEXT DEFAULT '';
END IF;
```

**Step 2: Add to createJob INSERT**

In `backend/src/db/apexJobs.js`, in the `createJob` function (line 50):
- Add `referred_by` to the INSERT column list (after `referral_source`)
- Add the corresponding `$N` placeholder
- Add `data.referred_by || ''` to the values array (after `data.referral_source || ''`)

**Step 3: Add to updateJob allowed fields**

Search for the `updateJob` function in `apexJobs.js`. Find where it builds the SET clause from allowed field names. Add `'referred_by'` to the allowed fields list.

**Step 4: Verify by restarting backend**

```bash
docker restart lyfehub-dev
```

Wait 5 seconds, then check logs:
```bash
docker logs lyfehub-dev --tail 20
```
Expected: No schema errors, server running.

**Step 5: Commit**

```bash
git add backend/src/db/init.sql backend/src/db/apexJobs.js
git commit -m "feat(backend): add referred_by column to apex_jobs for marketer attribution"
```

---

## Task 2: Update TypeScript Types

**Files:**
- Modify: `frontend-next/src/types/job.ts`

**Context:** The `ApexJob` interface is missing many fields that exist in the backend schema. The design doc requires these for the new modal. Current interface has 54 fields but is missing: `extraction_required`, `ongoing_intrusion`, `drywall_debris`, `content_manipulation`, `additional_clients`, `additional_adjusters`, `site_contacts`, `year_built`, `mitigation_pm`, `reconstruction_pm`, `estimator`, `project_coordinator`, `mitigation_techs`, `referred_by`, `source`, `zoho_id`.

**Step 1: Add missing fields to ApexJob interface**

In `frontend-next/src/types/job.ts`, add these fields to the `ApexJob` interface (after `internal_notes` on line 44):

```typescript
  referred_by: string
  source: string
  // Boolean flags (stored as 0/1 integers in DB)
  extraction_required: number
  ongoing_intrusion: number
  drywall_debris: number
  content_manipulation: number
  // Team assignment (JSON string arrays of user IDs)
  mitigation_pm: string
  reconstruction_pm: string
  estimator: string
  project_coordinator: string
  mitigation_techs: string
  // Multi-contact arrays (JSON string arrays)
  additional_clients: string
  additional_adjusters: string
  site_contacts: string
  // Property
  year_built: string
```

**Step 2: Add helper types for multi-contact arrays**

After the `ApexJob` interface, add these types that the form will use:

```typescript
export interface AdditionalContact {
  name: string
  phone: string
  email: string
}

export interface SiteContact {
  name: string
  phone: string
  email: string
  relation: string
}

export interface CrmContact {
  id: string
  first_name: string
  last_name: string
  phone: string
  ext: string
  alt_phone: string
  alt_ext: string
  email: string
  crm_organization_id: string | null
  org_name: string | null
}

export interface OrgMember {
  user_id: string
  name: string
  email: string
  role: string
  job_count?: number
}

export interface CreateCrmContactData {
  first_name: string
  last_name: string
  phone: string
  ext: string
  alt_phone: string
  alt_ext: string
  email: string
  crm_organization_id: string | null
}

export interface JobContactAssignment {
  contact_id: string
  job_role: string
  display_name: string
  org_name: string | null
  phone: string
}
```

**Step 3: Type check**

```bash
cd frontend-next && npx tsc --noEmit
```
Expected: No new errors.

**Step 4: Commit**

```bash
git add frontend-next/src/types/job.ts
git commit -m "feat(types): add missing fields to ApexJob — team, contacts, flags, referred_by"
```

---

## Task 3: Update Constants

**Files:**
- Modify: `frontend-next/src/pages/jobs/utils/jobConstants.ts`

**Context:** The constants file is missing: Fire (FR) job type, REFERRAL_SOURCES, JOB_CONTACT_ROLES, US_STATES, SITE_CONTACT_RELATIONS. The design doc specifies exact values for each.

**Step 1: Add Fire job type**

In `jobConstants.ts`, in the `JOB_TYPE_CODES` array (line 17-23), update to match design doc labels:

```typescript
export const JOB_TYPE_CODES = [
  { code: 'MIT', label: 'Mitigation', type: 'mitigation' },
  { code: 'RPR', label: 'Reconstruction', type: 'repair' },
  { code: 'RMD', label: 'Remodel', type: 'remodel' },
  { code: 'ABT', label: 'Abatement', type: 'abatement' },
  { code: 'REM', label: 'Remediation', type: 'remediation' },
  { code: 'FR', label: 'Fire', type: 'fire' },
] as const
```

Note: The design doc renames RMD to "Remodel" and REM to "Remediation" — these were swapped in the old code. Also adds FR/Fire.

**Step 2: Update PROPERTY_TYPES to include Multi-Family**

```typescript
export const PROPERTY_TYPES = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'multi_family', label: 'Multi-Family' },
  { value: 'industrial', label: 'Industrial' },
] as const
```

**Step 3: Update WATER_CATEGORIES and DAMAGE_CLASSES to match design doc labels**

```typescript
export const WATER_CATEGORIES = [
  { value: '1', label: 'Cat 1 - Clean Water' },
  { value: '2', label: 'Cat 2 - Gray Water' },
  { value: '3', label: 'Cat 3 - Black Water' },
] as const

export const DAMAGE_CLASSES = [
  { value: '1', label: 'Class 1 - Minimal' },
  { value: '2', label: 'Class 2 - Significant' },
  { value: '3', label: 'Class 3 - Extensive' },
  { value: '4', label: 'Class 4 - Specialty' },
] as const
```

**Step 4: Add new constant arrays at the end of the file**

```typescript
export const US_STATES = [
  { value: 'AZ', label: 'AZ' },
  { value: 'CA', label: 'CA' },
  { value: 'CO', label: 'CO' },
  { value: 'NM', label: 'NM' },
  { value: 'NV', label: 'NV' },
  { value: 'TX', label: 'TX' },
  { value: 'UT', label: 'UT' },
] as const

export const REFERRAL_SOURCES = [
  { value: 'insurance_company', label: 'Insurance Company' },
  { value: 'insurance_agent', label: 'Insurance Agent' },
  { value: 'past_client', label: 'Past Client' },
  { value: 'google_search', label: 'Google Search' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'nextdoor', label: 'Nextdoor' },
  { value: 'thumbtack', label: 'Thumbtack' },
  { value: 'yelp', label: 'Yelp' },
  { value: 'word_of_mouth', label: 'Word of Mouth' },
  { value: 'other', label: 'Other' },
] as const

export const JOB_CONTACT_ROLES = [
  { value: 'adjuster', label: 'Adjuster' },
  { value: 'client_representative', label: 'Client Representative' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'insurance_agent', label: 'Insurance Agent' },
  { value: 'property_manager', label: 'Property Manager' },
  { value: 'other', label: 'Other' },
] as const

export const SITE_CONTACT_RELATIONS = [
  { value: 'property_owner', label: 'Property Owner' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'property_manager', label: 'Property Manager' },
  { value: 'insurance_agent', label: 'Insurance Agent' },
  { value: 'other', label: 'Other' },
] as const

export const TEAM_ROLES = [
  { key: 'mitigation_pm', label: 'Mitigation PM', eligible: ['management', 'project_manager'] },
  { key: 'reconstruction_pm', label: 'Reconstruction PM', eligible: ['management', 'project_manager'] },
  { key: 'estimator', label: 'Estimator', eligible: ['management', 'estimator'] },
  { key: 'project_coordinator', label: 'Project Coordinator', eligible: ['management', 'office_coordinator'] },
  { key: 'mitigation_techs', label: 'Mitigation Techs', eligible: ['management', 'field_tech'] },
] as const
```

**Step 5: Type check**

```bash
cd frontend-next && npx tsc --noEmit
```
Expected: No new errors.

**Step 6: Commit**

```bash
git add frontend-next/src/pages/jobs/utils/jobConstants.ts
git commit -m "feat(constants): add Fire job type, referral sources, team roles, US states"
```

---

## Task 4: Create API Hooks for Org Members + Extend CRM Contacts

**Files:**
- Create: `frontend-next/src/api/hooks/useOrgMembers.ts`
- Modify: `frontend-next/src/api/hooks/useContacts.ts`
- Modify: `frontend-next/src/api/hooks/index.ts`

**Context:** The Team section needs: (1) org members list to populate role-based employee pickers, (2) CRM contact search for external member assignment, (3) CRM contact creation for inline "Create Contact" mini modal, (4) job-contact linking to associate contacts with jobs after creation. The `useContacts.ts` already has basic CRUD. The org members endpoint is `GET /api/apex-orgs/:id/members`.

**Step 1: Create useOrgMembers hook**

Create `frontend-next/src/api/hooks/useOrgMembers.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client.js'
import type { OrgMember } from '@/types/index.js'

export const orgMemberKeys = {
  all: ['org-members'] as const,
  list: (orgId: string) => [...orgMemberKeys.all, 'list', orgId] as const,
}

interface OrgMembersResponse {
  user_id: string
  email: string
  name: string
  role: string
}

export function useOrgMembers(orgId: string | undefined) {
  return useQuery({
    queryKey: orgMemberKeys.list(orgId ?? ''),
    queryFn: async (): Promise<OrgMember[]> => {
      if (!orgId) return []
      const members = await apiClient.get<OrgMembersResponse[]>(`/apex-orgs/${orgId}/members`)
      return members.map(m => ({
        user_id: m.user_id,
        name: m.name || m.email,
        email: m.email,
        role: m.role,
      }))
    },
    enabled: !!orgId,
  })
}
```

**Step 2: Add CRM contact search and job linking hooks to useContacts.ts**

In `frontend-next/src/api/hooks/useContacts.ts`, add these hooks:

```typescript
// Add to imports at top:
import type { CrmContact, CreateCrmContactData } from '@/types/index.js'

// Add after existing hooks:

export function useSearchCrmContacts(search: string) {
  return useQuery({
    queryKey: [...contactKeys.all, 'search', search] as const,
    queryFn: () => apiClient.get<CrmContact[]>(`/apex-crm/contacts?search=${encodeURIComponent(search)}&limit=10`),
    enabled: search.length >= 2,
  })
}

export function useLinkJobContact() {
  return useMutation({
    mutationFn: ({ jobId, contactId, jobRole }: { jobId: string; contactId: string; jobRole: string }) =>
      apiClient.post(`/apex-crm/jobs/${jobId}/contacts`, { contact_id: contactId, job_role: jobRole }),
  })
}
```

**Step 3: Ensure `useCreateCrmContact` exists and returns the created contact**

Check the existing `useCreateCrmContact` in `useContacts.ts`. It should post to `/apex-crm/contacts` and invalidate the contacts list. If it exists and works, no changes needed. If the return type isn't `CrmContact`, update the mutation's generic:

```typescript
export function useCreateCrmContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCrmContactData) =>
      apiClient.post<CrmContact>('/apex-crm/contacts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() })
    },
  })
}
```

**Step 4: Export new hooks from index.ts**

In `frontend-next/src/api/hooks/index.ts`, add:

```typescript
export * from './useOrgMembers.js'
```

Ensure `useContacts.ts` exports are already re-exported (they should be).

**Step 5: Export new types from types/index.ts**

Check `frontend-next/src/types/index.ts` and ensure all new types from Task 2 are exported. The file should already re-export everything from `job.ts` via `export * from './job.js'`.

**Step 6: Type check**

```bash
cd frontend-next && npx tsc --noEmit
```

**Step 7: Commit**

```bash
git add frontend-next/src/api/hooks/useOrgMembers.ts frontend-next/src/api/hooks/useContacts.ts frontend-next/src/api/hooks/index.ts
git commit -m "feat(hooks): add org members hook, CRM contact search + job linking hooks"
```

---

## Task 5: Form State Management — useCreateJobForm Hook

**Files:**
- Create: `frontend-next/src/pages/jobs/hooks/useCreateJobForm.ts`

**Context:** The current `CreateJobModal.tsx` manages form state inline with `useState`. The new modal has ~50+ fields across 8 sections, plus dynamic arrays (additional clients, adjusters, site contacts, team assignments, CRM contact assignments). Centralizing form state in a custom hook keeps section components pure and testable.

**Step 1: Create the hook file**

Create `frontend-next/src/pages/jobs/hooks/useCreateJobForm.ts`:

```typescript
import { useState, useCallback, useMemo } from 'react'
import { useCreateJob } from '@/api/hooks/index.js'
import { JOB_TYPE_CODES } from '@/pages/jobs/utils/jobConstants.js'
import type {
  CreateApexJobData,
  AdditionalContact,
  SiteContact,
  JobContactAssignment,
} from '@/types/index.js'

const EMPTY_CONTACT: AdditionalContact = { name: '', phone: '', email: '' }
const EMPTY_SITE_CONTACT: SiteContact = { name: '', phone: '', email: '', relation: '' }

export interface CreateJobFormState {
  // Job Setup
  jobTypes: string[]
  // Client Info
  client_name: string
  client_phone: string
  client_email: string
  client_street: string
  client_unit: string
  client_city: string
  client_state: string
  client_zip: string
  additional_clients: AdditionalContact[]
  // Insurance Info
  ins_carrier: string
  ins_claim: string
  ins_policy: string
  deductible: string
  adj_name: string
  adj_phone: string
  adj_email: string
  additional_adjusters: AdditionalContact[]
  // Property Info
  same_as_client: boolean
  year_built: string
  prop_type: string
  prop_street: string
  prop_unit: string
  prop_city: string
  prop_state: string
  prop_zip: string
  access_info: string
  site_contacts: SiteContact[]
  // Loss Info
  loss_type: string
  loss_date: string
  water_category: string
  damage_class: string
  areas_affected: string
  hazards: string
  loss_description: string
  extraction_required: boolean
  ongoing_intrusion: boolean
  drywall_debris: boolean
  content_manipulation: boolean
  // Team — Internal
  mitigation_pm: string[]
  reconstruction_pm: string[]
  estimator: string[]
  project_coordinator: string[]
  mitigation_techs: string[]
  // Team — External (CRM contacts to link after job creation)
  contact_assignments: JobContactAssignment[]
  // Referral & Tracking
  referral_source: string
  referred_by: string
  how_heard: string
  internal_notes: string
}

const INITIAL_STATE: CreateJobFormState = {
  jobTypes: [],
  client_name: '',
  client_phone: '',
  client_email: '',
  client_street: '',
  client_unit: '',
  client_city: '',
  client_state: '',
  client_zip: '',
  additional_clients: [],
  ins_carrier: '',
  ins_claim: '',
  ins_policy: '',
  deductible: '',
  adj_name: '',
  adj_phone: '',
  adj_email: '',
  additional_adjusters: [],
  same_as_client: false,
  year_built: '',
  prop_type: 'residential',
  prop_street: '',
  prop_unit: '',
  prop_city: '',
  prop_state: '',
  prop_zip: '',
  access_info: '',
  site_contacts: [],
  loss_type: '',
  loss_date: '',
  water_category: '',
  damage_class: '',
  areas_affected: '',
  hazards: '',
  loss_description: '',
  extraction_required: false,
  ongoing_intrusion: false,
  drywall_debris: false,
  content_manipulation: false,
  mitigation_pm: [],
  reconstruction_pm: [],
  estimator: [],
  project_coordinator: [],
  mitigation_techs: [],
  contact_assignments: [],
  referral_source: '',
  referred_by: '',
  how_heard: '',
  internal_notes: '',
}

export function useCreateJobForm() {
  const [form, setForm] = useState<CreateJobFormState>(INITIAL_STATE)
  const createJob = useCreateJob()

  const updateField = useCallback(<K extends keyof CreateJobFormState>(
    field: K,
    value: CreateJobFormState[K]
  ) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const toggleJobType = useCallback((code: string) => {
    setForm(prev => ({
      ...prev,
      jobTypes: prev.jobTypes.includes(code)
        ? prev.jobTypes.filter(c => c !== code)
        : [...prev.jobTypes, code],
    }))
  }, [])

  // Additional clients
  const addClient = useCallback(() => {
    setForm(prev => ({
      ...prev,
      additional_clients: [...prev.additional_clients, { ...EMPTY_CONTACT }],
    }))
  }, [])

  const removeClient = useCallback((index: number) => {
    setForm(prev => ({
      ...prev,
      additional_clients: prev.additional_clients.filter((_, i) => i !== index),
    }))
  }, [])

  const updateClient = useCallback((index: number, field: keyof AdditionalContact, value: string) => {
    setForm(prev => ({
      ...prev,
      additional_clients: prev.additional_clients.map((c, i) =>
        i === index ? { ...c, [field]: value } : c
      ),
    }))
  }, [])

  // Additional adjusters
  const addAdjuster = useCallback(() => {
    setForm(prev => ({
      ...prev,
      additional_adjusters: [...prev.additional_adjusters, { ...EMPTY_CONTACT }],
    }))
  }, [])

  const removeAdjuster = useCallback((index: number) => {
    setForm(prev => ({
      ...prev,
      additional_adjusters: prev.additional_adjusters.filter((_, i) => i !== index),
    }))
  }, [])

  const updateAdjuster = useCallback((index: number, field: keyof AdditionalContact, value: string) => {
    setForm(prev => ({
      ...prev,
      additional_adjusters: prev.additional_adjusters.map((a, i) =>
        i === index ? { ...a, [field]: value } : a
      ),
    }))
  }, [])

  // Site contacts
  const addSiteContact = useCallback(() => {
    setForm(prev => ({
      ...prev,
      site_contacts: [...prev.site_contacts, { ...EMPTY_SITE_CONTACT }],
    }))
  }, [])

  const removeSiteContact = useCallback((index: number) => {
    setForm(prev => ({
      ...prev,
      site_contacts: prev.site_contacts.filter((_, i) => i !== index),
    }))
  }, [])

  const updateSiteContact = useCallback((index: number, field: keyof SiteContact, value: string) => {
    setForm(prev => ({
      ...prev,
      site_contacts: prev.site_contacts.map((sc, i) =>
        i === index ? { ...sc, [field]: value } : sc
      ),
    }))
  }, [])

  // CRM contact assignments
  const addContactAssignment = useCallback((assignment: JobContactAssignment) => {
    setForm(prev => ({
      ...prev,
      contact_assignments: [...prev.contact_assignments, assignment],
    }))
  }, [])

  const removeContactAssignment = useCallback((contactId: string) => {
    setForm(prev => ({
      ...prev,
      contact_assignments: prev.contact_assignments.filter(a => a.contact_id !== contactId),
    }))
  }, [])

  const isValid = useMemo(() => {
    return (
      form.client_name.trim() !== '' &&
      form.client_phone.trim() !== '' &&
      form.jobTypes.length > 0
    )
  }, [form.client_name, form.client_phone, form.jobTypes])

  const reset = useCallback(() => {
    setForm(INITIAL_STATE)
  }, [])

  const buildSubmitData = useCallback((): CreateApexJobData & {
    job_types: { job_type_code: string; job_type: string }[]
  } => {
    const job_types = form.jobTypes.map(code => {
      const found = JOB_TYPE_CODES.find(jt => jt.code === code)
      return { job_type_code: code, job_type: found?.type ?? '' }
    })

    return {
      name: `${form.client_name} - ${form.jobTypes.join('/')}`,
      client_name: form.client_name,
      client_phone: form.client_phone,
      client_email: form.client_email,
      client_street: form.client_street,
      client_unit: form.client_unit,
      client_city: form.client_city,
      client_state: form.client_state,
      client_zip: form.client_zip,
      additional_clients: JSON.stringify(form.additional_clients),
      ins_carrier: form.ins_carrier,
      ins_claim: form.ins_claim,
      ins_policy: form.ins_policy,
      deductible: form.deductible ? Number(form.deductible) : 0,
      adj_name: form.adj_name,
      adj_phone: form.adj_phone,
      adj_email: form.adj_email,
      additional_adjusters: JSON.stringify(form.additional_adjusters),
      same_as_client: form.same_as_client ? 1 : 0,
      year_built: form.year_built,
      prop_type: form.prop_type,
      prop_street: form.same_as_client ? form.client_street : form.prop_street,
      prop_unit: form.same_as_client ? form.client_unit : form.prop_unit,
      prop_city: form.same_as_client ? form.client_city : form.prop_city,
      prop_state: form.same_as_client ? form.client_state : form.prop_state,
      prop_zip: form.same_as_client ? form.client_zip : form.prop_zip,
      access_info: form.access_info,
      site_contacts: JSON.stringify(form.site_contacts),
      loss_type: form.loss_type,
      loss_date: form.loss_date,
      water_category: form.water_category,
      damage_class: form.damage_class,
      areas_affected: form.areas_affected,
      hazards: form.hazards,
      loss_description: form.loss_description,
      extraction_required: form.extraction_required ? 1 : 0,
      ongoing_intrusion: form.ongoing_intrusion ? 1 : 0,
      drywall_debris: form.drywall_debris ? 1 : 0,
      content_manipulation: form.content_manipulation ? 1 : 0,
      mitigation_pm: JSON.stringify(form.mitigation_pm),
      reconstruction_pm: JSON.stringify(form.reconstruction_pm),
      estimator: JSON.stringify(form.estimator),
      project_coordinator: JSON.stringify(form.project_coordinator),
      mitigation_techs: JSON.stringify(form.mitigation_techs),
      referral_source: form.referral_source,
      referred_by: form.referred_by,
      how_heard: form.how_heard,
      internal_notes: form.internal_notes,
      job_types,
    } as CreateApexJobData & { job_types: { job_type_code: string; job_type: string }[] }
  }, [form])

  return {
    form,
    updateField,
    toggleJobType,
    addClient,
    removeClient,
    updateClient,
    addAdjuster,
    removeAdjuster,
    updateAdjuster,
    addSiteContact,
    removeSiteContact,
    updateSiteContact,
    addContactAssignment,
    removeContactAssignment,
    isValid,
    reset,
    buildSubmitData,
    createJob,
  }
}
```

**Step 2: Type check**

```bash
cd frontend-next && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add frontend-next/src/pages/jobs/hooks/useCreateJobForm.ts
git commit -m "feat: add useCreateJobForm hook with full state management for new job modal"
```

---

## Task 6a: JobSetupSection Component

**Files:**
- Create: `frontend-next/src/pages/jobs/components/modals/sections/JobSetupSection.tsx`

**Context:** Row 0 in the design doc. 6 toggle buttons for job types (multi-select). Selected state uses purple background/border/glow. Full width across the modal.

**Step 1: Create the component**

```tsx
import { Briefcase } from 'lucide-react'
import { JOB_TYPE_CODES } from '@/pages/jobs/utils/jobConstants.js'

interface JobSetupSectionProps {
  jobTypes: string[]
  onToggleJobType: (code: string) => void
}

export function JobSetupSection({ jobTypes, onToggleJobType }: JobSetupSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Briefcase className="size-4 text-accent" />
          <h3 className="font-medium text-sm text-text-secondary uppercase tracking-wider">
            Job Setup
          </h3>
        </div>
        <span className="text-xs text-red-400">* Required</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {JOB_TYPE_CODES.map(jt => {
          const selected = jobTypes.includes(jt.code)
          return (
            <button
              key={jt.code}
              type="button"
              onClick={() => onToggleJobType(jt.code)}
              className={[
                'px-3 py-2 rounded-md text-sm font-medium border transition-all cursor-pointer',
                selected
                  ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.3)]'
                  : 'bg-bg-surface border-border text-text-secondary hover:border-purple-500/50 hover:text-text-primary',
              ].join(' ')}
            >
              <div className="font-bold">{jt.code}</div>
              <div className="text-xs opacity-75">{jt.label}</div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
```

**Step 2: Type check**

```bash
cd frontend-next && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add frontend-next/src/pages/jobs/components/modals/sections/JobSetupSection.tsx
git commit -m "feat: add JobSetupSection component — 6 toggle buttons for job type selection"
```

---

## Task 6b: ClientInfoSection Component

**Files:**
- Create: `frontend-next/src/pages/jobs/components/modals/sections/ClientInfoSection.tsx`

**Context:** Column 1 of Row 1 in design doc. Client name (required), phone (required), email, address fields, plus "+ Add Client" for additional contacts.

**Step 1: Create the component**

```tsx
import { User, X, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input.js'
import { Label } from '@/components/ui/label.js'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js'
import { US_STATES } from '@/pages/jobs/utils/jobConstants.js'
import type { AdditionalContact } from '@/types/index.js'

interface ClientInfoSectionProps {
  client_name: string
  client_phone: string
  client_email: string
  client_street: string
  client_unit: string
  client_city: string
  client_state: string
  client_zip: string
  additional_clients: AdditionalContact[]
  onUpdateField: (field: string, value: string) => void
  onAddClient: () => void
  onRemoveClient: (index: number) => void
  onUpdateClient: (index: number, field: keyof AdditionalContact, value: string) => void
}

export function ClientInfoSection({
  client_name,
  client_phone,
  client_email,
  client_street,
  client_unit,
  client_city,
  client_state,
  client_zip,
  additional_clients,
  onUpdateField,
  onAddClient,
  onRemoveClient,
  onUpdateClient,
}: ClientInfoSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <User className="size-4 text-accent" />
        <h3 className="font-medium text-sm text-text-secondary uppercase tracking-wider">
          Client Info
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label htmlFor="cj-client-name">Name *</Label>
          <Input
            id="cj-client-name"
            value={client_name}
            onChange={e => onUpdateField('client_name', e.target.value)}
            placeholder="Full name"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cj-client-phone">Phone *</Label>
          <Input
            id="cj-client-phone"
            type="tel"
            value={client_phone}
            onChange={e => onUpdateField('client_phone', e.target.value)}
            placeholder="(555) 555-5555"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cj-client-email">Email</Label>
          <Input
            id="cj-client-email"
            type="email"
            value={client_email}
            onChange={e => onUpdateField('client_email', e.target.value)}
            placeholder="email@example.com"
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label htmlFor="cj-client-street">Street</Label>
          <Input
            id="cj-client-street"
            value={client_street}
            onChange={e => onUpdateField('client_street', e.target.value)}
            placeholder="Street address"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cj-client-unit">Unit #</Label>
          <Input
            id="cj-client-unit"
            value={client_unit}
            onChange={e => onUpdateField('client_unit', e.target.value)}
            placeholder="Apt, Suite, etc."
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cj-client-city">City</Label>
          <Input
            id="cj-client-city"
            value={client_city}
            onChange={e => onUpdateField('client_city', e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cj-client-state">State</Label>
          <Select value={client_state} onValueChange={v => onUpdateField('client_state', v)}>
            <SelectTrigger id="cj-client-state">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="cj-client-zip">Zip</Label>
          <Input
            id="cj-client-zip"
            value={client_zip}
            onChange={e => onUpdateField('client_zip', e.target.value)}
            maxLength={10}
          />
        </div>
      </div>

      {/* Additional clients */}
      {additional_clients.map((ac, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mt-2 items-end">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              value={ac.name}
              onChange={e => onUpdateClient(i, 'name', e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input
              type="tel"
              value={ac.phone}
              onChange={e => onUpdateClient(i, 'phone', e.target.value)}
              placeholder="(555) 555-5555"
            />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input
              type="email"
              value={ac.email}
              onChange={e => onUpdateClient(i, 'email', e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <button
            type="button"
            onClick={() => onRemoveClient(i)}
            className="p-2 text-red-400 hover:text-red-300 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onAddClient}
        className="mt-2 flex items-center gap-1 text-xs text-accent hover:text-accent/80 cursor-pointer"
      >
        <Plus className="size-3" /> Add Client
      </button>
    </section>
  )
}
```

**Step 2: Type check and commit**

```bash
cd frontend-next && npx tsc --noEmit
git add frontend-next/src/pages/jobs/components/modals/sections/ClientInfoSection.tsx
git commit -m "feat: add ClientInfoSection — name, phone, email, address, additional clients"
```

---

## Task 6c: InsuranceInfoSection Component

**Files:**
- Create: `frontend-next/src/pages/jobs/components/modals/sections/InsuranceInfoSection.tsx`

**Context:** Column 2 of Row 1. Carrier, claim #, policy #, deductible, plus adjuster sub-section with name/phone/email and "+ Add Adjuster" for additional adjusters.

**Step 1: Create the component**

```tsx
import { Shield, X, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input.js'
import { Label } from '@/components/ui/label.js'
import type { AdditionalContact } from '@/types/index.js'

interface InsuranceInfoSectionProps {
  ins_carrier: string
  ins_claim: string
  ins_policy: string
  deductible: string
  adj_name: string
  adj_phone: string
  adj_email: string
  additional_adjusters: AdditionalContact[]
  onUpdateField: (field: string, value: string) => void
  onAddAdjuster: () => void
  onRemoveAdjuster: (index: number) => void
  onUpdateAdjuster: (index: number, field: keyof AdditionalContact, value: string) => void
}

export function InsuranceInfoSection({
  ins_carrier,
  ins_claim,
  ins_policy,
  deductible,
  adj_name,
  adj_phone,
  adj_email,
  additional_adjusters,
  onUpdateField,
  onAddAdjuster,
  onRemoveAdjuster,
  onUpdateAdjuster,
}: InsuranceInfoSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Shield className="size-4 text-accent" />
        <h3 className="font-medium text-sm text-text-secondary uppercase tracking-wider">
          Insurance Info
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label htmlFor="cj-ins-carrier">Carrier</Label>
          <Input
            id="cj-ins-carrier"
            value={ins_carrier}
            onChange={e => onUpdateField('ins_carrier', e.target.value)}
            placeholder="Insurance company"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cj-ins-claim">Claim #</Label>
          <Input
            id="cj-ins-claim"
            value={ins_claim}
            onChange={e => onUpdateField('ins_claim', e.target.value)}
            placeholder="Claim number"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cj-ins-policy">Policy #</Label>
          <Input
            id="cj-ins-policy"
            value={ins_policy}
            onChange={e => onUpdateField('ins_policy', e.target.value)}
            placeholder="Policy number"
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label htmlFor="cj-deductible">Deductible</Label>
          <Input
            id="cj-deductible"
            type="number"
            step="0.01"
            min="0"
            value={deductible}
            onChange={e => onUpdateField('deductible', e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Adjuster divider */}
      <div className="mt-4 mb-3 border-t border-border pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
          Adjuster
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label htmlFor="cj-adj-name">Adjuster Name</Label>
          <Input
            id="cj-adj-name"
            value={adj_name}
            onChange={e => onUpdateField('adj_name', e.target.value)}
            placeholder="Full name"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cj-adj-phone">Adjuster Phone</Label>
          <Input
            id="cj-adj-phone"
            type="tel"
            value={adj_phone}
            onChange={e => onUpdateField('adj_phone', e.target.value)}
            placeholder="(555) 555-5555"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cj-adj-email">Adjuster Email</Label>
          <Input
            id="cj-adj-email"
            type="email"
            value={adj_email}
            onChange={e => onUpdateField('adj_email', e.target.value)}
            placeholder="adjuster@email.com"
          />
        </div>
      </div>

      {/* Additional adjusters */}
      {additional_adjusters.map((aa, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mt-2 items-end">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              value={aa.name}
              onChange={e => onUpdateAdjuster(i, 'name', e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input
              type="tel"
              value={aa.phone}
              onChange={e => onUpdateAdjuster(i, 'phone', e.target.value)}
              placeholder="(555) 555-5555"
            />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input
              type="email"
              value={aa.email}
              onChange={e => onUpdateAdjuster(i, 'email', e.target.value)}
              placeholder="adjuster@email.com"
            />
          </div>
          <button
            type="button"
            onClick={() => onRemoveAdjuster(i)}
            className="p-2 text-red-400 hover:text-red-300 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onAddAdjuster}
        className="mt-2 flex items-center gap-1 text-xs text-accent hover:text-accent/80 cursor-pointer"
      >
        <Plus className="size-3" /> Add Adjuster
      </button>
    </section>
  )
}
```

**Step 2: Type check and commit**

```bash
cd frontend-next && npx tsc --noEmit
git add frontend-next/src/pages/jobs/components/modals/sections/InsuranceInfoSection.tsx
git commit -m "feat: add InsuranceInfoSection — carrier, claim, policy, deductible, adjusters"
```

---

## Task 6d: PropertyInfoSection Component

**Files:**
- Create: `frontend-next/src/pages/jobs/components/modals/sections/PropertyInfoSection.tsx`

**Context:** Column 3 of Row 1. "Same as Client" toggle copies client address and grays out fields. Year built, property type, address, access info, plus site contacts sub-section.

**Step 1: Create the component**

The component receives both client address fields (for display when "Same" is active) and property fields. When `same_as_client` is true, the address inputs show client values and are disabled with a purple tint.

Key behaviors:
- "Same" toggle button in section header (top-right)
- When Same is active: address inputs show client values, are disabled, have `opacity-50` + purple tint
- Year built and property type are always editable (not affected by Same)
- Site contacts sub-section at bottom with Name, Phone, Email, Relation dropdown, "+ Add Site Contact"

The full component code follows the same patterns as `ClientInfoSection` and `InsuranceInfoSection`. Use `PROPERTY_TYPES`, `US_STATES`, and `SITE_CONTACT_RELATIONS` from `jobConstants.ts`. Use `Building` icon from lucide-react.

**Step 2: Type check and commit**

```bash
cd frontend-next && npx tsc --noEmit
git add frontend-next/src/pages/jobs/components/modals/sections/PropertyInfoSection.tsx
git commit -m "feat: add PropertyInfoSection — same-as-client toggle, year built, site contacts"
```

---

## Task 6e: LossInfoSection Component

**Files:**
- Create: `frontend-next/src/pages/jobs/components/modals/sections/LossInfoSection.tsx`

**Context:** Row 2 in design doc. Full width. Header has 4 inline checkbox toggles (Extraction Required, Ongoing Intrusion, Drywall Debris, Content Manipulation) with cyan accent. Body has a 4-column responsive grid with source of loss, date of loss, water category, damage class, areas affected (2 cols), hazards (2 cols), description (full width).

**Step 1: Create the component**

Key behaviors:
- Section header with `AlertTriangle` icon + "Loss Info" text
- Right side of header: 4 checkboxes using shadcn Checkbox with `data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500` styling
- Body grid: `grid-cols-2 lg:grid-cols-4` responsive layout
- Source of loss uses `loss_type` field name (text input, not select — design doc says text with placeholder)
- Areas affected and hazards span 2 columns
- Description is a textarea spanning full width

**Step 2: Type check and commit**

```bash
cd frontend-next && npx tsc --noEmit
git add frontend-next/src/pages/jobs/components/modals/sections/LossInfoSection.tsx
git commit -m "feat: add LossInfoSection — 4-col grid, header toggles, water/damage selects"
```

---

## Task 6f: TeamSection Component (Internal + External)

**Files:**
- Create: `frontend-next/src/pages/jobs/components/modals/sections/TeamSection.tsx`

**Context:** Row 3 in design doc. Two columns: Internal Members (left) and External Members (right). This is the most complex section.

**Internal Members (left column):**
- 5 role-based pickers using `TEAM_ROLES` constant
- Each picker shows org members filtered by eligible roles
- Shows member name + optional job count
- Multi-select for mitigation_techs, single-select for others
- Uses `useOrgMembers(orgId)` hook — get `orgId` from auth context

**External Members (right column):**
- Search bar that queries `useSearchCrmContacts(search)`
- Search results dropdown showing name, org, phone
- When selecting a contact from search, prompt for job role (using `JOB_CONTACT_ROLES`)
- "+ Create Contact" button opens the `CreateContactMiniModal` (Task 6g)
- Added contacts list showing name + org, role badge, phone, remove button

**Step 1: Create the component**

The component needs these props:
```typescript
interface TeamSectionProps {
  // Internal
  mitigation_pm: string[]
  reconstruction_pm: string[]
  estimator: string[]
  project_coordinator: string[]
  mitigation_techs: string[]
  onUpdateField: (field: string, value: string[]) => void
  // External
  contact_assignments: JobContactAssignment[]
  onAddContactAssignment: (assignment: JobContactAssignment) => void
  onRemoveContactAssignment: (contactId: string) => void
}
```

The component manages its own local state for:
- Search input text
- Role select for new contact assignment
- Whether create contact modal is open

Use `useAuth()` to get the user's org, then `useOrgMembers(orgId)` to get the member list. For each `TEAM_ROLES` entry, filter members by `eligible` roles and render a picker.

For the external column, use `useSearchCrmContacts(searchText)` with a debounced input. Render search results as a dropdown list. When a result is clicked, show a role selector (using `JOB_CONTACT_ROLES`), then call `onAddContactAssignment` with the selected contact + role.

Use `Users` icon from lucide-react.

**Step 2: Type check and commit**

```bash
cd frontend-next && npx tsc --noEmit
git add frontend-next/src/pages/jobs/components/modals/sections/TeamSection.tsx
git commit -m "feat: add TeamSection — role-based employee pickers + CRM contact search"
```

---

## Task 6g: CreateContactMiniModal Component

**Files:**
- Create: `frontend-next/src/pages/jobs/components/modals/sections/CreateContactMiniModal.tsx`

**Context:** Mini modal opened from TeamSection's External Members column. Creates a new CRM contact with basic fields and returns the created contact for immediate assignment to the job.

**Step 1: Create the component**

```tsx
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog.js'
import { Button } from '@/components/ui/button.js'
import { Input } from '@/components/ui/input.js'
import { Label } from '@/components/ui/label.js'
import { useCreateCrmContact } from '@/api/hooks/index.js'
import type { CrmContact } from '@/types/index.js'

interface CreateContactMiniModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (contact: CrmContact) => void
}

const INITIAL = {
  first_name: '',
  last_name: '',
  phone: '',
  ext: '',
  alt_phone: '',
  alt_ext: '',
  email: '',
  organization: '',
}

export function CreateContactMiniModal({ open, onOpenChange, onCreated }: CreateContactMiniModalProps) {
  const [form, setForm] = useState(INITIAL)
  const createContact = useCreateCrmContact()

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleSave() {
    if (!form.first_name.trim()) return
    createContact.mutate(
      {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        ext: form.ext,
        alt_phone: form.alt_phone,
        alt_ext: form.alt_ext,
        email: form.email,
        crm_organization_id: null, // TODO: org search/select
      },
      {
        onSuccess: (contact) => {
          onCreated(contact)
          setForm(INITIAL)
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Contact</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2 space-y-1">
            <Label>Organization</Label>
            <Input
              value={form.organization}
              onChange={e => update('organization', e.target.value)}
              placeholder="Company or org name"
            />
          </div>
          <div className="space-y-1">
            <Label>First Name *</Label>
            <Input
              value={form.first_name}
              onChange={e => update('first_name', e.target.value)}
              placeholder="First name"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label>Last Name</Label>
            <Input
              value={form.last_name}
              onChange={e => update('last_name', e.target.value)}
              placeholder="Last name"
            />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input
              type="tel"
              value={form.phone}
              onChange={e => update('phone', e.target.value)}
              placeholder="(555) 555-5555"
            />
          </div>
          <div className="space-y-1">
            <Label>Ext</Label>
            <Input
              value={form.ext}
              onChange={e => update('ext', e.target.value)}
              placeholder="Ext"
            />
          </div>
          <div className="space-y-1">
            <Label>Alt Phone</Label>
            <Input
              type="tel"
              value={form.alt_phone}
              onChange={e => update('alt_phone', e.target.value)}
              placeholder="(555) 555-5555"
            />
          </div>
          <div className="space-y-1">
            <Label>Alt Ext</Label>
            <Input
              value={form.alt_ext}
              onChange={e => update('alt_ext', e.target.value)}
              placeholder="Ext"
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              placeholder="email@example.com"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleSave}
            disabled={!form.first_name.trim() || createContact.isPending}
          >
            {createContact.isPending ? 'Saving...' : 'Save Contact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Type check and commit**

```bash
cd frontend-next && npx tsc --noEmit
git add frontend-next/src/pages/jobs/components/modals/sections/CreateContactMiniModal.tsx
git commit -m "feat: add CreateContactMiniModal — inline CRM contact creation from job form"
```

---

## Task 6h: ReferralSection Component

**Files:**
- Create: `frontend-next/src/pages/jobs/components/modals/sections/ReferralSection.tsx`

**Context:** Row 4 in design doc. Full width. Referral source dropdown, referred by text field (marketer name for bonus attribution), how heard text, internal notes textarea.

**Step 1: Create the component**

```tsx
import { Share2 } from 'lucide-react'
import { Input } from '@/components/ui/input.js'
import { Label } from '@/components/ui/label.js'
import { Textarea } from '@/components/ui/textarea.js'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js'
import { REFERRAL_SOURCES } from '@/pages/jobs/utils/jobConstants.js'

interface ReferralSectionProps {
  referral_source: string
  referred_by: string
  how_heard: string
  internal_notes: string
  onUpdateField: (field: string, value: string) => void
}

export function ReferralSection({
  referral_source,
  referred_by,
  how_heard,
  internal_notes,
  onUpdateField,
}: ReferralSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Share2 className="size-4 text-accent" />
        <h3 className="font-medium text-sm text-text-secondary uppercase tracking-wider">
          Referral & Tracking
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="cj-referral-source">Referral Source</Label>
          <Select value={referral_source} onValueChange={v => onUpdateField('referral_source', v)}>
            <SelectTrigger id="cj-referral-source">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {REFERRAL_SOURCES.map(rs => (
                <SelectItem key={rs.value} value={rs.value}>{rs.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="cj-referred-by">Referred By</Label>
          <Input
            id="cj-referred-by"
            value={referred_by}
            onChange={e => onUpdateField('referred_by', e.target.value)}
            placeholder="Marketer or person name"
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label htmlFor="cj-how-heard">How They Heard</Label>
          <Input
            id="cj-how-heard"
            value={how_heard}
            onChange={e => onUpdateField('how_heard', e.target.value)}
            placeholder="Details..."
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label htmlFor="cj-internal-notes">Internal Notes</Label>
          <Textarea
            id="cj-internal-notes"
            rows={2}
            value={internal_notes}
            onChange={e => onUpdateField('internal_notes', e.target.value)}
            placeholder="Private notes for the team..."
          />
        </div>
      </div>
    </section>
  )
}
```

**Step 2: Type check and commit**

```bash
cd frontend-next && npx tsc --noEmit
git add frontend-next/src/pages/jobs/components/modals/sections/ReferralSection.tsx
git commit -m "feat: add ReferralSection — referral source, referred by, how heard, notes"
```

---

## Task 7: Assemble CreateJobModal — Wire Sections Into Responsive Grid

**Files:**
- Modify: `frontend-next/src/pages/jobs/components/modals/CreateJobModal.tsx` (complete rewrite)

**Context:** Replace the current 519-line single-column modal with the full 3-column responsive layout that wires all section components to the `useCreateJobForm` hook. After job creation, link any CRM contact assignments via `POST /api/apex-crm/jobs/:jobId/contacts`.

**Step 1: Rewrite CreateJobModal.tsx**

The new modal:
- Uses `sm:max-w-6xl` width (was `sm:max-w-2xl`)
- Uses `useCreateJobForm()` hook for all state
- Layout structure:
  1. `JobSetupSection` — full width
  2. 3-column grid (`grid-cols-1 sm:grid-cols-2 xl:grid-cols-3`) containing:
     - `ClientInfoSection`
     - `InsuranceInfoSection`
     - `PropertyInfoSection`
  3. `LossInfoSection` — full width
  4. `TeamSection` — full width (internally 2 columns)
  5. `ReferralSection` — full width
- Footer: "* Required field" hint (left), Cancel + Create Job buttons (right)
- Submit button disabled until `isValid` is true
- On submit: create job, then for each `contact_assignment`, call `linkJobContact` mutation
- On success: reset form, close modal, call `onSuccess`

Key implementation detail for CRM contact linking after job creation:

```typescript
async function handleSubmit() {
  const data = buildSubmitData()
  createJob.mutate(data as unknown as CreateApexJobData, {
    onSuccess: async (newJob) => {
      // Link CRM contacts to the newly created job
      for (const assignment of form.contact_assignments) {
        try {
          await apiClient.post(`/apex-crm/jobs/${newJob.id}/contacts`, {
            contact_id: assignment.contact_id,
            job_role: assignment.job_role,
          })
        } catch (err) {
          console.error('Failed to link contact:', err)
        }
      }
      reset()
      onOpenChange(false)
      onSuccess?.()
    },
  })
}
```

Import all section components from the `./sections/` directory. Import the form hook from `@/pages/jobs/hooks/useCreateJobForm.js`.

**Step 2: Type check**

```bash
cd frontend-next && npx tsc --noEmit
```

**Step 3: Verify dev server loads**

```bash
cd frontend-next && npm run dev
```

Open browser, navigate to Jobs page, click "New Job" button. The modal should open with the full 3-column layout.

**Step 4: Commit**

```bash
git add frontend-next/src/pages/jobs/components/modals/CreateJobModal.tsx
git commit -m "feat: rebuild CreateJobModal — full 3-column layout with all sections wired"
```

---

## Task 8: Visual Verification

**Files:** None (read-only verification)

**Context:** Use Chrome browser automation to verify the modal renders correctly with all sections visible, responsive layout works, and the form is functional.

**Step 1: Open the app in Chrome**

Navigate to `http://localhost:5174/apex/jobs`

**Step 2: Open the New Job modal**

Click the "New Job" button in the jobs toolbar.

**Step 3: Verify sections**

Check the following are visible:
1. Job Setup — 6 toggle buttons in a row (MIT, RPR, RMD, ABT, REM, FR)
2. Client Info — Name, Phone fields with asterisks
3. Insurance Info — Carrier, Claim #, Policy #, Deductible, Adjuster sub-section
4. Property Info — "Same" toggle, Year Built, Property Type, address fields
5. Loss Info — Header toggles (Extraction, Ongoing, Drywall, Content), 4-column grid
6. Team — Two columns: Internal Members (role pickers) and External Members (search bar)
7. Referral & Tracking — Source dropdown, Referred By, How Heard, Notes

**Step 4: Test responsive layout**

Resize browser window to verify:
- >1280px: 3 columns for Client/Insurance/Property
- <=1280px: 2 columns (Property goes full width)
- <=640px: 1 column stacked

**Step 5: Test required field validation**

Verify the "Create Job" button is disabled. Enter a client name + phone + select one job type. Button should become enabled.

**Step 6: Test "Same as Client" toggle**

Enter a client address. Check "Same" on Property. Property address fields should show client values and be disabled.

**Step 7: Test "+ Add Client" and "+ Add Adjuster"**

Click "+ Add Client". A new name/phone/email row should appear. Click the red X to remove it. Same for "+ Add Adjuster".

**Step 8: Screenshot and report**

Take a screenshot showing the full modal layout. Report any visual issues found.

---

## Summary of All Files

**Created:**
- `frontend-next/src/pages/jobs/hooks/useCreateJobForm.ts`
- `frontend-next/src/api/hooks/useOrgMembers.ts`
- `frontend-next/src/pages/jobs/components/modals/sections/JobSetupSection.tsx`
- `frontend-next/src/pages/jobs/components/modals/sections/ClientInfoSection.tsx`
- `frontend-next/src/pages/jobs/components/modals/sections/InsuranceInfoSection.tsx`
- `frontend-next/src/pages/jobs/components/modals/sections/PropertyInfoSection.tsx`
- `frontend-next/src/pages/jobs/components/modals/sections/LossInfoSection.tsx`
- `frontend-next/src/pages/jobs/components/modals/sections/TeamSection.tsx`
- `frontend-next/src/pages/jobs/components/modals/sections/CreateContactMiniModal.tsx`
- `frontend-next/src/pages/jobs/components/modals/sections/ReferralSection.tsx`

**Modified:**
- `backend/src/db/init.sql` (add `referred_by` column + migration)
- `backend/src/db/apexJobs.js` (add `referred_by` to createJob + updateJob)
- `frontend-next/src/types/job.ts` (add missing fields + helper types)
- `frontend-next/src/pages/jobs/utils/jobConstants.ts` (add FR, referral sources, team roles, etc.)
- `frontend-next/src/api/hooks/useContacts.ts` (add search + job linking hooks)
- `frontend-next/src/api/hooks/index.ts` (export new hooks)
- `frontend-next/src/pages/jobs/components/modals/CreateJobModal.tsx` (complete rewrite)
