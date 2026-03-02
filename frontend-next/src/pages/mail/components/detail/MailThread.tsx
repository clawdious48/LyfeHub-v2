import { useMailThread } from '@/api/hooks/index.js'
import { MailThreadMessage } from './MailThreadMessage.js'
import { MailDetailActions } from './MailDetailActions.js'

interface Props {
  threadId: string
}

export function MailThread({ threadId }: Props) {
  const { data: thread, isLoading } = useMailThread(threadId)

  if (isLoading) {
    return (
      <div className="p-4 text-text-secondary text-sm">Loading thread...</div>
    )
  }

  if (!thread || thread.messages.length === 0) {
    return (
      <div className="p-4 text-text-muted text-sm">Thread not found</div>
    )
  }

  const lastMessage = thread.messages[thread.messages.length - 1]

  return (
    <div className="flex flex-col h-full">
      <MailDetailActions message={lastMessage} />

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">
            {lastMessage.subject || '(no subject)'}
          </h2>
          <span className="text-xs text-text-muted">
            {thread.messages.length} message{thread.messages.length !== 1 ? 's' : ''} in thread
          </span>
        </div>

        {thread.messages.map((msg, i) => (
          <MailThreadMessage
            key={msg.id}
            message={msg}
            defaultExpanded={i === thread.messages.length - 1}
          />
        ))}
      </div>
    </div>
  )
}
