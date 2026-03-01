import { Building, X, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input.js'
import { Label } from '@/components/ui/label.js'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js'
import { PROPERTY_TYPES, US_STATES, SITE_CONTACT_RELATIONS } from '@/pages/jobs/utils/jobConstants.js'
import type { SiteContact } from '@/types/index.js'

interface PropertyInfoSectionProps {
  same_as_client: boolean
  year_built: string
  prop_type: string
  prop_street: string
  prop_unit: string
  prop_city: string
  prop_state: string
  prop_zip: string
  access_info: string
  // Client fields for display when Same is active
  client_street: string
  client_unit: string
  client_city: string
  client_state: string
  client_zip: string
  // Site contacts
  site_contacts: SiteContact[]
  onUpdateField: (field: string, value: string | boolean) => void
  onAddSiteContact: () => void
  onRemoveSiteContact: (index: number) => void
  onUpdateSiteContact: (index: number, field: keyof SiteContact, value: string) => void
}

export function PropertyInfoSection({
  same_as_client,
  year_built,
  prop_type,
  prop_street,
  prop_unit,
  prop_city,
  prop_state,
  prop_zip,
  access_info,
  client_street,
  client_unit,
  client_city,
  client_state,
  client_zip,
  site_contacts,
  onUpdateField,
  onAddSiteContact,
  onRemoveSiteContact,
  onUpdateSiteContact,
}: PropertyInfoSectionProps) {
  // Show client values when Same is active, otherwise show property values
  const displayStreet = same_as_client ? client_street : prop_street
  const displayUnit = same_as_client ? client_unit : prop_unit
  const displayCity = same_as_client ? client_city : prop_city
  const displayState = same_as_client ? client_state : prop_state
  const displayZip = same_as_client ? client_zip : prop_zip

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Building className="size-4 text-accent" />
          <h3 className="font-medium text-sm text-text-secondary uppercase tracking-wider">
            Property Info
          </h3>
        </div>
        <button
          type="button"
          onClick={() => onUpdateField('same_as_client', !same_as_client)}
          className={[
            'px-2 py-1 rounded text-xs font-medium border transition-all cursor-pointer',
            same_as_client
              ? 'bg-purple-500/20 border-purple-500 text-purple-300'
              : 'bg-bg-surface border-border text-text-muted hover:border-purple-500/50',
          ].join(' ')}
        >
          Same
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="cj-year-built">Year Built</Label>
          <Input
            id="cj-year-built"
            value={year_built}
            onChange={e => onUpdateField('year_built', e.target.value)}
            placeholder="e.g. 1998"
            maxLength={4}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cj-prop-type">Property Type</Label>
          <Select value={prop_type} onValueChange={v => onUpdateField('prop_type', v)}>
            <SelectTrigger id="cj-prop-type">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_TYPES.map(pt => (
                <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1">
          <Label htmlFor="cj-prop-street">Street</Label>
          <Input
            id="cj-prop-street"
            value={displayStreet}
            onChange={e => onUpdateField('prop_street', e.target.value)}
            placeholder="Street address"
            disabled={same_as_client}
            className={same_as_client ? 'opacity-50' : ''}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cj-prop-unit">Unit #</Label>
          <Input
            id="cj-prop-unit"
            value={displayUnit}
            onChange={e => onUpdateField('prop_unit', e.target.value)}
            placeholder="Apt, Suite, etc."
            disabled={same_as_client}
            className={same_as_client ? 'opacity-50' : ''}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cj-prop-city">City</Label>
          <Input
            id="cj-prop-city"
            value={displayCity}
            onChange={e => onUpdateField('prop_city', e.target.value)}
            disabled={same_as_client}
            className={same_as_client ? 'opacity-50' : ''}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cj-prop-state">State</Label>
          <Select
            value={displayState}
            onValueChange={v => onUpdateField('prop_state', v)}
            disabled={same_as_client}
          >
            <SelectTrigger id="cj-prop-state" className={same_as_client ? 'opacity-50' : ''}>
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
          <Label htmlFor="cj-prop-zip">Zip</Label>
          <Input
            id="cj-prop-zip"
            value={displayZip}
            onChange={e => onUpdateField('prop_zip', e.target.value)}
            maxLength={10}
            disabled={same_as_client}
            className={same_as_client ? 'opacity-50' : ''}
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label htmlFor="cj-access-info">Access Info</Label>
          <Input
            id="cj-access-info"
            value={access_info}
            onChange={e => onUpdateField('access_info', e.target.value)}
            placeholder="Gate code, lockbox, etc."
          />
        </div>
      </div>

      {/* Site Contacts divider */}
      <div className="mt-4 mb-3 border-t border-border pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
          Site Contacts
        </span>
      </div>
      {site_contacts.map((sc, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mt-2 items-end">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              value={sc.name}
              onChange={e => onUpdateSiteContact(i, 'name', e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input
              type="tel"
              value={sc.phone}
              onChange={e => onUpdateSiteContact(i, 'phone', e.target.value)}
              placeholder="(555) 555-5555"
            />
          </div>
          <div className="space-y-1">
            <Label>Relation</Label>
            <Select value={sc.relation} onValueChange={v => onUpdateSiteContact(i, 'relation', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {SITE_CONTACT_RELATIONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <button
            type="button"
            onClick={() => onRemoveSiteContact(i)}
            className="p-2 text-red-400 hover:text-red-300 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onAddSiteContact}
        className="mt-2 flex items-center gap-1 text-xs text-accent hover:text-accent/80 cursor-pointer"
      >
        <Plus className="size-3" /> Add Site Contact
      </button>
    </section>
  )
}
