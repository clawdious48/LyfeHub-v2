import type { LucideIcon } from 'lucide-react'
import {
  Briefcase, Calendar, CheckSquare,
  FileText, Users, Database,
  Wrench, BookOpen,
} from 'lucide-react'

export interface SidebarItem {
  label: string
  icon: LucideIcon
  to: string
  badge?: number
}

export interface SidebarSection {
  key: string
  header: string
  icon: LucideIcon
  items: SidebarItem[]
}

export const sidebarSections: Record<string, SidebarSection[]> = {
  '/': [
    {
      key: 'productivity',
      header: 'Productivity',
      icon: Briefcase,
      items: [
        { label: 'Jobs', icon: Briefcase, to: '/jobs' },
        { label: 'Calendar', icon: Calendar, to: '/calendar' },
        { label: 'Tasks', icon: CheckSquare, to: '/tasks' },
      ],
    },
    {
      key: 'tools',
      header: 'Tools',
      icon: Wrench,
      items: [],
    },
    {
      key: 'resources',
      header: 'Resources',
      icon: BookOpen,
      items: [
        { label: 'Notes', icon: FileText, to: '/notes' },
        { label: 'People', icon: Users, to: '/people' },
        { label: 'Bases', icon: Database, to: '/bases' },
      ],
    },
  ],
}

export function getSectionsForRoute(pathname: string): SidebarSection[] {
  return sidebarSections[pathname] || sidebarSections['/']
}
