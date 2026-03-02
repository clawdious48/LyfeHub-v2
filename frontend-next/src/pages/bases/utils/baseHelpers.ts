import type { BaseRecord, BaseProperty, FilterConfig, SelectOption, StatusOption, BasePropertyType } from '@/types/index.js'
import { TAG_COLORS, SYSTEM_COLUMNS, type TagColor } from './baseConstants.js'

// --- Filter evaluation ---

function isEmpty(value: unknown): boolean {
  if (value == null) return true
  if (typeof value === 'string' && value.trim() === '') return true
  if (Array.isArray(value) && value.length === 0) return true
  return false
}

export function evaluateFilter(
  value: unknown,
  operator: string,
  filterValue: string,
  propertyType: BasePropertyType
): boolean {
  // Universal operators
  if (operator === 'is_empty') return isEmpty(value)
  if (operator === 'is_not_empty') return !isEmpty(value)

  const strValue = value != null ? String(value).toLowerCase() : ''
  const filterLower = filterValue.toLowerCase()

  switch (propertyType) {
    case 'text':
    case 'url': {
      switch (operator) {
        case 'contains': return strValue.includes(filterLower)
        case 'not_contains': return !strValue.includes(filterLower)
        case 'is': return strValue === filterLower
        case 'is_not': return strValue !== filterLower
        default: return true
      }
    }

    case 'number': {
      const numValue = Number(value)
      const numFilter = Number(filterValue)
      if (isNaN(numValue) || isNaN(numFilter)) return true
      switch (operator) {
        case 'eq': return numValue === numFilter
        case 'neq': return numValue !== numFilter
        case 'gt': return numValue > numFilter
        case 'lt': return numValue < numFilter
        case 'gte': return numValue >= numFilter
        case 'lte': return numValue <= numFilter
        default: return true
      }
    }

    case 'date': {
      switch (operator) {
        case 'is': return strValue === filterLower
        case 'before': return strValue < filterLower
        case 'after': return strValue > filterLower
        default: return true
      }
    }

    case 'checkbox': {
      const boolValue = value === true || value === 'true'
      const filterBool = filterValue === 'true'
      return operator === 'is' ? boolValue === filterBool : true
    }

    case 'select': {
      switch (operator) {
        case 'is': return strValue === filterLower
        case 'is_not': return strValue !== filterLower
        default: return true
      }
    }

    case 'multi_select': {
      const arr = Array.isArray(value) ? value.map(v => String(v).toLowerCase()) : []
      switch (operator) {
        case 'contains': return arr.includes(filterLower)
        case 'not_contains': return !arr.includes(filterLower)
        default: return true
      }
    }

    case 'relation': {
      const relArr = Array.isArray(value) ? value.map(v => String(v).toLowerCase()) : []
      switch (operator) {
        case 'contains': return relArr.includes(filterLower)
        default: return true
      }
    }

    case 'email':
    case 'phone':
    case 'rich_text': {
      switch (operator) {
        case 'contains': return strValue.includes(filterLower)
        case 'not_contains': return !strValue.includes(filterLower)
        case 'is': return strValue === filterLower
        case 'is_not': return strValue !== filterLower
        default: return true
      }
    }

    case 'status': {
      switch (operator) {
        case 'is': return strValue === filterLower
        case 'is_not': return strValue !== filterLower
        default: return true
      }
    }

    case 'created_time':
    case 'last_edited_time': {
      switch (operator) {
        case 'is': return strValue.startsWith(filterLower)
        case 'before': return strValue < filterLower
        case 'after': return strValue > filterLower
        default: return true
      }
    }

    case 'files': {
      // Files can only be filtered by empty/not_empty (handled above)
      return true
    }

    default:
      return true
  }
}

export function applyFilters(
  records: BaseRecord[],
  filters: FilterConfig[],
  properties: BaseProperty[]
): BaseRecord[] {
  if (!filters.length) return records

  return records.filter(record =>
    filters.every(filter => {
      const property = properties.find(p => p.id === filter.propertyId)
      if (!property) return true
      const value = record.values[property.id]
      return evaluateFilter(value, filter.operator, filter.value, property.type)
    })
  )
}

// --- Sorting ---

