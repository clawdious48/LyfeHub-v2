import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Briefcase, Calendar, CheckSquare,
  FileText, Users, Database,
  Wrench, BookOpen,
  HardHat, Contact, Package, FolderOpen, GitBranch, DollarSign, BarChart3,
  Mail,
} from 'lucide-react'
import { BaseSidebarContent } from '@/pages/bases/components/BaseSidebarContent.js'
import { MailSidebarContent } from '@/pages/mail/components/MailSidebarContent.js'

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

const apexSection: SidebarSection = {
  key: 'apex',
  header: 'Apex Restoration',
  icon: HardHat,
  items: [
    { label: 'Jobs', icon: Briefcase, to: '/jobs' },
    { label: 'CRM', icon: Contact, to: '/apex/crm' },
    { label: 'Inventory', icon: Package, to: '/apex/inventory' },
    { label: 'Documents', icon: FolderOpen, to: '/apex/documents' },
    { label: 'Workflows', icon: GitBranch, to: '/apex/workflows' },
    { label: 'Accounting', icon: DollarSign, to: '/apex/accounting' },
    { label: 'Reports', icon: BarChart3, to: '/apex/reports' },
  ],
}

const contextualSections: Record<string, SidebarSection[]> = {
  '/': [
    {
      key: 'productivity',
      header: 'Productivity',
      icon: Briefcase,
      items: [
        { label: 'Calendar', icon: Calendar, to: '/calendar' },
        { label: 'Tasks', icon: CheckSquare, to: '/tasks' },
        { label: 'Mail', icon: Mail, to: '/mail' },
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
  '/mail': [
    {
      key: 'mail-nav',
      header: 'Mail',
      icon: Mail,
      items: [],
      component: MailSidebarContent,
    },
    {
      key: 'productivity',
      header: 'Productivity',
      icon: Briefcase,
      items: [
        { label: 'Calendar', icon: Calendar, to: '/calendar' },
        { label: 'Tasks', icon: CheckSquare, to: '/tasks' },
        { label: 'Mail', icon: Mail, to: '/mail' },
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
        { label: 'Calendar', icon: Calendar, to: '/calendar' },
        { label: 'Tasks', icon: CheckSquare, to: '/tasks' },
        { label: 'Mail', icon: Mail, to: '/mail' },
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
  if (contextualSections[pathname]) return [apexSection, ...contextualSections[pathname]]
  const prefix = '/' + pathname.split('/')[1]
  if (contextualSections[prefix]) return [apexSection, ...contextualSections[prefix]]
  return [apexSection, ...contextualSections['/']]
}
