import { Label } from '@/components/ui/label.js'
import { Input } from '@/components/ui/input.js'
import { useBases } from '@/api/hooks/index.js'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js'

interface RelationConfigValue {
  relatedBaseId: string
  createReverse: boolean
  reverseName: string
}

interface RelationConfigProps {
  config: RelationConfigValue
  onChange: (config: RelationConfigValue) => void
  currentBaseId: string
}

export function RelationConfig({ config, onChange, currentBaseId }: RelationConfigProps) {
  const { data: bases } = useBases()
  const availableBases = (bases ?? []).filter(b => b.id !== currentBaseId)

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Target Base</Label>
        <Select
          value={config.relatedBaseId}
          onValueChange={value => onChange({ ...config, relatedBaseId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a base..." />
          </SelectTrigger>
          <SelectContent>
            {availableBases.map(base => (
              <SelectItem key={base.id} value={base.id}>
                {base.icon} {base.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <label className="flex items-center gap-2 cursor-pointer text-sm">
        <input
          type="checkbox"
          checked={config.createReverse}
          onChange={e => onChange({ ...config, createReverse: e.target.checked })}
          className="rounded"
        />
        Create reverse relation
      </label>

      {config.createReverse && (
        <div className="space-y-1">
          <Label>Reverse Relation Name</Label>
          <Input
            value={config.reverseName}
            onChange={e => onChange({ ...config, reverseName: e.target.value })}
            placeholder="e.g. Related Items"
          />
        </div>
      )}
    </div>
  )
}
