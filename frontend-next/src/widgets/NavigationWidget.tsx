import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronDown, FileText, CheckSquare, UserPlus } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog.js'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu.js'
import { Button } from '@/components/ui/button.js'
import { Input } from '@/components/ui/input.js'
import { cn } from '@/lib/utils.js'
import { getRouteByPath } from '@/layouts/navRoutes.js'
import { apiClient } from '@/api/client.js'
import { TaskQuickCaptureModal } from '@/pages/tasks/components/modals/TaskQuickCaptureModal.js'
import type { NavWidgetConfig, NavItem, NavToggleHeaderItem, NavCaptureItem } from './nav/navTypes.js'
import { DEFAULT_NAV_CONFIG } from './nav/navTypes.js'

type Orientation = 'horizontal' | 'vertical'

interface NavigationWidgetProps {
  config?: Record<string, unknown>
  onConfigChange?: (config: Record<string, unknown>) => void
}

function parseConfig(raw?: Record<string, unknown>): NavWidgetConfig {
  if (!raw) return DEFAULT_NAV_CONFIG
  return {
    items: (raw.items as NavItem[] | undefined) ?? DEFAULT_NAV_CONFIG.items,
    overflowTrigger: (raw.overflowTrigger as NavWidgetConfig['overflowTrigger']) ?? DEFAULT_NAV_CONFIG.overflowTrigger,
    overflowPosition: (raw.overflowPosition as NavWidgetConfig['overflowPosition']) ?? DEFAULT_NAV_CONFIG.overflowPosition,
    dockCollapseTrigger: (raw.dockCollapseTrigger as NavWidgetConfig['dockCollapseTrigger']) ?? DEFAULT_NAV_CONFIG.dockCollapseTrigger,
    collapsed: (raw.collapsed as boolean | undefined) ?? DEFAULT_NAV_CONFIG.collapsed,
    savedW: raw.savedW as number | undefined,
    savedH: raw.savedH as number | undefined,
  }
}

// ── Capture modal for note/contact ──────────────────────────────────────────

