import { AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input.js'
import { Label } from '@/components/ui/label.js'
import { Textarea } from '@/components/ui/textarea.js'
import { Checkbox } from '@/components/ui/checkbox.js'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js'
import { WATER_CATEGORIES, DAMAGE_CLASSES } from '@/pages/jobs/utils/jobConstants.js'

interface LossInfoSectionProps {
  loss_type: string
  loss_date: string
  water_category: string
  damage_class: string
  areas_affected: string
  hazards: string
  loss_description: string
  extraction_required: boolean
  ongoing_intrusion: boolean
  drywall_debris: boolean
  content_manipulation: boolean
  onUpdateField: (field: string, value: string | boolean) => void
}

const HEADER_TOGGLES = [
  { key: 'extraction_required', label: 'Extraction Required' },
  { key: 'ongoing_intrusion', label: 'Ongoing Intrusion' },
  { key: 'drywall_debris', label: 'Drywall Debris' },
  { key: 'content_manipulation', label: 'Content Manipulation' },
] as const

export function LossInfoSection({
  loss_type,
  loss_date,
  water_category,
  damage_class,
  areas_affected,
  hazards,
  loss_description,
  extraction_required,
  ongoing_intrusion,
  drywall_debris,
  content_manipulation,
  onUpdateField,
}: LossInfoSectionProps) {
  const toggleValues: Record<string, boolean> = {
    extraction_required,
    ongoing_intrusion,
    drywall_debris,
    content_manipulation,
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-accent" />
          <h3 className="font-medium text-sm text-text-secondary uppercase tracking-wider">
            Loss Info
          </h3>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {HEADER_TOGGLES.map(toggle => (
            <label key={toggle.key} className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox
                checked={toggleValues[toggle.key]}
                onCheckedChange={checked => onUpdateField(toggle.key, checked === true)}
                className="data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
              />
              <span className="text-xs text-text-muted">{toggle.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label htmlFor="cj-loss-type">Source of Loss</Label>
          <Input
            id="cj-loss-type"
            value={loss_type}
            onChange={e => onUpdateField('loss_type', e.target.value)}
            placeholder="e.g. Supply line break, roof leak..."
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cj-loss-date">Date of Loss</Label>
          <Input
            id="cj-loss-date"
            type="date"
            value={loss_date}
            onChange={e => onUpdateField('loss_date', e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cj-water-category">Water Category</Label>
          <Select value={water_category} onValueChange={v => onUpdateField('water_category', v)}>
            <SelectTrigger id="cj-water-category">
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
          <Label htmlFor="cj-damage-class">Damage Class</Label>
          <Select value={damage_class} onValueChange={v => onUpdateField('damage_class', v)}>
            <SelectTrigger id="cj-damage-class">
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
          <Label htmlFor="cj-areas-affected">Areas Affected</Label>
          <Input
            id="cj-areas-affected"
            value={areas_affected}
            onChange={e => onUpdateField('areas_affected', e.target.value)}
            placeholder="Kitchen, basement, etc."
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label htmlFor="cj-hazards">Hazards</Label>
          <Input
            id="cj-hazards"
            value={hazards}
            onChange={e => onUpdateField('hazards', e.target.value)}
            placeholder="Asbestos, lead, etc."
          />
        </div>
        <div className="col-span-2 lg:col-span-4 space-y-1">
          <Label htmlFor="cj-loss-description">Description</Label>
          <Textarea
            id="cj-loss-description"
            rows={2}
            value={loss_description}
            onChange={e => onUpdateField('loss_description', e.target.value)}
            placeholder="Brief description of the loss..."
          />
        </div>
      </div>
    </section>
  )
}
