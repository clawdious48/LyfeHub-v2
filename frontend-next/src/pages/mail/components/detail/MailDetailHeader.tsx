import { Badge } from '@/components/ui/badge.js'
import type { MailMessageFull } from '@/types/index.js'
import { parseEmailAddress, formatEmailDate, getInitials } from '@/pages/mail/utils/mailHelpers.js'

interface Props {
  message: MailMessageFull
}

export function MailDetailHeader({ message }: Props) {
  const sender = parseEmailAddress(message.from)
  const displayName = sender.name || sender.email
  const initials = getInitials(displayName)

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-text-primary">
        {message.subject || '(no subject)'}
      </h2>

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-accent-light flex items-center justify-center shrink-0">
          <span className="text-sm font-medium text-accent">{initials}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-sm font-medium text-text-primary">{displayName}</span>
              {sender.name && (
                <span className="text-xs text-text-muted ml-1">&lt;{sender.email}&gt;</span>
              )}
            </div>
            <span className="text-xs text-text-muted shrink-0">
              {formatEmailDate(message.date)}
            </span>
          </div>

          <div className="text-xs text-text-secondary">
            To: {message.to}
          </div>
          {message.cc && (
            <div className="text-xs text-text-secondary">
              Cc: {message.cc}
            </div>
          )}
        </div>
      </div>

      {message.labelIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {message.labelIds.map(label => (
            <Badge key={label} variant="secondary" className="text-xs">
              {label.replace('CATEGORY_', '').toLowerCase()}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
