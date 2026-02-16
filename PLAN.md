# Drying Log Improvements — Implementation Plan

## Feature 1: Chamber Placeholder Names
**Effort:** Small | **Risk:** Low

### What
In dryingSetup.js step 0 (Create Chambers), the chamber name input shows "Chamber N" as HTML placeholder. If user saves without typing a name, the placeholder text becomes the actual name.

### Files to Modify
- `frontend/js/dryingSetup.js` — `_renderStep3()` (step 0 = chambers step): Change `<input>` to use `placeholder="Chamber N"` based on index. On save/blur, if value is empty, set value to placeholder text.
- `backend/src/routes/drying.js` — POST `/chambers`: Allow empty name, default to server-side "Chamber N" fallback (defensive).

### Tasks
1. **[FE]** In `_renderStep3()`, compute placeholder per chamber: `Chamber ${index + 1}`. Set as HTML `placeholder` attribute.
2. **[FE]** On chamber name blur/save, if input is empty, use placeholder value as the name before API call.
3. **[FE]** When adding a new chamber via "+ Add Chamber", auto-set placeholder to next number.
4. **[BE]** In POST `/chambers`, if `name` is empty/missing, generate default name `Chamber N` from count+1. Remove the 400 error for missing name.

### Dependencies
None — standalone.

---

## Feature 2: Chamber Floor Level Selector
**Effort:** Medium | **Risk:** Medium (DB migration)

### What
Optional dropdown on each chamber card in setup wizard. Default "Main Level". Options: Basement/Crawlspace, Main Level, Floor 2–25.

### DB Migration Required
```sql
ALTER TABLE drying_chambers ADD COLUMN floor_level TEXT DEFAULT 'main_level';
```

### Files to Modify
- `backend/src/db/init.sql` — Add `floor_level` column to `drying_chambers` CREATE TABLE.
- `backend/src/db/dryingLogs.js` — Update `insertChamber()`, `updateChamber()`, `getChamberById()` to include `floor_level`.
- `backend/src/routes/drying.js` — Accept `floor_level` in POST/PATCH `/chambers`.
- `frontend/js/dryingSetup.js` — Add dropdown to chamber card in `_renderStep3()`.
- `frontend/js/dryingUtils.js` — Add `FLOOR_LEVELS` constant array.

### Floor Level Options
```js
FLOOR_LEVELS: [
  { key: 'basement', label: 'Basement/Crawlspace' },
  { key: 'main_level', label: 'Main Level' },
  ...Array.from({length: 24}, (_, i) => ({ key: `floor_${i+2}`, label: `Floor ${i+2}` }))
]
```

### Tasks
1. **[DB]** Write and run migration to add `floor_level` column.
2. **[BE]** Update dryingLogs.js CRUD functions for floor_level.
3. **[BE]** Update routes to accept/return floor_level.
4. **[FE]** Add FLOOR_LEVELS constant to dryingUtils.js.
5. **[FE]** Add `<select>` dropdown to chamber card in `_renderStep3()`.
6. **[FE]** Wire change event to PATCH chamber API.
7. **[FE]** Display floor level in atmospheric section headers (optional, nice-to-have).

### Dependencies
- Tasks 2–3 depend on Task 1.
- Tasks 5–7 depend on Tasks 2–4.

---

## Feature 3: Visit History — Chronological (Oldest First)
**Effort:** Tiny | **Risk:** None

### What
Currently `_renderDryingLogView` in jobDetailTabs.js reverses visits (newest first). Change to oldest first. Use cards/list format (already cards).

### Files to Modify
- `frontend/js/jobDetailTabs.js` — `_renderDryingLogView()`: Remove `.reverse()` on line that builds visitCards.

### Tasks
1. **[FE]** In `_renderDryingLogView`, change `visits.slice().reverse()` → `visits.slice()` (already sorted by visit_number ascending from API).

### Dependencies
None.

---

## Feature 4: Photos Below Notes (Not Inside)
**Effort:** Small | **Risk:** Low

### What
In dryingVisit.js, photos are currently rendered inside the notes textarea area. Move photo upload/display below the notes textarea with no header — just the thumbnails.

### Files to Modify
- `frontend/js/dryingVisit.js` — `_renderNotesSection()`: Restructure HTML so photo upload + thumbnails appear below the textarea, outside the notes container. Remove "Add Photos" label text, keep just the `+` button or a camera icon.
- `frontend/js/dryingVisit.js` — `_renderReadOnlyNotes()`: Move photo thumbnails below note text, remove any wrapping inside the note card.

### Tasks
1. **[FE]** In `_renderNotesSection()` (input mode): Move `.dry-photo-upload` and `#dv-photo-thumbs` outside/below the notes `<div>`, remove "Add Photos" text label.
2. **[FE]** In `_renderReadOnlyNotes()`: Render photos after all note text blocks, no header.
3. **[CSS]** Minor spacing adjustments if needed.

