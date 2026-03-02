import { useEffect, useRef, useCallback } from 'react'
import { useMailMessages, useToggleStar } from '@/api/hooks/index.js'
import { useMailUiStore } from '@/stores/mailUiStore.js'
import { MailListItem } from './MailListItem.js'
import { MailListToolbar } from './MailListToolbar.js'

interface Props {
  onOpenSettings?: () => void
}

export function MailList({ onOpenSettings }: Props) {
  const { activeLabel, searchQuery, selectedMessageId, setSelectedMessage } = useMailUiStore()
  const toggleStar = useToggleStar()

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useMailMessages(activeLabel, searchQuery)

  const messages = data?.pages.flatMap(p => p.messages) ?? []

  // Infinite scroll
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || !hasNextPage || isFetchingNextPage) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  return (
    <div className="flex flex-col h-full border-r border-border w-full lg:w-[400px] md:w-[300px] shrink-0">
      <MailListToolbar
        onRefresh={() => refetch()}
        isRefreshing={isRefetching}
        onOpenSettings={onOpenSettings}
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-text-secondary text-sm">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="p-4 text-text-muted text-sm text-center">No messages</div>
        ) : (
          messages.map(msg => (
            <MailListItem
              key={msg.id}
              message={msg}
              isSelected={selectedMessageId === msg.id}
              onSelect={() => setSelectedMessage(msg.id, msg.threadId)}
              onToggleStar={() => toggleStar.mutate(msg.id)}
            />
          ))
        )}

        {isFetchingNextPage && (
          <div className="p-3 text-text-muted text-xs text-center">Loading more...</div>
        )}
      </div>
    </div>
  )
}
