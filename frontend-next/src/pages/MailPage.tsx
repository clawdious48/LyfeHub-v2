import { useMailStatus } from '@/api/hooks/index.js'
import { ConnectGmailPrompt } from '@/pages/mail/components/ConnectGmailPrompt.js'

export default function MailPage() {
  const { data: status, isLoading } = useMailStatus()

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-text-secondary text-sm">Loading mail...</p>
      </div>
    )
  }

  if (!status?.connected) {
    return <ConnectGmailPrompt />
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
        Mail connected as {status.email}. UI loading...
      </div>
    </div>
  )
}
