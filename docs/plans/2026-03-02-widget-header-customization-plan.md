# Widget Header Customization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users customize widget header size (sm/md/lg), density (compact/normal/spacious), and icon visibility from the existing style panel.

**Architecture:** Extend the flat `WidgetStyle` type with 3 new optional fields. Add UI controls to `WidgetStylePanel`. Map new fields to Tailwind classes in `WidgetWrapper`. All fields have backward-compatible defaults so existing saved layouts render unchanged.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, shadcn/ui

---

### Task 1: Extend WidgetStyle type in registry.ts

**Files:**
- Modify: `frontend-next/src/widgets/registry.ts:17-21`

**Step 1: Add the new fields to the WidgetStyle interface**

Current code at lines 17-21:
```ts
export interface WidgetStyle {
  preset: 'default' | 'borderless' | 'transparent'
  accent: string | null
  headerVisible: boolean
}
```

Replace with:
```ts
export interface WidgetStyle {
  preset: 'default' | 'borderless' | 'transparent'
  accent: string | null
  headerVisible: boolean
  headerSize: 'sm' | 'md' | 'lg'
  headerDensity: 'compact' | 'normal' | 'spacious'
  headerIconVisible: boolean
}
```

**Step 2: Update the DEFAULT_STYLE in WidgetWrapper.tsx**

Open `frontend-next/src/widgets/WidgetWrapper.tsx` and find the `DEFAULT_STYLE` constant (line 22-26):
```ts
const DEFAULT_STYLE: WidgetStyle = {
  preset: 'default',
  accent: null,
  headerVisible: true,
}
```

Replace with:
```ts
const DEFAULT_STYLE: WidgetStyle = {
  preset: 'default',
  accent: null,
  headerVisible: true,
  headerSize: 'md',
  headerDensity: 'normal',
  headerIconVisible: true,
}
```

**Step 3: Verify TypeScript compiles**

Run: `cd frontend-next && npx tsc --noEmit`
Expected: Errors in `WidgetStylePanel.tsx` and `WidgetConfigDialog.tsx` where `WidgetStyle` objects are created without the new fields. That's expected — we fix those in the next tasks.

**Step 4: Fix any WidgetStyle object literals that are now incomplete**

Search for places that create WidgetStyle objects and add the missing fields. Check `WidgetStylePanel.tsx` — the `onChange` calls spread `...style` so they should be fine. Check `WidgetConfigDialog.tsx` line 56 — `setLocalStyle` is initialized from the `style` prop, so it should carry existing fields.

If `npx tsc --noEmit` passes after the type change, skip this step.

**Step 5: Commit**

```bash
git add frontend-next/src/widgets/registry.ts frontend-next/src/widgets/WidgetWrapper.tsx
git commit -m "feat(widgets): extend WidgetStyle with header size, density, and icon visibility"
```

---

### Task 2: Add header customization controls to WidgetStylePanel

**Files:**
- Modify: `frontend-next/src/widgets/WidgetStylePanel.tsx`

**Step 1: Add size and density option arrays**

After the existing `ACCENT_COLORS` array (line 25), add:

```ts
const HEADER_SIZES: { value: WidgetStyle['headerSize']; label: string }[] = [
  { value: 'sm', label: 'S' },
  { value: 'md', label: 'M' },
  { value: 'lg', label: 'L' },
]

const HEADER_DENSITIES: { value: WidgetStyle['headerDensity']; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'normal', label: 'Normal' },
  { value: 'spacious', label: 'Spacious' },
]
```

**Step 2: Add the Header Size control**

Insert after the accent color section (after the closing `</div>` of the accent color block, before the "Show header" checkbox). Add:

```tsx
<div className="space-y-2">
  <Label className="text-text-secondary text-xs">Header Size</Label>
  <div className="grid grid-cols-3 gap-2">
    {HEADER_SIZES.map((size) => (
      <button
        key={size.value}
        type="button"
        disabled={!style.headerVisible}
        onClick={() => onChange({ ...style, headerSize: size.value })}
        className={cn(
          'rounded-md border py-1.5 text-center text-xs font-medium transition-colors',
          !style.headerVisible
            ? 'border-border bg-bg-surface text-text-muted opacity-50 cursor-not-allowed'
            : (style.headerSize ?? 'md') === size.value
              ? 'border-accent bg-accent/10 text-text-primary'
              : 'border-border bg-bg-surface text-text-secondary hover:border-text-muted'
        )}
      >
        {size.label}
      </button>
    ))}
  </div>
</div>
```

**Step 3: Add the Header Density control**

Immediately after the Header Size section:

```tsx
<div className="space-y-2">
  <Label className="text-text-secondary text-xs">Header Density</Label>
  <div className="grid grid-cols-3 gap-2">
    {HEADER_DENSITIES.map((density) => (
      <button
        key={density.value}
        type="button"
        disabled={!style.headerVisible}
        onClick={() => onChange({ ...style, headerDensity: density.value })}
        className={cn(
          'rounded-md border py-1.5 text-center text-xs transition-colors',
          !style.headerVisible
            ? 'border-border bg-bg-surface text-text-muted opacity-50 cursor-not-allowed'
            : (style.headerDensity ?? 'normal') === density.value
              ? 'border-accent bg-accent/10 text-text-primary'
              : 'border-border bg-bg-surface text-text-secondary hover:border-text-muted'
        )}
      >
        {density.label}
      </button>
    ))}
  </div>
</div>
```

