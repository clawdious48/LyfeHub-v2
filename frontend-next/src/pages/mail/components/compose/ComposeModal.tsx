import { useState, useRef } from 'react'
import { Send, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.js'
import { Button } from '@/components/ui/button.js'
import { Input } from '@/components/ui/input.js'
import { useSendMail } from '@/api/hooks/index.js'
import { useMailUiStore } from '@/stores/mailUiStore.js'
import { RecipientField } from './RecipientField.js'
import { RichTextEditor, type RichTextEditorRef } from './RichTextEditor.js'
import { AttachmentZone } from './AttachmentZone.js'
import { parseEmailAddress } from '@/pages/mail/utils/mailHelpers.js'

export function ComposeModal() {
  const { composeOpen, composeMode, composeReplyTo, closeCompose } = useMailUiStore()
  const sendMail = useSendMail()
  const editorRef = useRef<RichTextEditorRef>(null)

  // Initialize fields based on mode
  const [to, setTo] = useState<string[]>(() => {
    if (composeReplyTo?.to) {
      const parsed = parseEmailAddress(composeReplyTo.to)
      return [parsed.email]
    }
    return []
  })
  const [cc, setCc] = useState<string[]>(() => {
    if (composeMode === 'replyAll' && composeReplyTo?.cc) {
      return composeReplyTo.cc.split(',').map(e => parseEmailAddress(e.trim()).email).filter(Boolean)
    }
    return []
  })
  const [bcc, setBcc] = useState<string[]>([])
  const [subject, setSubject] = useState(composeReplyTo?.subject ?? '')
  const [showCcBcc, setShowCcBcc] = useState(cc.length > 0)
  const [attachments, setAttachments] = useState<File[]>([])

  const initialBody = composeReplyTo
    ? `<br/><br/><blockquote style="border-left:3px solid #444;padding-left:12px;color:#999">${composeReplyTo.body}</blockquote>`
    : ''

  function handleSend() {
    const body = editorRef.current?.getHTML() ?? ''

    if (attachments.length > 0) {
      const formData = new FormData()
      formData.append('to', to.join(', '))
      if (cc.length > 0) formData.append('cc', cc.join(', '))
      if (bcc.length > 0) formData.append('bcc', bcc.join(', '))
      formData.append('subject', subject)
      formData.append('body', body)
      if (composeReplyTo?.inReplyTo) formData.append('inReplyTo', composeReplyTo.inReplyTo)
      if (composeReplyTo?.threadId) formData.append('threadId', composeReplyTo.threadId)
      attachments.forEach(file => formData.append('attachments', file))
      sendMail.mutate(formData, { onSuccess: () => closeCompose() })
    } else {
      sendMail.mutate({
        to: to.join(', '),
        cc: cc.length > 0 ? cc.join(', ') : undefined,
        bcc: bcc.length > 0 ? bcc.join(', ') : undefined,
        subject,
        body,
        inReplyTo: composeReplyTo?.inReplyTo || undefined,
        threadId: composeReplyTo?.threadId || undefined,
      }, { onSuccess: () => closeCompose() })
    }
  }

  const modeLabel =
    composeMode === 'reply' ? 'Reply' :
    composeMode === 'replyAll' ? 'Reply All' :
    composeMode === 'forward' ? 'Forward' :
    'New Message'

  return (
    <Dialog open={composeOpen} onOpenChange={(open) => { if (!open) closeCompose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{modeLabel}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-2">
          <RecipientField label="To" value={to} onChange={setTo} />

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowCcBcc(!showCcBcc)}
              className="text-xs text-text-muted hover:text-accent flex items-center gap-1"
            >
              Cc/Bcc {showCcBcc ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </button>
          </div>

          {showCcBcc && (
            <>
              <RecipientField label="Cc" value={cc} onChange={setCc} />
              <RecipientField label="Bcc" value={bcc} onChange={setBcc} />
            </>
          )}

          <Input
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="text-sm"
          />

          <RichTextEditor ref={editorRef} initialContent={initialBody} />

          <AttachmentZone files={attachments} onChange={setAttachments} />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="text-text-muted"
            onClick={closeCompose}
          >
            <Trash2 className="size-4 mr-1.5" />
            Discard
          </Button>
          <Button
            onClick={handleSend}
            disabled={to.length === 0 || sendMail.isPending}
            size="sm"
          >
            <Send className="size-4 mr-1.5" />
            {sendMail.isPending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
