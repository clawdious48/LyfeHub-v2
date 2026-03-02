import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, Briefcase, Contact, Package, FolderOpen,
  GitBranch, DollarSign, BarChart3, Calendar, CheckSquare,
  Mail, FileText, Users, Database,
} from 'lucide-react'

export type RouteCategory = 'apex' | 'productivity' | 'resources'

export interface AppRoute {
  path: string
  label: string
  icon: LucideIcon
  category: RouteCategory
}

export const APP_ROUTES: AppRoute[] = [
  { path: '/',                label: 'Dashboard',  icon: LayoutDashboard, category: 'productivity' },
  { path: '/jobs',            label: 'Jobs',       icon: Briefcase,       category: 'apex' },
  { path: '/apex/crm',       label: 'CRM',        icon: Contact,         category: 'apex' },
  { path: '/apex/inventory',  label: 'Inventory',  icon: Package,         category: 'apex' },
  { path: '/apex/documents',  label: 'Documents',  icon: FolderOpen,      category: 'apex' },
  { path: '/apex/workflows',  label: 'Workflows',  icon: GitBranch,       category: 'apex' },
  { path: '/apex/accounting', label: 'Accounting', icon: DollarSign,      category: 'apex' },
  { path: '/apex/reports',    label: 'Reports',    icon: BarChart3,       category: 'apex' },
  { path: '/calendar',        label: 'Calendar',   icon: Calendar,        category: 'productivity' },
  { path: '/tasks',           label: 'Tasks',      icon: CheckSquare,     category: 'productivity' },
  { path: '/mail',            label: 'Mail',       icon: Mail,            category: 'productivity' },
  { path: '/notes',           label: 'Notes',      icon: FileText,        category: 'resources' },
  { path: '/people',          label: 'People',     icon: Users,           category: 'resources' },
  { path: '/bases',           label: 'Bases',      icon: Database,        category: 'resources' },
]

export const ROUTE_CATEGORIES: { key: RouteCategory; label: string }[] = [
  { key: 'apex', label: 'Apex Restoration' },
  { key: 'productivity', label: 'Productivity' },
  { key: 'resources', label: 'Resources' },
]

export function getRouteByPath(path: string): AppRoute | undefined {
  return APP_ROUTES.find((r) => r.path === path)
}
