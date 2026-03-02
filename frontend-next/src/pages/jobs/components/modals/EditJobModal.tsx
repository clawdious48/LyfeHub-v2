import { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js'
import { Textarea } from '@/components/ui/textarea.js'
import { Separator } from '@/components/ui/separator.js'
import { Checkbox } from '@/components/ui/checkbox.js'
import { Badge } from '@/components/ui/badge.js'
import { useUpdateJob } from '@/api/hooks/index.js'
import type { ApexJob, UpdateApexJobData } from '@/types/index.js'
import {
  JOB_TYPE_CODES,
  LOSS_TYPES,
  CLIENT_RELATIONS,
  PROPERTY_TYPES,
  WATER_CATEGORIES,
  DAMAGE_CLASSES,
} from '@/pages/jobs/utils/jobConstants.js'

interface EditJobModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: ApexJob
}

function buildFormFromJob(job: ApexJob) {
  return {
    client_name: job.client_name ?? '',
    client_phone: job.client_phone ?? '',
    client_email: job.client_email ?? '',
    client_street: job.client_street ?? '',
    client_city: job.client_city ?? '',
    client_state: job.client_state ?? '',
    client_zip: job.client_zip ?? '',
    client_unit: job.client_unit ?? '',
    client_relation: job.client_relation ?? '',
    prop_street: job.prop_street ?? '',
    prop_city: job.prop_city ?? '',
    prop_state: job.prop_state ?? '',
    prop_zip: job.prop_zip ?? '',
    prop_unit: job.prop_unit ?? '',
    prop_type: job.prop_type ?? '',
    loss_type: job.loss_type ?? '',
    loss_date: job.loss_date ?? '',
    water_category: job.water_category ?? '',
    damage_class: job.damage_class ?? '',
    areas_affected: job.areas_affected ?? '',
    loss_description: job.loss_description ?? '',
    scope_notes: job.scope_notes ?? '',
    ins_carrier: job.ins_carrier ?? '',
    ins_claim: job.ins_claim ?? '',
    ins_policy: job.ins_policy ?? '',
    deductible: job.deductible ? String(job.deductible) : '',
    adj_name: job.adj_name ?? '',
    adj_phone: job.adj_phone ?? '',
    adj_email: job.adj_email ?? '',
  }
}

