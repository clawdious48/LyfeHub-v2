# LyfeHub Mobile Responsive — Implementation Plan

**Feature:** Full mobile/tablet optimization for field use
**Reference:** Codebase analysis from 4 parallel agents (2026-02-09)
**Created:** 2026-02-09

---

## Executive Summary

LyfeHub has basic responsive CSS but **no mobile-first navigation strategy**. The app is usable on desktop but breaks down on phones/tablets due to:
- Fixed 240px sidebars that never collapse
- No hamburger menu, bottom nav, or mobile drawer
- Hover-only controls inaccessible on touch devices
- Tables that only scroll (no card transformation)
- Kanban board requiring 1680px minimum width

**Goal:** Make every feature fully usable on phone and 11" iPad without sacrificing desktop functionality.

---

## Evals (Acceptance Criteria)

### E1: Mobile Navigation
- [ ] Hamburger menu icon visible on screens ≤768px
- [ ] Tapping hamburger opens a slide-out drawer with all 5 tabs
- [ ] Active tab is visually indicated in drawer
- [ ] Drawer closes on tab selection or outside tap
- [ ] Drawer includes Settings and Logout options

### E2: Sidebar Collapse
- [ ] Bases sidebar collapses to icon-only (48px) on screens ≤768px
- [ ] People sidebar collapses to icon-only (48px) on screens ≤768px
- [ ] Toggle button to expand/collapse sidebar manually
- [ ] Expanded sidebar overlays content on mobile (doesn't push)
- [ ] Sidebar state persists in localStorage

### E3: Touch-Friendly Controls
- [ ] All interactive elements have minimum 44px touch target
- [ ] Hover-only controls (delete buttons, menus) always visible on touch devices
- [ ] Row actions accessible via swipe or long-press on mobile
- [ ] No functionality requires hover state

### E4: Responsive Tables
- [ ] Tables transform to card/list view on screens ≤640px
- [ ] Each "card" shows key fields with clear labels
- [ ] Card view supports tap-to-expand for full record
- [ ] Horizontal scroll indicator visible when table overflows (tablet)

### E5: Kanban Board Mobile
- [ ] Single column view on screens ≤640px
- [ ] Horizontal swipe to change columns on mobile
- [ ] Column indicator shows current position (e.g., "2 of 6")
- [ ] Cards fully readable without horizontal scroll

### E6: Standardized Breakpoints
- [ ] All responsive CSS uses consistent breakpoint system:
  - `sm: 640px` (mobile)
  - `md: 768px` (tablet portrait)
  - `lg: 1024px` (tablet landscape)
  - `xl: 1280px` (desktop)
- [ ] No orphan breakpoints outside this system

### E7: Form Optimization
- [ ] All forms single-column on mobile (≤640px)
- [ ] Input fields full-width on mobile
- [ ] Form submit buttons sticky at bottom on mobile
- [ ] Date/time pickers use native mobile inputs where appropriate

### E8: Header/Tab Bar
- [ ] Header doesn't obscure content when keyboard opens
- [ ] Tab bar hidden on mobile (replaced by hamburger menu)
- [ ] Optional: Bottom tab bar for most-used sections (Tasks, Quick Add)

---

## Task List

| ID | Task | Depends On | Parallel Group | Est. Complexity |
|----|------|------------|----------------|-----------------|
| T1 | Create new worktree `feature/mobile-responsive` | — | A | Low |
| T2 | Define CSS custom properties for breakpoints | T1 | B | Low |
| T3 | Create mobile detection utility (JS) | T1 | B | Low |
| T4 | Build hamburger menu component | T2, T3 | C | Medium |
| T5 | Build slide-out drawer component | T4 | D | Medium |
| T6 | Implement sidebar collapse for Bases | T2, T3 | C | Medium |
| T7 | Implement sidebar collapse for People | T2, T3 | C | Medium |
| T8 | Add touch-friendly control styles | T2 | C | Low |
| T9 | Implement table-to-card transformation | T2, T3 | C | High |
| T10 | Mobile Kanban: single column + swipe | T3 | C | High |
| T11 | Standardize all existing breakpoints | T2 | C | Medium |
| T12 | Form mobile optimizations | T2 | C | Low |
| T13 | Add swipe/long-press for row actions | T3 | D | Medium |
| T14 | Header mobile adjustments | T4, T5 | E | Low |
| T15 | Integration testing on phone viewport | T4-T14 | F | Medium |
| T16 | Integration testing on iPad viewport | T4-T14 | F | Medium |
| T17 | Polish and edge case fixes | T15, T16 | G | Medium |

---

## Execution Order

**Phase A:** T1 — Setup worktree

**Phase B (Parallel):** T2, T3 — Foundation (breakpoints + mobile detection)

**Phase C (Parallel):** T4, T6, T7, T8, T9, T10, T11, T12 — Core mobile components
- T4: Hamburger menu
- T6: Bases sidebar collapse
- T7: People sidebar collapse
- T8: Touch-friendly styles
- T9: Table cards
- T10: Mobile Kanban
- T11: Breakpoint standardization
- T12: Form optimizations

**Phase D (Parallel):** T5, T13 — Dependent components
- T5: Drawer (needs hamburger)
- T13: Swipe/long-press actions

**Phase E:** T14 — Header adjustments (needs drawer complete)

**Phase F (Parallel):** T15, T16 — Integration testing (phone + iPad)

**Phase G:** T17 — Polish and fixes

---

## Technical Approach

### Breakpoint System
```css
:root {
  --bp-sm: 640px;
  --bp-md: 768px;
  --bp-lg: 1024px;
  --bp-xl: 1280px;
}
```

### Mobile Detection (JS)
```javascript
const isMobile = () => window.matchMedia('(max-width: 768px)').matches;
const isTouch = () => 'ontouchstart' in window;
```

### Sidebar Collapse Pattern
- Desktop: Full 240px sidebar
- Mobile: Icon-only 48px rail OR hidden with toggle
- Overlay mode: Sidebar overlays content, backdrop behind

### Table-to-Card Pattern
- Detect viewport, swap CSS class
- Each row becomes a card with labeled fields
- Tap card to expand/edit

---

## Post-Implementation

1. **Code Review** — Sub-agent reviews all new CSS/JS for consistency
2. **QA via Browser Agent** — Test against all evals using headless browser at 375px, 768px, 1024px viewports
3. **Real Device Testing** — Jake tests on actual phone and iPad
4. **Report** — Complete only after all evals pass

---

## Status

**[x] Plan Created**
**[ ] Awaiting Approval**
**[ ] In Progress**
**[ ] Code Review**
**[ ] QA Testing**
**[ ] Complete**

---

## Decisions (Approved 2026-02-09)

1. **Bottom navigation:** No — using hamburger + drawer only (cleaner, can add later)
2. **iPad sidebar:** Auto mode — collapsed in portrait, expanded in landscape
3. **Table priority:** Apex Jobs first, then other bases
4. **Kanban mobile:** Swipe with column indicator
