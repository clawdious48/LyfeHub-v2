import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog.js'
import { Button } from '@/components/ui/button.js'
import { Input } from '@/components/ui/input.js'
import { Label } from '@/components/ui/label.js'
import { Checkbox } from '@/components/ui/checkbox.js'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js'
import { Separator } from '@/components/ui/separator.js'
import { useBases, useBase } from '@/api/hooks/useBases.js'
import WidgetStylePanel from './WidgetStylePanel.js'
import NavConfigEditor from './nav/NavConfigEditor.js'
import type { NavWidgetConfig } from './nav/navTypes.js'
import type { ConfigField, WidgetStyle } from './registry.js'

interface WidgetConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  configSchema: ConfigField[]
  config: Record<string, unknown>
  style: WidgetStyle
  onSave: (config: Record<string, unknown>, style: WidgetStyle) => void
}

const ACCENT_COLORS = [
  { value: 'purple', className: 'bg-purple-500' },
  { value: 'blue', className: 'bg-blue-500' },
  { value: 'cyan', className: 'bg-cyan-500' },
  { value: 'pink', className: 'bg-pink-500' },
  { value: 'orange', className: 'bg-orange-500' },
  { value: 'green', className: 'bg-green-500' },
]

export default function WidgetConfigDialog({
  open,
  onOpenChange,
  title,
  configSchema,
  config,
  style,
  onSave,
}: WidgetConfigDialogProps) {
  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>(config)
  const [localStyle, setLocalStyle] = useState<WidgetStyle>(style)

  useEffect(() => {
    if (open) {
      setLocalConfig(config)
      setLocalStyle(style)
    }
  }, [open, config, style])

  const updateField = (key: string, value: unknown) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    onSave(localConfig, localStyle)
    onOpenChange(false)
  }

  const hasNavEditor = configSchema.some((f) => f.type === 'nav-editor')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={hasNavEditor ? 'sm:max-w-2xl' : 'sm:max-w-md'}>
        <DialogHeader>
          <DialogTitle className="text-text-primary">Configure {title}</DialogTitle>
        </DialogHeader>

        {hasNavEditor ? (
          <div className="py-2">
            <NavConfigEditor
              config={localConfig as unknown as NavWidgetConfig}
              onChange={(newConfig) => setLocalConfig(newConfig as unknown as Record<string, unknown>)}
            />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {configSchema.map((field) => (
              <ConfigFieldRenderer
                key={field.key}
                field={field}
                value={localConfig[field.key] ?? field.default}
                allValues={localConfig}
                onChange={(val) => updateField(field.key, val)}
              />
            ))}

            {configSchema.length > 0 && <Separator />}

            <WidgetStylePanel style={localStyle} onChange={setLocalStyle} />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ConfigFieldRendererProps {
  field: ConfigField
  value: unknown
  allValues: Record<string, unknown>
  onChange: (value: unknown) => void
}

function ConfigFieldRenderer({ field, value, allValues, onChange }: ConfigFieldRendererProps) {
  switch (field.type) {
    case 'text':
      return (
        <div className="space-y-1.5">
          <Label className="text-text-secondary text-xs">{field.label}</Label>
          <Input
            value={(value as string) ?? ''}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )

    case 'number':
      return (
        <div className="space-y-1.5">
          <Label className="text-text-secondary text-xs">{field.label}</Label>
          <Input
            type="number"
            value={(value as number) ?? ''}
            placeholder={field.placeholder}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </div>
      )

    case 'url':
      return (
        <div className="space-y-1.5">
          <Label className="text-text-secondary text-xs">{field.label}</Label>
          <Input
            type="url"
            value={(value as string) ?? ''}
            placeholder={field.placeholder ?? 'https://...'}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )

    case 'select':
      return (
        <div className="space-y-1.5">
          <Label className="text-text-secondary text-xs">{field.label}</Label>
          <Select value={(value as string) ?? ''} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )

    case 'toggle':
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={`config-${field.key}`}
            checked={(value as boolean) ?? false}
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          <Label
            htmlFor={`config-${field.key}`}
            className="text-text-secondary text-xs cursor-pointer"
          >
            {field.label}
          </Label>
        </div>
      )

    case 'color':
      return (
        <div className="space-y-1.5">
          <Label className="text-text-secondary text-xs">{field.label}</Label>
          <ColorPicker value={(value as string) ?? ''} onChange={onChange} />
        </div>
      )

    case 'base-picker':
      return (
        <div className="space-y-1.5">
          <Label className="text-text-secondary text-xs">{field.label}</Label>
          <BasePicker value={(value as string) ?? ''} onChange={onChange} />
        </div>
      )

    case 'view-picker': {
      const baseId = field.dependsOn ? (allValues[field.dependsOn] as string) : ''
      return (
        <div className="space-y-1.5">
          <Label className="text-text-secondary text-xs">{field.label}</Label>
          <ViewPicker baseId={baseId ?? ''} value={(value as string) ?? ''} onChange={onChange} />
        </div>
      )
    }

    case 'links-editor':
    case 'feeds-editor':
      return (
        <div className="space-y-1.5">
          <Label className="text-text-secondary text-xs">{field.label}</Label>
          <p className="text-text-muted text-xs">Configure in widget</p>
        </div>
      )

    default:
      return null
  }
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: unknown) => void }) {
  return (
    <div className="flex gap-2">
      {ACCENT_COLORS.map((color) => (
        <button
          key={color.value}
          type="button"
          title={color.value}
          onClick={() => onChange(color.value)}
          className={`size-6 rounded-full ${color.className} transition-all ${
            value === color.value
              ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg-app'
              : 'hover:scale-110'
          }`}
        />
      ))}
    </div>
  )
}

function BasePicker({ value, onChange }: { value: string; onChange: (v: unknown) => void }) {
  const { data: bases } = useBases()

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select a base..." />
      </SelectTrigger>
      <SelectContent>
        {bases?.map((base) => (
          <SelectItem key={base.id} value={base.id}>
            {base.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function ViewPicker({
  baseId,
  value,
  onChange,
}: {
  baseId: string
  value: string
  onChange: (v: unknown) => void
}) {
  const { data: base } = useBase(baseId)
  const views = (base as unknown as Record<string, unknown>)?.views as
    | Array<{ id: string; name: string }>
    | undefined

  if (!baseId) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Select a base first" />
        </SelectTrigger>
        <SelectContent />
      </Select>
    )
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select a view..." />
      </SelectTrigger>
      <SelectContent>
        {views?.map((view) => (
          <SelectItem key={view.id} value={view.id}>
            {view.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
