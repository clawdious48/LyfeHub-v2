import { Shield, X, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input.js'
import { Label } from '@/components/ui/label.js'
import type { AdditionalContact } from '@/types/index.js'

interface InsuranceInfoSectionProps {
  ins_carrier: string
  ins_claim: string
  ins_policy: string
  deductible: string
  adj_name: string
  adj_phone: string
  adj_email: string
  additional_adjusters: AdditionalContact[]
  onUpdateField: (field: string, value: string) => void
  onAddAdjuster: () => void
  onRemoveAdjuster: (index: number) => void
  onUpdateAdjuster: (index: number, field: keyof AdditionalContact, value: string) => void
}

export function InsuranceInfoSection({
  ins_carrier,
  ins_claim,
  ins_policy,
  deductible,
  adj_name,
  adj_phone,
  adj_email,
  additional_adjusters,
  onUpdateField,
  onAddAdjuster,
  onRemoveAdjuster,
  onUpdateAdjuster,
}: InsuranceInfoSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Shield className="size-4 text-accent" />
        <h3 className="font-medium text-sm text-text-secondary uppercase tracking-wider">
          Insurance Info
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label htmlFor="cj-ins-carrier">Carrier</Label>
          <Input
            id="cj-ins-carrier"
            value={ins_carrier}
            onChange={e => onUpdateField('ins_carrier', e.target.value)}
            placeholder="Insurance company"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cj-ins-claim">Claim #</Label>
          <Input
            id="cj-ins-claim"
            value={ins_claim}
            onChange={e => onUpdateField('ins_claim', e.target.value)}
            placeholder="Claim number"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cj-ins-policy">Policy #</Label>
          <Input
            id="cj-ins-policy"
            value={ins_policy}
            onChange={e => onUpdateField('ins_policy', e.target.value)}
            placeholder="Policy number"
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label htmlFor="cj-deductible">Deductible</Label>
          <Input
            id="cj-deductible"
            type="number"
            step="0.01"
            min="0"
            value={deductible}
            onChange={e => onUpdateField('deductible', e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Adjuster divider */}
      <div className="mt-4 mb-3 border-t border-border pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
          Adjuster
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label htmlFor="cj-adj-name">Adjuster Name</Label>
          <Input
            id="cj-adj-name"
            value={adj_name}
            onChange={e => onUpdateField('adj_name', e.target.value)}
            placeholder="Full name"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cj-adj-phone">Adjuster Phone</Label>
          <Input
            id="cj-adj-phone"
            type="tel"
            value={adj_phone}
            onChange={e => onUpdateField('adj_phone', e.target.value)}
            placeholder="(555) 555-5555"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cj-adj-email">Adjuster Email</Label>
          <Input
            id="cj-adj-email"
            type="email"
            value={adj_email}
            onChange={e => onUpdateField('adj_email', e.target.value)}
            placeholder="adjuster@email.com"
          />
        </div>
      </div>

      {/* Additional adjusters */}
      {additional_adjusters.map((aa, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mt-2 items-end">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              value={aa.name}
              onChange={e => onUpdateAdjuster(i, 'name', e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input
              type="tel"
              value={aa.phone}
              onChange={e => onUpdateAdjuster(i, 'phone', e.target.value)}
              placeholder="(555) 555-5555"
            />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input
              type="email"
              value={aa.email}
              onChange={e => onUpdateAdjuster(i, 'email', e.target.value)}
              placeholder="adjuster@email.com"
            />
          </div>
          <button
            type="button"
            onClick={() => onRemoveAdjuster(i)}
            className="p-2 text-red-400 hover:text-red-300 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onAddAdjuster}
        className="mt-2 flex items-center gap-1 text-xs text-accent hover:text-accent/80 cursor-pointer"
      >
        <Plus className="size-3" /> Add Adjuster
      </button>
    </section>
  )
}
