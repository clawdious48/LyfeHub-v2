# New Job Modal - Job Type Selection — Implementation Plan

**Feature:** Add Job Type Selection and Job Number sections to the top of the New Job modal
**Reference:** `resources/apex-integration/NEW-JOB-MODAL-REFERENCE.md`
**Created:** 2026-02-06

---

## Evals (Acceptance Criteria)

### E1: Job Type Toggle Buttons
- [ ] Five toggle buttons visible: Mitigation (MIT), Reconstruction (RPR), Remodel (RMD), Abatement (ABT), Remediation (REM)
- [ ] Buttons display both name and code (e.g., "Mitigation (MIT)")
- [ ] Multiple buttons can be selected simultaneously
- [ ] Selected buttons have distinct active state (neon glow/highlight per style guide)
- [ ] Clicking a selected button deselects it

### E2: Job Numbers Section
- [ ] Job Numbers section is hidden when no job types selected
- [ ] Job Numbers section appears when at least one job type is selected
- [ ] One input field appears per selected job type, labeled with the type code
- [ ] Each input has a "Generate" button (wand icon) next to it
- [ ] Inputs disappear when their corresponding job type is deselected

### E3: Auto-Generate Job Number
- [ ] Clicking "Generate" button populates the job number field
- [ ] Generated format: `YYYYMM-###-TYPE` (e.g., 202602-001-MIT)
- [ ] Generate button shows loading state while generating
- [ ] API call: `GET /api/projects/next-job-number?job_type=TYPE` (mock if backend doesn't exist)

### E4: Form Validation
- [ ] "Create Job" button disabled when no job types selected
- [ ] "Create Job" button disabled when any selected job type is missing its job number
- [ ] "Create Job" button enabled only when all selected types have job numbers filled in
- [ ] Client Name requirement still enforced (existing behavior)

### E5: Layout & Styling
- [ ] New section appears at top of modal (above Client Info row)
- [ ] Section spans full width (all 3 columns)
- [ ] Follows existing LyfeHub neon glassmorphic style
- [ ] Responsive layout works on tablet/mobile views

---

## Task List

| ID | Task | Depends On | Parallel Group |
|----|------|------------|----------------|
| T1 | Add HTML structure for Job Type section | — | A |
| T2 | Add CSS for job type buttons and layout | T1 | B |
| T3 | Add CSS for job numbers inputs | T1 | B |
| T4 | Update grid layout (shift rows down) | T1 | B |
| T5 | Add JS: Job type toggle logic | T1 | B |
| T6 | Add JS: Dynamic job number inputs | T5 | C |
| T7 | Add JS: Generate button functionality | T6 | D |
| T8 | Add JS: Form validation update | T6 | D |
| T9 | Test & fix integration | T7, T8 | E |

---

## Execution Order

**Phase A:** T1 — HTML structure (foundation)
**Phase B (Parallel):** T2, T3, T4, T5 — CSS + initial JS (all depend on HTML only)
**Phase C:** T6 — Dynamic job numbers (needs toggle logic)
**Phase D (Parallel):** T7, T8 — Generate + validation (both need job number inputs)
**Phase E:** T9 — Integration testing and fixes

---

## Post-Implementation

1. **Code Review** — Sub-agent reviews codebase for quality, bugs, consistency
2. **QA via Browser Agent** — Sub-agent tests all evals against running app at :3002
3. **Report** — Complete only after all evals pass

---

## Status

**[X] Awaiting Approval**
