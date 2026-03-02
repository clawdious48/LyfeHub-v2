import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button.js'
import { Badge } from '@/components/ui/badge.js'
import { StatusBadge } from '@/components/shared/StatusBadge.js'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog.js'
import {
  useJobLabor,
  useDeleteJobLabor,
  useJobReceipts,
  useDeleteJobReceipt,
  useJobWorkOrders,
  useDeleteJobWorkOrder,
  useJobEstimates,
} from '@/api/hooks/index.js'
import { formatCurrency } from '@/pages/jobs/utils/jobFormatters.js'
import { ExpenseSection } from './ExpenseSection.js'
import { LaborEntryModal } from '../../modals/LaborEntryModal.js'
import { ReceiptModal } from '../../modals/ReceiptModal.js'
import { WorkOrderModal } from '../../modals/WorkOrderModal.js'
import type { ApexJobLabor, ApexJobReceipt, ApexJobWorkOrder } from '@/types/index.js'

interface JobExpensesTabProps {
  jobId: string
  selectedPhaseId: string | null
}

export function JobExpensesTab({ jobId, selectedPhaseId }: JobExpensesTabProps) {
  const { data: labor } = useJobLabor(jobId)
  const { data: receipts } = useJobReceipts(jobId)
  const { data: workOrders } = useJobWorkOrders(jobId)
  const { data: estimates } = useJobEstimates(jobId)

  const deleteLabor = useDeleteJobLabor()
  const deleteReceipt = useDeleteJobReceipt()
  const deleteWorkOrder = useDeleteJobWorkOrder()

  // Modal state
  const [laborModalOpen, setLaborModalOpen] = useState(false)
  const [editingLabor, setEditingLabor] = useState<ApexJobLabor | null>(null)

  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [editingReceipt, setEditingReceipt] = useState<ApexJobReceipt | null>(null)

  const [woModalOpen, setWoModalOpen] = useState(false)
  const [editingWO, setEditingWO] = useState<ApexJobWorkOrder | null>(null)

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'labor' | 'receipt' | 'workOrder'
    id: string
  } | null>(null)

  // Filter by phase
  const filteredLabor = (labor ?? []).filter(
    (l) => !selectedPhaseId || l.phase_id === selectedPhaseId,
  )
  const filteredReceipts = (receipts ?? []).filter(
    (r) => !selectedPhaseId || r.phase_id === selectedPhaseId,
  )
  const filteredWOs = (workOrders ?? []).filter(
    (w) => !selectedPhaseId || w.phase_id === selectedPhaseId,
  )
  const filteredEstimates = (estimates ?? []).filter(
    (e) => !selectedPhaseId || e.phase_id === selectedPhaseId,
  )

  // Totals
  const laborTotal = filteredLabor.reduce((sum, l) => sum + l.hours * l.hourly_rate, 0)
  const receiptsTotal = filteredReceipts.reduce((sum, r) => sum + r.amount, 0)
  const woTotal = filteredWOs.reduce((sum, w) => sum + (w.budget_amount ?? 0), 0)
  const estimatesTotal = filteredEstimates.reduce((sum, e) => sum + e.amount, 0)

  function openLaborEdit(entry: ApexJobLabor) {
    setEditingLabor(entry)
    setLaborModalOpen(true)
  }

  function openLaborAdd() {
    setEditingLabor(null)
    setLaborModalOpen(true)
  }

  function openReceiptEdit(entry: ApexJobReceipt) {
    setEditingReceipt(entry)
    setReceiptModalOpen(true)
  }

  function openReceiptAdd() {
    setEditingReceipt(null)
    setReceiptModalOpen(true)
  }

  function openWOEdit(entry: ApexJobWorkOrder) {
    setEditingWO(entry)
    setWoModalOpen(true)
  }

  function openWOAdd() {
    setEditingWO(null)
    setWoModalOpen(true)
  }

  function handleDelete() {
    if (!deleteTarget) return
    const { type, id } = deleteTarget

    const onSuccess = () => setDeleteTarget(null)

    if (type === 'labor') {
      deleteLabor.mutate({ jobId, entryId: id }, { onSuccess })
    } else if (type === 'receipt') {
      deleteReceipt.mutate({ jobId, receiptId: id }, { onSuccess })
    } else {
      deleteWorkOrder.mutate({ jobId, woId: id }, { onSuccess })
    }
  }

  const isDeleting =
    deleteLabor.isPending || deleteReceipt.isPending || deleteWorkOrder.isPending

  return (
    <div>
      {/* Labor Section */}
      <ExpenseSection
        title="Labor"
        count={filteredLabor.length}
        total={laborTotal}
        onAdd={openLaborAdd}
        defaultExpanded
      >
        {filteredLabor.map((entry) => (
          <div
            key={entry.id}
            className="flex justify-between items-center py-2 border-b border-border/50 cursor-pointer hover:bg-muted/50 px-1 rounded"
            onClick={() => openLaborEdit(entry)}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-sm text-text-primary truncate">
                {entry.employee_name}
              </span>
              <Badge variant="secondary" className="capitalize text-xs">
                {entry.work_category.replace(/_/g, ' ')}
              </Badge>
              <span className="text-xs text-text-muted whitespace-nowrap">
                {entry.hours} hrs
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-medium text-text-secondary">
                {formatCurrency(entry.hours * entry.hourly_rate)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteTarget({ type: 'labor', id: entry.id })
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
        {filteredLabor.length === 0 && (
          <p className="text-sm text-text-muted text-center py-2">No labor entries</p>
        )}
      </ExpenseSection>

      {/* Receipts Section */}
      <ExpenseSection
        title="Receipts"
        count={filteredReceipts.length}
        total={receiptsTotal}
        onAdd={openReceiptAdd}
      >
        {filteredReceipts.map((receipt) => (
          <div
            key={receipt.id}
            className="flex justify-between items-center py-2 border-b border-border/50 cursor-pointer hover:bg-muted/50 px-1 rounded"
            onClick={() => openReceiptEdit(receipt)}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-sm text-text-primary truncate">
                {receipt.vendor || receipt.description || 'Receipt'}
              </span>
              <Badge variant="secondary" className="capitalize text-xs">
                {receipt.expense_category.replace(/_/g, ' ')}
              </Badge>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-medium text-text-secondary">
                {formatCurrency(receipt.amount)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteTarget({ type: 'receipt', id: receipt.id })
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
        {filteredReceipts.length === 0 && (
          <p className="text-sm text-text-muted text-center py-2">No receipts</p>
        )}
      </ExpenseSection>

      {/* Work Orders Section */}
      <ExpenseSection
        title="Work Orders"
        count={filteredWOs.length}
        total={woTotal}
        onAdd={openWOAdd}
      >
        {filteredWOs.map((wo) => (
          <div
            key={wo.id}
            className="flex justify-between items-center py-2 border-b border-border/50 cursor-pointer hover:bg-muted/50 px-1 rounded"
            onClick={() => openWOEdit(wo)}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-sm text-text-primary truncate">
                {wo.wo_number ? `${wo.wo_number} - ` : ''}{wo.title}
              </span>
              <StatusBadge status={wo.status} />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-medium text-text-secondary">
                {formatCurrency(wo.budget_amount)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteTarget({ type: 'workOrder', id: wo.id })
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
        {filteredWOs.length === 0 && (
          <p className="text-sm text-text-muted text-center py-2">No work orders</p>
        )}
      </ExpenseSection>

      {/* Estimates Section (read-only) */}
      <ExpenseSection
        title="Estimates"
        count={filteredEstimates.length}
        total={estimatesTotal}
      >
        {filteredEstimates.map((est) => (
          <div
            key={est.id}
            className="flex justify-between items-center py-2 border-b border-border/50 px-1"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-sm text-text-primary capitalize">
                {est.estimate_type}
              </span>
              <span className="text-xs text-text-muted">v{est.version}</span>
              <StatusBadge status={est.status} />
            </div>
            <span className="text-sm font-medium text-text-secondary shrink-0">
              {formatCurrency(est.amount)}
            </span>
          </div>
        ))}
        {filteredEstimates.length === 0 && (
          <p className="text-sm text-text-muted text-center py-2">No estimates</p>
        )}
      </ExpenseSection>

      {/* Modals */}
      <LaborEntryModal
        open={laborModalOpen}
        onOpenChange={setLaborModalOpen}
        jobId={jobId}
        initialData={editingLabor}
        selectedPhaseId={selectedPhaseId}
      />

      <ReceiptModal
        open={receiptModalOpen}
        onOpenChange={setReceiptModalOpen}
        jobId={jobId}
        initialData={editingReceipt}
        selectedPhaseId={selectedPhaseId}
      />

      <WorkOrderModal
        open={woModalOpen}
        onOpenChange={setWoModalOpen}
        jobId={jobId}
        initialData={editingWO}
        selectedPhaseId={selectedPhaseId}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title={`Delete ${deleteTarget?.type === 'labor' ? 'Labor Entry' : deleteTarget?.type === 'receipt' ? 'Receipt' : 'Work Order'}`}
        description="Are you sure you want to delete this entry? This action cannot be undone."
        variant="destructive"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={isDeleting}
      />
    </div>
  )
}
