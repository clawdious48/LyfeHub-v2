# Widget Polish — Implementation Plan

**Feature:** Polish all dashboard widgets into fully functional, production-quality features
**Created:** 2026-02-19

---

## Evals (Acceptance Criteria)

### E1: Quick Capture Widget Removed
- [ ] Widget removed from widget-registry.js
- [ ] quick-capture.js deleted or unused
- [ ] Existing dashboard layouts with quick-capture don't break (graceful fallback)

### E2: My Day Widget — Fully Interactive
- [ ] Events are clickable (opens event detail/modal)
- [ ] Empty state has an "Add Task" action button
- [ ] Auto-refreshes every 60s
- [ ] Loading skeleton shows while fetching
- [ ] Dark mode styling works correctly

### E3: Week Calendar — Navigable & Interactive
- [ ] Days are clickable → shows that day's full schedule below the strip
- [ ] Prev/Next week arrows for navigation
- [ ] Click on empty day shows "+ Add Event" prompt
- [ ] Auto-refreshes every 60s
- [ ] Dark mode styling works correctly

### E4: Quick Notes — Clickable & Actionable
- [ ] Notes are clickable → opens note in context sheet or modal for viewing/editing
- [ ] "New Note" button in widget header or empty state
- [ ] Robust base lookup (doesn't rely on name matching)
- [ ] Dark mode styling works correctly

### E5: Inbox Widget — Action-Ready
- [ ] Click item opens InboxProcessor (verify wiring works end-to-end)
- [ ] Stale items visually distinct (already partial)
- [ ] Badge updates after processing an item
- [ ] Auto-refreshes every 30s
- [ ] Dark mode styling works correctly

### E6: Base View Widget — Interactive Rows
- [ ] Rows are clickable → opens record in context sheet
- [ ] "Show more" link when truncated beyond 8 rows
- [ ] Dark mode styling already exists (verify)

### E7: Areas Widget — Real Data
- [ ] Fetches areas from /api/areas
- [ ] Shows area cards with name, color, task/project counts
- [ ] Click area → navigates to filtered view
- [ ] Empty state has "Create Area" action
- [ ] Dark mode styling works correctly

---

## Task List

| ID | Task | Depends On | Parallel Group |
|----|------|------------|----------------|
| T1 | Remove Quick Capture widget from registry + default layouts | — | A |
| T2 | Polish My Day: clickable events, add-task button, auto-refresh, skeleton | — | A |
| T3 | Polish Week Calendar: day click, week nav, auto-refresh | — | A |
| T4 | Polish Quick Notes: clickable notes, new-note button, robust lookup | — | A |
| T5 | Polish Inbox: verify InboxProcessor wiring, auto-refresh, badge sync | — | A |
| T6 | Polish Base View: clickable rows, show-more link | — | A |
| T7 | Build Areas widget: fetch from API, render cards, click nav | — | A |

---

## Execution Order

**Phase A (All Parallel):** T1, T2, T3, T4, T5, T6, T7
- All widgets are independent files with no cross-dependencies
- Each sub-agent works on a single widget file + its CSS

**Phase B:** Code Review sub-agent
**Phase C:** Browser QA against evals

---

## Key Files Reference (for sub-agents)

| Widget | JS File | CSS |
|--------|---------|-----|
| Quick Capture | `frontend/js/widgets/quick-capture.js` | `frontend/css/dashboard.css` |
| My Day | `frontend/js/widgets/my-day.js` | `frontend/css/dashboard.css` |
| Week Calendar | `frontend/js/widgets/week-calendar.js` | `frontend/css/dashboard.css` |
| Quick Notes | `frontend/js/widgets/quick-notes.js` | `frontend/css/dashboard.css` |
| Inbox | `frontend/js/widgets/inbox.js` + `frontend/js/inbox-process.js` | `frontend/css/dashboard.css` |
| Base View | `frontend/js/widgets/base-view.js` | `frontend/css/dashboard.css` |
| Areas | `frontend/js/widgets/areas.js` (NEW) | `frontend/css/dashboard.css` |
| Registry | `frontend/js/widget-registry.js` | — |

**Backend routes:** `backend/src/routes/` — areas.js, inbox.js, taskItems.js, calendarEvents.js, bases.js
**Dashboard CSS has 77 dark mode rules already** — follow `[data-theme="dark"]` pattern

---

## Status

**[ ] Awaiting Approval**
