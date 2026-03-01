import { User, X, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input.js'
import { Label } from '@/components/ui/label.js'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js'
import { US_STATES } from '@/pages/jobs/utils/jobConstants.js'
import type { AdditionalContact } from '@/types/index.js'

interface ClientInfoSectionProps {
  client_name: string
  client_phone: string
  client_email: string
  client_street: string
  client_unit: string
  client_city: string
  client_state: string
  client_zip: string
  additional_clients: AdditionalContact[]
  onUpdateField: (field: string, value: string) => void
  onAddClient: () => void
  onRemoveClient: (index: number) => void
  onUpdateClient: (index: number, field: keyof AdditionalContact, value: string) => void
}

export function ClientInfoSection({
  client_name,
  client_phone,
  client_email,
  client_street,
  client_unit,
  client_city,
  client_state,
  client_zip,
  additional_clients,
  onUpdateField,
  onAddClient,
  onRemoveClient,
  onUpdateClient,
}: ClientInfoSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <User className="size-4 text-accent" />
        <h3 className="font-medium text-sm text-text-secondary uppercase tracking-wider">
          Client Info
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label htmlFor="cj-client-name">Name *</Label>
          <Input
            id="cj-client-name"
            value={client_name}
            onChange={e => onUpdateField('client_name', e.target.value)}
            placeholder="Full name"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cj-client-phone">Phone *</Label>
          <Input
            id="cj-client-phone"
            type="tel"
            value={client_phone}
            onChange={e => onUpdateField('client_phone', e.target.value)}
            placeholder="(555) 555-5555"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cj-client-email">Email</Label>
          <Input
            id="cj-client-email"
            type="email"
            value={client_email}
            onChange={e => onUpdateField('client_email', e.target.value)}
            placeholder="email@example.com"
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label htmlFor="cj-client-street">Street</Label>
          <Input
            id="cj-client-street"
            value={client_street}
            onChange={e => onUpdateField('client_street', e.target.value)}
            placeholder="Street address"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cj-client-unit">Unit #</Label>
          <Input
            id="cj-client-unit"
            value={client_unit}
            onChange={e => onUpdateField('client_unit', e.target.value)}
            placeholder="Apt, Suite, etc."
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cj-client-city">City</Label>
          <Input
            id="cj-client-city"
            value={client_city}
            onChange={e => onUpdateField('client_city', e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cj-client-state">State</Label>
          <Select value={client_state} onValueChange={v => onUpdateField('client_state', v)}>
            <SelectTrigger id="cj-client-state">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="cj-client-zip">Zip</Label>
          <Input
            id="cj-client-zip"
            value={client_zip}
            onChange={e => onUpdateField('client_zip', e.target.value)}
            maxLength={10}
          />
        </div>
      </div>

      {/* Additional clients */}
      {additional_clients.map((ac, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mt-2 items-end">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              value={ac.name}
              onChange={e => onUpdateClient(i, 'name', e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input
              type="tel"
              value={ac.phone}
              onChange={e => onUpdateClient(i, 'phone', e.target.value)}
              placeholder="(555) 555-5555"
            />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input
              type="email"
              value={ac.email}
              onChange={e => onUpdateClient(i, 'email', e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <button
            type="button"
            onClick={() => onRemoveClient(i)}
            className="p-2 text-red-400 hover:text-red-300 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onAddClient}
        className="mt-2 flex items-center gap-1 text-xs text-accent hover:text-accent/80 cursor-pointer"
      >
        <Plus className="size-3" /> Add Client
      </button>
    </section>
  )
}
