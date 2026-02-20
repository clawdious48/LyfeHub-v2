# People Tab Rebuild — Implementation Plan

**Feature:** Rebuild the People tab to use the core-people base, with polished mobile-first UX
**Created:** 2025-07-26

---

## Evals (Acceptance Criteria)

### E1: Data Integration — Core People Base
- [ ] People tab loads records from `GET /api/bases/core/core-people/records` (not old `/api/people`)
- [ ] Creating a person calls `POST /api/bases/core/core-people/records` with `{ values: {...} }`
- [ ] Editing a person calls `PUT /api/bases/core/core-people/records/:id`
- [ ] Deleting a person calls `DELETE /api/bases/core/core-people/records/:id`
- [ ] All existing people data displays correctly (name, phone, email, company, etc.)

### E2: Contact List View — Mobile Portrait
- [ ] Scrollable list of contact cards fills viewport width with no horizontal overflow
- [ ] Each card shows: avatar (initials or photo), name, company/title, primary phone, primary email
- [ ] Phone numbers are tappable `tel:` links (don't navigate away from page)
- [ ] Email addresses are tappable `mailto:` links
- [ ] Search bar at top filters contacts by name, company, email, phone in real-time
- [ ] Search bar stays visible (sticky) when scrolling
- [ ] Cards have min 44px touch targets
- [ ] Content doesn't get hidden behind bottom nav bar
- [ ] Empty state shows when no contacts exist with "Add Person" CTA

### E3: Contact List View — Mobile Landscape
- [ ] Cards adapt to landscape — more compact vertical spacing, wider layout
- [ ] No horizontal overflow or clipped content
- [ ] Search bar remains functional and visible
- [ ] Bottom nav padding is correct (shorter in landscape)

### E4: Person Detail View
- [ ] Tapping a contact card transitions to a detail view (slide or page swap)
- [ ] Detail view shows ALL populated fields organized in sections:
  - Identity (name, nickname, photo, birthday)
  - Contact (phones, emails — all tappable)
  - Location (address tappable → Google Maps)
  - Professional (company, title, industry)
  - Social (website, linkedin, twitter, instagram — all tappable links)
  - Relationship (type, how we met, tags, introduced by)
  - Notes & Tracking (notes, last contacted, follow up, important flag)
  - Personality (MBTI, enneagram, love language, communication style)
  - Relationship Dynamics (strength, energy, trust, reciprocity, frequency)
  - Personal Reflection (admire, learn, feel, interests, topics)
  - History (date met, evolution, conflicts)
  - Gifts (ideas, favorites, allergies)
  - Goals (relationship goals, support)
- [ ] Empty sections are hidden (only show sections with data)
- [ ] Back button returns to list view preserving scroll position
- [ ] Edit button opens edit mode
- [ ] Delete button with confirmation dialog

### E5: Add/Edit Person
- [ ] Add Person button accessible from list view (floating action button or header button)
- [ ] Add modal/form with organized field sections (not all 50+ fields at once — progressive disclosure)
  - Quick add: name, phone, email, company (shown first)
  - Full form: expandable sections matching detail view categories
- [ ] Edit mode accessible from detail view
- [ ] Edit form pre-populates with existing values
- [ ] Save persists to core-people base API
- [ ] After create: navigates to new person's detail view
- [ ] After edit: returns to updated detail view
- [ ] Form fields have appropriate input types (tel, email, url, date, select)

### E6: Context Sheet Integration
- [ ] Tap-again on People bottom nav item opens context sheet
- [ ] Sheet shows filter pills (All, Family, Friends, Colleagues, Clients, etc.) — filters by relationship field
- [ ] Sheet shows sort pills (A-Z, Recent, Company) — sorts contact list
- [ ] Filter/sort selections apply immediately and dismiss sheet
- [ ] `people:filter` and `people:sort` custom events are handled

### E7: Visual Polish & Design Language
- [ ] Uses app's existing design language: glass morphism, orange accent (#FF8C00), rounded corners
- [ ] Smooth transitions between list ↔ detail views
- [ ] Dark mode fully supported (`[data-theme="dark"]` selectors)
- [ ] Avatar colors are consistent per-person (hash-based)
- [ ] Cards have subtle hover/active states
- [ ] No layout jank or flash of unstyled content on tab switch

### E8: Desktop Sidebar Compatibility
- [ ] Desktop sidebar still renders with groups (hidden on mobile)
- [ ] `window.loadPeople` and `window.peopleApi` exports maintained
- [ ] Sidebar person items still clickable to open detail view on desktop

---

## Task List

| ID | Task | Depends On | Parallel Group | Est. |
|----|------|------------|----------------|------|
| T1 | **API adapter layer** — Create `peopleBaseApi` object in people.js that wraps core-people base endpoints, mapping responses to the same shape the UI expects. Keep old `peopleApi` as fallback export. | — | A | S |
| T2 | **HTML structure rebuild** — Rewrite the `<main data-tab="people">` section in index.html: sticky search bar, scrollable card list container, detail view container, add/edit modal. Remove old view-controls/display-toggle/card-size UI (not needed for mobile-first). Keep sidebar markup for desktop. | — | A | M |
| T3 | **Contact list renderer** — Rewrite `renderPeopleList()` to render mobile-first contact cards from core-people base data. Cards: avatar, name, company/title, tappable phone, tappable email. Search filtering logic. Alphabetical default sort. | T1, T2 | B | M |
| T4 | **Person detail view** — Rewrite `openPerson()` and `renderPersonDetail()`. Organized field sections, only show populated sections. Tappable phone/email/address/social links. Back button, edit button, delete button. Slide transition. | T1, T2 | B | L |
| T5 | **Add/Edit person form** — Modal with progressive disclosure: quick-add fields first (name, phone, email, company), expandable sections for everything else. Proper input types. Create and update API calls. | T1, T2 | B | L |
| T6 | **Context sheet wiring** — Wire `people:filter` and `people:sort` events from sheet-content.js. Filter by relationship type, sort by name/recent/company. Update sheet-content.js populatePeople() if needed to match new data shape. | T3 | C | S |
| T7 | **CSS — Mobile portrait** — New mobile-first styles for contact cards, search bar, detail view, add/edit modal. Glass morphism, orange accents, proper spacing, 44px touch targets, bottom nav padding. Replace old people CSS. | T2 | B | M |
| T8 | **CSS — Mobile landscape** — Landscape-specific overrides: compact spacing, wider card layout, shorter bottom nav clearance. | T7 | C | S |
| T9 | **CSS — Dark mode** — Dark mode variants for all new people UI elements. | T7 | C | S |
| T10 | **CSS — Desktop sidebar compat** — Ensure desktop sidebar still works. Sidebar hidden on mobile (<1200px), visible on desktop with groups. | T7 | C | S |
| T11 | **Data loading & tab activation** — Wire `tab:activated` event listener, `window.loadPeople()`, initial load on People tab switch. Cache management. | T1, T3 | C | S |
| T12 | **Integration testing & deploy** — Verify no JS errors, test all flows, commit, push, deploy to production. | T3-T11 | D | S |

---

## Execution Order

**Phase A (Parallel):** T1, T2 — No dependencies, can build API adapter and HTML structure simultaneously
**Phase B (Parallel):** T3, T4, T5, T7 — All depend on Phase A. List renderer, detail view, add/edit form, and base CSS can all be built in parallel since they're separate components
**Phase C (Parallel):** T6, T8, T9, T10, T11 — Depend on Phase B components. Sheet wiring, landscape CSS, dark mode, desktop compat, data loading
**Phase D:** T12 — Integration, testing, deploy. Depends on everything.

---

## Sub-Agent Strategy

Given dependencies, the most efficient approach:

- **Phase A+B+C combined into 2 parallel sub-agents:**
  - **Sub-Agent 1: Core UI** — T1 (API adapter) → T2 (HTML) → T3 (list renderer) → T4 (detail view) → T5 (add/edit) → T6 (sheet wiring) → T11 (data loading)
  - **Sub-Agent 2: Styling** — T7 (mobile portrait CSS) → T8 (landscape CSS) → T9 (dark mode) → T10 (desktop compat)

- **Phase D: Main agent** — T12 integration test & deploy after both sub-agents complete

The split works because JS logic and CSS are in separate files with minimal coupling. Sub-Agent 1 writes people.js + index.html. Sub-Agent 2 writes CSS files. No file conflicts.

---

## Status

**[ ] Awaiting Approval**