**Step 4: Add the "Show icon" checkbox**

Add immediately before the existing "Show header" checkbox:

```tsx
<div className="flex items-center gap-2">
  <Checkbox
    id="header-icon-visible"
    checked={style.headerIconVisible ?? true}
    disabled={!style.headerVisible}
    onCheckedChange={(checked) =>
      onChange({ ...style, headerIconVisible: checked === true })
    }
  />
  <Label
    htmlFor="header-icon-visible"
    className={cn(
      'text-xs cursor-pointer',
      style.headerVisible ? 'text-text-secondary' : 'text-text-muted opacity-50'
    )}
  >
    Show icon
  </Label>
</div>
```

**Step 5: Add the `cn` import if not already present**

Check if `cn` is imported at the top of the file. It should already be there (line 1). If not, add:
```ts
import { cn } from '@/lib/utils.js'
```

**Step 6: Verify TypeScript compiles**

Run: `cd frontend-next && npx tsc --noEmit`
Expected: PASS (0 errors)

**Step 7: Commit**

```bash
git add frontend-next/src/widgets/WidgetStylePanel.tsx
git commit -m "feat(widgets): add header size, density, and icon visibility controls to style panel"
```

---

### Task 3: Apply header styles in WidgetWrapper

**Files:**
- Modify: `frontend-next/src/widgets/WidgetWrapper.tsx:68-89`

**Step 1: Add class mapping constants**

After the existing `ACCENT_BORDER_CLASSES` constant (around line 41), add:

```ts
const HEADER_SIZE_CLASSES: Record<string, { title: string; icon: string }> = {
  sm: { title: 'text-xs', icon: 'size-3' },
  md: { title: 'text-sm', icon: 'size-4' },
  lg: { title: 'text-base', icon: 'size-5' },
}

const HEADER_DENSITY_CLASSES: Record<string, string> = {
  compact: 'py-1.5 px-3',
  normal: 'py-3 px-4',
  spacious: 'py-4 px-5',
}
```

**Step 2: Read the new style fields**

After the existing `const showHeader = resolvedStyle.headerVisible` line (around line 71), add:

```ts
const headerSize = resolvedStyle.headerSize ?? 'md'
const headerDensity = resolvedStyle.headerDensity ?? 'normal'
const showIcon = resolvedStyle.headerIconVisible ?? true
const sizeClasses = HEADER_SIZE_CLASSES[headerSize] ?? HEADER_SIZE_CLASSES.md
const densityClass = HEADER_DENSITY_CLASSES[headerDensity] ?? HEADER_DENSITY_CLASSES.normal
```

**Step 3: Update the CardHeader**

Find the `<CardHeader>` element (line 82). Change from:
```tsx
<CardHeader className="flex flex-row items-center gap-2 py-3 px-4">
```
to:
```tsx
<CardHeader className={cn('flex flex-row items-center gap-2', densityClass)}>
```

Make sure `cn` is imported (it should be already from line 5).

**Step 4: Update the Icon rendering**

Find the Icon element (line 88). Change from:
```tsx
<Icon className="size-4 text-text-secondary" />
```
to:
```tsx
{showIcon && <Icon className={cn(sizeClasses.icon, 'text-text-secondary')} />}
```

**Step 5: Update the CardTitle**

Find the CardTitle element (line 89). Change from:
```tsx
<CardTitle className="text-sm text-text-primary flex-1">{label}</CardTitle>
```
to:
```tsx
<CardTitle className={cn(sizeClasses.title, 'text-text-primary flex-1')}>{label}</CardTitle>
```

**Step 6: Verify TypeScript compiles**

Run: `cd frontend-next && npx tsc --noEmit`
Expected: PASS (0 errors)

**Step 7: Commit**

```bash
git add frontend-next/src/widgets/WidgetWrapper.tsx
git commit -m "feat(widgets): apply header size, density, and icon visibility styles in WidgetWrapper"
```

---

### Task 4: Visual verification

**Step 1: Open the app in browser**

Navigate to `http://localhost:5174/` and verify the dashboard loads.

**Step 2: Enter edit mode and open a widget config**

Click Edit, then click the gear icon on any configurable widget (e.g., Clock, Sticky Note, or the Navigation widget).

**Step 3: Verify new controls appear in the style section**

Scroll down in the config dialog. Below the accent colors, you should see:
- "Header Size" with S / M / L buttons
- "Header Density" with Compact / Normal / Spacious buttons
- "Show icon" checkbox
- "Show header" checkbox (existing)

**Step 4: Test each option**

- Click "S" for size, click Save — header text should shrink, icon should get smaller
- Click "L" for size, click Save — header text should grow, icon should get bigger
- Click "Compact" for density — header padding should tighten
- Click "Spacious" for density — header padding should increase
- Uncheck "Show icon" — icon should disappear from header, title remains
- Uncheck "Show header" — verify the Size/Density/Icon controls become disabled/grayed out

**Step 5: Test backward compatibility**

Verify widgets that were NOT reconfigured still render with their original medium/normal/icon-visible appearance (the defaults).

**Step 6: Commit (no code changes — just verification)**

No commit needed for this task.
