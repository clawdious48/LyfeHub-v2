import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox.js'
import { Button } from '@/components/ui/button.js'
import { Input } from '@/components/ui/input.js'
import { Label } from '@/components/ui/label.js'
import { Separator } from '@/components/ui/separator.js'
import { Plus, Check, StickyNote, CheckSquare, Contact } from 'lucide-react'
import { APP_ROUTES, ROUTE_CATEGORIES } from '@/layouts/navRoutes.js'
import type { NavItem } from './navTypes.js'

interface NavItemPickerProps {
  items: NavItem[]
  onAddItem: (item: NavItem) => void
  onRemoveItem: (id: string) => void
}

const CAPTURE_TYPES = [
  { type: 'note' as const, label: 'Note', icon: StickyNote },
  { type: 'task' as const, label: 'Task', icon: CheckSquare },
  { type: 'contact' as const, label: 'Contact', icon: Contact },
]

export default function NavItemPicker({ items, onAddItem, onRemoveItem }: NavItemPickerProps) {
  const [headerInput, setHeaderInput] = useState<'header' | 'toggle-header' | null>(null)
  const [headerLabel, setHeaderLabel] = useState('')

  const isRouteAdded = (path: string) =>
    items.some((item) => item.type === 'route' && item.route === path)

  const isCaptureAdded = (captureType: string) =>
    items.some((item) => item.type === 'quick-capture' && item.captureType === captureType)

  const findItemId = (predicate: (item: NavItem) => boolean): string | undefined => {
    const found = items.find(predicate)
    return found?.id
  }

  const handleRouteToggle = (path: string) => {
    if (isRouteAdded(path)) {
      const id = findItemId((item) => item.type === 'route' && item.route === path)
      if (id) onRemoveItem(id)
    } else {
      onAddItem({ id: crypto.randomUUID(), type: 'route', route: path })
    }
  }

  const handleCaptureToggle = (captureType: 'note' | 'task' | 'contact') => {
    if (isCaptureAdded(captureType)) {
      const id = findItemId((item) => item.type === 'quick-capture' && item.captureType === captureType)
      if (id) onRemoveItem(id)
    } else {
      onAddItem({ id: crypto.randomUUID(), type: 'quick-capture', captureType })
    }
  }

  const handleAddHeader = () => {
    if (!headerInput || !headerLabel.trim()) return
    onAddItem({
      id: crypto.randomUUID(),
      type: headerInput,
      label: headerLabel.trim(),
      ...(headerInput === 'toggle-header' ? { children: [], collapsed: false } : {}),
    } as NavItem)
    setHeaderInput(null)
    setHeaderLabel('')
  }

  return (
    <div className="space-y-3 text-sm">
      <Label className="text-text-secondary text-xs">Routes</Label>
      {ROUTE_CATEGORIES.map((cat) => {
        const routes = APP_ROUTES.filter((r) => r.category === cat.key)
        return (
          <div key={cat.key} className="space-y-1">
            <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
              {cat.label}
            </div>
            {routes.map((route) => {
              const Icon = route.icon
              const checked = isRouteAdded(route.path)
              return (
                <label
                  key={route.path}
                  className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-bg-hover cursor-pointer"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => handleRouteToggle(route.path)}
                  />
                  <Icon className="size-3.5 text-text-muted" />
                  <span className="text-text-primary text-xs">{route.label}</span>
                </label>
              )
            })}
          </div>
        )
      })}

      <Separator />

      <Label className="text-text-secondary text-xs">Quick Capture</Label>
      <div className="space-y-1">
        {CAPTURE_TYPES.map(({ type, label, icon: Icon }) => {
          const checked = isCaptureAdded(type)
          return (
            <label
              key={type}
              className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-bg-hover cursor-pointer"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => handleCaptureToggle(type)}
              />
              <Icon className="size-3.5 text-text-muted" />
              <span className="text-text-primary text-xs">{label}</span>
            </label>
          )
        })}
      </div>

      <Separator />

      <Label className="text-text-secondary text-xs">Structure</Label>
      <div className="space-y-1.5">
        {headerInput ? (
          <div className="flex items-center gap-1.5">
            <Input
              autoFocus
              value={headerLabel}
              onChange={(e) => setHeaderLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddHeader()
                if (e.key === 'Escape') {
                  setHeaderInput(null)
                  setHeaderLabel('')
                }
              }}
              placeholder={headerInput === 'header' ? 'Header label...' : 'Toggle header label...'}
              className="h-7 text-xs"
            />
            <Button
              size="sm"
              variant="ghost"
              className="size-7 p-0"
              onClick={handleAddHeader}
              disabled={!headerLabel.trim()}
            >
              <Check className="size-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs flex-1"
              onClick={() => setHeaderInput('header')}
            >
              <Plus className="size-3 mr-1" /> Header
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs flex-1"
              onClick={() => setHeaderInput('toggle-header')}
            >
              <Plus className="size-3 mr-1" /> Toggle
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
