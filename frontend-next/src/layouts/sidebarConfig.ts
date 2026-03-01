import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Briefcase, Calendar, CheckSquare,
  FileText, Users, Database,
  Wrench, BookOpen,
} from 'lucide-react'
import { BaseSidebarContent } from '@/pages/bases/components/BaseSidebarContent.js'

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
  component?: ComponentType
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
  '/bases': [
    {
      key: 'bases-browser',
      header: 'Bases',
      icon: Database,
      items: [],
      component: BaseSidebarContent,
    },
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
  // Exact match first
  if (sidebarSections[pathname]) return sidebarSections[pathname]
  // Prefix match (e.g., /bases/123 should match /bases config)
  const prefix = '/' + pathname.split('/')[1]
  if (sidebarSections[prefix]) return sidebarSections[prefix]
  // Fallback to dashboard
  return sidebarSections['/']
}
