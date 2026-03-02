import { Navigate, type RouteObject } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import AppLayout from '@/layouts/AppLayout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import JobsPage from '@/pages/JobsPage'
import TasksPage from '@/pages/TasksPage'
import CalendarPage from '@/pages/CalendarPage'
import PeoplePage from '@/pages/PeoplePage'
import BasesPage from '@/pages/BasesPage'
import ApexCrmPage from '@/pages/ApexCrmPage'
import ApexInventoryPage from '@/pages/ApexInventoryPage'
import ApexDocumentsPage from '@/pages/ApexDocumentsPage'
import ApexWorkflowsPage from '@/pages/ApexWorkflowsPage'
import ApexAccountingPage from '@/pages/ApexAccountingPage'
import ApexReportsPage from '@/pages/ApexReportsPage'
import MailPage from '@/pages/MailPage'
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
      { path: 'jobs', element: <JobsPage /> },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'mail', element: <MailPage /> },
      { path: 'people', element: <PeoplePage /> },
      { path: 'bases', element: <BasesPage /> },
      { path: 'apex/crm', element: <ApexCrmPage /> },
      { path: 'apex/inventory', element: <ApexInventoryPage /> },
      { path: 'apex/documents', element: <ApexDocumentsPage /> },
      { path: 'apex/workflows', element: <ApexWorkflowsPage /> },
      { path: 'apex/accounting', element: <ApexAccountingPage /> },
      { path: 'apex/reports', element: <ApexReportsPage /> },
    ],
  },
]
