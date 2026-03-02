import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Sun, Calendar, FileText, Inbox, Target } from 'lucide-react'

export type WidgetCategory = 'productivity' | 'external' | 'data' | 'utility'

export interface ConfigField {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'toggle' | 'color' | 'url' | 'base-picker' | 'view-picker' | 'links-editor' | 'feeds-editor'
  default?: unknown
  options?: { label: string; value: string }[]
  placeholder?: string
  dependsOn?: string
}

export interface WidgetStyle {
  preset: 'default' | 'borderless' | 'transparent'
  accent: string | null
  headerVisible: boolean
}

export interface WidgetDefinition {
  component: ComponentType<{ config?: Record<string, unknown> }>
  label: string
  description: string
  icon: LucideIcon
  category: WidgetCategory
  singleton: boolean
  configurable: boolean
  configSchema?: ConfigField[]
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
  'my-day': {
    component: MyDayWidget,
    label: 'My Day',
    description: 'Today\'s tasks and calendar events',
    icon: Sun,
    category: 'productivity',
    singleton: true,
    configurable: false,
    minW: 8, minH: 6, defaultW: 12, defaultH: 8,
  },
  'week-cal': {
    component: WeekCalWidget,
    label: 'This Week',
    description: 'Week calendar strip with navigation',
    icon: Calendar,
    category: 'utility',
    singleton: true,
    configurable: false,
    minW: 8, minH: 4, defaultW: 12, defaultH: 6,
  },
  'quick-notes': {
    component: QuickNotesWidget,
    label: 'Quick Notes',
    description: 'Recent notes list',
    icon: FileText,
    category: 'utility',
    singleton: true,
    configurable: false,
    minW: 6, minH: 4, defaultW: 12, defaultH: 6,
  },
  'inbox': {
    component: InboxWidget,
    label: 'Inbox',
    description: 'Unified inbox for tasks, notes, and contacts',
    icon: Inbox,
    category: 'productivity',
    singleton: true,
    configurable: false,
    minW: 6, minH: 6, defaultW: 12, defaultH: 8,
  },
  'areas': {
    component: AreasWidget,
    label: 'Areas',
    description: 'Tags base filtered by Type = Area',
    icon: Target,
    category: 'data',
    singleton: true,
    configurable: false,
    minW: 8, minH: 4, defaultW: 24, defaultH: 6,
  },
}
