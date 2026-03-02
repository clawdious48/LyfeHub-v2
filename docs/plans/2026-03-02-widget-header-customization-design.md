# Widget Header Customization Design

**Date:** 2026-03-02
**Status:** Approved

## Goal

Allow users to customize widget header size, density, and icon visibility from the existing widget config dialog's style panel.

## Current State

`WidgetStyle` has 3 fields: `preset`, `accent`, `headerVisible`. The style panel in the config dialog offers card presets, accent colors, and a show/hide header toggle. Header rendering is fixed at `text-sm` / `py-3 px-4` with a mandatory icon.

## Design

### Data Model

Extend `WidgetStyle` in `registry.ts` with 3 new fields (all with backward-compatible defaults):

```ts
export interface WidgetStyle {
  preset: 'default' | 'borderless' | 'transparent'
  accent: string | null
  headerVisible: boolean          // existing
  headerSize: 'sm' | 'md' | 'lg' // NEW — default 'md'
  headerDensity: 'compact' | 'normal' | 'spacious' // NEW — default 'normal'
  headerIconVisible: boolean      // NEW — default true
}
```

### Tailwind Class Mapping

| Size | Title class | Icon size |
|------|------------|-----------|
| `sm` | `text-xs` | `size-3` |
| `md` | `text-sm` (current) | `size-4` (current) |
| `lg` | `text-base` | `size-5` |

| Density | Header padding |
|---------|---------------|
| `compact` | `py-1.5 px-3` |
| `normal` | `py-3 px-4` (current) |
| `spacious` | `py-4 px-5` |

### UI Controls (WidgetStylePanel)

Add between accent colors and "Show header" checkbox:

1. **Header Size** — 3-chip toggle: S / M / L
2. **Header Density** — 3-chip toggle: Compact / Normal / Spacious
3. **Show icon** — Checkbox (same style as "Show header")

All header-specific controls disabled when "Show header" is unchecked.

### WidgetWrapper Changes

- Read new style fields with defaults (`headerSize ?? 'md'`, `headerDensity ?? 'normal'`, `headerIconVisible ?? true`)
- Map to Tailwind classes for CardHeader padding, CardTitle text size, Icon size
- Conditionally render icon based on `headerIconVisible`

## Approach

Flat fields on WidgetStyle (Approach A). No migration needed — missing fields use defaults, so existing saved layouts render identically.

## Files Affected

- `widgets/registry.ts` — WidgetStyle type
- `widgets/WidgetStylePanel.tsx` — New controls
- `widgets/WidgetWrapper.tsx` — Class mapping + conditional icon
