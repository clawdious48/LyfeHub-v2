import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, Settings, ExternalLink, Check, X } from 'lucide-react'
import { useBase, useBaseViews } from '@/api/hooks/index.js'
import type { BaseProperty, BaseRecord, FilterConfig, SortConfig } from '@/types/index.js'

const MAX_ROWS = 12
const MAX_CELL_LEN = 30

function truncate(val: string, max = MAX_CELL_LEN): string {
  return val.length > max ? val.slice(0, max) + '\u2026' : val
}

function getCellValue(record: BaseRecord, prop: BaseProperty): unknown {
  const raw = record.values?.[prop.id]
  if (raw === undefined || raw === null) return null
  // JSON fields may be stored as strings
  if (typeof raw === 'string' && (prop.type === 'multi_select' || prop.type === 'relation' || prop.type === 'files')) {
    try { return JSON.parse(raw) } catch { return raw }
  }
  return raw
}

function renderCellText(value: unknown, prop: BaseProperty): string {
  if (value === null || value === undefined || value === '') return '\u2014'

  switch (prop.type) {
    case 'text':
    case 'url':
    case 'email':
    case 'phone':
    case 'rich_text':
      return truncate(String(value))
    case 'number':
      return String(value)
    case 'date':
    case 'created_time':
    case 'last_edited_time': {
      const d = new Date(String(value))
      return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString()
    }
    case 'select':
    case 'status':
      return truncate(String(value))
    case 'multi_select': {
      const arr = Array.isArray(value) ? value : []
      return arr.length ? arr.map((v: unknown) => String(v)).join(', ') : '\u2014'
    }
    case 'checkbox':
      return ''
    case 'relation': {
      const arr = Array.isArray(value) ? value : []
      return arr.length ? `${arr.length} item${arr.length !== 1 ? 's' : ''}` : '\u2014'
    }
    case 'files': {
      const arr = Array.isArray(value) ? value : []
      return arr.length ? `${arr.length} file${arr.length !== 1 ? 's' : ''}` : '\u2014'
    }
    default:
      return truncate(String(value))
  }
}

function getSelectColor(prop: BaseProperty, value: unknown): string | null {
  if ((prop.type !== 'select' && prop.type !== 'status') || !value) return null
  const opts = Array.isArray(prop.options) ? prop.options : []
  const match = opts.find(
    (o: Record<string, unknown>) =>
      (o.label === value || o.value === value),
  )
  return (match as { color?: string } | undefined)?.color ?? null
}

// ── Filter logic ──────────────────────────────────────────────

function matchesFilter(record: BaseRecord, filter: FilterConfig, props: BaseProperty[]): boolean {
  const prop = props.find((p) => p.id === filter.propertyId)
  if (!prop) return true
  const raw = getCellValue(record, prop)
  const strVal = raw == null ? '' : String(raw)

  switch (filter.operator) {
    case 'contains':
      return strVal.toLowerCase().includes((filter.value ?? '').toLowerCase())
    case 'not_contains':
      return !strVal.toLowerCase().includes((filter.value ?? '').toLowerCase())
    case 'is':
      return strVal === filter.value
    case 'is_not':
      return strVal !== filter.value
    case 'is_empty':
      return raw == null || strVal === '' || (Array.isArray(raw) && raw.length === 0)
    case 'is_not_empty':
      return raw != null && strVal !== '' && !(Array.isArray(raw) && raw.length === 0)
    default:
      return true
  }
}

function applyFilters(records: BaseRecord[], filters: FilterConfig[], props: BaseProperty[]): BaseRecord[] {
  return records.filter((r) => filters.every((f) => matchesFilter(r, f, props)))
}

// ── Sort logic ────────────────────────────────────────────────

