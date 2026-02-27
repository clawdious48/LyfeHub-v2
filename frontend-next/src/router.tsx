import { Navigate, type RouteObject } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import AppLayout from '@/layouts/AppLayout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import ApexPage from '@/pages/ApexPage'
import TasksPage from '@/pages/TasksPage'
import CalendarPage from '@/pages/CalendarPage'
import PeoplePage from '@/pages/PeoplePage'
import BasesPage from '@/pages/BasesPage'
import type { ReactNode } from 'react'

function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-app">
        <div className="text-text-secondary text-sm">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

export const routes: RouteObject[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: (
      <AuthGuard>
        <AppLayout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'apex', element: <ApexPage /> },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'people', element: <PeoplePage /> },
      { path: 'bases', element: <BasesPage /> },
    ],
  },
]
