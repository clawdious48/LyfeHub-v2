import type { ApexJob } from '@/types/index.js'
import { Badge } from '@/components/ui/badge.js'
import { JobCard } from '@/pages/jobs/components/list/JobCard.js'

interface JobKanbanViewProps {
  jobs: ApexJob[]
  onSelectJob: (id: string) => void
}

const COLUMNS = [
  { key: 'active', label: 'Active' },
  { key: 'pending_insurance', label: 'Pending Insurance' },
  { key: 'complete', label: 'Complete' },
] as const

export function JobKanbanView({ jobs, onSelectJob }: JobKanbanViewProps) {
  const grouped = {
    active: jobs.filter((j) => j.status === 'active'),
    pending_insurance: jobs.filter((j) => j.status === 'pending_insurance'),
    complete: jobs.filter((j) => j.status === 'complete'),
  }

  return (
    <div className="flex flex-row gap-4">
      {COLUMNS.map((col) => (
        <div
          key={col.key}
          className="flex-1 min-w-0 rounded-lg border bg-bg-surface p-3"
        >
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-medium text-text-primary">{col.label}</h3>
            <Badge variant="secondary" className="text-xs">
              {grouped[col.key].length}
            </Badge>
          </div>
          <div className="space-y-2">
            {grouped[col.key].map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onClick={() => onSelectJob(job.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
