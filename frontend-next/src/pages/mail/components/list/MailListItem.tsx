import { Star, Paperclip } from 'lucide-react'
import type { MailMessageSummary } from '@/types/index.js'
import { formatEmailDate, parseEmailAddress, truncateSnippet } from '@/pages/mail/utils/mailHelpers.js'

interface Props {
  message: MailMessageSummary
  isSelected: boolean
  onSelect: () => void
  onToggleStar: () => void
}

export function MailListItem({ message, isSelected, onSelect, onToggleStar }: Props) {
  const sender = parseEmailAddress(message.from)
  const displayName = sender.name || sender.email

  return (
    <div
      onClick={onSelect}
      className={[
        'flex items-start gap-3 px-3 py-2.5 cursor-pointer border-b border-border transition-colors',
        isSelected ? 'bg-accent-light' : 'hover:bg-bg-hover',
        !message.isRead ? 'bg-bg-surface' : '',
      ].join(' ')}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggleStar() }}
        className="mt-0.5 shrink-0"
      >
        <Star
          className={`size-4 ${message.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-text-muted hover:text-yellow-400'}`}
        />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm truncate ${!message.isRead ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
            {displayName}
          </span>
          <span className="text-xs text-text-muted shrink-0">
            {formatEmailDate(message.date)}
          </span>
        </div>
        <div className={`text-sm truncate ${!message.isRead ? 'font-medium text-text-primary' : 'text-text-secondary'}`}>
          {message.subject || '(no subject)'}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-muted truncate">
            {truncateSnippet(message.snippet, 80)}
          </span>
          {message.hasAttachments && (
            <Paperclip className="size-3 text-text-muted shrink-0" />
          )}
        </div>
      </div>
    </div>
  )
}