function CaptureDialog({
  open,
  onOpenChange,
  captureType,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  captureType: 'note' | 'contact'
}) {
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)

  function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    apiClient.post('/inbox/capture', { type: captureType, title: title.trim() }).finally(() => {
      setSaving(false)
      setTitle('')
      onOpenChange(false)
    })
  }

  function handleOpenChange(next: boolean) {
    if (!next) setTitle('')
    onOpenChange(next)
  }

  const label = captureType === 'note' ? 'Note' : 'Contact'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Add {label}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Input
            placeholder={`${label} title...`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSave()
              }
            }}
            autoFocus
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={!title.trim() || saving}>
            Create {label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Capture item helpers ────────────────────────────────────────────────────

const CAPTURE_META: Record<NavCaptureItem['captureType'], { icon: typeof FileText; label: string; color: string }> = {
  note: { icon: FileText, label: 'Note', color: 'text-purple-500' },
  task: { icon: CheckSquare, label: 'Task', color: 'text-blue-500' },
  contact: { icon: UserPlus, label: 'Contact', color: 'text-green-500' },
}

// ── Vertical layout renderers ───────────────────────────────────────────────

function VerticalRouteItem({
  route,
  isActive,
  onNavigate,
}: {
  route: string
  isActive: boolean
  onNavigate: (path: string) => void
}) {
  const appRoute = getRouteByPath(route)
  if (!appRoute) return null
  const Icon = appRoute.icon

  return (
    <button
      onClick={() => onNavigate(route)}
      className={cn(
        'flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-left transition-colors',
        isActive
          ? 'border-l-2 border-accent bg-accent/5 text-accent'
          : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary',
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="text-sm truncate">{appRoute.label}</span>
    </button>
  )
}

function VerticalHeader({ label }: { label: string }) {
  return (
    <div className="pt-3 pb-1 px-2">
      <div className="flex items-center gap-2">
        <span className="uppercase text-[10px] font-medium tracking-wider text-text-muted">
          {label}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>
    </div>
  )
}

function VerticalToggleHeader({
  item,
  currentPath,
  onNavigate,
  onToggle,
  onCapture,
}: {
  item: NavToggleHeaderItem
  currentPath: string
  onNavigate: (path: string) => void
  onToggle: (id: string) => void
  onCapture: (type: NavCaptureItem['captureType']) => void
}) {
  return (
    <div>
      <button
        onClick={() => onToggle(item.id)}
        className="flex items-center gap-1.5 w-full rounded-md px-2 py-1.5 text-left text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
      >
        {item.collapsed ? (
          <ChevronRight className="size-3.5 shrink-0" />
        ) : (
          <ChevronDown className="size-3.5 shrink-0" />
        )}
        <span className="text-sm font-medium truncate">{item.label}</span>
      </button>
      {!item.collapsed && (
        <div className="pl-4">
          {item.children.map((child) => (
            <VerticalNavItem
              key={child.id}
              item={child}
              currentPath={currentPath}
              onNavigate={onNavigate}
              onToggle={onToggle}
              onCapture={onCapture}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function VerticalCaptureItem({
  captureType,
  onCapture,
}: {
  captureType: NavCaptureItem['captureType']
  onCapture: (type: NavCaptureItem['captureType']) => void
}) {
  const meta = CAPTURE_META[captureType]
  const Icon = meta.icon

  return (
    <button
      onClick={() => onCapture(captureType)}
      className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-left text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
    >
      <Icon className={cn('size-4 shrink-0', meta.color)} />
      <span className="text-sm truncate">{meta.label}</span>
    </button>
  )
}

function VerticalNavItem({
  item,
  currentPath,
  onNavigate,
  onToggle,
  onCapture,
}: {
  item: NavItem
  currentPath: string
  onNavigate: (path: string) => void
  onToggle: (id: string) => void
  onCapture: (type: NavCaptureItem['captureType']) => void
}) {
  switch (item.type) {
    case 'route':
      return <VerticalRouteItem route={item.route} isActive={currentPath === item.route} onNavigate={onNavigate} />
    case 'header':
      return <VerticalHeader label={item.label} />
    case 'toggle-header':
      return (
        <VerticalToggleHeader
          item={item}
          currentPath={currentPath}
          onNavigate={onNavigate}
          onToggle={onToggle}
          onCapture={onCapture}
        />
      )
    case 'quick-capture':
      return <VerticalCaptureItem captureType={item.captureType} onCapture={onCapture} />
  }
}

// ── Horizontal layout renderers ─────────────────────────────────────────────

function HorizontalRouteItem({
  route,
  isActive,
  onNavigate,
}: {
  route: string
  isActive: boolean
  onNavigate: (path: string) => void
}) {
  const appRoute = getRouteByPath(route)
  if (!appRoute) return null
  const Icon = appRoute.icon

  return (
    <button
      onClick={() => onNavigate(route)}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap transition-colors',
        isActive
          ? 'border-b-2 border-accent text-accent'
          : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary',
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span>{appRoute.label}</span>
    </button>
  )
}

function HorizontalHeader() {
  return <div className="w-px h-5 bg-border mx-1" />
}

function HorizontalToggleHeader({
  item,
  currentPath,
  onNavigate,
  onCapture,
}: {
  item: NavToggleHeaderItem
  currentPath: string
  onNavigate: (path: string) => void
  onCapture: (type: NavCaptureItem['captureType']) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary whitespace-nowrap transition-colors">
          <span>{item.label}</span>
          <ChevronDown className="size-3.5 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {item.children.map((child) => {
          if (child.type === 'route') {
            const appRoute = getRouteByPath(child.route)
            if (!appRoute) return null
            const Icon = appRoute.icon
            const isActive = currentPath === child.route
            return (
              <DropdownMenuItem
                key={child.id}
                onClick={() => onNavigate(child.route)}
                className={cn(isActive && 'text-accent')}
              >
                <Icon className="size-4 shrink-0" />
                {appRoute.label}
              </DropdownMenuItem>
            )
          }
          if (child.type === 'quick-capture') {
            const meta = CAPTURE_META[child.captureType]
            const CaptureIcon = meta.icon
            return (
              <DropdownMenuItem
                key={child.id}
                onClick={() => onCapture(child.captureType)}
              >
                <CaptureIcon className={cn('size-4 shrink-0', meta.color)} />
                {meta.label}
              </DropdownMenuItem>
            )
          }
          return null
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function HorizontalCaptureItem({
  captureType,
  onCapture,
}: {
  captureType: NavCaptureItem['captureType']
  onCapture: (type: NavCaptureItem['captureType']) => void
}) {
  const meta = CAPTURE_META[captureType]
  const Icon = meta.icon

  return (
    <button
      onClick={() => onCapture(captureType)}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary whitespace-nowrap transition-colors"
    >
      <Icon className={cn('size-4 shrink-0', meta.color)} />
      <span>{meta.label}</span>
    </button>
  )
}

function HorizontalNavItem({
  item,
  currentPath,
  onNavigate,
  onCapture,
}: {
  item: NavItem
  currentPath: string
  onNavigate: (path: string) => void
  onCapture: (type: NavCaptureItem['captureType']) => void
}) {
  switch (item.type) {
    case 'route':
      return <HorizontalRouteItem route={item.route} isActive={currentPath === item.route} onNavigate={onNavigate} />
    case 'header':
      return <HorizontalHeader />
    case 'toggle-header':
      return (
        <HorizontalToggleHeader
          item={item}
          currentPath={currentPath}
          onNavigate={onNavigate}
          onCapture={onCapture}
        />
      )
    case 'quick-capture':
      return <HorizontalCaptureItem captureType={item.captureType} onCapture={onCapture} />
  }
}

// ── Main widget ─────────────────────────────────────────────────────────────

export default function NavigationWidget({ config: rawConfig, onConfigChange }: NavigationWidgetProps) {
  const navConfig = parseConfig(rawConfig)
  const containerRef = useRef<HTMLDivElement>(null)
  const [orientation, setOrientation] = useState<Orientation>('vertical')
  const location = useLocation()
  const navigate = useNavigate()

  // Capture modal state
  const [captureOpen, setCaptureOpen] = useState(false)
  const [captureType, setCaptureType] = useState<'note' | 'contact'>('note')
  const [taskCaptureOpen, setTaskCaptureOpen] = useState(false)

  // Measure container and determine orientation
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (height === 0) continue
        const ratio = width / height
        if (ratio > 1.5) {
          setOrientation('horizontal')
        } else if (ratio < 0.67) {
          setOrientation('vertical')
        } else {
          setOrientation('vertical')
        }
      }
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleNavigate = useCallback((path: string) => {
    navigate(path)
  }, [navigate])

  const handleCapture = useCallback((type: NavCaptureItem['captureType']) => {
    if (type === 'task') {
      setTaskCaptureOpen(true)
    } else {
      setCaptureType(type)
      setCaptureOpen(true)
    }
  }, [])

  const handleToggle = useCallback((id: string) => {
    if (!onConfigChange) return
    const toggleInItems = (items: NavItem[]): NavItem[] =>
      items.map((item) => {
        if (item.type === 'toggle-header' && item.id === id) {
          return { ...item, collapsed: !item.collapsed }
        }
        return item
      })

    onConfigChange({
      ...rawConfig,
      items: toggleInItems(navConfig.items),
    })
  }, [onConfigChange, rawConfig, navConfig.items])

  // Empty state
  if (navConfig.items.length === 0) {
    return (
      <div ref={containerRef} className="flex flex-col items-center justify-center h-full gap-1 text-center px-4">
        <p className="text-sm text-text-secondary">No navigation items configured</p>
        <p className="text-xs text-text-muted">Enter edit mode and click the gear icon to add items</p>
      </div>
    )
  }

  const currentPath = location.pathname

  return (
    <div ref={containerRef} className="h-full">
      {orientation === 'vertical' ? (
        <div className="flex flex-col gap-0.5">
          {navConfig.items.map((item) => (
            <VerticalNavItem
              key={item.id}
              item={item}
              currentPath={currentPath}
              onNavigate={handleNavigate}
              onToggle={handleToggle}
              onCapture={handleCapture}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-row gap-1 items-center flex-wrap">
          {navConfig.items.map((item) => (
            <HorizontalNavItem
              key={item.id}
              item={item}
              currentPath={currentPath}
              onNavigate={handleNavigate}
              onCapture={handleCapture}
            />
          ))}
        </div>
      )}

      {/* Note / Contact capture dialog */}
      <CaptureDialog
        open={captureOpen}
        onOpenChange={setCaptureOpen}
        captureType={captureType}
      />

      {/* Task capture dialog */}
      <TaskQuickCaptureModal
        open={taskCaptureOpen}
        onOpenChange={setTaskCaptureOpen}
      />
    </div>
  )
}
