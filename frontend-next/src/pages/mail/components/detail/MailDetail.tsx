import { Mail } from 'lucide-react'
import { useMailUiStore } from '@/stores/mailUiStore.js'
import { MailThread } from './MailThread.js'

export function MailDetail() {
  const { selectedThreadId } = useMailUiStore()

  if (!selectedThreadId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
        <Mail className="size-12 text-text-muted" />
        <p className="text-text-muted text-sm">Select a message to read</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <MailThread threadId={selectedThreadId} />
    </div>
  )
}
