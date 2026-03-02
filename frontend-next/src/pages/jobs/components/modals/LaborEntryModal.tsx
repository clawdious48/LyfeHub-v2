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
import { Checkbox } from '@/components/ui/checkbox.js'
import { useCreateJobLabor, useUpdateJobLabor } from '@/api/hooks/index.js'
import { WORK_CATEGORIES } from '@/pages/jobs/utils/jobConstants.js'
import { formatCurrency } from '@/pages/jobs/utils/jobFormatters.js'
import type { ApexJobLabor } from '@/types/index.js'

interface LaborEntryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  initialData?: ApexJobLabor | null
  selectedPhaseId?: string | null
}

const DEFAULTS = {
  employee_name: '',
  work_date: '',
  hours: '',
  hourly_rate: '35',
  work_category: 'other',
  description: '',
  billable: true,
}

export function LaborEntryModal({
  open,
  onOpenChange,
  jobId,
  initialData,
  selectedPhaseId,
}: LaborEntryModalProps) {
  const createLabor = useCreateJobLabor()
  const updateLabor = useUpdateJobLabor()
  const isEdit = !!initialData

  const [form, setForm] = useState(DEFAULTS)

  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm({
          employee_name: initialData.employee_name ?? '',
          work_date: initialData.work_date ?? '',
          hours: String(initialData.hours ?? ''),
          hourly_rate: String(initialData.hourly_rate ?? '35'),
          work_category: initialData.work_category ?? 'other',
          description: initialData.description ?? '',
          billable: initialData.billable === 1,
        })
      } else {
        setForm(DEFAULTS)
      }
    }
  }, [open, initialData])

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const hours = parseFloat(form.hours) || 0
  const rate = parseFloat(form.hourly_rate) || 0
  const totalCost = hours * rate

  const isValid = form.employee_name.trim() !== '' && hours > 0
  const isPending = createLabor.isPending || updateLabor.isPending

  function handleSave() {
    const payload = {
      employee_name: form.employee_name,
      work_date: form.work_date || null,
      hours,
      hourly_rate: rate,
      work_category: form.work_category,
      description: form.description,
      billable: form.billable ? 1 : 0,
      phase_id: selectedPhaseId ?? initialData?.phase_id ?? null,
    }

    if (isEdit) {
      updateLabor.mutate(
        { jobId, entryId: initialData.id, ...payload },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      createLabor.mutate(
        { jobId, ...payload },
        { onSuccess: () => onOpenChange(false) },
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Labor Entry' : 'Add Labor Entry'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="space-y-1">
            <Label htmlFor="labor-employee">Employee Name *</Label>
            <Input
              id="labor-employee"
              value={form.employee_name}
              onChange={(e) => updateField('employee_name', e.target.value)}
              placeholder="Employee name"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="labor-date">Work Date</Label>
            <Input
              id="labor-date"
              type="date"
              value={form.work_date}
              onChange={(e) => updateField('work_date', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="labor-hours">Hours *</Label>
              <Input
                id="labor-hours"
                type="number"
                step="0.25"
                min="0"
                value={form.hours}
                onChange={(e) => updateField('hours', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="labor-rate">Hourly Rate</Label>
              <Input
                id="labor-rate"
                type="number"
                step="0.01"
                value={form.hourly_rate}
                onChange={(e) => updateField('hourly_rate', e.target.value)}
              />
            </div>
          </div>

          <div className="text-lg font-semibold text-text-primary">
            {formatCurrency(totalCost)}
          </div>

          <div className="space-y-1">
            <Label htmlFor="labor-category">Work Category</Label>
            <Select
              value={form.work_category}
              onValueChange={(v) => updateField('work_category', v)}
            >
              <SelectTrigger id="labor-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORK_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="labor-desc">Description</Label>
            <Textarea
              id="labor-desc"
              rows={2}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="labor-billable"
              checked={form.billable}
              onCheckedChange={(checked) => updateField('billable', checked === true)}
            />
            <Label htmlFor="labor-billable">Billable</Label>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button disabled={!isValid || isPending} onClick={handleSave}>
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
