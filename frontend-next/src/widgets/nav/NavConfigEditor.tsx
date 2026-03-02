import { Label } from '@/components/ui/label.js'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js'
import { Separator } from '@/components/ui/separator.js'
import NavItemPicker from './NavItemPicker.js'
import NavBuilderList from './NavBuilderList.js'
import type { NavItem, NavWidgetConfig, OverflowTriggerStyle, TriggerPosition } from './navTypes.js'

interface NavConfigEditorProps {
  config: NavWidgetConfig
  onChange: (config: NavWidgetConfig) => void
}

const TRIGGER_STYLES: { value: OverflowTriggerStyle; label: string }[] = [
  { value: 'ellipsis', label: 'Ellipsis (...)' },
  { value: 'hamburger', label: 'Hamburger' },
  { value: 'arrow', label: 'Arrow' },
  { value: 'invisible', label: 'Invisible' },
]

const TRIGGER_POSITIONS: { value: TriggerPosition; label: string }[] = [
  { value: 'start', label: 'Start' },
  { value: 'end', label: 'End' },
]

export default function NavConfigEditor({ config, onChange }: NavConfigEditorProps) {
  const items = config.items ?? []

  const handleAddItem = (item: NavItem) => {
    onChange({ ...config, items: [...items, item] })
  }

  const handleRemoveItem = (id: string) => {
    // Remove from top-level or from within toggle-header children
    const filtered = items
      .filter((item) => item.id !== id)
      .map((item) => {
        if (item.type === 'toggle-header') {
          return { ...item, children: item.children.filter((c) => c.id !== id) }
        }
        return item
      })
    onChange({ ...config, items: filtered })
  }

  const handleReorder = (newItems: NavItem[]) => {
    onChange({ ...config, items: newItems })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Left panel: item picker */}
        <div className="border border-border rounded-md p-3 max-h-[360px] overflow-y-auto">
          <NavItemPicker
            items={items}
            onAddItem={handleAddItem}
            onRemoveItem={handleRemoveItem}
          />
        </div>

        {/* Right panel: builder list */}
        <div className="border border-border rounded-md p-3 max-h-[360px] overflow-y-auto">
          <Label className="text-text-secondary text-xs mb-2 block">Nav Order</Label>
          <NavBuilderList
            items={items}
            onReorder={handleReorder}
            onRemoveItem={handleRemoveItem}
          />
        </div>
      </div>

      <Separator />

      {/* Overflow & dock trigger settings */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-text-secondary text-xs">Overflow Trigger</Label>
          <div className="flex gap-2">
            <Select
              value={config.overflowTrigger}
              onValueChange={(val) =>
                onChange({ ...config, overflowTrigger: val as OverflowTriggerStyle })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_STYLES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={config.overflowPosition}
              onValueChange={(val) =>
                onChange({ ...config, overflowPosition: val as TriggerPosition })
              }
            >
              <SelectTrigger className="h-8 text-xs w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_POSITIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-text-secondary text-xs">Dock Collapse Trigger</Label>
          <Select
            value={config.dockCollapseTrigger}
            onValueChange={(val) =>
              onChange({ ...config, dockCollapseTrigger: val as OverflowTriggerStyle })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRIGGER_STYLES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