export function getCellValueForSort(
  record: BaseRecord,
  property: BaseProperty
): string | number | boolean | null {
  const raw = record.values[property.id]
  if (raw == null) return null

  switch (property.type) {
    case 'number': {
      const n = Number(raw)
      return isNaN(n) ? null : n
    }
    case 'checkbox':
      return raw === true || raw === 'true'
    case 'multi_select':
      return Array.isArray(raw) ? raw.join(', ') : String(raw)
    case 'relation':
      return Array.isArray(raw) ? raw.length : 0
    case 'email':
    case 'phone':
    case 'rich_text':
    case 'status':
      return String(raw)
    case 'created_time':
    case 'last_edited_time':
      return String(raw) // ISO timestamps sort lexicographically
    case 'files':
      return Array.isArray(raw) ? raw.length : 0
    default:
      return String(raw)
  }
}

export function getSortedRecords(
  records: BaseRecord[],
  sortColumn: string | null,
  sortDirection: 'asc' | 'desc',
  properties: BaseProperty[]
): BaseRecord[] {
  if (!sortColumn) {
    return [...records].sort((a, b) => a.position - b.position)
  }

  const isSystem = (SYSTEM_COLUMNS as readonly string[]).includes(sortColumn)
  const dir = sortDirection === 'asc' ? 1 : -1

  return [...records].sort((a, b) => {
    let aVal: unknown
    let bVal: unknown

    if (isSystem) {
      aVal = a[sortColumn as keyof BaseRecord]
      bVal = b[sortColumn as keyof BaseRecord]
    } else {
      const property = properties.find(p => p.id === sortColumn)
      if (!property) return 0
      aVal = getCellValueForSort(a, property)
      bVal = getCellValueForSort(b, property)
    }

    // Nulls always sort last
    if (aVal == null && bVal == null) return 0
    if (aVal == null) return 1
    if (bVal == null) return -1

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * dir
    }

    if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
      return (aVal === bVal ? 0 : aVal ? 1 : -1) * dir
    }

    return String(aVal).localeCompare(String(bVal)) * dir
  })
}

// --- Date formatting ---

export function formatSystemDate(dateString: string | null | undefined): string {
  if (!dateString) return '\u2014'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '\u2014'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatRelativeDate(dateString: string | null | undefined): string {
  if (!dateString) return '\u2014'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '\u2014'

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// --- Property helpers ---

export function parsePropertyOptions(options: unknown): unknown {
  if (typeof options === 'string') {
    try {
      return JSON.parse(options)
    } catch {
      return []
    }
  }
  return options ?? []
}

export function getNextAvailableColor(usedColors: string[]): TagColor {
  const available = TAG_COLORS.find(c => !usedColors.includes(c.name))
  return available ?? TAG_COLORS[0]
}

// --- Display values ---

export function getDisplayValue(record: BaseRecord, property: BaseProperty): string {
  const raw = record.values[property.id]
  if (raw == null) return ''

  switch (property.type) {
    case 'text':
    case 'url':
      return String(raw)

    case 'number': {
      const n = Number(raw)
      return isNaN(n) ? '' : n.toLocaleString()
    }

    case 'checkbox':
      return raw === true || raw === 'true' ? 'Yes' : 'No'

    case 'date':
      return formatSystemDate(String(raw))

    case 'select': {
      const options = parsePropertyOptions(property.options) as SelectOption[]
      if (Array.isArray(options)) {
        const opt = options.find(o => o.value === raw || o.label === raw)
        return opt?.label ?? String(raw)
      }
      return String(raw)
    }

    case 'multi_select': {
      const msOptions = parsePropertyOptions(property.options) as SelectOption[]
      const values = Array.isArray(raw) ? raw : []
      if (Array.isArray(msOptions)) {
        return values
          .map(v => {
            const opt = msOptions.find(o => o.value === v || o.label === v)
            return opt?.label ?? String(v)
          })
          .join(', ')
      }
      return values.join(', ')
    }

    case 'relation': {
      const relValues = Array.isArray(raw) ? raw : []
      const count = relValues.length
      return count === 0 ? '' : `${count} item${count === 1 ? '' : 's'}`
    }

    case 'email':
    case 'phone':
    case 'rich_text':
      return String(raw)

    case 'status': {
      const statusOptions = parsePropertyOptions(property.options) as StatusOption[]
      if (Array.isArray(statusOptions)) {
        const opt = statusOptions.find(o => o.label === raw)
        return opt?.label ?? String(raw)
      }
      return String(raw)
    }

    case 'created_time':
    case 'last_edited_time':
      return formatSystemDate(String(raw))

    case 'files': {
      const filesArr = Array.isArray(raw) ? raw : []
      return filesArr.length === 0 ? '' : `${filesArr.length} file${filesArr.length === 1 ? '' : 's'}`
    }

    default:
      return String(raw)
  }
}