function applySorts(records: BaseRecord[], sorts: SortConfig[]): BaseRecord[] {
  if (!sorts.length) return records
  return [...records].sort((a, b) => {
    for (const sort of sorts) {
      const aVal = a.values?.[sort.propertyId]
      const bVal = b.values?.[sort.propertyId]
      const aStr = aVal == null ? '' : String(aVal)
      const bStr = bVal == null ? '' : String(bVal)
      const cmp = aStr.localeCompare(bStr, undefined, { numeric: true })
      if (cmp !== 0) return sort.direction === 'desc' ? -cmp : cmp
    }
    return 0
  })
}

// ── Component ─────────────────────────────────────────────────

export default function BaseViewWidget({ config }: { config?: Record<string, unknown> }) {
  const navigate = useNavigate()
  const baseId = (config?.baseId as string) ?? ''
  const viewId = (config?.viewId as string) ?? ''

  const { data: base, isLoading: baseLoading, isError: baseError } = useBase(baseId)
  const { data: views } = useBaseViews(baseId)

  const view = useMemo(() => {
    if (!viewId || !views) return null
    return views.find((v) => v.id === viewId) ?? null
  }, [viewId, views])

  const properties = base?.properties ?? []
  const allRecords = base?.records ?? []

  const visibleProps = useMemo(() => {
    const visibleCols = view?.config?.visibleColumns
    if (visibleCols && visibleCols.length > 0) {
      return visibleCols
        .map((id) => properties.find((p) => p.id === id))
        .filter((p): p is BaseProperty => p != null)
    }
    return [...properties].sort((a, b) => a.position - b.position)
  }, [properties, view])

  const processedRecords = useMemo(() => {
    let recs = allRecords
    const filters = view?.config?.filters
    if (filters && filters.length > 0) {
      recs = applyFilters(recs, filters, properties)
    }
    const sorts = view?.config?.sorts
    if (sorts && sorts.length > 0) {
      recs = applySorts(recs, sorts)
    }
    return recs
  }, [allRecords, view, properties])

  // ── No base configured ──────────────────────────────────────
  if (!baseId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 py-8">
        <Database className="size-8 text-text-muted" />
        <p className="text-text-muted text-sm">Select a base in widget settings</p>
      </div>
    )
  }

  // ── Loading ─────────────────────────────────────────────────
  if (baseLoading) {
    return (
      <div className="flex flex-col gap-2 p-2 animate-pulse">
        <div className="h-4 w-32 rounded bg-bg-hover" />
        <div className="h-3 w-full rounded bg-bg-hover" />
        <div className="h-3 w-full rounded bg-bg-hover" />
        <div className="h-3 w-3/4 rounded bg-bg-hover" />
        <div className="h-3 w-full rounded bg-bg-hover" />
      </div>
    )
  }

  // ── Error / deleted base ────────────────────────────────────
  if (baseError || !base) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 py-8">
        <Settings className="size-8 text-text-muted" />
        <p className="text-text-muted text-sm text-center">
          This base no longer exists &mdash; reconfigure in settings
        </p>
      </div>
    )
  }

  const useTableMode = visibleProps.length >= 3
  const displayRecords = processedRecords.slice(0, MAX_ROWS)
  const overflowCount = processedRecords.length - displayRecords.length

  const subtitle = view ? `${base.name} \u2022 ${view.name}` : base.name

  return (
    <div className="flex flex-col h-full gap-1">
      {/* Subtitle */}
      <p className="text-text-muted text-xs px-1 truncate">{subtitle}</p>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {processedRecords.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <p className="text-text-muted text-xs">No records</p>
          </div>
        ) : useTableMode ? (
          <TableView
            records={displayRecords}
            properties={visibleProps}
          />
        ) : (
          <ListView
            records={displayRecords}
            properties={visibleProps}
          />
        )}

        {overflowCount > 0 && (
          <p className="text-text-muted text-xs text-center py-1">
            +{overflowCount} more
          </p>
        )}
      </div>

      {/* Footer */}
      <button
        onClick={() => navigate('/bases')}
        className="flex items-center gap-1 text-text-muted hover:text-accent text-xs px-1 py-0.5 self-start transition-colors"
      >
        <ExternalLink className="size-3" />
        Open in Bases
      </button>
    </div>
  )
}

