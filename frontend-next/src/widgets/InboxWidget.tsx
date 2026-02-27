import { CheckSquare, FileText, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useInbox, useInboxCount, useArchiveInboxItem } from '@/api/hooks'

const TYPE_ICONS = {
  task: { icon: CheckSquare, color: 'text-blue-500' },
  note: { icon: FileText, color: 'text-purple-500' },
  person: { icon: Users, color: 'text-green-500' },
} as const

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

  const items = inbox?.items ?? []

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <p className="text-text-secondary text-sm">All clear — nothing to process</p>
        <p className="text-text-muted text-xs">Items will appear here when captured</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Count badge */}
      {counts && counts.count > 0 && (
        <div className="flex items-center gap-2 px-2 pb-2">
          <Badge variant="secondary" className="text-xs">
            {counts.count} item{counts.count !== 1 ? 's' : ''}
          </Badge>
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
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-bg-hover transition-colors group"
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
              onClick={() => archiveMutation.mutate({ id: item.id, type: item.type })}
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
