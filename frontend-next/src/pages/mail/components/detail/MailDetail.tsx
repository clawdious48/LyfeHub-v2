import { ArrowLeft, Mail } from 'lucide-react'
import { useMailUiStore } from '@/stores/mailUiStore.js'
import { MailThread } from './MailThread.js'

export function MailDetail() {
  const { selectedThreadId, setSelectedMessage } = useMailUiStore()

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
      <button
        onClick={() => setSelectedMessage(null)}
        className="lg:hidden flex items-center gap-1 px-3 py-2 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="size-4" /> Back
      </button>
      <MailThread threadId={selectedThreadId} />
    </div>
  )
}
