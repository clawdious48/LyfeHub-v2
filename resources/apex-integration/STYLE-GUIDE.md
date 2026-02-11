# Apex.Dev → LyfeHub Style Migration Guide

> A comprehensive document for recreating Apex.Dev with LyfeHub's neon glassmorphic aesthetic.

---

## 1. Design Philosophy

### LyfeHub Aesthetic
- **Dark Mode First** — Deep black backgrounds (`#0a0a0f`)
- **Neon Glassmorphism** — Translucent cards with blur, glowing accents
- **Vibrant Accents** — Neon colors that "pop" against dark backgrounds
- **Subtle Animations** — Smooth transitions, gentle glows, micro-interactions
- **Information Density** — Compact but readable layouts

### Key Visual Principles
1. **Glass Effect** — Cards feel like frosted glass floating above the background
2. **Neon Glow** — Important elements have subtle glowing borders/shadows
3. **Gradients** — Headers and CTAs use gradient text/backgrounds
4. **Depth** — Multiple layers of translucency create visual hierarchy

---

## 2. Color System

### CSS Variables (from LyfeHub)

```css
:root {
    /* Backgrounds */
    --glass-bg: rgba(255, 255, 255, 0.03);
    --glass-border: rgba(255, 255, 255, 0.08);
    --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    --blur: blur(12px);
    
    /* Text */
    --text-primary: #ffffff;
    --text-secondary: rgba(255, 255, 255, 0.75);
    --text-muted: rgba(255, 255, 255, 0.5);
    
    /* Neon Palette */
    --neon-purple: #bf5af2;
    --neon-blue: #0af;
    --neon-cyan: #00f5d4;
    --neon-pink: #ff2a6d;
    --neon-orange: #ff6b35;
    --neon-yellow: #ffe66d;
    --neon-green: #05ffa1;
    
    /* Semantic */
    --accent: var(--neon-purple);
    --accent-hover: #d17ff7;
    --danger: var(--neon-pink);
    --danger-hover: #ff5a8a;
    
    /* Transitions */
    --transition: all 0.3s ease;
}
```

### Color Mapping: Apex.Dev → LyfeHub

| Apex.Dev | LyfeHub | Usage |
|----------|---------|-------|
| `--primary: #E97A2B` (orange) | `--neon-orange: #ff6b35` | Primary brand accent |
| `--background: #1a1a1a` | `#0a0a0f` | Main background (darker) |
| `--foreground: #ffffff` | `--text-primary: #ffffff` | Primary text |
| `--muted: 60% white` | `--text-muted: rgba(255,255,255,0.5)` | Secondary text |
| Status green | `--neon-green: #05ffa1` | Success/Active |
| Status yellow | `--neon-yellow: #ffe66d` | Warning/Pending |
| Status red | `--neon-pink: #ff2a6d` | Error/Danger |

---

## 3. Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
```

### Scale
| Element | Size | Weight | Extra |
|---------|------|--------|-------|
| Page title | 1.5rem | 600 | Gradient text |
| Section header | 0.8rem | 600 | Uppercase, letter-spacing: 0.1em |
| Body text | 0.875rem | 400 | - |
| Labels | 0.7rem | 500 | Uppercase, muted color |
| Badges | 0.7rem | 600 | Uppercase |

### Gradient Text Effect
```css
.gradient-text {
    background: linear-gradient(135deg, var(--neon-purple), var(--neon-cyan));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}
```

---

## 4. Core Component Patterns

### 4.1 Glass Card
```css
.glass-card {
    background: rgba(20, 20, 35, 0.95);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 1rem;
    transition: var(--transition);
}

