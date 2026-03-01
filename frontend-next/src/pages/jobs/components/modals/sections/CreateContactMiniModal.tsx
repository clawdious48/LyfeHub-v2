import { useState } from 'react'
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
import { useCreateCrmContact } from '@/api/hooks/index.js'
import type { CrmContact, CreateCrmContactData } from '@/types/index.js'

interface CreateContactMiniModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (contact: CrmContact) => void
}

const INITIAL = {
  first_name: '',
  last_name: '',
  phone: '',
  phone_alt: '',
  email: '',
}

export function CreateContactMiniModal({ open, onOpenChange, onCreated }: CreateContactMiniModalProps) {
  const [form, setForm] = useState(INITIAL)
  const createContact = useCreateCrmContact()

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleSave() {
    if (!form.first_name.trim()) return
    const payload: CreateCrmContactData = {
      first_name: form.first_name,
      last_name: form.last_name,
      phone: form.phone,
      phone_alt: form.phone_alt,
      email: form.email,
    }
    createContact.mutate(payload, {
      onSuccess: (contact) => {
        onCreated(contact)
        setForm(INITIAL)
        onOpenChange(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Contact</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1">
            <Label>First Name *</Label>
            <Input
              value={form.first_name}
              onChange={e => update('first_name', e.target.value)}
              placeholder="First name"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label>Last Name</Label>
            <Input
              value={form.last_name}
              onChange={e => update('last_name', e.target.value)}
              placeholder="Last name"
            />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input
              type="tel"
              value={form.phone}
              onChange={e => update('phone', e.target.value)}
              placeholder="(555) 555-5555"
            />
          </div>
          <div className="space-y-1">
            <Label>Alt Phone</Label>
            <Input
              type="tel"
              value={form.phone_alt}
              onChange={e => update('phone_alt', e.target.value)}
              placeholder="(555) 555-5555"
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              placeholder="email@example.com"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleSave}
            disabled={!form.first_name.trim() || createContact.isPending}
          >
            {createContact.isPending ? 'Saving...' : 'Save Contact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
