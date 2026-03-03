import { useLocation, useNavigate, NavLink } from 'react-router-dom'
import { Moon, Sun, LogOut, FileText, CheckSquare, UserPlus, Settings, SlidersHorizontal } from 'lucide-react'
import { motion, useTransform } from 'framer-motion'
import { Button } from '@/components/ui/button.js'
import { useTheme } from '@/contexts/ThemeContext.js'
import { useAuth } from '@/hooks/useAuth.js'
import { useHeaderStore } from '@/stores/headerStore.js'
import { getAreaForRoute, personalArea, apexArea, areas } from '@/layouts/headerConfig.js'
import { useCaptureStore } from '@/stores/captureStore.js'
import { HeaderTabBar } from '@/layouts/HeaderTabBar.js'
import { springboardProgress } from '@/stores/springboardProgress.js'

const DISPLAY_MODES = ['icon-label', 'icon-only', 'label-only'] as const

export default function Header() {
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const openCapture = useCaptureStore((s) => s.openCapture)
  const { tabDisplayMode, personalTabOrder, apexTabOrder } = useHeaderStore()

  const activeAreaId = getAreaForRoute(pathname)
  const isDashboard = pathname === '/' || pathname === '/apex'

  // Sort helper
  function sortTabs(tabs: typeof personalArea.tabs, order: string[]) {
    return [...tabs].sort((a, b) => {
      const ai = order.indexOf(a.id)
      const bi = order.indexOf(b.id)
      return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi)
    })
  }

  // Always compute both sorted tab sets (needed for dashboard sliding)
  const personalSortedTabs = sortTabs(personalArea.tabs, personalTabOrder)
  const apexSortedTabs = sortTabs(apexArea.tabs, apexTabOrder)

  // For module pages, pick the active set
  const activeSortedTabs = activeAreaId === 'personal' ? personalSortedTabs : apexSortedTabs

  // Scroll-synced tab sliding: translateX from 0% (personal) to -50% (apex)
  const tabSlideX = useTransform(springboardProgress, [0, 1], ['0%', '-50%'])

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
      {isDashboard ? (
        /* Dashboard: both tab sets slide in sync with springboard swipe */
        <div className="flex-1 overflow-hidden flex items-center h-full">
          <motion.div className="flex w-[200%] h-full" style={{ x: tabSlideX }}>
            <div className="w-1/2 flex items-center justify-center gap-1">
              <HeaderTabBar tabs={personalSortedTabs} tabDisplayMode={tabDisplayMode} activeAreaId="personal" />
            </div>
            <div className="w-1/2 flex items-center justify-center gap-1">
              <HeaderTabBar tabs={apexSortedTabs} tabDisplayMode={tabDisplayMode} activeAreaId="apex" />
            </div>
          </motion.div>
        </div>
      ) : (
        /* Module page: show the active area's tabs */
        <div className="flex-1 flex items-center justify-center gap-1">
          <HeaderTabBar tabs={activeSortedTabs} tabDisplayMode={tabDisplayMode} activeAreaId={activeAreaId} />
        </div>
      )}

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

        {/* Tab display mode toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            const modes = DISPLAY_MODES
            const currentIndex = modes.indexOf(tabDisplayMode)
            const nextMode = modes[(currentIndex + 1) % modes.length]
            useHeaderStore.getState().setTabDisplayMode(nextMode)
          }}
          title={`Tab display: ${tabDisplayMode}`}
          className="text-text-secondary hover:text-text-primary"
        >
          <SlidersHorizontal className="size-4" />
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
