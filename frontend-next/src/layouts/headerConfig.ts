import type { LucideIcon } from 'lucide-react'
import {
  Calendar, CheckSquare, Mail, FileText, Users, Database,
  Briefcase, Contact, Package, FolderOpen, GitBranch, DollarSign, BarChart3,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AreaId = 'personal' | 'apex'

export interface HeaderTab {
  id: string
  label: string
  icon: LucideIcon
  to: string
}

export interface AreaConfig {
  id: AreaId
  label: string
  dashboardRoute: string
  tabs: HeaderTab[]
}

// ---------------------------------------------------------------------------
// Area definitions
// ---------------------------------------------------------------------------

export const personalArea: AreaConfig = {
  id: 'personal',
  label: 'Dashboard',
  dashboardRoute: '/',
  tabs: [
    { id: 'calendar', label: 'Calendar', icon: Calendar, to: '/calendar' },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, to: '/tasks' },
    { id: 'mail', label: 'Mail', icon: Mail, to: '/mail' },
    { id: 'notes', label: 'Notes', icon: FileText, to: '/notes' },
    { id: 'people', label: 'People', icon: Users, to: '/people' },
    { id: 'bases', label: 'Bases', icon: Database, to: '/bases' },
  ],
}

export const apexArea: AreaConfig = {
  id: 'apex',
  label: 'Apex Restoration',
  dashboardRoute: '/apex',
  tabs: [
    { id: 'jobs', label: 'Jobs', icon: Briefcase, to: '/jobs' },
    { id: 'crm', label: 'CRM', icon: Contact, to: '/apex/crm' },
    { id: 'inventory', label: 'Inventory', icon: Package, to: '/apex/inventory' },
    { id: 'documents', label: 'Documents', icon: FolderOpen, to: '/apex/documents' },
    { id: 'workflows', label: 'Workflows', icon: GitBranch, to: '/apex/workflows' },
    { id: 'accounting', label: 'Accounting', icon: DollarSign, to: '/apex/accounting' },
    { id: 'reports', label: 'Reports', icon: BarChart3, to: '/apex/reports' },
  ],
}

export const areas: AreaConfig[] = [personalArea, apexArea]

// ---------------------------------------------------------------------------
// Route helpers
// ---------------------------------------------------------------------------

/** Routes (exact or prefix) that belong to the personal area. */
const personalRoutes = ['/', '/calendar', '/tasks', '/mail', '/notes', '/people', '/bases', '/settings']

/**
 * Determine which area a given route belongs to.
 * Personal routes: /, /calendar, /tasks, /mail, /notes, /people, /bases (exact + prefix).
 * Everything else maps to 'apex'.
 */
export function getAreaForRoute(pathname: string): AreaId {
  for (const route of personalRoutes) {
    if (route === '/') {
      // Root must be exact match only
      if (pathname === '/') return 'personal'
    } else if (pathname === route || pathname.startsWith(route + '/')) {
      return 'personal'
    }
  }
  // Default to personal for unknown routes (settings, profile, 404, etc.)
  return 'personal'
}

/** Return the full AreaConfig for a given area id. */
export function getAreaConfig(areaId: AreaId): AreaConfig {
  return areaId === 'personal' ? personalArea : apexArea
}

/** Routes that have a dedicated sidebar panel (exact + prefix match). */
const sidebarRoutes = ['/calendar', '/tasks', '/mail', '/bases']

/**
 * Whether the given route should show a sidebar panel.
 * Only /calendar, /tasks, /mail, and /bases (exact + prefix) have sidebars.
 */
export function routeHasSidebar(pathname: string): boolean {
  return sidebarRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + '/'),
  )
}
