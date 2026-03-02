import { cn } from '@/lib/utils.js'
import { Label } from '@/components/ui/label.js'
import { Checkbox } from '@/components/ui/checkbox.js'
import type { WidgetStyle } from './registry.js'

interface WidgetStylePanelProps {
  style: WidgetStyle
  onChange: (style: WidgetStyle) => void
}

const PRESETS: { value: WidgetStyle['preset']; label: string; desc: string }[] = [
  { value: 'default', label: 'Default', desc: 'Border + background' },
  { value: 'borderless', label: 'Borderless', desc: 'Background, no border' },
  { value: 'transparent', label: 'Transparent', desc: 'No background or border' },
]

const ACCENT_COLORS: { value: string | null; label: string; className: string }[] = [
  { value: null, label: 'None', className: 'bg-bg-surface border border-border' },
  { value: 'purple', label: 'Purple', className: 'bg-purple-500' },
  { value: 'blue', label: 'Blue', className: 'bg-blue-500' },
  { value: 'cyan', label: 'Cyan', className: 'bg-cyan-500' },
  { value: 'pink', label: 'Pink', className: 'bg-pink-500' },
  { value: 'orange', label: 'Orange', className: 'bg-orange-500' },
  { value: 'green', label: 'Green', className: 'bg-green-500' },
]

export default function WidgetStylePanel({ style, onChange }: WidgetStylePanelProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-text-secondary text-xs">Style</Label>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => onChange({ ...style, preset: preset.value })}
              className={cn(
                'rounded-md border p-2 text-center text-xs transition-colors',
                style.preset === preset.value
                  ? 'border-accent bg-accent/10 text-text-primary'
                  : 'border-border bg-bg-surface text-text-secondary hover:border-text-muted'
              )}
            >
              <div className="font-medium">{preset.label}</div>
              <div className="text-text-muted text-[10px] mt-0.5">{preset.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-text-secondary text-xs">Accent Color</Label>
        <div className="flex gap-2">
          {ACCENT_COLORS.map((color) => (
            <button
              key={color.value ?? 'none'}
              type="button"
              title={color.label}
              onClick={() => onChange({ ...style, accent: color.value })}
              className={cn(
                'size-6 rounded-full transition-all',
                color.className,
                style.accent === color.value
                  ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg-app'
                  : 'hover:scale-110'
              )}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="header-visible"
          checked={style.headerVisible}
          onCheckedChange={(checked) =>
            onChange({ ...style, headerVisible: checked === true })
          }
        />
        <Label htmlFor="header-visible" className="text-text-secondary text-xs cursor-pointer">
          Show header
        </Label>
      </div>
    </div>
  )
}
