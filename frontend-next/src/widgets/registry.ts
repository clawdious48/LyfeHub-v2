import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Sun, Calendar, FileText, Inbox, Target, Clock, StickyNote, ExternalLink, Quote, CloudSun, Rss, Timer, CheckSquare, Database, PlusCircle, Navigation2 } from 'lucide-react'

export type WidgetCategory = 'productivity' | 'external' | 'data' | 'utility'

export interface ConfigField {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'toggle' | 'color' | 'url' | 'base-picker' | 'view-picker' | 'links-editor' | 'feeds-editor' | 'nav-editor'
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
import ClockWidget from './ClockWidget.js'
import StickyNoteWidget from './StickyNoteWidget.js'
import QuickLinksWidget from './QuickLinksWidget.js'
import QuoteWidget from './QuoteWidget.js'
import WeatherWidget from './WeatherWidget.js'
import NewsFeedWidget from './NewsFeedWidget.js'
import PomodoroWidget from './PomodoroWidget.js'
import HabitTrackerWidget from './HabitTrackerWidget.js'
import BaseViewWidget from './BaseViewWidget.js'
import QuickCaptureWidget from './QuickCaptureWidget.js'
import NavigationWidget from './NavigationWidget.js'

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
  'clock': {
    component: ClockWidget,
    label: 'Clock',
    description: 'Digital clock with date and greeting',
    icon: Clock,
    category: 'utility',
    singleton: false,
    configurable: true,
    configSchema: [
      { key: 'format24h', label: '24-hour format', type: 'toggle', default: false },
      { key: 'showSeconds', label: 'Show seconds', type: 'toggle', default: false },
      { key: 'showDate', label: 'Show date', type: 'toggle', default: true },
      { key: 'showGreeting', label: 'Show greeting', type: 'toggle', default: true },
    ],
    minW: 4, minH: 3, defaultW: 6, defaultH: 4,
  },
  'sticky-note': {
    component: StickyNoteWidget,
    label: 'Sticky Note',
    description: 'Quick scratchpad note',
    icon: StickyNote,
    category: 'utility',
    singleton: false,
    configurable: true,
    configSchema: [
      {
        key: 'color', label: 'Color', type: 'select', default: 'default',
        options: [
          { label: 'Default', value: 'default' },
          { label: 'Yellow', value: 'yellow' },
          { label: 'Green', value: 'green' },
          { label: 'Blue', value: 'blue' },
          { label: 'Pink', value: 'pink' },
          { label: 'Orange', value: 'orange' },
        ],
      },
    ],
    minW: 4, minH: 3, defaultW: 6, defaultH: 5,
  },
  'quick-links': {
    component: QuickLinksWidget,
    label: 'Quick Links',
    description: 'Bookmarks grid with favicons',
    icon: ExternalLink,
    category: 'utility',
    singleton: false,
    configurable: true,
    configSchema: [
      { key: 'links', label: 'Links', type: 'links-editor', default: [] },
    ],
    minW: 4, minH: 3, defaultW: 6, defaultH: 5,
  },
  'quote': {
    component: QuoteWidget,
    label: 'Focus Quote',
    description: 'Random quote from your Notes',
    icon: Quote,
    category: 'productivity',
    singleton: true,
    configurable: false,
    minW: 6, minH: 3, defaultW: 8, defaultH: 4,
  },
  'weather': {
    component: WeatherWidget,
    label: 'Weather',
    description: 'Current weather and forecast',
    icon: CloudSun,
    category: 'external',
    singleton: true,
    configurable: true,
    configSchema: [
      { key: 'city', label: 'City', type: 'text', default: '', placeholder: 'e.g. Salt Lake City' },
      {
        key: 'units', label: 'Units', type: 'select', default: 'imperial',
        options: [
          { label: 'Fahrenheit', value: 'imperial' },
          { label: 'Celsius', value: 'metric' },
        ],
      },
    ],
    minW: 6, minH: 4, defaultW: 8, defaultH: 6,
  },
  'news-feed': {
    component: NewsFeedWidget,
    label: 'News Feed',
    description: 'RSS headlines from your feeds',
    icon: Rss,
    category: 'external',
    singleton: false,
    configurable: true,
    configSchema: [
      { key: 'feedIds', label: 'Feeds', type: 'feeds-editor', default: [] },
    ],
    minW: 6, minH: 4, defaultW: 8, defaultH: 6,
  },
  'pomodoro': {
    component: PomodoroWidget,
    label: 'Pomodoro Timer',
    description: 'Focus timer with work session logging',
    icon: Timer,
    category: 'productivity',
    singleton: true,
    configurable: true,
    configSchema: [
      { key: 'focusDuration', label: 'Focus (minutes)', type: 'number', default: 25 },
      { key: 'breakDuration', label: 'Break (minutes)', type: 'number', default: 5 },
      { key: 'longBreakDuration', label: 'Long break (minutes)', type: 'number', default: 15 },
      { key: 'sessionsBeforeLongBreak', label: 'Sessions before long break', type: 'number', default: 4 },
    ],
    minW: 4, minH: 5, defaultW: 6, defaultH: 7,
  },
  'habit-tracker': {
    component: HabitTrackerWidget,
    label: 'Habit Tracker',
    description: 'Daily habits with streak tracking',
    icon: CheckSquare,
    category: 'productivity',
    singleton: true,
    configurable: true,
    configSchema: [
      { key: 'habitsBaseId', label: 'Habits Base', type: 'base-picker' },
      { key: 'habitLogBaseId', label: 'Habit Log Base', type: 'base-picker' },
    ],
    minW: 6, minH: 4, defaultW: 8, defaultH: 6,
  },
  'base-view': {
    component: BaseViewWidget,
    label: 'Base View',
    description: 'Any Base + View as a compact data table',
    icon: Database,
    category: 'data',
    singleton: false,
    configurable: true,
    configSchema: [
      { key: 'baseId', label: 'Base', type: 'base-picker' },
      { key: 'viewId', label: 'View', type: 'view-picker', dependsOn: 'baseId' },
    ],
    minW: 6, minH: 4, defaultW: 12, defaultH: 8,
  },
  'quick-capture': {
    component: QuickCaptureWidget,
    label: 'Quick Capture',
    description: 'Fast-access buttons for creating notes, tasks, and contacts',
    icon: PlusCircle,
    category: 'productivity',
    singleton: false,
    configurable: true,
    configSchema: [
      { key: 'showNote', label: 'Note', type: 'toggle', default: true },
      { key: 'showTask', label: 'Task', type: 'toggle', default: true },
      { key: 'showPerson', label: 'Person', type: 'toggle', default: true },
    ],
    minW: 3, minH: 2, defaultW: 6, defaultH: 3,
  },
  'navigation': {
    component: NavigationWidget,
    label: 'Navigation',
    description: 'Customizable app navigation with dockable collapse',
    icon: Navigation2,
    category: 'utility',
    singleton: false,
    configurable: true,
    configSchema: [
      { key: 'items', label: 'Nav Items', type: 'nav-editor' },
    ],
    minW: 2, minH: 2, defaultW: 4, defaultH: 12,
  },
}
