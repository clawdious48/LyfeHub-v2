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
import { Checkbox } from '@/components/ui/checkbox.js'
import { useCreateJobReceipt, useUpdateJobReceipt } from '@/api/hooks/index.js'
import { EXPENSE_CATEGORIES, PAID_BY_OPTIONS } from '@/pages/jobs/utils/jobConstants.js'
import type { ApexJobReceipt } from '@/types/index.js'

interface ReceiptModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  initialData?: ApexJobReceipt | null
  selectedPhaseId?: string | null
}

const DEFAULTS = {
  amount: '',
  expense_category: 'materials',
  description: '',
  vendor: '',
  paid_by: 'company_card',
  reimbursable: false,
  expense_date: '',
}

export function ReceiptModal({
  open,
  onOpenChange,
  jobId,
  initialData,
  selectedPhaseId,
}: ReceiptModalProps) {
  const createReceipt = useCreateJobReceipt()
  const updateReceipt = useUpdateJobReceipt()
  const isEdit = !!initialData

  const [form, setForm] = useState(DEFAULTS)

  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm({
          amount: String(initialData.amount ?? ''),
          expense_category: initialData.expense_category ?? 'materials',
          description: initialData.description ?? '',
          vendor: initialData.vendor ?? '',
          paid_by: initialData.paid_by ?? 'company_card',
          reimbursable: initialData.reimbursable === 1,
          expense_date: initialData.expense_date ?? '',
        })
      } else {
        setForm(DEFAULTS)
      }
    }
  }, [open, initialData])

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const amount = parseFloat(form.amount) || 0
  const isValid = amount > 0
  const isPending = createReceipt.isPending || updateReceipt.isPending

  function handleSave() {
    const payload = {
      amount,
      expense_category: form.expense_category,
      description: form.description,
      vendor: form.vendor,
      paid_by: form.paid_by,
      reimbursable: form.reimbursable ? 1 : 0,
      expense_date: form.expense_date || null,
      phase_id: selectedPhaseId ?? initialData?.phase_id ?? null,
    }

    if (isEdit) {
      updateReceipt.mutate(
        { jobId, receiptId: initialData.id, ...payload },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      createReceipt.mutate(
        { jobId, ...payload },
        { onSuccess: () => onOpenChange(false) },
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Receipt' : 'Add Receipt'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="space-y-1">
            <Label htmlFor="receipt-amount">Amount *</Label>
            <Input
              id="receipt-amount"
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => updateField('amount', e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="receipt-category">Expense Category</Label>
            <Select
              value={form.expense_category}
              onValueChange={(v) => updateField('expense_category', v)}
            >
              <SelectTrigger id="receipt-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="receipt-desc">Description</Label>
            <Input
              id="receipt-desc"
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="receipt-vendor">Vendor</Label>
            <Input
              id="receipt-vendor"
              value={form.vendor}
              onChange={(e) => updateField('vendor', e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="receipt-paid-by">Paid By</Label>
            <Select
              value={form.paid_by}
              onValueChange={(v) => updateField('paid_by', v)}
            >
              <SelectTrigger id="receipt-paid-by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAID_BY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="receipt-reimbursable"
              checked={form.reimbursable}
              onCheckedChange={(checked) => updateField('reimbursable', checked === true)}
            />
            <Label htmlFor="receipt-reimbursable">Reimbursable</Label>
          </div>

          <div className="space-y-1">
            <Label htmlFor="receipt-date">Expense Date</Label>
            <Input
              id="receipt-date"
              type="date"
              value={form.expense_date}
              onChange={(e) => updateField('expense_date', e.target.value)}
            />
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
