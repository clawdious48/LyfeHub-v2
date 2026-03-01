import {
  Type, Hash, ChevronDown, Tags, Calendar, CheckSquare, Link,
  ArrowLeftRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { BasePropertyType } from '@/types/index.js'

export interface PropertyTypeDefinition {
  value: BasePropertyType
  label: string
  icon: LucideIcon
}

export const PROPERTY_TYPES: PropertyTypeDefinition[] = [
  { value: 'text', label: 'Text', icon: Type },
  { value: 'number', label: 'Number', icon: Hash },
  { value: 'select', label: 'Select', icon: ChevronDown },
  { value: 'multi_select', label: 'Multi Select', icon: Tags },
  { value: 'date', label: 'Date', icon: Calendar },
  { value: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { value: 'url', label: 'URL', icon: Link },
  { value: 'relation', label: 'Relation', icon: ArrowLeftRight },
]

export function getPropertyTypeIcon(type: BasePropertyType): LucideIcon {
  return PROPERTY_TYPES.find(pt => pt.value === type)?.icon ?? Type
}

export function getPropertyTypeLabel(type: BasePropertyType): string {
  return PROPERTY_TYPES.find(pt => pt.value === type)?.label ?? type
}

// Filter operators by property type
export const FILTER_OPERATORS: Record<string, { value: string; label: string }[]> = {
  text: [
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does not contain' },
    { value: 'is', label: 'Is' },
    { value: 'is_not', label: 'Is not' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
  number: [
    { value: 'eq', label: '=' },
    { value: 'neq', label: '\u2260' },
    { value: 'gt', label: '>' },
    { value: 'lt', label: '<' },
    { value: 'gte', label: '\u2265' },
    { value: 'lte', label: '\u2264' },
    { value: 'is_empty', label: 'Is empty' },
  ],
  select: [
    { value: 'is', label: 'Is' },
    { value: 'is_not', label: 'Is not' },
    { value: 'is_empty', label: 'Is empty' },
  ],
  multi_select: [
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does not contain' },
    { value: 'is_empty', label: 'Is empty' },
  ],
  date: [
    { value: 'is', label: 'Is' },
    { value: 'before', label: 'Before' },
    { value: 'after', label: 'After' },
    { value: 'is_empty', label: 'Is empty' },
  ],
  checkbox: [
    { value: 'is', label: 'Is' },
  ],
  url: [
    { value: 'contains', label: 'Contains' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
  relation: [
    { value: 'contains', label: 'Contains' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
}

// Tag colors for select/multi_select options (Tailwind classes)
export const TAG_COLORS = [
  { name: 'blue', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-400' },
  { name: 'green', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', dot: 'bg-green-400' },
  { name: 'purple', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', dot: 'bg-purple-400' },
  { name: 'red', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-400' },
  { name: 'yellow', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', dot: 'bg-yellow-400' },
  { name: 'pink', bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30', dot: 'bg-pink-400' },
  { name: 'cyan', bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30', dot: 'bg-cyan-400' },
  { name: 'orange', bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-400' },
  { name: 'gray', bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30', dot: 'bg-gray-400' },
] as const

export type TagColor = (typeof TAG_COLORS)[number]

export function getTagColor(colorName: string): TagColor {
  return TAG_COLORS.find(c => c.name === colorName) ?? TAG_COLORS[0]
}

// System columns (read-only, shown in table but not editable)
export const SYSTEM_COLUMNS = ['created_at', 'updated_at', 'global_id'] as const

// Default column width
export const DEFAULT_COLUMN_WIDTH = 200
export const MIN_COLUMN_WIDTH = 100
export const MAX_COLUMN_WIDTH = 600
