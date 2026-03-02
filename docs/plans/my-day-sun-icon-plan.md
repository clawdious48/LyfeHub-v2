# My Day Sun Icon — Implementation Plan

**Feature:** Add a sun (☀️) icon to task list items and cards that toggles "Add to My Day" (sets due_date to today). Refactor My Day view to be purely date-driven — only tasks due today appear.

**Created:** 2025-07-27

---

## Evals (Acceptance Criteria)

### E1: Sun Icon Renders on Task Items
- [ ] Sun icon (☀️) appears on every task in **list view** (next to the star/important icon)
- [ ] Sun icon appears on every task in **card view**
- [ ] Sun icon is **filled/highlighted** when the task's `due_date` equals today
- [ ] Sun icon is **outlined/dim** when the task is NOT due today

### E2: Sun Icon Toggle Behavior
- [ ] Clicking sun on a task with no due_date → sets `due_date` to today
- [ ] Clicking sun on a task already due today → clears `due_date` (removes from My Day)
- [ ] Clicking sun on a task with a DIFFERENT due_date → sets `due_date` to today (overwrites)
- [ ] Toggle is instant (optimistic UI) with API call in background
- [ ] Task list/count refreshes after toggle

### E3: My Day View — Pure Date Logic
- [ ] My Day shows ONLY tasks where `due_date = today` (+ recurring matching today's DOW)
- [ ] Tasks with `my_day = 1` but due_date ≠ today do NOT appear in My Day
- [ ] Overdue tasks (due_date < today) do NOT appear in My Day view
- [ ] My Day badge count reflects only today's tasks (not overdue, not my_day flag)

### E4: My Day Widget (Dashboard)
- [ ] Dashboard My Day widget uses same pure-date logic
- [ ] Widget count matches sidebar badge count

### E5: Backward Compatibility
- [ ] The `my_day` column remains in DB (no migration needed) but is ignored for view logic
- [ ] Existing tasks with `my_day = 1` are unaffected (flag stays, just not used for filtering)
- [ ] API still accepts `my_day` field (no breaking changes) but it's cosmetic only

---

## Task List

| ID | Task | Depends On | Parallel Group |
|----|------|------------|----------------|
| T1 | **Backend: Refactor My Day query** — Update `getTaskItems` my-day case to filter ONLY `due_date = today OR (recurring today)`. Remove `my_day = 1` and overdue conditions. | — | A |
| T2 | **Backend: Refactor My Day count** — Update `getSmartListCounts` to count only `due_date = today OR (recurring today)`. Remove `my_day = 1` and overdue from count. | — | A |
| T3 | **Backend: Add toggle-my-day endpoint** — `POST /api/task-items/:id/toggle-my-day`. If task due today → clear due_date. If not due today → set due_date to today. Return updated task. | — | A |
| T4 | **Frontend: Add sun icon to list view** — In `renderTaskItem()`, add sun SVG button next to the star icon. Filled when `due_date === today`, outlined otherwise. | T1 | B |
| T5 | **Frontend: Add sun icon to card view** — In the card render block, add sun icon in card header/footer area. Same filled/outlined logic. | T1 | B |
| T6 | **Frontend: Wire sun icon click handler** — On click, call `POST /api/task-items/:id/toggle-my-day`, optimistic UI update, refresh counts. | T3, T4, T5 | C |
| T7 | **Frontend: Update My Day widget** — Ensure dashboard widget fetches with updated logic (no changes needed if it uses same API, just verify). | T1, T2 | B |
| T8 | **CSS: Style sun icon** — Consistent with existing star icon. Warm yellow when active, muted when inactive. Hover/transition effects. | T4, T5 | C |

---

## Execution Order

**Phase A (Parallel):** T1, T2, T3 — Backend changes, no dependencies between them
**Phase B (Parallel):** T4, T5, T7 — Frontend rendering (needs backend done)
**Phase C (Parallel):** T6, T8 — Wiring + styling (needs icons rendered)

---

## Post-Implementation

1. **Code Review** — Sub-agent reviews for consistency with codebase conventions
2. **QA via Browser** — Verify all E1–E5 evals on preview
3. **Report** — Complete only after all evals pass

---

## Status

**[ ] Awaiting Approval**