// ── Table mode ────────────────────────────────────────────────

function TableView({
  records,
  properties,
}: {
  records: BaseRecord[]
  properties: BaseProperty[]
}) {
  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="border-b border-border">
          {properties.map((prop) => (
            <th
              key={prop.id}
              className="text-left text-text-secondary font-medium px-2 py-1.5 truncate max-w-[160px]"
            >
              {prop.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {records.map((record) => (
          <tr
            key={record.id}
            className="border-b border-border/50 hover:bg-bg-hover cursor-pointer transition-colors"
            onClick={() => console.log('Open record:', record.id)}
          >
            {properties.map((prop) => (
              <td key={prop.id} className="px-2 py-1.5 max-w-[160px]">
                <CellRenderer record={record} prop={prop} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── List mode ─────────────────────────────────────────────────

function ListView({
  records,
  properties,
}: {
  records: BaseRecord[]
  properties: BaseProperty[]
}) {
  const primaryProp = properties[0]
  const secondaryProps = properties.slice(1, 3)

  return (
    <div className="flex flex-col gap-0.5">
      {records.map((record) => {
        const primaryVal = primaryProp
          ? getCellValue(record, primaryProp)
          : null
        const title = primaryVal != null ? truncate(String(primaryVal), 50) : 'Untitled'

        return (
          <div
            key={record.id}
            className="flex flex-col gap-0.5 px-2 py-1.5 rounded hover:bg-bg-hover cursor-pointer transition-colors"
            onClick={() => console.log('Open record:', record.id)}
          >
            <span className="text-sm text-text-primary truncate">{title}</span>
            {secondaryProps.length > 0 && (
              <div className="flex items-center gap-2">
                {secondaryProps.map((prop) => (
                  <span key={prop.id} className="text-xs text-text-muted truncate max-w-[120px]">
                    <CellRenderer record={record} prop={prop} />
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Cell renderer ─────────────────────────────────────────────

function CellRenderer({ record, prop }: { record: BaseRecord; prop: BaseProperty }) {
  const value = getCellValue(record, prop)

  // Checkbox — icon
  if (prop.type === 'checkbox') {
    const checked = value === true || value === 'true' || value === 1
    return checked
      ? <Check className="size-3.5 text-accent" />
      : <X className="size-3.5 text-text-muted" />
  }

  // Select / status — badge
  if (prop.type === 'select' || prop.type === 'status') {
    if (value == null || value === '') return <span className="text-text-muted">{'\u2014'}</span>
    const color = getSelectColor(prop, value)
    return (
      <span
        className="inline-block px-1.5 py-0.5 rounded text-[10px] leading-tight truncate max-w-[120px]"
        style={color ? { backgroundColor: color + '22', color } : undefined}
      >
        {truncate(String(value), 20)}
      </span>
    )
  }

  // Multi-select — badges
  if (prop.type === 'multi_select') {
    const arr = Array.isArray(value) ? value : []
    if (!arr.length) return <span className="text-text-muted">{'\u2014'}</span>
    return (
      <div className="flex flex-wrap gap-0.5">
        {arr.slice(0, 3).map((v: unknown, i: number) => (
          <span
            key={i}
            className="inline-block px-1 py-0.5 rounded bg-bg-hover text-[10px] leading-tight truncate max-w-[80px]"
          >
            {truncate(String(v), 15)}
          </span>
        ))}
        {arr.length > 3 && (
          <span className="text-text-muted text-[10px]">+{arr.length - 3}</span>
        )}
      </div>
    )
  }

  // Default text
  const text = renderCellText(value, prop)
  return <span className="text-text-secondary truncate block">{text}</span>
}
