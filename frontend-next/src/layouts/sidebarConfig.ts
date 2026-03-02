import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Calendar, CheckSquare, Database, Mail } from 'lucide-react'
import { CalendarSidebarContent } from '@/pages/calendar/components/sidebar/CalendarSidebarContent.js'
import { TasksSidebarContent } from '@/pages/tasks/components/TasksSidebarContent.js'
import { BaseSidebarContent } from '@/pages/bases/components/BaseSidebarContent.js'
import { MailSidebarContent } from '@/pages/mail/components/MailSidebarContent.js'

export interface SidebarSection {
  key: string
  header: string
  icon: LucideIcon
  component: ComponentType
}

const contextualSections: Record<string, SidebarSection[]> = {
  '/calendar': [
    { key: 'calendar-nav', header: 'Calendar', icon: Calendar, component: CalendarSidebarContent },
  ],
  '/tasks': [
    { key: 'tasks-nav', header: 'Tasks', icon: CheckSquare, component: TasksSidebarContent },
  ],
  '/bases': [
    { key: 'bases-browser', header: 'Bases', icon: Database, component: BaseSidebarContent },
  ],
  '/mail': [
    { key: 'mail-nav', header: 'Mail', icon: Mail, component: MailSidebarContent },
  ],
}

export function getSectionsForRoute(pathname: string): SidebarSection[] {
  if (contextualSections[pathname]) return contextualSections[pathname]
  const prefix = '/' + pathname.split('/')[1]
  if (contextualSections[prefix]) return contextualSections[prefix]
  return []
}
