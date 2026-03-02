import { useState, useEffect, useMemo } from 'react'
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
import { useJobEstimates, useCreateJobEstimate } from '@/api/hooks/index.js'
import { ESTIMATE_TYPES } from '@/pages/jobs/utils/jobConstants.js'

interface AddEstimateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  selectedPhaseId?: string | null
}

export function AddEstimateModal({ open, onOpenChange, jobId, selectedPhaseId }: AddEstimateModalProps) {
  const [estimateType, setEstimateType] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const { data: estimates } = useJobEstimates(jobId)
  const createEstimate = useCreateJobEstimate()

  useEffect(() => {
    if (open) {
      setEstimateType('')
      setAmount('')
      setNotes('')
    }
  }, [open])

  const version = useMemo(() => {
    if (!estimateType || !estimates) return 1
    const matching = estimates.filter(e => e.estimate_type === estimateType)
    if (matching.length === 0) return 1
    return Math.max(...matching.map(e => e.version)) + 1
  }, [estimateType, estimates])

  function handleSubmit() {
    createEstimate.mutate(
      {
        jobId,
        estimate_type: estimateType,
        amount: Number(amount),
        version,
        notes: notes || undefined,
        phase_id: selectedPhaseId ?? undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      },
    )
  }

  const isValid = estimateType !== '' && amount !== '' && Number(amount) > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Estimate</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="est_type">Estimate Type *</Label>
            <Select value={estimateType} onValueChange={setEstimateType}>
              <SelectTrigger id="est_type">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {ESTIMATE_TYPES.map(et => (
                  <SelectItem key={et.value} value={et.value}>{et.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {estimateType && (
            <p className="text-sm text-text-muted">Version: {version}</p>
          )}

          <div className="space-y-1">
            <Label htmlFor="est_amount">Amount *</Label>
            <Input
              id="est_amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="est_notes">Notes</Label>
            <Textarea
              id="est_notes"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!isValid || createEstimate.isPending}
            onClick={handleSubmit}
          >
            {createEstimate.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
