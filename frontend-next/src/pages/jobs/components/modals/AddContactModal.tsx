import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog.js'
import { Button } from '@/components/ui/button.js'
import { Input } from '@/components/ui/input.js'
import { Label } from '@/components/ui/label.js'
import { Textarea } from '@/components/ui/textarea.js'
import { Separator } from '@/components/ui/separator.js'
import { Search, User } from 'lucide-react'
import { useCrmContacts, useCreateCrmContact, useAddJobContact } from '@/api/hooks/index.js'
import { formatPhone } from '@/pages/jobs/utils/jobFormatters.js'
import { cn } from '@/lib/utils.js'

interface AddContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
}

export function AddContactModal({ open, onOpenChange, jobId }: AddContactModalProps) {
  const [mode, setMode] = useState<'search' | 'create'>('search')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [jobRole, setJobRole] = useState('')
  const [notes, setNotes] = useState('')

  const { data: contacts } = useCrmContacts()
  const createCrmContact = useCreateCrmContact()
  const addJobContact = useAddJobContact()

  useEffect(() => {
    if (open) {
      setMode('search')
      setSearchTerm('')
      setSelectedContactId(null)
      setFirstName('')
      setLastName('')
      setPhone('')
      setEmail('')
      setJobRole('')
      setNotes('')
    }
  }, [open])

  const filteredContacts = useMemo(() => {
    if (!contacts || !searchTerm.trim()) return contacts ?? []
    const term = searchTerm.toLowerCase()
    return contacts.filter(c =>
      c.first_name?.toLowerCase().includes(term) ||
      c.last_name?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.phone?.includes(term),
    )
  }, [contacts, searchTerm])

  const isPending = createCrmContact.isPending || addJobContact.isPending

  function handleSubmit() {
    if (mode === 'search') {
      if (!selectedContactId) return
      addJobContact.mutate(
        {
          jobId,
          contact_id: selectedContactId,
          job_role: jobRole || undefined,
          notes: notes || undefined,
        },
        {
          onSuccess: () => onOpenChange(false),
        },
      )
    } else {
      if (!firstName.trim()) return
      createCrmContact.mutate(
        {
          first_name: firstName.trim(),
          last_name: lastName.trim() || undefined,
          phone: phone || undefined,
          email: email || undefined,
        },
        {
          onSuccess: (newContact) => {
            addJobContact.mutate(
              {
                jobId,
                contact_id: newContact.id,
                job_role: jobRole || undefined,
                notes: notes || undefined,
              },
              {
                onSuccess: () => onOpenChange(false),
              },
            )
          },
        },
      )
    }
  }

  const isValid = mode === 'search'
    ? selectedContactId !== null
    : firstName.trim() !== ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'search' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('search')}
            >
              Search Existing
            </Button>
            <Button
              variant={mode === 'create' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('create')}
            >
              Create New
            </Button>
          </div>

          {mode === 'search' ? (
            <>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-muted" />
                <Input
                  className="pl-9"
                  placeholder="Search contacts..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredContacts.length > 0 ? (
                  filteredContacts.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className={cn(
                        'flex items-center gap-2 w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                        selectedContactId === c.id
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-accent/50',
                      )}
                      onClick={() => setSelectedContactId(c.id)}
                    >
                      <User className="h-4 w-4 shrink-0 text-text-muted" />
                      <div className="min-w-0">
                        <span className="font-medium">
                          {c.first_name} {c.last_name}
                        </span>
                        {(c.phone || c.email) && (
                          <span className="ml-2 text-sm text-text-muted">
                            {c.phone ? formatPhone(c.phone) : c.email}
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="py-4 text-center text-sm text-text-muted">
                    {searchTerm ? 'No contacts found' : 'Type to search contacts'}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="contact_first_name">First Name *</Label>
                <Input
                  id="contact_first_name"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contact_last_name">Last Name</Label>
                <Input
                  id="contact_last_name"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contact_phone">Phone</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contact_email">Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="contact_job_role">Job Role</Label>
              <Input
                id="contact_job_role"
                value={jobRole}
                onChange={e => setJobRole(e.target.value)}
                placeholder="e.g. Adjuster, Contractor"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="contact_notes">Notes</Label>
              <Textarea
                id="contact_notes"
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!isValid || isPending}
            onClick={handleSubmit}
          >
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
