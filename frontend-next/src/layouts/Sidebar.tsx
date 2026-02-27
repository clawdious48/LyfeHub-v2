import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CheckSquare,
  HardHat,
  Database,
  Users,
  CalendarDays,
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/apex', label: 'Apex', icon: HardHat },
  { to: '/bases', label: 'Bases', icon: Database },
  { to: '/people', label: 'People', icon: Users },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
]

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-bg-surface border-r border-border h-full flex flex-col">
      <div className="px-4 h-14 flex items-center border-b border-border">
        <span className="font-heading text-xl text-text-primary">LyfeHub</span>
      </div>

      <nav className="flex-1 py-2 px-2 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent-light text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
              ].join(' ')
            }
          >
            <Icon className="size-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
