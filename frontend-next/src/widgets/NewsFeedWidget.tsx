import { Rss, Loader2 } from 'lucide-react'
import { useFeedItems } from '@/api/hooks/useFeeds.js'

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return ''
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  if (isNaN(then)) return ''
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

export default function NewsFeedWidget({
  config,
}: {
  config?: Record<string, unknown>
}) {
  const feedIds = (config?.feedIds as string[] | undefined) ?? []
  const { data: items, isLoading } = useFeedItems(feedIds, 15)

  if (feedIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <Rss className="size-8 text-text-muted" />
        <p className="text-text-secondary text-sm">No feeds configured</p>
        <p className="text-text-muted text-xs">
          Add your first feed in widget settings
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 text-text-muted animate-spin" />
      </div>
    )
  }

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <Rss className="size-6 text-text-muted" />
        <p className="text-text-secondary text-sm">No articles yet</p>
        <p className="text-text-muted text-xs">
          New items will appear as feeds update
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5 overflow-y-auto h-full">
      {items.map((item) => {
        const ago = timeAgo(item.published_at ?? item.fetched_at)
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => window.open(item.url, '_blank', 'noopener')}
            className="flex items-start gap-2.5 px-2 py-1.5 rounded-md hover:bg-bg-hover transition-colors text-left w-full"
          >
            {item.feed_icon_url ? (
              <img
                src={item.feed_icon_url}
                alt=""
                className="size-4 shrink-0 mt-0.5"
                loading="lazy"
              />
            ) : (
              <Rss className="size-4 shrink-0 text-text-muted mt-0.5" />
            )}
            <span className="text-sm text-text-primary line-clamp-2 flex-1 leading-snug">
              {item.title}
            </span>
            {ago && (
              <span className="text-xs text-text-muted shrink-0 mt-0.5">
                {ago}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
