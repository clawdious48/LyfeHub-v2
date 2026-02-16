# Bottom Nav CSS Audit — 2026-02-16

## CSS Files Loaded Per Page

### settings.html (5 files — THE GOOD ONE)
1. `css/style.css`
2. `css/apex-theme.css`
3. `css/dark-mode.css`
4. `css/bottom-nav.css`
5. `css/settings.css`

### index.html (25 files — THE BROKEN ONE)
All of the above PLUS 20 more, including files that override nav styles:
- `css/responsive.css`
- `css/hamburger.css`
- `css/drawer.css`
- `css/header-mobile.css`
- `css/sidebar.css`
- `css/dashboard.css`
- `css/apex-jobs.css` ⚠️ **HAS NAV OVERRIDES**
- `css/apex-crm.css`
- `css/drying.css`
- `css/sidebar-responsive.css`
- `css/mobile-polish.css`
- `css/table-cards.css`
- `css/forms-mobile.css` ⚠️ **HAS NAV OVERRIDES**
- `css/touch-friendly.css` ⚠️ **HAS NAV OVERRIDES**
- `css/task-swipe-complete.css`
- `css/kanban-mobile.css`
- `css/quick-add.css`
- `css/core-pages.css`
- `css/base-views.css`
- `css/context-sheet.css`

---

## Every CSS Rule Touching Bottom Nav (by file)

### 1. `css/bottom-nav.css` (CANONICAL — loaded by BOTH pages)

| Line | Selector | What It Does |
|------|----------|-------------|
| 6 | `:root` | `--bottom-nav-height: 70px` |
| 9 | `.bottom-nav` | `display:none; position:fixed; bottom:0; left:0; right:0; z-index:1000; background:rgba(255,255,255,0.85); backdrop-filter:blur(20px); border-top:1px solid rgba(0,0,0,0.08); box-shadow; padding-bottom:env(safe-area-inset-bottom)` |
| 24 | `.bottom-nav-items` | `display:flex; justify-content:space-around; align-items:center; padding:8px 0; max-width:100%; margin:0 auto; padding-left:16px; padding-right:16px` |
| 35 | `.bottom-nav-item` | `display:flex; flex-direction:column; align-items:center; gap:4px; padding:8px 8px; min-width:48px; color:rgba(26,26,46,0.45); font-size:10px; font-weight:500; text-transform:uppercase; letter-spacing:0.5px` |
| 56 | `.bottom-nav-item:active` | `transform:scale(0.95)` |
| 60-62 | `.bottom-nav-item:focus/focus-visible/focus-within` | Removes outline/border/box-shadow |
| 69 | `.bottom-nav-item svg` | `width:24px; height:24px; stroke:currentColor; stroke-width:1.8; fill:none` |
| 81-129 | `.bottom-nav-item[data-nav="dashboard"]` variants | Home button glow effects, ::after radial gradient, active states |
| 130-152 | `.bottom-nav-item.active` | `color:#FF8C00`, svg drop-shadow, ::before bottom indicator bar (30px wide, 3px tall) |
| 153-161 | `.bottom-nav-capture` | Capture button styles |
| 423 | `@media (max-width:1199px) .bottom-nav` | `display:block` — **this is where nav becomes visible** |
| 428 | `@media (max-width:1199px) body` | `padding-bottom: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom))` |
| 455 | `@media (max-width:1199px) and (orientation:landscape) .bottom-nav-items` | `padding:4px 0` |
| 459 | `@media (max-width:1199px) and (orientation:landscape) .bottom-nav-item` | `padding:4px 8px` |
| 463 | `@media (max-width:1199px) and (orientation:landscape) .bottom-nav-item svg` | `width:20px; height:20px` |
| 468 | `@media (max-width:1199px) and (orientation:landscape) .bottom-nav-item span` | `display:none` |
| 502 | `[data-theme="dark"] .bottom-nav` | Dark mode background, border, box-shadow |
| 508 | `[data-theme="dark"] .bottom-nav-item` | `color:rgba(240,240,245,0.45)` |
| 516 | `[data-theme="dark"] .bottom-nav-item[data-nav="dashboard"]::after` | Dark mode dashboard glow |