export function EditJobModal({ open, onOpenChange, job }: EditJobModalProps) {
  const [form, setForm] = useState(() => buildFormFromJob(job))
  const [sameAsClient, setSameAsClient] = useState(job.same_as_client === 1)
  const updateJob = useUpdateJob()

  useEffect(() => {
    if (open) {
      setForm(buildFormFromJob(job))
      setSameAsClient(job.same_as_client === 1)
    }
  }, [open, job])

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleSubmit() {
    const data: UpdateApexJobData & { id: string } = {
      id: job.id,
      client_name: form.client_name,
      client_phone: form.client_phone,
      client_email: form.client_email,
      client_street: form.client_street,
      client_city: form.client_city,
      client_state: form.client_state,
      client_zip: form.client_zip,
      client_unit: form.client_unit,
      client_relation: form.client_relation,
      same_as_client: sameAsClient ? 1 : 0,
      prop_street: sameAsClient ? form.client_street : form.prop_street,
      prop_city: sameAsClient ? form.client_city : form.prop_city,
      prop_state: sameAsClient ? form.client_state : form.prop_state,
      prop_zip: sameAsClient ? form.client_zip : form.prop_zip,
      prop_unit: sameAsClient ? form.client_unit : form.prop_unit,
      prop_type: form.prop_type,
      loss_type: form.loss_type,
      loss_date: form.loss_date,
      water_category: form.water_category,
      damage_class: form.damage_class,
      areas_affected: form.areas_affected,
      loss_description: form.loss_description,
      scope_notes: form.scope_notes,
      ins_carrier: form.ins_carrier,
      ins_claim: form.ins_claim,
      ins_policy: form.ins_policy,
      deductible: form.deductible ? Number(form.deductible) : 0,
      adj_name: form.adj_name,
      adj_phone: form.adj_phone,
      adj_email: form.adj_email,
    }

    updateJob.mutate(data, {
      onSuccess: () => {
        onOpenChange(false)
      },
    })
  }

  const existingTypeCodes = (job.phases ?? []).map(p => p.job_type_code)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Job</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* -- Client Info -- */}
          <section>
            <h3 className="font-medium text-sm text-text-secondary uppercase tracking-wider mb-2">Client Info</h3>
            <Separator className="mb-3" />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit_client_name">Client Name *</Label>
                <Input
                  id="edit_client_name"
                  value={form.client_name}
                  onChange={e => updateField('client_name', e.target.value)}
                  placeholder="Client name"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit_client_phone">Phone *</Label>
                <Input
                  id="edit_client_phone"
                  type="tel"
                  value={form.client_phone}
                  onChange={e => updateField('client_phone', e.target.value)}
                  placeholder="(555) 555-5555"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="edit_client_email">Email</Label>
                <Input
                  id="edit_client_email"
                  type="email"
                  value={form.client_email}
                  onChange={e => updateField('client_email', e.target.value)}
                  placeholder="client@example.com"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="edit_client_street">Street</Label>
                <Input
                  id="edit_client_street"
                  value={form.client_street}
                  onChange={e => updateField('client_street', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit_client_unit">Unit/Suite</Label>
                <Input
                  id="edit_client_unit"
                  value={form.client_unit}
                  onChange={e => updateField('client_unit', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit_client_relation">Relation</Label>
                <Select value={form.client_relation} onValueChange={v => updateField('client_relation', v)}>
                  <SelectTrigger id="edit_client_relation">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_RELATIONS.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="space-y-1">
                <Label htmlFor="edit_client_city">City</Label>
                <Input
                  id="edit_client_city"
                  value={form.client_city}
                  onChange={e => updateField('client_city', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit_client_state">State</Label>
                <Input
                  id="edit_client_state"
                  value={form.client_state}
                  onChange={e => updateField('client_state', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit_client_zip">Zip</Label>
                <Input
                  id="edit_client_zip"
                  value={form.client_zip}
                  onChange={e => updateField('client_zip', e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* -- Property Info -- */}
          <section>
            <h3 className="font-medium text-sm text-text-secondary uppercase tracking-wider mb-2">Property Info</h3>
            <Separator className="mb-3" />
            <div className="flex items-center gap-2 mb-3">
              <Checkbox
                id="edit_same_as_client"
                checked={sameAsClient}
                onCheckedChange={checked => setSameAsClient(checked === true)}
              />
              <Label htmlFor="edit_same_as_client">Same as client address</Label>
            </div>
            {!sameAsClient && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <Label htmlFor="edit_prop_street">Street</Label>
                    <Input
                      id="edit_prop_street"
                      value={form.prop_street}
                      onChange={e => updateField('prop_street', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit_prop_unit">Unit/Suite</Label>
                    <Input
                      id="edit_prop_unit"
                      value={form.prop_unit}
                      onChange={e => updateField('prop_unit', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit_prop_type">Property Type</Label>
                    <Select value={form.prop_type} onValueChange={v => updateField('prop_type', v)}>
                      <SelectTrigger id="edit_prop_type">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PROPERTY_TYPES.map(pt => (
                          <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit_prop_city">City</Label>
                    <Input
                      id="edit_prop_city"
                      value={form.prop_city}
                      onChange={e => updateField('prop_city', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit_prop_state">State</Label>
                    <Input
                      id="edit_prop_state"
                      value={form.prop_state}
                      onChange={e => updateField('prop_state', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit_prop_zip">Zip</Label>
                    <Input
                      id="edit_prop_zip"
                      value={form.prop_zip}
                      onChange={e => updateField('prop_zip', e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}
          </section>

          {/* -- Loss Info -- */}
          <section>
            <h3 className="font-medium text-sm text-text-secondary uppercase tracking-wider mb-2">Loss Info</h3>
            <Separator className="mb-3" />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit_loss_type">Loss Type</Label>
                <Select value={form.loss_type} onValueChange={v => updateField('loss_type', v)}>
                  <SelectTrigger id="edit_loss_type">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {LOSS_TYPES.map(lt => (
                      <SelectItem key={lt.value} value={lt.value}>{lt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit_loss_date">Loss Date</Label>
                <Input
                  id="edit_loss_date"
                  type="date"
                  value={form.loss_date}
                  onChange={e => updateField('loss_date', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit_water_category">Water Category</Label>
                <Select value={form.water_category} onValueChange={v => updateField('water_category', v)}>
                  <SelectTrigger id="edit_water_category">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {WATER_CATEGORIES.map(wc => (
                      <SelectItem key={wc.value} value={wc.value}>{wc.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit_damage_class">Damage Class</Label>
                <Select value={form.damage_class} onValueChange={v => updateField('damage_class', v)}>
                  <SelectTrigger id="edit_damage_class">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DAMAGE_CLASSES.map(dc => (
                      <SelectItem key={dc.value} value={dc.value}>{dc.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="edit_areas_affected">Areas Affected</Label>
                <Input
                  id="edit_areas_affected"
                  value={form.areas_affected}
                  onChange={e => updateField('areas_affected', e.target.value)}
                  placeholder="e.g. Kitchen, Bathroom, Basement"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="edit_loss_description">Loss Description</Label>
                <Textarea
                  id="edit_loss_description"
                  rows={3}
                  value={form.loss_description}
                  onChange={e => updateField('loss_description', e.target.value)}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="edit_scope_notes">Scope Notes</Label>
                <Textarea
                  id="edit_scope_notes"
                  rows={2}
                  value={form.scope_notes}
                  onChange={e => updateField('scope_notes', e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* -- Insurance -- */}
          <section>
            <h3 className="font-medium text-sm text-text-secondary uppercase tracking-wider mb-2">Insurance</h3>
            <Separator className="mb-3" />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit_ins_carrier">Carrier</Label>
                <Input
                  id="edit_ins_carrier"
                  value={form.ins_carrier}
                  onChange={e => updateField('ins_carrier', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit_ins_claim">Claim #</Label>
                <Input
                  id="edit_ins_claim"
                  value={form.ins_claim}
                  onChange={e => updateField('ins_claim', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit_ins_policy">Policy #</Label>
                <Input
                  id="edit_ins_policy"
                  value={form.ins_policy}
                  onChange={e => updateField('ins_policy', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit_deductible">Deductible</Label>
                <Input
                  id="edit_deductible"
                  type="number"
                  step="0.01"
                  value={form.deductible}
                  onChange={e => updateField('deductible', e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* -- Adjuster -- */}
          <section>
            <h3 className="font-medium text-sm text-text-secondary uppercase tracking-wider mb-2">Adjuster</h3>
            <Separator className="mb-3" />
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1 space-y-1">
                <Label htmlFor="edit_adj_name">Name</Label>
                <Input
                  id="edit_adj_name"
                  value={form.adj_name}
                  onChange={e => updateField('adj_name', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit_adj_phone">Phone</Label>
                <Input
                  id="edit_adj_phone"
                  type="tel"
                  value={form.adj_phone}
                  onChange={e => updateField('adj_phone', e.target.value)}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="edit_adj_email">Email</Label>
                <Input
                  id="edit_adj_email"
                  type="email"
                  value={form.adj_email}
                  onChange={e => updateField('adj_email', e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* -- Job Types (read-only) -- */}
          <section>
            <h3 className="font-medium text-sm text-text-secondary uppercase tracking-wider mb-2">Job Types</h3>
            <Separator className="mb-3" />
            <div className="flex flex-wrap gap-2">
              {existingTypeCodes.length > 0 ? (
                existingTypeCodes.map(code => {
                  const found = JOB_TYPE_CODES.find(jt => jt.code === code)
                  return (
                    <Badge key={code} variant="secondary">
                      {code} - {found?.label ?? code}
                    </Badge>
                  )
                })
              ) : (
                <span className="text-sm text-text-muted">No phases</span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-2">
              Job types cannot be changed after creation because phases are already created.
            </p>
          </section>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!form.client_name.trim() || !form.client_phone.trim() || updateJob.isPending}
            onClick={handleSubmit}
          >
            {updateJob.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
