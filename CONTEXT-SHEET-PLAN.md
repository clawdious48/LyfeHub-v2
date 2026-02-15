# Context Sheet — Task List with Dependencies & Evals

## Dependency Graph
```
Phase 1A (Sheet Component) ──┐
                              ├──→ Phase 2 (Section Content) ──→ Phase 3 (Code Review) ──→ Phase 4 (Jake Tests)
Phase 1B (Tap-Again + Chevron)┘
```

Phase 1A and 1B can run in parallel. Phase 2 depends on both. Phase 3 is code review before Jake touches it.

---

## Phase 1A — Bottom Sheet Component
**Agent:** sub-agent-sheet
**Files:** `frontend/js/context-sheet.js` (NEW), `frontend/css/context-sheet.css` (NEW), `frontend/index.html` (add links)
**Depends on:** nothing

### Tasks
- [ ] 1A.1 — Create `context-sheet.css` with:
  - Sheet container (fixed, bottom, above nav bar)
  - Backdrop overlay (rgba(0,0,0,0.3) + blur)
  - Drag handle bar (40px wide, 4px tall, centered, rounded)
  - Sheet body (glassmorphic: white 0.95 opacity, blur 20px, rounded top corners 20px)
  - Default height: 45vh, max: 85vh, min: 20vh
  - Slide-up animation (transform translateY, 250ms ease-out)
  - `.context-sheet.visible` state
  - Landscape phone: max 60vh (less vertical space)
  - iPad landscape (768-1199px, landscape): render as left sidebar panel (240px) instead of sheet
  - Section-specific content areas (`.sheet-section[data-section="tasks"]` etc)
  - Scrollable content area inside sheet

- [ ] 1A.2 — Create `context-sheet.js` with:
  - IIFE pattern
  - `showSheet(sectionId)` — populates sheet with section content, slides up
  - `hideSheet()` — slides down, clears active state
  - `toggleSheet(sectionId)` — show/hide
  - Touch gesture: swipe down to dismiss (track touchstart Y vs touchend Y, threshold 50px)
  - Backdrop tap to dismiss
  - Drag handle: track touch to resize sheet height (snap to 45vh or 85vh)
  - Dispatch `context-sheet:opened` and `context-sheet:closed` events
  - Dispatch `context-sheet:action` when user selects something inside sheet
  - Expose `window.contextSheet = { show, hide, toggle }`
  - Media query detection: if iPad landscape, don't show sheet — instead toggle a sidebar panel

- [ ] 1A.3 — Add `<div id="context-sheet">` container to `index.html`
- [ ] 1A.4 — Add CSS/JS links to `index.html`

---

## Phase 1B — Tap-Again Detection + Chevron Indicator
**Agent:** sub-agent-nav-enhance  
**Files:** `frontend/js/bottom-nav.js`, `frontend/css/bottom-nav.css`
**Depends on:** nothing (but needs to call `window.contextSheet.toggle` which Phase 1A provides — use defensive check)

### Tasks
- [ ] 1B.1 — Modify `handleNavClick()` in bottom-nav.js:
  - Track `currentActiveTab` variable
  - If clicked tab === currentActiveTab AND tab is not 'capture' or 'settings':
    - If 300ms+ have passed since tab became active: call `window.contextSheet && window.contextSheet.toggle(tabId)`
    - Else: ignore (prevent accidental double-tap)
  - If clicked tab !== currentActiveTab: normal navigation, update `currentActiveTab`, record timestamp

- [ ] 1B.2 — Add chevron indicator CSS:
  - `.bottom-nav-item.active .nav-chevron` — small ˄ arrow above icon
  - 8px font, orange `#FF8C00`, positioned absolute top: -2px
  - One-time subtle bounce on appearance (CSS keyframe, 400ms)
  - Hidden when context sheet is open (`.sheet-open .nav-chevron { display: none }`)

