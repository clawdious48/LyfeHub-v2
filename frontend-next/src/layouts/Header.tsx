import { useLocation, useNavigate, NavLink } from 'react-router-dom'
import { Moon, Sun, LogOut, FileText, CheckSquare, UserPlus, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button.js'
import { useTheme } from '@/contexts/ThemeContext.js'
import { useAuth } from '@/hooks/useAuth.js'
import { useHeaderStore } from '@/stores/headerStore.js'
import { getAreaForRoute, getAreaConfig, areas } from '@/layouts/headerConfig.js'
import { useCaptureStore } from '@/stores/captureStore.js'
import type { HeaderTab } from '@/layouts/headerConfig.js'

export default function Header() {
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const openCapture = useCaptureStore((s) => s.openCapture)
  const { tabDisplayMode, personalTabOrder, apexTabOrder } = useHeaderStore()

  const activeAreaId = getAreaForRoute(pathname)
  const activeArea = getAreaConfig(activeAreaId)
  const tabOrder = activeAreaId === 'personal' ? personalTabOrder : apexTabOrder

  // Sort tabs by their position in the user's tab order. Tabs not in the order go to the end.
  const sortedTabs = [...activeArea.tabs].sort((a, b) => {
    const ai = tabOrder.indexOf(a.id)
    const bi = tabOrder.indexOf(b.id)
    const posA = ai === -1 ? Infinity : ai
    const posB = bi === -1 ? Infinity : bi
    return posA - posB
  })

  return (
    <header className="h-14 shrink-0 bg-bg-surface border-b border-border flex items-center px-4">
      {/* Left zone -- Area buttons */}
      <div className="flex items-center gap-1">
        {areas.map((area) => {
          const isActive = area.id === activeAreaId
          return (
            <button
              key={area.id}
              onClick={() => navigate(area.dashboardRoute)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent-light text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`}
            >
              {area.label}
            </button>
          )
        })}
      </div>

      {/* Center zone -- Module tabs */}
      <div className="flex-1 flex items-center justify-center gap-1">
        {sortedTabs.map((tab: HeaderTab) => (
          <NavLink
            key={tab.id}
            to={tab.to}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent-light text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`
            }
          >
            {tabDisplayMode !== 'label-only' && <tab.icon className="size-4" />}
            {tabDisplayMode !== 'icon-only' && <span>{tab.label}</span>}
          </NavLink>
        ))}
      </div>

      {/* Right zone -- Actions */}
      <div className="flex items-center gap-1">
        {/* Quick Capture buttons */}
        <Button
          variant="ghost"
          size="icon-sm"
          title="New Note"
          onClick={() => openCapture('note')}
          className="text-purple-500 hover:text-purple-400 hover:bg-purple-500/10"
        >
          <FileText className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title="New Task"
          onClick={() => openCapture('task')}
          className="text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
        >
          <CheckSquare className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title="New Contact"
          onClick={() => openCapture('contact')}
          className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
        >
          <UserPlus className="size-4" />
        </Button>

        {/* Divider */}
        <div className="w-px h-6 bg-border mx-1" />

        {/* Settings */}
        <NavLink to="/settings">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-text-secondary hover:text-text-primary"
          >
            <Settings className="size-4" />
          </Button>
        </NavLink>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          className="text-text-secondary hover:text-text-primary"
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        {/* User section */}
        {user && (
          <div className="flex items-center gap-2 ml-2">
            <span className="hidden lg:inline text-sm text-text-secondary">
              {user.name || user.email}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={logout}
              className="text-text-secondary hover:text-danger"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
