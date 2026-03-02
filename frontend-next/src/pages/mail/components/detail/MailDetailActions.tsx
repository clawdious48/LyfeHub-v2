import { Reply, ReplyAll, Forward, Archive, Trash2, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button.js'
import { Separator } from '@/components/ui/separator.js'
import { useArchiveMail, useTrashMail, useToggleRead } from '@/api/hooks/index.js'
import { useMailUiStore } from '@/stores/mailUiStore.js'
import type { MailMessageFull } from '@/types/index.js'

interface Props {
  message: MailMessageFull
}

export function MailDetailActions({ message }: Props) {
  const { setSelectedMessage, openCompose } = useMailUiStore()
  const archiveMail = useArchiveMail()
  const trashMail = useTrashMail()
  const toggleRead = useToggleRead()

  function handleReply() {
    openCompose('reply', {
      messageId: message.id,
      threadId: message.threadId,
      to: message.from,
      cc: '',
      subject: message.subject.startsWith('Re:') ? message.subject : `Re: ${message.subject}`,
      body: message.body,
      inReplyTo: message.messageId,
    })
  }

  function handleReplyAll() {
    openCompose('replyAll', {
      messageId: message.id,
      threadId: message.threadId,
      to: message.from,
      cc: message.cc,
      subject: message.subject.startsWith('Re:') ? message.subject : `Re: ${message.subject}`,
      body: message.body,
      inReplyTo: message.messageId,
    })
  }

  function handleForward() {
    openCompose('forward', {
      messageId: message.id,
      threadId: message.threadId,
      to: '',
      cc: '',
      subject: message.subject.startsWith('Fwd:') ? message.subject : `Fwd: ${message.subject}`,
      body: message.body,
      inReplyTo: '',
    })
  }

  function handleArchive() {
    archiveMail.mutate(message.id, {
      onSuccess: () => setSelectedMessage(null),
    })
  }

  function handleTrash() {
    trashMail.mutate(message.id, {
      onSuccess: () => setSelectedMessage(null),
    })
  }

  function handleToggleRead() {
    toggleRead.mutate({
      messageId: message.id,
      markAs: message.isRead ? 'unread' : 'read',
    })
  }

  return (
    <div className="flex items-center gap-1 p-2 border-b border-border">
      <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={handleReply}>
        <Reply className="size-4" />
        Reply
      </Button>
      <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={handleReplyAll}>
        <ReplyAll className="size-4" />
        Reply All
      </Button>
      <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={handleForward}>
        <Forward className="size-4" />
        Forward
      </Button>

      <Separator orientation="vertical" className="h-5 mx-1" />

      <Button variant="ghost" size="icon" className="size-8" onClick={handleArchive} title="Archive">
        <Archive className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" className="size-8" onClick={handleTrash} title="Trash">
        <Trash2 className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={handleToggleRead}
        title={message.isRead ? 'Mark unread' : 'Mark read'}
      >
        <Tag className="size-4" />
      </Button>
    </div>
  )
}
