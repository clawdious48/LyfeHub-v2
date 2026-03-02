import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.js'
import type { DashboardSettings } from '@/api/hooks/index.js'
import { cn } from '@/lib/utils.js'

interface DashboardSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: DashboardSettings
  onSettingsChange: (settings: DashboardSettings) => void
}

const GAP_OPTIONS: { label: string; value: 8 | 16 | 24 }[] = [
  { label: 'Compact', value: 8 },
  { label: 'Normal', value: 16 },
  { label: 'Spacious', value: 24 },
]

const BG_OPTIONS: { label: string; value: string; swatch: string }[] = [
  { label: 'Default', value: 'default', swatch: 'bg-bg-app' },
  { label: 'Subtle Gradient', value: 'gradient-purple', swatch: 'bg-gradient-to-br from-bg-app to-purple-950/20' },
  { label: 'Deep Space', value: 'gradient-space', swatch: 'bg-gradient-to-b from-slate-950 to-bg-app' },
  { label: 'Warm', value: 'gradient-warm', swatch: 'bg-gradient-to-br from-bg-app to-orange-950/10' },
]

function GapPreview({ gap }: { gap: number }) {
  const g = gap === 8 ? 1 : gap === 16 ? 2 : 3
  return (
    <div className="flex gap-[var(--preview-gap)] w-full justify-center" style={{ '--preview-gap': `${g * 2}px` } as React.CSSProperties}>
      <div className="w-3 h-5 rounded-sm bg-text-muted/30" />
      <div className="w-3 h-5 rounded-sm bg-text-muted/30" />
      <div className="w-3 h-5 rounded-sm bg-text-muted/30" />
    </div>
  )
}

export default function DashboardSettingsDialog({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
}: DashboardSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dashboard Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Widget Gap */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-text-primary">Widget Gap</label>
            <div className="flex gap-3">
              {GAP_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onSettingsChange({ ...settings, gap: opt.value })}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors',
                    settings.gap === opt.value
                      ? 'border-accent bg-accent/5'
                      : 'border-border hover:border-border-hover'
                  )}
                >
                  <GapPreview gap={opt.value} />
                  <span className="text-xs text-text-secondary">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dashboard Background */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-text-primary">Background</label>
            <div className="flex gap-3">
              {BG_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onSettingsChange({ ...settings, background: opt.value })}
                  className="flex flex-col items-center gap-2"
                >
                  <div
                    className={cn(
                      'size-12 rounded-lg border-2 transition-all',
                      opt.swatch,
                      settings.background === opt.value
                        ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg-app border-accent'
                        : 'border-border hover:border-border-hover'
                    )}
                  />
                  <span className="text-xs text-text-secondary">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
