import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js'
import { JOB_STATUSES, LOSS_TYPES } from '@/pages/jobs/utils/jobConstants.js'

interface JobFiltersProps {
  statusFilter: string
  lossTypeFilter: string
  onStatusChange: (value: string) => void
  onLossTypeChange: (value: string) => void
}

export function JobFilters({
  statusFilter,
  lossTypeFilter,
  onStatusChange,
  onLossTypeChange,
}: JobFiltersProps) {
  return (
    <div className="flex flex-row gap-2">
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {JOB_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={lossTypeFilter} onValueChange={onLossTypeChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Loss Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Loss Types</SelectItem>
          {LOSS_TYPES.map((lt) => (
            <SelectItem key={lt.value} value={lt.value}>
              {lt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
