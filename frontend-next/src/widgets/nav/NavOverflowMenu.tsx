import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  MoreHorizontal, MoreVertical, Menu,
  ChevronDown, ChevronUp, ChevronRight, ChevronLeft,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu.js'
import { cn } from '@/lib/utils.js'
import { APP_ROUTES, ROUTE_CATEGORIES, type AppRoute } from '@/layouts/navRoutes.js'
import type { OverflowTriggerStyle, TriggerPosition } from './navTypes.js'

interface NavOverflowMenuProps {
  configuredRoutes: string[]
  triggerStyle: OverflowTriggerStyle
  position: TriggerPosition
  orientation: 'vertical' | 'horizontal'
}

function getTriggerIcon(
  style: OverflowTriggerStyle,
  orientation: 'vertical' | 'horizontal',
  position: TriggerPosition,
) {
  switch (style) {
    case 'ellipsis':
      return orientation === 'horizontal' ? MoreHorizontal : MoreVertical
    case 'hamburger':
      return Menu
    case 'arrow': {
      if (orientation === 'vertical') return position === 'end' ? ChevronDown : ChevronUp
      return position === 'end' ? ChevronRight : ChevronLeft
    }
    case 'invisible':
      return orientation === 'horizontal' ? MoreHorizontal : MoreVertical
  }
}

export default function NavOverflowMenu({
  configuredRoutes,
  triggerStyle,
  position,
  orientation,
}: NavOverflowMenuProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const missingRoutes = APP_ROUTES.filter((r) => !configuredRoutes.includes(r.path))

  if (missingRoutes.length === 0) return null

  // Group missing routes by category
  const groupedRoutes: { key: string; label: string; routes: AppRoute[] }[] = []
  for (const cat of ROUTE_CATEGORIES) {
    const routes = missingRoutes.filter((r) => r.category === cat.key)
    if (routes.length > 0) {
      groupedRoutes.push({ key: cat.key, label: cat.label, routes })
    }
  }

  const Icon = getTriggerIcon(triggerStyle, orientation, position)
  const isInvisible = triggerStyle === 'invisible'

  const trigger = isInvisible ? (
    <button
      className={cn(
        'flex items-center justify-center transition-opacity opacity-0 hover:opacity-100',
        orientation === 'vertical' ? 'w-full h-5' : 'h-full w-5',
      )}
    >
      <Icon className="size-3.5 text-text-muted" />
    </button>
  ) : (
    <button
      className={cn(
        'flex items-center justify-center rounded-md transition-colors text-text-muted hover:bg-bg-hover hover:text-text-primary',
        orientation === 'vertical' ? 'w-full py-1.5 px-2' : 'px-1.5 py-1.5',
      )}
    >
      <Icon className="size-4" />
    </button>
  )

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={position === 'start' ? 'start' : 'end'}
        className="max-h-80 overflow-y-auto min-w-[160px]"
      >
        {groupedRoutes.map((group, gi) => (
          <div key={group.key}>
            {gi > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="uppercase text-[10px] font-medium tracking-wider text-text-muted py-1">
              {group.label}
            </DropdownMenuLabel>
            {group.routes.map((route) => {
              const RouteIcon = route.icon
              const isActive = location.pathname === route.path
              return (
                <DropdownMenuItem
                  key={route.path}
                  onClick={() => {
                    navigate(route.path)
                    setOpen(false)
                  }}
                  className={cn(isActive && 'text-accent')}
                >
                  <RouteIcon className="size-4 shrink-0" />
                  {route.label}
                </DropdownMenuItem>
              )
            })}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
