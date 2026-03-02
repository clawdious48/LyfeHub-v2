import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMailStatus } from '@/api/hooks/index.js'
import { useMailUiStore } from '@/stores/mailUiStore.js'
import { useMailHotkeys } from '@/pages/mail/hooks/useMailHotkeys.js'
import { ConnectGmailPrompt } from '@/pages/mail/components/ConnectGmailPrompt.js'
import { MailList } from '@/pages/mail/components/list/MailList.js'
import { MailDetail } from '@/pages/mail/components/detail/MailDetail.js'
import { ComposeModal } from '@/pages/mail/components/compose/ComposeModal.js'

export default function MailPage() {
  const { data: status, isLoading } = useMailStatus()
  const { composeOpen, selectedMessageId, activeLabel, searchQuery, setActiveLabel, setSearchQuery } = useMailUiStore()
  useMailHotkeys()
  const [searchParams, setSearchParams] = useSearchParams()

  // Sync URL -> store on mount
  useEffect(() => {
    const urlLabel = searchParams.get('label')
    const urlQ = searchParams.get('q')
    if (urlLabel && urlLabel !== activeLabel) setActiveLabel(urlLabel)
    if (urlQ && urlQ !== searchQuery) setSearchQuery(urlQ)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync store -> URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (activeLabel && activeLabel !== 'INBOX') params.set('label', activeLabel)
    if (searchQuery) params.set('q', searchQuery)
    setSearchParams(params, { replace: true })
  }, [activeLabel, searchQuery, setSearchParams])

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
        <div className={`${selectedMessageId ? 'hidden lg:flex' : 'flex'} lg:flex`}>
          <MailList />
        </div>
        <div className={`${selectedMessageId ? 'flex' : 'hidden lg:flex'} flex-1`}>
          <MailDetail />
        </div>
      </div>
      {composeOpen && <ComposeModal />}
    </>
  )
}
