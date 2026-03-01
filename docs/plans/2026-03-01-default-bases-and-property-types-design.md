# Default Bases & Property Type Expansion — Design Doc

**Date:** 2026-03-01
**Status:** Approved
**Scope:** Backend migration + seed system + 7 new property types + 5 default bases + frontend cell components

---

## Summary

Expand the Bases property type system from 8 to 15 types and seed 5 default bases (Tasks, Projects, Notes, Tags, People) inspired by Ultimate Brain 3.0. Default bases are real rows in the `bases`/`base_records` tables — same code path as user-created bases. Module pages (Tasks, People, etc.) will use their corresponding default base as a data source with custom UIs.

## Decisions

1. **Real seeded bases** — Default bases are actual rows in `bases`/`base_records`, not virtual mapped tables
2. **5 default bases** — Tasks, Projects, Notes, Tags, People
3. **15 property types** — Current 8 + email, phone, files, rich_text, status, created_time, last_edited_time
4. **Backend seed on first login** — Idempotent `seedDefaultBases(userId)` in a transaction
5. **Custom page UI, base as data source** — Module pages have their own UI but pull all data from their default base

---

## Property Type Expansion (8 → 15)

### New Types

| Type | Storage | Editor | Read-only? | Notes |
|------|---------|--------|------------|-------|
| `email` | TEXT in values | Text input + validation | No | Renders as `mailto:` link |
| `phone` | TEXT in values | Text input | No | Renders as `tel:` link |
| `files` | JSON array in values | File upload modal | No | `[{name, url, size, type}]` — component already exists |
| `rich_text` | TEXT in values (markdown) | Textarea (taller) | No | Truncated preview in table cells |
| `status` | TEXT in values (option label) | Grouped dropdown | No | Options have `group: 'todo' \| 'in_progress' \| 'complete'` |
| `created_time` | Read from `base_records.created_at` | None | **Yes** | Injected by API, not stored in values |
| `last_edited_time` | Read from `base_records.updated_at` | None | **Yes** | Injected by API, not stored in values |

### Status Type

Like `select` but with workflow groups:

```typescript
interface StatusOption {
  label: string
  color: string
  group: 'todo' | 'in_progress' | 'complete'
}
```

Enables kanban grouping and progress visualization.

### Auto-Populated Types

`created_time` and `last_edited_time` don't store data in `values`. The API injects them from `base_records.created_at`/`updated_at` when returning records. No editor — always read-only.

### Backend Migration

```sql
ALTER TABLE base_properties DROP CONSTRAINT IF EXISTS base_properties_type_check;
ALTER TABLE base_properties ADD CONSTRAINT base_properties_type_check
  CHECK(type IN ('text','number','select','multi_select','date','checkbox','url','relation',
                 'email','phone','files','rich_text','status','created_time','last_edited_time'));

ALTER TABLE bases ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;
ALTER TABLE base_properties ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;
```

---

## Default Base Schemas

### Tasks Base

| # | Property | Type | Options/Notes |
|---|----------|------|---------------|
| 1 | Name | text | Task title |
| 2 | Description | rich_text | Task notes/details |
| 3 | Status | status | To Do (todo), Doing (in_progress), Done (complete) |
| 4 | Priority | status | Low (todo), Medium (in_progress), High (in_progress) |
| 5 | Due | date | Due date |
| 6 | Snooze | date | Hide until this date |
| 7 | Completed | date | When marked done |
| 8 | Wait Date | date | Blocked/delegated date |
| 9 | Energy | select | High, Low |
| 10 | Location | select | Home, Office, Errand |
| 11 | Labels | multi_select | User-defined tags |
| 12 | Smart List | select | Do Next, Delegated, Someday |
| 13 | My Day | checkbox | Flag for today's focus |
| 14 | Recur Interval | number | How often (1, 2, 3...) |
| 15 | Recur Unit | select | Day(s), Week(s), Month(s), Year(s) |
| 16 | Days | multi_select | Mon, Tue, Wed, Thu, Fri, Sat, Sun |
| 17 | Created | created_time | Auto |
| 18 | Edited | last_edited_time | Auto |
| 19 | Project | relation | → Projects base |
| 20 | People | relation | → People base |
| 21 | Parent Task | relation | → Tasks (self-ref) |
| 22 | Sub-Tasks | relation | → Tasks (self-ref, reverse of Parent Task) |

