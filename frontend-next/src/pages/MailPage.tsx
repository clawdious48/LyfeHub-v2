import { useMailStatus } from '@/api/hooks/index.js'
import { useMailUiStore } from '@/stores/mailUiStore.js'
import { ConnectGmailPrompt } from '@/pages/mail/components/ConnectGmailPrompt.js'
import { MailList } from '@/pages/mail/components/list/MailList.js'
import { MailDetail } from '@/pages/mail/components/detail/MailDetail.js'
import { ComposeModal } from '@/pages/mail/components/compose/ComposeModal.js'

export default function MailPage() {
  const { data: status, isLoading } = useMailStatus()
  const { composeOpen } = useMailUiStore()

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
    <>
      <div className="flex h-full">
        <MailList />
        <MailDetail />
      </div>
      {composeOpen && <ComposeModal />}
    </>
  )
}
