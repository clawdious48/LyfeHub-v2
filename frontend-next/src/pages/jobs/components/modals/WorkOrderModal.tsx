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
import { useCreateJobWorkOrder, useUpdateJobWorkOrder } from '@/api/hooks/index.js'
import { WORK_ORDER_STATUSES } from '@/pages/jobs/utils/jobConstants.js'
import type { ApexJobWorkOrder } from '@/types/index.js'

interface WorkOrderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  initialData?: ApexJobWorkOrder | null
  selectedPhaseId?: string | null
}

const DEFAULTS = {
  wo_number: '',
  title: '',
  description: '',
  budget_amount: '',
  status: 'draft',
}

export function WorkOrderModal({
  open,
  onOpenChange,
  jobId,
  initialData,
  selectedPhaseId,
}: WorkOrderModalProps) {
  const createWO = useCreateJobWorkOrder()
  const updateWO = useUpdateJobWorkOrder()
  const isEdit = !!initialData

  const [form, setForm] = useState(DEFAULTS)

  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm({
          wo_number: initialData.wo_number ?? '',
          title: initialData.title ?? '',
          description: initialData.description ?? '',
          budget_amount: String(initialData.budget_amount ?? ''),
          status: initialData.status ?? 'draft',
        })
      } else {
        setForm(DEFAULTS)
      }
    }
  }, [open, initialData])

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const isValid = form.title.trim() !== ''
  const isPending = createWO.isPending || updateWO.isPending

  function handleSave() {
    const budgetAmount = parseFloat(form.budget_amount) || 0

    const payload = {
      wo_number: form.wo_number,
      title: form.title,
      description: form.description,
      budget_amount: budgetAmount,
      status: form.status as ApexJobWorkOrder['status'],
      phase_id: selectedPhaseId ?? initialData?.phase_id ?? null,
    }

    if (isEdit) {
      updateWO.mutate(
        { jobId, woId: initialData.id, ...payload },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      createWO.mutate(
        { jobId, ...payload },
        { onSuccess: () => onOpenChange(false) },
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Work Order' : 'Add Work Order'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="space-y-1">
            <Label htmlFor="wo-number">WO Number</Label>
            <Input
              id="wo-number"
              value={form.wo_number}
              onChange={(e) => updateField('wo_number', e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="wo-title">Title *</Label>
            <Input
              id="wo-title"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Work order title"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="wo-desc">Description</Label>
            <Textarea
              id="wo-desc"
              rows={3}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="wo-budget">Budget Amount</Label>
            <Input
              id="wo-budget"
              type="number"
              step="0.01"
              value={form.budget_amount}
              onChange={(e) => updateField('budget_amount', e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="wo-status">Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => updateField('status', v)}
            >
              <SelectTrigger id="wo-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORK_ORDER_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