### Projects Base

| # | Property | Type | Options/Notes |
|---|----------|------|---------------|
| 1 | Name | text | Project name |
| 2 | Status | status | Planned (todo), On Hold (todo), Doing (in_progress), Ongoing (in_progress), Done (complete) |
| 3 | Target Deadline | date | Planned completion |
| 4 | Completed | date | Actual completion |
| 5 | Archived | checkbox | Soft-delete |
| 6 | Review Notes | rich_text | Quick notes |
| 7 | Created | created_time | Auto |
| 8 | Edited | last_edited_time | Auto |
| 9 | Tasks | relation | → Tasks base (reverse of Tasks.Project) |
| 10 | Notes | relation | → Notes base (reverse of Notes.Project) |
| 11 | Tag | relation | → Tags base |
| 12 | People | relation | → People base |

### Notes Base

| # | Property | Type | Options/Notes |
|---|----------|------|---------------|
| 1 | Name | text | Note title |
| 2 | Type | select | Journal, Meeting, Web Clip, Reference, Idea, Plan, Recipe, Voice Note, Quote |
| 3 | Content | rich_text | Main note body |
| 4 | Archived | checkbox | Soft-delete |
| 5 | Favorite | checkbox | Pin important |
| 6 | Note Date | date | Manual date |
| 7 | Review Date | date | When to review |
| 8 | URL | url | Source link |
| 9 | Image | files | Attached images |
| 10 | Created | created_time | Auto |
| 11 | Updated | last_edited_time | Auto |
| 12 | Tag | relation | → Tags base |
| 13 | Project | relation | → Projects base |
| 14 | People | relation | → People base |

### Tags Base (PARA)

| # | Property | Type | Options/Notes |
|---|----------|------|---------------|
| 1 | Name | text | Tag name |
| 2 | Type | status | Area (in_progress/orange), Resource (in_progress/purple), Entity (in_progress/green) |
| 3 | Archived | checkbox | Soft-delete |
| 4 | Favorite | checkbox | Pin for quick access |
| 5 | Date | date | Reference date |
| 6 | URL | url | External link |
| 7 | Created | created_time | Auto |
| 8 | Edited | last_edited_time | Auto |
| 9 | Notes | relation | → Notes base (reverse of Notes.Tag) |
| 10 | Projects | relation | → Projects base (reverse of Projects.Tag) |
| 11 | People | relation | → People base |
| 12 | Parent Tag | relation | → Tags (self-ref) |
| 13 | Sub-Tags | relation | → Tags (self-ref, reverse of Parent Tag) |

### People Base

| # | Property | Type | Options/Notes |
|---|----------|------|---------------|
| 1 | Full Name | text | Display name |
| 2 | Email | email | Primary email |
| 3 | Secondary Email | email | Work/claims email |
| 4 | Phone | phone | Contact number |
| 5 | Website | url | Personal site |
| 6 | LinkedIn | url | Profile link |
| 7 | Twitter/X | url | Profile link |
| 8 | Instagram | url | Profile link |
| 9 | Location | text | City/state |
| 10 | Company | multi_select | Employer(s) |
| 11 | Title | text | Job title |
| 12 | Industry | select | Insurance, HVAC, Plumbing, Electrical, etc. |
| 13 | Relationship | multi_select | Friend, Family, Client, Vendor, Colleague, etc. |
| 14 | Interests | multi_select | User-defined |
| 15 | How Met | rich_text | Origin story |
| 16 | Birthday | date | Birth date |
| 17 | Last Check-In | date | Most recent contact |
| 18 | Next Check-In | date | Scheduled follow-up |
| 19 | Pipeline Status | status | Prospect (todo), Contacted (in_progress), Negotiating (in_progress), Closed (complete), Rejected (complete) |
| 20 | Created | created_time | Auto |
| 21 | Edited | last_edited_time | Auto |
| 22 | Tags | relation | → Tags base |
| 23 | Notes | relation | → Notes base |
| 24 | Tasks | relation | → Tasks base |
| 25 | Projects | relation | → Projects base |