### Dependencies
None.

---

## Feature 5: Notes Duplication to Job Dashboard
**Effort:** Medium | **Risk:** Medium (cross-module coupling)

### What
When a drying visit note is saved, also create a corresponding note in the job's main Notes tab (apex_job_notes). Prefix with visit info for context.

### Files to Modify
- `backend/src/routes/drying.js` — POST `/visits/:visitId/notes`: After inserting drying note, also insert into apex_job_notes.
- `backend/src/routes/drying.js` — POST `/visits/:visitId/save`: If the save payload includes note text, duplicate to job notes after saving.
- `frontend/js/dryingVisit.js` — `_save()` method: No change needed if backend handles duplication.

### Note Format for Job Dashboard
```
[Drying Visit #N — {date}] {note content}
```
Type: `site_visit`

### Tasks
1. **[BE]** In the visit note creation route, after inserting drying note, also call the job notes insert function with formatted content.
2. **[BE]** Look up visit number and date for the prefix. Resolve job_id from the log.
3. **[BE]** Use note_type = `site_visit` and subject = `Drying Visit #N`.
4. **[FE]** No frontend changes needed — job Notes tab auto-refreshes on next view.

### Dependencies
- Needs the existing `apex_job_notes` insert function (already exists via `api.createApexJobNote`).

### Risks/Concerns
- **Duplication on edit**: If a drying note is edited, should the job note update too? For MVP, probably not — only create on initial save.
- **Deletion cascade**: If drying note is deleted, should job note be deleted? Probably not for MVP.
- **Photo references**: Job notes don't support photos — text only. Note content is duplicated, photos are not.

---

## Task Dependency Graph

```
Feature 1 (Placeholders)     ──── standalone
Feature 2 (Floor Level)      ──── DB migration → BE → FE
Feature 3 (Chronological)    ──── standalone (1 line change)
Feature 4 (Photos below)     ──── standalone
Feature 5 (Notes duplication) ──── standalone (BE only)
```

**Recommended order:** 3 → 1 → 4 → 2 → 5
(Easiest wins first, DB migration mid-cycle, cross-module last)

---

## DB Migrations Summary

| # | SQL | Table | Risk |
|---|-----|-------|------|
| 1 | `ALTER TABLE drying_chambers ADD COLUMN floor_level TEXT DEFAULT 'main_level'` | drying_chambers | Low — additive, has default |

---

## Risks & Concerns

1. **Feature 2 (floor_level)** — Only migration needed. Non-breaking since it has a default. Run on prod DB before deploying code.
2. **Feature 5 (notes duplication)** — Cross-module writes. If job notes API changes, this could break. Keep it simple: direct DB insert, not going through the HTTP route.
3. **Feature 1 (placeholders)** — Edge case: user has 3 chambers, deletes #2, adds new one. Placeholder numbering should be based on current count, not historical. Use `chambers.length + 1` for new, and `index + 1` for existing display.
4. **Feature 4 (photos)** — Verify lightbox still works after DOM restructure. Test on mobile.

---

## QA Eval Checklist

### Feature 1: Chamber Placeholder Names
- [ ] New drying setup shows "Chamber 1" as grey placeholder in first chamber name input
- [ ] Adding second chamber shows "Chamber 2" as placeholder
- [ ] Saving chamber without typing a name → name becomes "Chamber 1" (not blank)
- [ ] Typing a custom name → custom name is saved (placeholder ignored)
- [ ] Deleting a chamber and adding new one → placeholder numbers are sequential based on current list

### Feature 2: Chamber Floor Level Selector
- [ ] Dropdown appears on each chamber card in setup wizard
- [ ] Default selection is "Main Level"
- [ ] All options present: Basement/Crawlspace, Main Level, Floor 2–25
- [ ] Changing floor level persists after closing and reopening wizard
- [ ] Floor level value saved in DB (`SELECT floor_level FROM drying_chambers`)
- [ ] New chambers get default "Main Level"

### Feature 3: Visit History Chronological
- [ ] Visit history cards show oldest visit first, newest last
- [ ] Visit numbers still display correctly
- [ ] Clicking a visit card still opens read-only view

### Feature 4: Photos Below Notes
- [ ] In add/edit visit mode: photo upload area appears below the notes textarea
- [ ] No "Photos" or "Add Photos" header text visible
- [ ] Photo thumbnails render below notes, not inside
- [ ] In read-only mode: photos appear below note text
- [ ] Photo lightbox still opens on thumbnail click
- [ ] Mobile layout looks correct

### Feature 5: Notes Duplication
- [ ] Adding a drying visit note → also appears in job's Notes tab
- [ ] Job note has subject "Drying Visit #N" and type "site_visit"
- [ ] Job note content includes the drying note text
- [ ] Deleting the drying note does NOT delete the job note
- [ ] Multiple notes on same visit → each duplicates separately
- [ ] Empty note text → nothing duplicated to job notes
