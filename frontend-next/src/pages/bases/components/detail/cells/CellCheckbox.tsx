import { Checkbox } from '@/components/ui/checkbox.js'

interface CellCheckboxProps {
  value: unknown
  onChange?: (val: boolean) => void
}

function isTruthy(value: unknown): boolean {
  return value === true || value === 1 || value === 'true' || value === '1'
}

export function CellCheckbox({ value, onChange }: CellCheckboxProps) {
  const checked = isTruthy(value)

  return (
    <div className="flex items-center justify-center h-full">
      <Checkbox
        checked={checked}
        onCheckedChange={(val) => onChange?.(Boolean(val))}
        disabled={!onChange}
      />
    </div>
  )
}
