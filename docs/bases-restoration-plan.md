# Restore Bases Section + Add Books Base — Implementation Plan

**Feature:** Restore the Bases tab to navigation and seed a Books base from UB3 schema
**Reference:** `docs/ultimate-brain-3-schema.md` (Section 9: Books)
**Created:** 2026-06-23

---

## Evals (Acceptance Criteria)

### E1: Bases Tab Visible in Navigation
- [ ] "Bases" tab appears in the top nav bar (desktop)
- [ ] "Bases" tab appears in mobile drawer/nav
- [ ] Clicking the tab loads the Bases section with sidebar + content area
- [ ] Core bases (People, Organizations, Tasks, Notes, Projects, Tags) display in the sidebar under "Core Bases"

### E2: Books Base Exists and is Functional
- [ ] A "Books" custom base exists in the bases list
- [ ] Books base has correct properties from UB3 schema: Title (text), Author (text), Status (select: Want to Read / Reading / Finished / Abandoned), Pages (number), Date Started (date), Date Finished (date), Rating (select: ⭐-⭐⭐⭐⭐⭐), Description (text), Read Next (checkbox), Owned Formats (multi_select: Physical / Kindle / Audiobook / PDF), Image (url)
- [ ] Can create a new book record via the UI
- [ ] Can view/edit book records
- [ ] Default table view works

### E3: No Regressions
- [ ] Existing features (Dashboard, Tasks, Notes, People, Apex) still work
- [ ] No console errors on page load
- [ ] Mobile navigation still works correctly

---

## Task List

| ID | Task | Depends On | Parallel Group |
|----|------|------------|----------------|
| T1 | Add "Bases" tab button back to nav bar in `index.html` (between existing tabs) | — | A |
| T2 | Verify drawer.js already has bases entry (confirmed: line 24) | — | A |
| T3 | Seed Books base into prod DB via API (create base + add all properties) | T1 | B |
| T4 | Rebuild and deploy production container | T1, T3 | C |
| T5 | Browser QA — verify bases tab, core bases, Books base, create a test record | T4 | D |

---

## Execution Order

**Phase A (Parallel):** T1, T2 — Nav restoration + drawer verification
**Phase B:** T3 — Seed Books base (needs the app deployed with nav fix first... actually, the API already exists, we just need the nav visible to verify. We can seed via API independently.)
**Phase C:** T4 — Deploy
**Phase D:** T5 — QA

---

## Implementation Details

### T1: Add Bases Tab to Nav
In `frontend/index.html` line ~67, add before the settings tab:
```html
<button class="tab" data-tab="bases">Bases</button>
```

### T3: Seed Books Base
Use the existing `/api/bases` POST endpoint to create the base, then `/api/bases/:id/properties` to add each property. This matches the UB3 Books schema (Section 9 of `ultimate-brain-3-schema.md`).

Properties to create:
1. Title (text) — primary/title field
2. Author (text)
3. Status (select) — Want to Read, Reading, Finished, Abandoned
4. Pages (number)
5. Date Started (date)
6. Date Finished (date)
7. Rating (select) — ⭐, ⭐⭐, ⭐⭐⭐, ⭐⭐⭐⭐, ⭐⭐⭐⭐⭐
8. Description (text)
9. Read Next (checkbox)
10. Owned Formats (multi_select) — Physical, Kindle, Audiobook, PDF
11. Image (url)

---

## Status

**[ ] Awaiting Approval**
