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
import { useJobEstimates, useCreateJobPayment } from '@/api/hooks/index.js'
import { PAYMENT_METHODS, PAYMENT_TYPES } from '@/pages/jobs/utils/jobConstants.js'
import { formatCurrency } from '@/pages/jobs/utils/jobFormatters.js'

interface RecordPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  selectedPhaseId?: string | null
}

const INITIAL_FORM = {
  amount: '',
  payment_method: '',
  payment_type: '',
  check_number: '',
  received_date: '',
  deposited_date: '',
  invoice_number: '',
  estimate_id: '',
  notes: '',
}

export function RecordPaymentModal({ open, onOpenChange, jobId, selectedPhaseId }: RecordPaymentModalProps) {
  const [form, setForm] = useState(INITIAL_FORM)
  const { data: estimates } = useJobEstimates(jobId)
  const createPayment = useCreateJobPayment()

  useEffect(() => {
    if (open) {
      setForm(INITIAL_FORM)
    }
  }, [open])

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleSubmit() {
    createPayment.mutate(
      {
        jobId,
        amount: Number(form.amount),
        payment_method: form.payment_method,
        payment_type: form.payment_type,
        check_number: form.check_number || undefined,
        received_date: form.received_date || undefined,
        deposited_date: form.deposited_date || undefined,
        invoice_number: form.invoice_number || undefined,
        estimate_id: form.estimate_id || undefined,
        notes: form.notes || undefined,
        phase_id: selectedPhaseId ?? undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      },
    )
  }

  const isValid = form.amount !== '' && Number(form.amount) > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="pay_amount">Amount *</Label>
            <Input
              id="pay_amount"
              type="number"
              step="0.01"
              value={form.amount}
              onChange={e => updateField('amount', e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="pay_method">Payment Method</Label>
              <Select value={form.payment_method} onValueChange={v => updateField('payment_method', v)}>
                <SelectTrigger id="pay_method">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(pm => (
                    <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pay_type">Payment Type</Label>
              <Select value={form.payment_type} onValueChange={v => updateField('payment_type', v)}>
                <SelectTrigger id="pay_type">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPES.map(pt => (
                    <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.payment_method === 'check' && (
            <div className="space-y-1">
              <Label htmlFor="pay_check_number">Check Number</Label>
              <Input
                id="pay_check_number"
                value={form.check_number}
                onChange={e => updateField('check_number', e.target.value)}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="pay_received_date">Received Date</Label>
              <Input
                id="pay_received_date"
                type="date"
                value={form.received_date}
                onChange={e => updateField('received_date', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pay_deposited_date">Deposited Date</Label>
              <Input
                id="pay_deposited_date"
                type="date"
                value={form.deposited_date}
                onChange={e => updateField('deposited_date', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="pay_invoice">Invoice Number</Label>
            <Input
              id="pay_invoice"
              value={form.invoice_number}
              onChange={e => updateField('invoice_number', e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="pay_estimate">Linked Estimate</Label>
            <Select value={form.estimate_id} onValueChange={v => updateField('estimate_id', v)}>
              <SelectTrigger id="pay_estimate">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {(estimates ?? []).map(est => (
                  <SelectItem key={est.id} value={est.id}>
                    {est.estimate_type} v{est.version} - {formatCurrency(est.amount)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="pay_notes">Notes</Label>
            <Textarea
              id="pay_notes"
              rows={2}
              value={form.notes}
              onChange={e => updateField('notes', e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!isValid || createPayment.isPending}
            onClick={handleSubmit}
          >
            {createPayment.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
