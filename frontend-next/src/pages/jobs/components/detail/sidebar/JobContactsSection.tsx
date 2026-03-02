import { useState } from 'react'
import { Card } from '@/components/ui/card.js'
import { Badge } from '@/components/ui/badge.js'
import { Button } from '@/components/ui/button.js'
import { Plus, Trash2, Phone, Mail } from 'lucide-react'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog.js'
import { AddContactModal } from '@/pages/jobs/components/modals/AddContactModal.js'
import { useJobContacts, useRemoveJobContact } from '@/api/hooks/index.js'
import { formatPhone } from '@/pages/jobs/utils/jobFormatters.js'

interface JobContactsSectionProps {
  jobId: string
}

export function JobContactsSection({ jobId }: JobContactsSectionProps) {
  const { data: contacts } = useJobContacts(jobId)
  const removeContact = useRemoveJobContact()
  const [addContactOpen, setAddContactOpen] = useState(false)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  function handleRemove() {
    if (!confirmRemoveId) return
    removeContact.mutate(
      { jobId, contactLinkId: confirmRemoveId },
      { onSuccess: () => setConfirmRemoveId(null) },
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-sm">Contacts</h3>
        <Button variant="ghost" size="sm" onClick={() => setAddContactOpen(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {(contacts ?? []).length === 0 ? (
          <p className="text-xs text-text-muted py-2">No contacts linked</p>
        ) : (
          (contacts ?? []).map(contact => (
            <Card key={contact.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <p className="font-medium text-sm truncate">
                    {contact.first_name} {contact.last_name}
                  </p>
                  {contact.job_role && (
                    <Badge variant="secondary" className="text-xs">
                      {contact.job_role}
                    </Badge>
                  )}
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary"
                    >
                      <Phone className="h-3 w-3" />
                      {formatPhone(contact.phone)}
                    </a>
                  )}
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary"
                    >
                      <Mail className="h-3 w-3" />
                      {contact.email}
                    </a>
                  )}
                  {contact.org_name && (
                    <p className="text-xs text-text-muted">{contact.org_name}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 h-7 w-7 p-0 text-text-muted hover:text-destructive"
                  onClick={() => setConfirmRemoveId(contact.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <AddContactModal
        open={addContactOpen}
        onOpenChange={setAddContactOpen}
        jobId={jobId}
      />

      <ConfirmDialog
        open={confirmRemoveId !== null}
        onOpenChange={open => { if (!open) setConfirmRemoveId(null) }}
        title="Remove Contact"
        description="Are you sure you want to remove this contact from the job?"
        variant="destructive"
        onConfirm={handleRemove}
        loading={removeContact.isPending}
      />
    </div>
  )
}
