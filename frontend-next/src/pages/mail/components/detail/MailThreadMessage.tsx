import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { MailMessageFull } from '@/types/index.js'
import { parseEmailAddress, formatEmailDate } from '@/pages/mail/utils/mailHelpers.js'
import { MailDetailHeader } from './MailDetailHeader.js'
import { MailDetailBody } from './MailDetailBody.js'

interface Props {
  message: MailMessageFull
  defaultExpanded: boolean
}

export function MailThreadMessage({ message, defaultExpanded }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const sender = parseEmailAddress(message.from)
  const displayName = sender.name || sender.email

  if (!expanded) {
    return (
      <div
        onClick={() => setExpanded(true)}
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-bg-hover border-b border-border transition-colors"
      >
        <ChevronRight className="size-4 text-text-muted shrink-0" />
        <span className="text-sm font-medium text-text-primary truncate">
          {displayName}
        </span>
        <span className="text-xs text-text-muted shrink-0 ml-auto">
          {formatEmailDate(message.date)}
        </span>
      </div>
    )
  }

  return (
    <div className="border-b border-border">
      <div
        onClick={() => setExpanded(false)}
        className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-bg-hover transition-colors"
      >
        <ChevronDown className="size-4 text-text-muted shrink-0" />
        <span className="text-xs text-text-muted">Collapse</span>
      </div>
      <div className="px-4 pb-4 space-y-4">
        <MailDetailHeader message={message} />
        <MailDetailBody body={message.body} />
      </div>
    </div>
  )
}
