import { useState } from 'react'
import { Button } from '@/components/ui/button.js'
import { Input } from '@/components/ui/input.js'
import { Rss, X, Plus, Loader2 } from 'lucide-react'
import { useFeeds, useAddFeed, useDeleteFeed } from '@/api/hooks/useFeeds.js'

interface FeedsEditorProps {
  value: string[]
  onChange: (feedIds: string[]) => void
}

export default function FeedsEditor({ value, onChange }: FeedsEditorProps) {
  const [addUrl, setAddUrl] = useState('')
  const [error, setError] = useState('')
  const { data: allFeeds } = useFeeds()
  const addFeed = useAddFeed()
  const deleteFeed = useDeleteFeed()

  // Show feeds whose IDs are in the value array
  const selectedFeeds = (allFeeds ?? []).filter((f) => value.includes(f.id))

  const handleAdd = async () => {
    const url = addUrl.trim()
    if (!url) return
    setError('')

    try {
      const feed = await addFeed.mutateAsync({ url })
      if (!value.includes(feed.id)) {
        onChange([...value, feed.id])
      }
      setAddUrl('')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to add feed'
      setError(message)
    }
  }

  const handleRemove = async (feedId: string) => {
    try {
      await deleteFeed.mutateAsync(feedId)
      onChange(value.filter((id) => id !== feedId))
    } catch {
      // Silently fail — the feed list will refresh via query invalidation
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="space-y-2">
      {selectedFeeds.length > 0 && (
        <div className="space-y-1">
          {selectedFeeds.map((feed) => (
            <div
              key={feed.id}
              className="flex items-center gap-2 p-1.5 rounded hover:bg-bg-hover group"
            >
              {feed.icon_url ? (
                <img
                  src={feed.icon_url}
                  alt=""
                  className="size-4 shrink-0"
                  loading="lazy"
                />
              ) : (
                <Rss className="size-4 shrink-0 text-text-muted" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-primary truncate">
                  {feed.title}
                </p>
                <p className="text-[10px] text-text-muted truncate">
                  {feed.url}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => handleRemove(feed.id)}
                disabled={deleteFeed.isPending}
                className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-400"
              >
                <X className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1 p-2 rounded border border-dashed border-border">
        <div className="flex items-center gap-1.5">
          <Plus className="size-3 text-text-muted shrink-0" />
          <Input
            value={addUrl}
            onChange={(e) => {
              setAddUrl(e.target.value)
              if (error) setError('')
            }}
            placeholder="https://example.com or feed URL"
            type="url"
            className="h-7 text-xs flex-1"
            onKeyDown={handleKeyDown}
            disabled={addFeed.isPending}
          />
        </div>
        {error && (
          <p className="text-[11px] text-red-400 px-1">{error}</p>
        )}
        <div className="flex justify-end">
          <Button
            size="sm"
            className="h-6 text-xs px-3"
            onClick={handleAdd}
            disabled={!addUrl.trim() || addFeed.isPending}
          >
            {addFeed.isPending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              'Add'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