.glass-card:hover {
    background: rgba(30, 30, 50, 0.7);
    border-color: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

### 4.2 Primary Button
```css
.btn-primary {
    background: linear-gradient(135deg, var(--neon-purple), var(--neon-blue));
    color: white;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    box-shadow: 0 0 20px rgba(191, 90, 242, 0.3);
    transition: var(--transition);
}

.btn-primary:hover {
    box-shadow: 0 0 30px rgba(191, 90, 242, 0.5);
    transform: translateY(-2px);
}
```

### 4.3 Secondary Button
```css
.btn-secondary {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-primary);
    border: 1px solid var(--glass-border);
    padding: 0.5rem 1rem;
    border-radius: 8px;
}

.btn-secondary:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
}
```

### 4.4 Form Input
```css
.form-input {
    width: 100%;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    color: var(--text-primary);
    font-size: 0.875rem;
    transition: var(--transition);
}

.form-input:focus {
    outline: none;
    border-color: var(--neon-purple);
    box-shadow: 0 0 20px rgba(191, 90, 242, 0.2);
    background: rgba(255, 255, 255, 0.05);
}

.form-input::placeholder {
    color: var(--text-muted);
}
```

### 4.5 Status Badge
```css
.status-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

/* Status variants with neon glow */
.status-active {
    background: rgba(5, 255, 161, 0.15);
    color: var(--neon-green);
    box-shadow: 0 0 10px rgba(5, 255, 161, 0.2);
}

.status-pending {
    background: rgba(255, 230, 109, 0.15);
    color: var(--neon-yellow);
}

.status-lead {
    background: rgba(0, 170, 255, 0.15);
    color: var(--neon-blue);
}

.status-complete {
    background: rgba(191, 90, 242, 0.15);
    color: var(--neon-purple);
}
```

### 4.6 Modal
```css
.modal {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    opacity: 0;
    visibility: hidden;
    transition: var(--transition);
}

.modal.open {
    opacity: 1;
    visibility: visible;
}

.modal-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
}

.modal-content {
    position: relative;
    width: 100%;
    max-width: 560px;
    max-height: 90vh;
    background: rgba(15, 15, 25, 0.95);
    backdrop-filter: var(--blur);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    overflow: hidden;
    transform: scale(0.95) translateY(20px);
    transition: var(--transition);
    box-shadow: 
        0 0 60px rgba(191, 90, 242, 0.1),
        0 0 100px rgba(0, 170, 255, 0.05);
}

.modal.open .modal-content {
    transform: scale(1) translateY(0);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.modal-header h2 {
    background: linear-gradient(135deg, var(--neon-purple), var(--neon-cyan));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}
```

---

## 5. Sidebar Pattern

### Structure
```html
<aside class="sidebar">
    <!-- Primary action -->
    <button class="sidebar-new-btn">+ New Item</button>
    
    <!-- Header with controls -->
    <div class="sidebar-header">
        <button class="sidebar-add-group-btn">+ New Group</button>
        <button class="sidebar-toggle-btn">▼</button>
    </div>
    
    <!-- Scrollable content -->
    <div class="sidebar-content">
        <!-- Groups -->
        <div class="sidebar-group">
            <div class="sidebar-group-header">
                <span class="toggle-icon">▼</span>
                <span class="group-name">Active Jobs</span>
                <span class="group-count">5</span>
            </div>
            <div class="sidebar-group-items">
                <div class="sidebar-item active">
                    <span class="item-icon">💧</span>
                    <span class="item-name">Murphy Water Loss</span>
                </div>
                <!-- More items -->
            </div>
        </div>
    </div>
</aside>
```

### CSS
```css
.sidebar {
    width: 240px;
    min-width: 240px;
    background: rgba(15, 15, 25, 0.6);
    border-right: 1px solid var(--glass-border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem 0;
}

.sidebar-group-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    transition: var(--transition);
}

.sidebar-group-header:hover {
    background: rgba(255, 255, 255, 0.05);
}

.sidebar-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.75rem 0.4rem 2rem;
    cursor: pointer;
    transition: var(--transition);
}

.sidebar-item:hover {
    background: rgba(255, 255, 255, 0.05);
}

.sidebar-item.active {
    background: rgba(191, 90, 242, 0.15);
    border-right: 2px solid var(--neon-purple);
}

/* Collapse animation */
.sidebar-group-items {
    overflow: hidden;
    transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-group.collapsed .sidebar-group-items {
    max-height: 0 !important;
}

.sidebar-group.collapsed .toggle-icon {
    transform: rotate(-90deg);
}
```

---

## 6. Layout Patterns

### Main App Layout
```css
body {
    background: #0a0a0f;
    min-height: 100vh;
    color: var(--text-primary);
}

.app-layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
}

/* Top navigation */
.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 2rem;
    background: rgba(10, 10, 15, 0.7);
    backdrop-filter: var(--blur);
    border-bottom: 1px solid var(--glass-border);
    position: sticky;
    top: 0;
    z-index: 100;
}

/* Content area with sidebar */
.content-layout {
    display: flex;
    flex: 1;
    overflow: hidden;
}

.main-content {
    flex: 1;
    overflow: auto;
    padding: 1.5rem;
}
```

### Tab Navigation
```css
.tabs {
    display: flex;
    gap: 0.25rem;
}

.tab {
    padding: 0.75rem 1.5rem;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text-secondary);
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: var(--transition);
}

.tab:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.03);
}

.tab.active {
    color: var(--neon-purple);
    border-bottom-color: var(--neon-purple);
    text-shadow: 0 0 20px var(--neon-purple);
}
```

---

## 7. Special Effects

### Neon Glow on Focus/Hover
```css
.glow-on-hover:hover {
    box-shadow: 0 0 20px rgba(191, 90, 242, 0.3);
    border-color: var(--neon-purple);
}

.glow-on-focus:focus {
    box-shadow: 0 0 20px rgba(191, 90, 242, 0.3);
    border-color: var(--neon-purple);
}
```

### Pulsing Animation (for alerts/notifications)
```css
@keyframes pulse-glow {
    0%, 100% { 
        box-shadow: 0 0 8px var(--neon-pink);
    }
    50% { 
        box-shadow: 0 0 20px var(--neon-pink);
    }
}

.pulse {
    animation: pulse-glow 2s ease-in-out infinite;
}
```

### Gradient Border
```css
.gradient-border {
    position: relative;
    background: rgba(20, 20, 35, 0.95);
    border-radius: 12px;
}

.gradient-border::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 13px;
    background: linear-gradient(135deg, var(--neon-purple), var(--neon-cyan));
    z-index: -1;
    opacity: 0.5;
}
```

---

## 8. Migration Checklist

### Phase 1: Base Styles
- [ ] Replace background color (#1a1a1a → #0a0a0f)
- [ ] Add CSS variables from LyfeHub
- [ ] Update font weights and sizes
- [ ] Add glass effect utilities

### Phase 2: Components
- [ ] Convert buttons to LyfeHub style
- [ ] Update form inputs with glow focus
- [ ] Restyle cards with glassmorphism
- [ ] Update status badges with neon colors
- [ ] Add gradient text to headers

### Phase 3: Layout
- [ ] Update top navigation
- [ ] Add sidebar with LyfeHub pattern
- [ ] Restyle modals
- [ ] Update tab navigation

### Phase 4: Polish
- [ ] Add hover animations
- [ ] Add focus states with glow
- [ ] Ensure consistent spacing
- [ ] Test on dark backgrounds

---

## 9. Quick Reference: Tailwind → LyfeHub CSS

If using Tailwind in Apex.Dev, here are the mappings:

| Tailwind | LyfeHub CSS |
|----------|-------------|
| `bg-background/50` | `background: rgba(15, 15, 25, 0.6)` |
| `backdrop-blur-xl` | `backdrop-filter: blur(12px)` |
| `border-white/5` | `border-color: rgba(255, 255, 255, 0.05)` |
| `text-muted-foreground` | `color: var(--text-muted)` |
| `hover:bg-white/5` | `:hover { background: rgba(255, 255, 255, 0.05) }` |
| `rounded-xl` | `border-radius: 12px` |
| `shadow-lg` | `box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4)` |

---

## 10. File Reference

### LyfeHub Source Files
- **Main CSS:** `/frontend/css/style.css`
- **Kanban JS:** `/frontend/js/kanban.js`
- **Bases JS:** `/frontend/js/bases.js`
- **Index HTML:** `/frontend/index.html`

### Apex.Dev Source Files
- **Entry:** `/frontend/src/main.tsx`
- **Layout:** `/frontend/src/components/layout/AppLayout.tsx`
- **Sidebar:** `/frontend/src/components/layout/JobsSidebar.tsx`
- **Global CSS:** `/frontend/src/index.css`

---

*Generated for Jake Rogers | Apex Restoration | 2026-02-06*
