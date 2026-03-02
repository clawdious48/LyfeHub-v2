import { Plus, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button.js'
import { Checkbox } from '@/components/ui/checkbox.js'
import { Label } from '@/components/ui/label.js'
import { StatusBadge } from '@/components/shared/StatusBadge.js'
import {
  useJobAccounting,
  useToggleJobInvoice,
} from '@/api/hooks/index.js'
import { formatCurrency } from '@/pages/jobs/utils/jobFormatters.js'
import { cn } from '@/lib/utils.js'
import type { ApexJob } from '@/types/index.js'

interface JobAccountingSidebarProps {
  jobId: string
  job: ApexJob
  selectedPhaseId: string | null
  onAddEstimate: () => void
  onRecordPayment: () => void
}

export function JobAccountingSidebar({
  jobId,
  job,
  selectedPhaseId: _selectedPhaseId,
  onAddEstimate,
  onRecordPayment,
}: JobAccountingSidebarProps) {
  const { data: accounting, isLoading } = useJobAccounting(jobId)
  const toggleInvoice = useToggleJobInvoice()

  if (isLoading) {
    return (
      <div className="text-sm text-text-muted animate-pulse py-4">
        Loading accounting...
      </div>
    )
  }

  if (!accounting) return null

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-sm text-text-primary">Accounting</h3>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          label="Total Estimates"
          value={formatCurrency(accounting.total_estimates)}
        />
        <MetricCard
          label="Total Payments"
          value={formatCurrency(accounting.total_payments)}
        />
        <MetricCard
          label="Total Costs"
          value={formatCurrency(accounting.total_costs)}
        />
        <MetricCard
          label="GP Margin"
          value={`${accounting.gp_margin.toFixed(1)}%`}
          className={
            accounting.gp_margin > 0
              ? 'text-green-400'
              : accounting.gp_margin < 0
                ? 'text-red-400'
                : ''
          }
        />
      </div>

      {/* Estimate breakdown */}
      {accounting.estimates.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-text-muted font-medium">Estimates</p>
          {accounting.estimates.map((est) => (
            <div key={est.id} className="flex justify-between items-center text-sm">
              <span className="text-text-secondary capitalize">
                {est.estimate_type}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-text-primary">
                  {formatCurrency(est.amount)}
                </span>
                <StatusBadge status={est.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onAddEstimate}>
          <Plus className="size-4" />
          Add Estimate
        </Button>
        <Button variant="outline" size="sm" onClick={onRecordPayment}>
          <DollarSign className="size-4" />
          Record Payment
        </Button>
      </div>

      {/* Ready to Invoice */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="ready-to-invoice"
          checked={!!job.ready_to_invoice}
          onCheckedChange={(checked) =>
            toggleInvoice.mutate({
              id: job.id,
              ready_to_invoice: !!checked,
            })
          }
        />
        <Label htmlFor="ready-to-invoice" className="text-sm cursor-pointer">
          Ready to Invoice
        </Label>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className="rounded border border-border p-3 text-center">
      <p className="text-xs text-text-muted">{label}</p>
      <p className={cn('text-lg font-semibold text-text-primary', className)}>
        {value}
      </p>
    </div>
  )
}
