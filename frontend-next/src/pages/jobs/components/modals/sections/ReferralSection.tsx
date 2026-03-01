import { Share2 } from 'lucide-react'
import { Input } from '@/components/ui/input.js'
import { Label } from '@/components/ui/label.js'
import { Textarea } from '@/components/ui/textarea.js'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js'
import { REFERRAL_SOURCES } from '@/pages/jobs/utils/jobConstants.js'

interface ReferralSectionProps {
  referral_source: string
  referred_by: string
  how_heard: string
  internal_notes: string
  onUpdateField: (field: string, value: string) => void
}

export function ReferralSection({
  referral_source,
  referred_by,
  how_heard,
  internal_notes,
  onUpdateField,
}: ReferralSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Share2 className="size-4 text-accent" />
        <h3 className="font-medium text-sm text-text-secondary uppercase tracking-wider">
          Referral & Tracking
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="cj-referral-source">Referral Source</Label>
          <Select value={referral_source} onValueChange={v => onUpdateField('referral_source', v)}>
            <SelectTrigger id="cj-referral-source">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {REFERRAL_SOURCES.map(rs => (
                <SelectItem key={rs.value} value={rs.value}>{rs.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="cj-referred-by">Referred By</Label>
          <Input
            id="cj-referred-by"
            value={referred_by}
            onChange={e => onUpdateField('referred_by', e.target.value)}
            placeholder="Marketer or person name"
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label htmlFor="cj-how-heard">How They Heard</Label>
          <Input
            id="cj-how-heard"
            value={how_heard}
            onChange={e => onUpdateField('how_heard', e.target.value)}
            placeholder="Details..."
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label htmlFor="cj-internal-notes">Internal Notes</Label>
          <Textarea
            id="cj-internal-notes"
            rows={2}
            value={internal_notes}
            onChange={e => onUpdateField('internal_notes', e.target.value)}
            placeholder="Private notes for the team..."
          />
        </div>
      </div>
    </section>
  )
}
