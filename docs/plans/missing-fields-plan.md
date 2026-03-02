# Missing Fields — Implementation Plan

**Feature:** Add missing Apex.Dev fields + job role assignments to LyfeHub New Job modal
**Reference:** `resources/apex-integration/NEW-JOB-MODAL-REFERENCE.md`
**Created:** 2026-02-06

---

## Evals (Acceptance Criteria)

### E1: Rename Loss Type → Source of Loss
- [ ] Existing "Loss Type" field renamed to "Source of Loss"
- [ ] Label updated in HTML
- [ ] Form field name remains `loss_type` (or update to `source_of_loss`)

### E2: Water Category Dropdown
- [ ] Dropdown appears in Loss Info section
- [ ] Options: "Select category...", "Cat 1 - Clean Water", "Cat 2 - Gray Water", "Cat 3 - Black Water"
- [ ] Value stored in form data as `water_category`

### E3: Damage Class Dropdown
- [ ] Dropdown appears in Loss Info section (next to Water Category)
- [ ] Options: "Select class...", "Class 1 - Minimal", "Class 2 - Significant", "Class 3 - Extensive", "Class 4 - Specialty"
- [ ] Value stored in form data as `damage_class`

### E4: Deductible Field
- [ ] Currency input appears in Insurance Info section
- [ ] Placeholder shows "$" or "0.00" format
- [ ] Accepts decimal values (step=0.01)
- [ ] Value stored in form data as `deductible`

### E5: Assign Contacts Section
- [ ] New section appears at bottom of form (before footer)
- [ ] Search input with placeholder "Search contacts..."
- [ ] Contact list area (can show "No contacts found" for now since no backend)
- [ ] Follows existing section styling (glass card, header with icon)

### E6: Job Role Assignments
- [ ] Five role multi-select fields appear in Assignment section
- [ ] Mitigation PM (multi-select)
- [ ] Reconstruction PM (multi-select)
- [ ] Estimator (multi-select)
- [ ] Project Coordinator (multi-select)
- [ ] Mitigation Technician(s) (multi-select)
- [ ] All fields support selecting multiple people
- [ ] Values stored as arrays: `mitigation_pm`, `reconstruction_pm`, `estimator`, `project_coordinator`, `mitigation_techs`

### E7: Layout & Styling
- [ ] All new fields match existing LyfeHub neon glassmorphic style
- [ ] Water Category and Damage Class appear side-by-side in Loss Info
- [ ] Deductible appears below Policy # in Insurance Info
- [ ] 5 role multi-selects organized cleanly in Assignment section
- [ ] Assign Contacts section spans full width at bottom
- [ ] Responsive layout maintained

---

## Task List

| ID | Task | Depends On | Parallel Group |
|----|------|------------|----------------|
| T1 | Rename "Loss Type" → "Source of Loss" | — | A |
| T2 | Add Water Category dropdown HTML | — | A |
| T3 | Add Damage Class dropdown HTML | — | A |
| T4 | Add Deductible input HTML | — | A |
| T5 | Add Assign Contacts section HTML | — | A |
| T6 | Add Job Role multi-selects HTML (5 roles) | — | A |
| T7 | Add CSS for new fields (if needed) | T1-T6 | B |
| T8 | Update grid layout for Contacts section | T5 | B |
| T9 | Verify form data collection includes new fields | T1-T6 | B |

---

## Execution Order

**Phase A (Parallel):** T1-T6 — All HTML changes (independent)
**Phase B (Parallel):** T7-T9 — CSS + form data verification

---

## Post-Implementation

1. **Code Review** — Sub-agent reviews for quality/consistency
2. **QA via Browser Agent** — Open modal at :3002, verify all evals pass visually
3. **Report** — Complete only after all evals pass

---

## Status

**[X] Awaiting Approval**
