import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckSquare, FileText, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button.js'
import { Badge } from '@/components/ui/badge.js'
import { useInbox, useInboxCount, useArchiveInboxItem } from '@/api/hooks/index.js'

type FilterType = 'all' | 'task' | 'note' | 'person'

const TYPE_ICONS = {
  task: { icon: CheckSquare, color: 'text-blue-500' },
  note: { icon: FileText, color: 'text-purple-500' },
  person: { icon: Users, color: 'text-green-500' },
} as const

const FILTER_TABS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'task', label: 'Tasks' },
  { key: 'note', label: 'Notes' },
  { key: 'person', label: 'People' },
]

const TYPE_ROUTES: Record<string, string> = {
  task: '/tasks',
  note: '/bases',
  person: '/people',
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then

  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`

  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export default function InboxWidget({ config: _config }: { config?: Record<string, unknown> }) {
  const [filter, setFilter] = useState<FilterType>('all')
  const navigate = useNavigate()
  const { data: inbox, isLoading } = useInbox(10)
  const { data: counts } = useInboxCount()
  const archiveMutation = useArchiveInboxItem()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-text-muted text-sm">Loading...</p>
      </div>
    )
  }

  const allItems = inbox?.items ?? []
  const items = filter === 'all' ? allItems : allItems.filter((item) => item.type === filter)

  if (allItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <CheckSquare className="size-10 text-green-500 animate-bounce" />
        <p className="text-text-primary text-base font-semibold">All clear!</p>
        <p className="text-text-muted text-xs">Nothing to process — enjoy the calm</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 min-w-0">
      {/* Filter tabs + count badge */}
      <div className="flex items-center gap-2 px-2 pb-2 min-w-0">
        <div className="flex items-center gap-1 flex-1 min-w-0 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-accent text-white'
                  : 'bg-bg-hover text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {counts && counts.count > 0 && (
          <Badge variant="secondary" className="text-xs">
            {counts.count} item{counts.count !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Filtered empty state */}
      {items.length === 0 && filter !== 'all' && (
        <div className="flex items-center justify-center py-6">
          <p className="text-text-muted text-sm">
            No {filter === 'task' ? 'tasks' : filter === 'note' ? 'notes' : 'people'} in inbox
          </p>
        </div>
      )}

      {/* Item list */}
      {items.map((item) => {
        const typeDef = TYPE_ICONS[item.type as keyof typeof TYPE_ICONS]
        const Icon = typeDef?.icon ?? FileText
        const iconColor = typeDef?.color ?? 'text-text-muted'

        return (
          <div
            key={`${item.type}-${item.id}`}
            role="button"
            tabIndex={0}
            onClick={() => navigate(TYPE_ROUTES[item.type] ?? '/')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                navigate(TYPE_ROUTES[item.type] ?? '/')
              }
            }}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-bg-hover transition-colors group cursor-pointer"
          >
            <Icon className={`size-4 shrink-0 ${iconColor}`} />
            <span className="text-sm text-text-primary truncate flex-1">
              {item.title}
            </span>
            <span className="text-xs text-text-muted shrink-0">
              {timeAgo(item.created_at)}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-opacity"
              onClick={(e) => {
                e.stopPropagation()
                archiveMutation.mutate({ id: item.id, type: item.type })
              }}
              disabled={archiveMutation.isPending}
            >
              <X className="size-3" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}
