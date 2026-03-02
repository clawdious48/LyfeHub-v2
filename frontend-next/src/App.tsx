import { useEffect } from 'react'
import { useRoutes } from 'react-router-dom'
import { routes } from '@/router.js'
import { useAuth } from '@/hooks/useAuth.js'
import { useTheme } from '@/contexts/ThemeContext.js'
import { useSidebarStore } from '@/stores/sidebarStore.js'
import { useTasksUiStore } from '@/stores/tasksUiStore.js'
import { useCalendarUiStore } from '@/stores/calendarUiStore.js'
import { useBasesUiStore } from '@/stores/basesUiStore.js'
import { useMailUiStore } from '@/stores/mailUiStore.js'
import { ErrorBoundary } from '@/components/ErrorBoundary.js'

export default function App() {
  const checkAuth = useAuth((s) => s.checkAuth)
  const isAuthenticated = useAuth((s) => s.isAuthenticated)
  const { hydrateTheme } = useTheme()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (isAuthenticated) {
      useSidebarStore.getState().hydrate()
      useTasksUiStore.getState().hydrate()
      useCalendarUiStore.getState().hydrate()
      useBasesUiStore.getState().hydrate()
      useMailUiStore.getState().hydrate()
      hydrateTheme()

      // One-time cleanup of old localStorage keys
      const migrated = localStorage.getItem('lyfehub-settings-migrated')
      if (!migrated) {
        localStorage.removeItem('lyfehub-sidebar-collapsed')
        localStorage.removeItem('lyfehub-sidebar-sections')
        localStorage.removeItem('lyfehub-tasks-ui')
        localStorage.removeItem('lyfehub-calendar-ui')
        localStorage.removeItem('lyfehub-bases-ui')
        localStorage.removeItem('lyfehub-mail-ui')
        localStorage.setItem('lyfehub-settings-migrated', '1')
      }
    }
  }, [isAuthenticated])

  return (
    <ErrorBoundary>
      {useRoutes(routes)}
    </ErrorBoundary>
  )
}
