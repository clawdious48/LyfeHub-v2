import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Sun, Calendar, FileText, Inbox, Target } from 'lucide-react'

export interface WidgetDefinition {
  component: ComponentType<{ config?: Record<string, unknown> }>
  label: string
  icon: LucideIcon
  minW: number
  minH: number
  defaultW: number
  defaultH: number
}

import MyDayWidget from './MyDayWidget.js'
import WeekCalWidget from './WeekCalWidget.js'
import QuickNotesWidget from './QuickNotesWidget.js'
import InboxWidget from './InboxWidget.js'
import AreasWidget from './AreasWidget.js'

export const widgetRegistry: Record<string, WidgetDefinition> = {
  'my-day':      { component: MyDayWidget, label: 'My Day', icon: Sun, minW: 4, minH: 3, defaultW: 6, defaultH: 4 },
  'week-cal':    { component: WeekCalWidget, label: 'This Week', icon: Calendar, minW: 4, minH: 2, defaultW: 6, defaultH: 3 },
  'quick-notes': { component: QuickNotesWidget, label: 'Quick Notes', icon: FileText, minW: 3, minH: 2, defaultW: 6, defaultH: 3 },
  'inbox':       { component: InboxWidget, label: 'Inbox', icon: Inbox, minW: 3, minH: 3, defaultW: 6, defaultH: 4 },
  'areas':       { component: AreasWidget, label: 'Areas', icon: Target, minW: 4, minH: 2, defaultW: 12, defaultH: 3 },
}
