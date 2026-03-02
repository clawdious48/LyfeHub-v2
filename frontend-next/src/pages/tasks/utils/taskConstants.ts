import {
  Sun, AlertCircle, CalendarDays, Repeat, ListTodo, CheckCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const PRIORITY_OPTIONS = [
  { value: null, label: 'None' },
  { value: 'low', label: 'Low', color: 'text-blue-400' },
  { value: 'medium', label: 'Medium', color: 'text-amber-400' },
  { value: 'high', label: 'High', color: 'text-red-400' },
] as const

export const ENERGY_OPTIONS = [
  { value: null, label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'high', label: 'High' },
] as const

export const LOCATION_OPTIONS = [
  { value: null, label: 'None' },
  { value: 'home', label: 'Home' },
  { value: 'office', label: 'Office' },
  { value: 'errand', label: 'Errand' },
] as const

export const RECURRING_OPTIONS = [
  { value: null, label: 'Never' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
] as const

export interface SmartView {
  key: string
  label: string
  icon: LucideIcon
  apiParam: string
}

export const SMART_VIEWS: SmartView[] = [
  { key: 'my-day', label: 'My Day', icon: Sun, apiParam: 'my-day' },
  { key: 'important', label: 'Important', icon: AlertCircle, apiParam: 'important' },
  { key: 'scheduled', label: 'Scheduled', icon: CalendarDays, apiParam: 'scheduled' },
  { key: 'recurring', label: 'Recurring', icon: Repeat, apiParam: 'recurring' },
  { key: 'all', label: 'All Tasks', icon: ListTodo, apiParam: 'all' },
  { key: 'completed', label: 'Completed', icon: CheckCircle, apiParam: 'completed' },
]

export const BOARD_GROUP_OPTIONS = [
  { value: 'priority', label: 'Priority' },
  { value: 'energy', label: 'Energy' },
  { value: 'list', label: 'List' },
  { value: 'location', label: 'Location' },
] as const
