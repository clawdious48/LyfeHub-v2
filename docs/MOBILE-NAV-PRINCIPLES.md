# Mobile Navigation — Core Design Principles

These are non-negotiable design rules for LyfeHub's mobile navigation. Any developer (human or AI) working on mobile UI must follow these.

---

## 1. Bottom Nav is the Primary Navigation

The bottom navigation bar is the main way users move between sections on mobile (portrait mode, phones, tablets in portrait).

**Current layout:** `Capture | Tasks | Home | Calendar | People`

- **Home** is always center, with a blue glow highlight to anchor it visually
- **Capture (+)** is always far-left for quick thumb access
- The active section shows an indicator bar **below** the icon (never above)
- No focus outlines or browser-default highlights on nav items

---

## 2. Tap-Again Opens the Context Sheet

Tapping the already-active bottom nav item a second time opens that section's **context sheet** — a slide-up panel with section-specific actions, navigation, or settings.

- Delay: **300ms** after first tap before tap-again is recognized
- The sheet slides up from the bottom
- Tapping outside the sheet or tapping the nav item again closes it

---

## 3. Nested Sections Inherit the Drag-Up Gesture

**Core principle:** If a section (e.g., Bases) lives inside another section's context sheet (e.g., Home's sheet), AND that nested section has its own side panel, the parent's nav button supports a **tap + hold (135ms) + drag up** gesture to reveal the nested section's panel.

This is the same interaction pattern as the Capture button's radial bubbles.

**How it works:**
- User is viewing a nested section (e.g., Bases, accessed via Home sheet)
- User presses and holds the parent nav button (Home) for 135ms
- User drags upward → the nested section's side panel slides up as a sheet
- Releasing over the sheet confirms; releasing elsewhere cancels

**This is generic, not hardcoded.** It applies automatically anywhere section nesting occurs:
- If Section X lives in Section Y's sheet...
- AND Section X has a side panel...
- THEN Y's nav button gets the drag-up gesture when X is the active view

**Current applications:**
- Bases (nested in Home sheet) → drag-up on Home reveals Bases side panel

**Future-proof:** Any new section added to another section's sheet automatically gets this behavior if it has a side panel.

---

## 4. Capture Button — Tap vs Long-Press

The Capture (+) button has dual behavior:
- **Single tap** → Quick Task modal (fastest capture path)
- **Long press (135ms) + drag** → Radial bubbles appear (Task, Note, Photo) — drag to select

---

## 5. Side Panels on Mobile

Sections that have a sidebar/side panel on desktop (Bases, People, Calendar) use these patterns on mobile:

- **Side panel is hidden by default** on mobile
- **Pull-tab** (subtle edge indicator) hints at swipe-to-open
- **Overlay mode** — panel slides in from the left with a backdrop
- **Dismissal** — tap backdrop or swipe left to close

When a section is nested (lives in another section's sheet), the drag-up gesture on the parent nav button is the primary way to access the side panel.

---

## 6. Landscape Tablet = Sidebar, Portrait = Bottom Nav

- **iPad/tablet landscape** → show desktop sidebar, hide bottom nav
- **iPad/tablet portrait + all phones** → bottom nav + context sheets, no sidebar
- This is orientation-based, not purely width-based

---

## 7. No Clutter in the Bottom Nav

The bottom nav should only contain the **most essential, daily-use sections**. Everything else lives in context sheets or is accessed through navigation within sections.

Sections that are "power user" or "configuration" tools (like Bases, Settings) belong in sheets, not the nav bar. The nav bar is for where users spend 90% of their time.

---

*Established: 2026-02-16 by Jake Rogers*
*These principles apply to all mobile views across the app.*