### 2. `css/dark-mode.css` (loaded by BOTH pages)

| Line | Selector | What It Does |
|------|----------|-------------|
| 387 | `[data-theme="dark"] .bottom-nav` | `background:rgba(15,23,42,0.95); border-top-color:rgba(255,255,255,0.08)` |
| 552 | `[data-theme="dark"] .bottom-nav` | **DUPLICATE** — `background:rgba(15,23,42,0.95); border-top-color:rgba(255,255,255,0.08)` |
| 557 | `[data-theme="dark"] .bottom-nav .nav-item` | `color:#94a3b8` ⚠️ Uses `.nav-item` not `.bottom-nav-item` — **probably dead CSS** (JS creates `bottom-nav-item` class, not `nav-item`) |
| 561 | `[data-theme="dark"] .bottom-nav .nav-item.active` | `color:#FF8C00` ⚠️ Same issue — likely dead |

### 3. `css/apex-jobs.css` ⚠️ (loaded by index.html ONLY)

| Line | Selector | What It Does |
|------|----------|-------------|
| 3934 | `@media (min-width:768px) and (max-width:1200px) .bottom-nav` | `display:flex !important` — **Forces flex display on tablets instead of block** |

**⚠️ INCONSISTENCY:** `bottom-nav.css` sets `display:block` at `max-width:1199px`. This rule sets `display:flex !important` for 768-1200px range. On tablets (768-1199px), `flex !important` wins over `block`. This **changes the layout model** — flex on the `.bottom-nav` container itself (not `.bottom-nav-items`). This could affect how the inner `.bottom-nav-items` renders.

### 4. `css/forms-mobile.css` ⚠️ (loaded by index.html ONLY)

| Line | Selector | What It Does |
|------|----------|-------------|
| 569 | `@media (max-width:640px) .bottom-nav` | `padding-bottom:env(safe-area-inset-bottom)` — redundant with bottom-nav.css but harmless |

### 5. `css/touch-friendly.css` ⚠️ (loaded by index.html ONLY)

| Line | Selector | What It Does |
|------|----------|-------------|
| 17 | `.touch-device .nav-item` | `min-height:44px; min-width:44px` — Uses `.nav-item` class, **probably doesn't match** `.bottom-nav-item` elements. Would only matter if some elements actually have class `nav-item`. |

---

## 🚨 ROOT CAUSE ANALYSIS

### The Key Difference: `display: block` vs `display: flex !important`

**Settings page:** `bottom-nav.css` line 423 sets `.bottom-nav { display: block }` at `≤1199px`. The inner `.bottom-nav-items` div handles all flex layout with `justify-content: space-around`. This gives natural, wide spacing.

**Index page (tablets 768-1200px):** `apex-jobs.css` line 3934 overrides to `.bottom-nav { display: flex !important }`. When the outer `.bottom-nav` is itself a flex container, it can change how `.bottom-nav-items` (the child) is sized/positioned, potentially constraining it differently.

### On phones (<768px):
Both pages should render identically because `apex-jobs.css`'s override only kicks in at `min-width: 768px`. **If the difference is visible on phones**, the cause is likely **CSS cascade order** — index.html loads 20 extra stylesheets after `bottom-nav.css`, and any subtle inheritance or specificity differences could compound.

### Other Minor Conflicts:
1. **`dark-mode.css` has duplicate `.bottom-nav` rules** (lines 387 & 552) — the second one wins, plus it references `.nav-item` which doesn't exist in the DOM (should be `.bottom-nav-item`)
2. **`forms-mobile.css`** adds redundant `padding-bottom` — harmless
3. **`touch-friendly.css`** `.nav-item` selector — probably doesn't match anything in the bottom nav

---

## Recommended Next Steps

1. **Remove or scope the `apex-jobs.css` tablet override** (line 3934) — it shouldn't be forcing `display:flex` on `.bottom-nav`
2. **Clean up `dark-mode.css`** duplicate rules and fix `.nav-item` → `.bottom-nav-item`
3. **Test on mobile (<768px)** — if still different, the issue may be in CSS load order affecting `max-width` on `.bottom-nav-items` or body padding differences
4. Ensure `.bottom-nav-items` has no `max-width` constraint being inherited from any parent style
