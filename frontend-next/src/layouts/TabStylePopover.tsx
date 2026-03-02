import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog.js'
import { Button } from '@/components/ui/button.js'
import { useHeaderStore } from '@/stores/headerStore.js'
import type { TabStyleConfig } from '@/hooks/useUserSettings.js'

const COLOR_OPTIONS = [
  { label: 'Default', value: '', preview: 'transparent' },
  { label: 'Purple', value: 'rgba(168,85,247,0.15)', preview: 'rgb(168,85,247)' },
  { label: 'Blue', value: 'rgba(59,130,246,0.15)', preview: 'rgb(59,130,246)' },
  { label: 'Cyan', value: 'rgba(6,182,212,0.15)', preview: 'rgb(6,182,212)' },
  { label: 'Pink', value: 'rgba(236,72,153,0.15)', preview: 'rgb(236,72,153)' },
  { label: 'Orange', value: 'rgba(249,115,22,0.15)', preview: 'rgb(249,115,22)' },
  { label: 'Green', value: 'rgba(34,197,94,0.15)', preview: 'rgb(34,197,94)' },
]

const SELECTED_COLOR_OPTIONS = [
  { label: 'Default', value: '', preview: 'transparent' },
  { label: 'Purple', value: 'rgba(168,85,247,0.25)', preview: 'rgb(168,85,247)' },
  { label: 'Blue', value: 'rgba(59,130,246,0.25)', preview: 'rgb(59,130,246)' },
  { label: 'Cyan', value: 'rgba(6,182,212,0.25)', preview: 'rgb(6,182,212)' },
  { label: 'Pink', value: 'rgba(236,72,153,0.25)', preview: 'rgb(236,72,153)' },
  { label: 'Orange', value: 'rgba(249,115,22,0.25)', preview: 'rgb(249,115,22)' },
  { label: 'Green', value: 'rgba(34,197,94,0.25)', preview: 'rgb(34,197,94)' },
]

const BORDER_WIDTH_OPTIONS = [
  { label: 'None', value: 0 },
  { label: 'Thin', value: 1 },
  { label: 'Medium', value: 2 },
]

interface TabStylePopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tabId: string
  tabLabel: string
}

function ColorSwatch({
  options,
  selected,
  onChange,
}: {
  options: { label: string; value: string; preview: string }[]
  selected: string | undefined
  onChange: (value: string) => void
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {options.map((opt) => {
        const isSelected = (selected ?? '') === opt.value
        const isDefault = opt.value === ''
        return (
          <button
            key={opt.label}
            type="button"
            title={opt.label}
            onClick={() => onChange(opt.value)}
            className={`size-6 rounded-full border-2 transition-all shrink-0 ${
              isSelected
                ? 'border-accent ring-1 ring-accent ring-offset-1 ring-offset-bg-surface scale-110'
                : 'border-border hover:border-text-muted'
            }`}
            style={{
              background: isDefault
                ? 'repeating-conic-gradient(rgba(128,128,128,0.3) 0% 25%, transparent 0% 50%) 50% / 8px 8px'
                : opt.preview,
            }}
          />
        )
      })}
    </div>
  )
}

export function TabStylePopover({ open, onOpenChange, tabId, tabLabel }: TabStylePopoverProps) {
  const tabStyles = useHeaderStore((s) => s.tabStyles)
  const setTabStyle = useHeaderStore((s) => s.setTabStyle)

  const currentStyle = tabStyles[tabId] ?? {}
  const [draft, setDraft] = useState<TabStyleConfig>(currentStyle)

  useEffect(() => {
    if (open) setDraft(tabStyles[tabId] ?? {})
  }, [open, tabId, tabStyles])

  function updateDraft(patch: Partial<TabStyleConfig>) {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  function handleSave() {
    // Clean up empty values before saving
    const cleaned: TabStyleConfig = {}
    if (draft.bgColor) cleaned.bgColor = draft.bgColor
    if (draft.borderColor) cleaned.borderColor = draft.borderColor
    if (draft.borderWidth) cleaned.borderWidth = draft.borderWidth
    if (draft.opacity !== undefined && draft.opacity !== 1) cleaned.opacity = draft.opacity
    if (draft.selectedBgColor) cleaned.selectedBgColor = draft.selectedBgColor
    if (draft.hoverBgColor) cleaned.hoverBgColor = draft.hoverBgColor
    setTabStyle(tabId, cleaned)
    onOpenChange(false)
  }

  function handleReset() {
    setTabStyle(tabId, {})
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Style: {tabLabel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Background Color */}
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Background</label>
            <ColorSwatch
              options={COLOR_OPTIONS}
              selected={draft.bgColor}
              onChange={(v) => updateDraft({ bgColor: v })}
            />
          </div>

          {/* Border */}
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Border Color</label>
            <ColorSwatch
              options={COLOR_OPTIONS}
              selected={draft.borderColor}
              onChange={(v) => updateDraft({ borderColor: v })}
            />
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-text-muted">Width:</span>
              <div className="flex gap-1">
                {BORDER_WIDTH_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateDraft({ borderWidth: opt.value })}
                    className={`px-2 py-0.5 text-xs rounded transition-colors ${
                      (draft.borderWidth ?? 0) === opt.value
                        ? 'bg-accent text-white'
                        : 'bg-bg-hover text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Opacity */}
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">
              Opacity: {draft.opacity ?? 1}
            </label>
            <input
              type="range"
              min="0.3"
              max="1"
              step="0.1"
              value={draft.opacity ?? 1}
              onChange={(e) => updateDraft({ opacity: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-bg-hover rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-3.5
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-0
                [&::-moz-range-thumb]:cursor-pointer"
            />
          </div>

          {/* Selected Color */}
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Selected (active tab)</label>
            <ColorSwatch
              options={SELECTED_COLOR_OPTIONS}
              selected={draft.selectedBgColor}
              onChange={(v) => updateDraft({ selectedBgColor: v })}
            />
          </div>

          {/* Hover Color */}
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Hover</label>
            <ColorSwatch
              options={COLOR_OPTIONS}
              selected={draft.hoverBgColor}
              onChange={(v) => updateDraft({ hoverBgColor: v })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