---

## Relation Map (10 Bidirectional Pairs)

```
Tasks.Project      ↔  Projects.Tasks
Tasks.People       ↔  People.Tasks
Tasks.Parent Task  ↔  Tasks.Sub-Tasks     (self-ref)
Projects.Notes     ↔  Notes.Project
Projects.Tag       ↔  Tags.Projects
Projects.People    ↔  People.Projects
Notes.Tag          ↔  Tags.Notes
Notes.People       ↔  People.Notes
Tags.People        ↔  People.Tags
Tags.Parent Tag    ↔  Tags.Sub-Tags       (self-ref)
```

---

## Seeding Architecture

### New File: `backend/src/db/defaultBases.js`

Contains:
- `DEFAULT_BASES` config object — defines all 5 bases with their properties
- `seedDefaultBases(userId)` — transactional function that creates bases + properties + relations
- Idempotent: checks for existing default bases by name + is_default flag, skips those that exist

### Seed Trigger

Called from the login/auth flow:
1. After successful auth, check if user has any bases with `is_default = true`
2. If not, call `seedDefaultBases(userId)` inside a transaction
3. Creates 5 bases, ~85 properties, 10 bidirectional relation pairs

### Convenience Endpoint

`GET /api/bases/default/:name` — Returns the default base by canonical name (Tasks, Projects, Notes, Tags, People) for the authenticated user. Used by module pages.

### Protection Rules

- Default bases (`is_default = true`) cannot be deleted (API returns 403, UI hides option)
- Default properties (`is_default = true`) cannot be deleted (API returns 403, UI hides option)
- Default bases CAN be renamed, re-iconed, moved to groups
- Default properties CAN be hidden via views
- Users CAN add custom properties to default bases
- Users CAN add custom records (that's the whole point)

---

## Frontend Changes

### New Cell Components (10 files)

```
cells/CellEmail.tsx            — mailto: link renderer
cells/CellEmailEditor.tsx      — Email input with validation
cells/CellPhone.tsx            — tel: link renderer
cells/CellPhoneEditor.tsx      — Phone input
cells/CellRichText.tsx         — Truncated markdown preview
cells/CellRichTextEditor.tsx   — Textarea editor (taller)
cells/CellStatus.tsx           — Colored badge with group indicator
cells/CellStatusEditor.tsx     — Grouped dropdown (todo/in_progress/complete sections)
cells/CellCreatedTime.tsx      — Read-only formatted timestamp
cells/CellLastEditedTime.tsx   — Read-only formatted timestamp
```

`CellFiles.tsx` already exists — just register as official type.

### Updated Files

| File | Changes |
|------|---------|
| `types/base.ts` | Add 7 types to union, add `StatusOption` interface |
| `baseConstants.ts` | Add 7 entries to `PROPERTY_TYPES`, filter operators for new types |
| `baseHelpers.ts` | Filter/sort/display logic for new types |
| `BaseTableRow.tsx` | Cell renderer switch cases for new types |
| `BaseTableBody.tsx` | Skip editor for read-only types |
| `useBases.ts` | Add `useDefaultBase(name)` hook |
| `PropertyTypeSelect.tsx` | Show new types in picker |
| `AddPropertyModal.tsx` | Handle status options (group field) |
| `EditPropertyModal.tsx` | Handle status options editing |
| `EditOptionsModal.tsx` | Add group selector for status options |

### Backend Changes

| File | Changes |
|------|---------|
| `db/init.sql` | Expand CHECK constraint, add is_default columns |
| `db/defaultBases.js` | New file — seed config + function |
| `routes/bases.js` | Seed trigger, protection logic, default base endpoint, inject created_time/last_edited_time |

---

## What This Does NOT Include

- No custom page UIs for Tasks/People/Notes/etc. (separate future work — those pages will be built later using `useDefaultBase()`)
- No formula/rollup/computed field engine
- No changes to the existing base list/detail/sidebar UI
- No changes to the relation sync system
- No mobile-specific work