- [ ] 1B.3 — Add chevron DOM element to active nav item:
  - In `updateActiveState()`, add/remove a `<span class="nav-chevron">˄</span>` to the active item
  - Skip chevron for 'capture' and 'settings' items (they don't have sheets)

- [ ] 1B.4 — Listen for `context-sheet:closed` to re-show chevron

---

## Phase 2 — Section-Specific Sheet Content
**Agent:** sub-agent-sheet-content
**Files:** `frontend/js/context-sheet.js` (extend with section renderers)
**Depends on:** Phase 1A + 1B complete

### Tasks
- [ ] 2.1 — Tasks sheet content:
  - View pills: My Day, Important, Scheduled, Recurring, All Tasks
  - Lists: fetch from `/api/task-lists` (credentials: include), show with task count
  - Sort toggles: Due, Created, Custom
  - View toggles: List, Cards
  - Tapping a view/list: dispatch `context-sheet:action` with `{ section: 'tasks', action: 'view', value: 'my-day' }` → auto-dismiss
  - Wire up: listen for action event, click corresponding header tab/button in tasks section

- [ ] 2.2 — Calendar sheet content:
  - View pills: Month, Week, 3-Day, Day
  - Task list: fetch from `/api/task-items?view=scheduled` + unscheduled
  - Collapsible sections: Scheduled (count), Unscheduled (count)
  - Task items with checkbox toggle
  - "+ New Calendar" button
  - Tapping a view: dispatch action → update calendar view → auto-dismiss

- [ ] 2.3 — People sheet content:
  - Filter pills: All, Clients, Adjusters, Contractors, Team (based on tags/roles)
  - Sort: A-Z, Recent, Company
  - Tag chips from existing data
  - Tapping a filter: dispatch action → filter people list → auto-dismiss

- [ ] 2.4 — Tables sheet content:
  - Core Bases section: list all core bases from `/api/bases/core/list`
  - My Bases section: list user bases from `/api/bases/list`
  - Each base shows icon + name + record count
  - "+ New Base" button
  - Tapping a base: dispatch action → navigate to that base → auto-dismiss

- [ ] 2.5 — Apex sheet content (leave Apex tab alone visually, but wire the sheet):
  - Status filter chips: Active, Leads, Complete, All
  - Loss Type dropdown
  - Owner dropdown
  - Apply / Clear buttons
  - Dispatch filter action → update Apex job list

- [ ] 2.6 — Wire all dispatched actions to actually update page content:
  - Listen for `context-sheet:action` globally
  - Route to appropriate section handler (click existing buttons, update filters, etc.)

---

## Phase 3 — Code Review
**Agent:** sub-agent-code-review
**Depends on:** Phase 1A + 1B + 2 all complete

### Tasks
- [ ] 3.1 — Review `context-sheet.js`:
  - No memory leaks (event listeners cleaned up)
  - Touch events have proper passive flags
  - Defensive checks (elements exist before accessing)
  - IIFE pattern, no global pollution beyond `window.contextSheet`
  - Credentials: include on all fetch calls

- [ ] 3.2 — Review `context-sheet.css`:
  - No hardcoded px that should be responsive
  - All breakpoints correct (1199px, 768px, landscape queries)
  - No z-index conflicts with bottom nav (1000) or modals (1100)
  - Sheet z-index should be 1050 (between nav and modals)
  - Glassmorphism fallback for non-supporting browsers

- [ ] 3.3 — Review `bottom-nav.js` changes:
  - Tap-again logic doesn't break normal navigation
  - Chevron doesn't appear on capture or settings
  - 300ms delay works correctly
  - No race conditions with sheet open/close

- [ ] 3.4 — Review section content renderers:
  - API calls handle errors gracefully (show "couldn't load" not blank)
  - Auto-dismiss works after selection
  - Events dispatch correct payloads
  - Content actually updates the page (not just the sheet)

- [ ] 3.5 — Cross-section review:
  - Switching tabs while sheet is open → sheet closes, new tab loads
  - Rotating device while sheet is open → graceful transition
  - Quick capture (+) still works with sheet system in place
  - Bottom nav active states still correct

- [ ] 3.6 — Report issues found with fix recommendations

---

## Phase 4 — Manual Testing Evals (Jake)
**Depends on:** Phase 3 complete, all issues fixed, preview rebuilt

### Bottom Sheet Core

| # | Test | Steps | Expected | Pass? |
|---|------|-------|----------|-------|
| E1 | Chevron appears on active tab | Load app, look at Home in bottom nav | Small orange ˄ above the Home icon | ☐ |
| E2 | Chevron moves with active tab | Tap Tasks, then Calendar, then People | Chevron appears ONLY on the currently active tab each time | ☐ |
| E3 | No chevron on Capture or Settings | Look at + and ⚙️ icons when they're tapped | No chevron ever appears on these two | ☐ |
| E4 | Tap-again opens sheet | Tap Tasks (navigate), then tap Tasks again | Bottom sheet slides up with Tasks options | ☐ |
| E5 | Sheet doesn't open on fast double-tap | Quickly double-tap Tasks from another tab | Should navigate to Tasks but NOT open sheet (300ms guard) | ☐ |
| E6 | Backdrop dismisses sheet | Open any sheet, tap the dimmed area above it | Sheet slides down, content visible again | ☐ |
| E7 | Swipe down dismisses | Open any sheet, swipe down on the sheet body | Sheet dismisses smoothly | ☐ |
| E8 | Chevron hides when sheet open | Open a sheet, look at bottom nav | Chevron gone while sheet is up | ☐ |
| E9 | Chevron returns when sheet closes | Dismiss the sheet | Chevron reappears on active tab | ☐ |
| E10 | Tab switch closes sheet | Open Tasks sheet, then tap Calendar in nav | Sheet closes, Calendar loads | ☐ |

### Section Content — Tasks

| # | Test | Steps | Expected | Pass? |
|---|------|-------|----------|-------|
| E11 | Tasks sheet shows views | Tap Tasks twice to open sheet | See My Day, Important, Scheduled, Recurring, All Tasks pills | ☐ |
| E12 | Tasks sheet shows lists | Open Tasks sheet | See task lists with counts below views | ☐ |
| E13 | Selecting a view updates page | Tap "Important" in sheet | Sheet dismisses, Tasks page switches to Important view | ☐ |
| E14 | Sort options work | Tap a sort option in sheet | Tasks page re-sorts accordingly | ☐ |

### Section Content — Calendar

| # | Test | Steps | Expected | Pass? |
|---|------|-------|----------|-------|
| E15 | Calendar sheet shows views | Tap Calendar twice | See Month, Week, 3-Day, Day view options | ☐ |
| E16 | Calendar sheet shows tasks | Open Calendar sheet | See Scheduled/Unscheduled task sections with counts | ☐ |
| E17 | View switch works | Tap "Week" in sheet | Sheet dismisses, calendar switches to week view | ☐ |

### Section Content — People

| # | Test | Steps | Expected | Pass? |
|---|------|-------|----------|-------|
| E18 | People sheet shows filters | Tap People twice | See filter pills (All, Clients, etc.) | ☐ |
| E19 | Filter selection works | Tap a filter pill | Sheet dismisses, people list filters | ☐ |

### Section Content — Tables

| # | Test | Steps | Expected | Pass? |
|---|------|-------|----------|-------|
| E20 | Tables sheet shows bases | Tap Tables twice | See Core Bases list with names and counts | ☐ |
| E21 | Tapping a base opens it | Tap "People" in the bases list | Sheet dismisses, People base opens in Tables view | ☐ |

### Section Content — Apex

| # | Test | Steps | Expected | Pass? |
|---|------|-------|----------|-------|
| E22 | Apex sheet shows filters | Navigate to Apex (via sidebar on desktop or header), tap again | See Status chips, Loss Type, Owner dropdowns | ☐ |
| E23 | Filter and apply works | Select "Active" status, tap Apply | Sheet dismisses, Apex jobs filtered to Active only | ☐ |

### Device & Orientation

| # | Test | Steps | Expected | Pass? |
|---|------|-------|----------|-------|
| E24 | Portrait phone — sheet works | Test on phone in portrait | Sheet slides up ~45% of screen, all content readable | ☐ |
| E25 | Landscape phone — compact sheet | Rotate phone to landscape, open sheet | Sheet is shorter (max 60vh), content still usable | ☐ |
| E26 | Portrait iPad — sheet works | Test on iPad Pro portrait | Sheet works same as phone but with more room | ☐ |
| E27 | Landscape iPad — split view | Rotate iPad to landscape, tap a section | Sidebar panel appears on left instead of bottom sheet | ☐ |
| E28 | Rotation with sheet open | Open sheet in portrait, rotate to landscape | Graceful transition — either stays as sheet or morphs to sidebar | ☐ |

### Quick Capture Still Works

| # | Test | Steps | Expected | Pass? |
|---|------|-------|----------|-------|
| E29 | Tap capture still works | Tap + button | Task capture modal opens (not a sheet) | ☐ |
| E30 | Long-press capture still works | Long-press + button | Radial bubbles appear normally | ☐ |
| E31 | Capture while sheet is open | Open a sheet, then tap + | Sheet closes, capture modal opens | ☐ |

---

## Execution Order

1. **Wave 1** (parallel): Phase 1A (sheet component) + Phase 1B (tap-again + chevron)
2. **Wave 2**: Phase 2 (section content) — depends on Wave 1
3. **Wave 3**: Phase 3 (code review) — depends on Wave 2
4. **Main agent**: Rebuild preview after Wave 3 passes
5. **Jake**: Phase 4 manual testing with eval checklist above
