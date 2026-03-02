import { useState, useMemo } from 'react'
import { List, LayoutGrid, Plus } from 'lucide-react'
import type { ApexJob } from '@/types/index.js'
import { Button } from '@/components/ui/button.js'
import { JobFilters } from '@/pages/jobs/components/list/JobFilters.js'
import { JobListTableView } from '@/pages/jobs/components/list/JobListTableView.js'
import { JobCardGridView } from '@/pages/jobs/components/list/JobCardGridView.js'

type ViewMode = 'list' | 'card'

interface JobListViewProps {
  jobs: ApexJob[]
  onSelectJob: (id: string) => void
  onCreateJob: () => void
}

const VIEW_OPTIONS: { mode: ViewMode; icon: typeof List; label: string }[] = [
  { mode: 'list', icon: List, label: 'List' },
  { mode: 'card', icon: LayoutGrid, label: 'Grid' },
]

export function JobListView({ jobs, onSelectJob, onCreateJob }: JobListViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [statusFilter, setStatusFilter] = useState('all')
  const [lossTypeFilter, setLossTypeFilter] = useState('all')

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (statusFilter !== 'all' && job.status !== statusFilter) return false
      if (lossTypeFilter !== 'all' && job.loss_type !== lossTypeFilter) return false
      return true
    })
  }, [jobs, statusFilter, lossTypeFilter])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-heading text-text-primary">Jobs</h1>
        <div className="flex items-center gap-2">
          <Button onClick={onCreateJob} size="sm">
            <Plus />
            New Job
          </Button>
          <div className="flex items-center">
            {VIEW_OPTIONS.map(({ mode, icon: Icon, label }) => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'default' : 'outline'}
                size="icon-sm"
                onClick={() => setViewMode(mode)}
                title={label}
              >
                <Icon />
              </Button>
            ))}
          </div>
        </div>
      </div>

      <JobFilters
        statusFilter={statusFilter}
        lossTypeFilter={lossTypeFilter}
        onStatusChange={setStatusFilter}
        onLossTypeChange={setLossTypeFilter}
      />

      {viewMode === 'list' && (
        <JobListTableView jobs={filteredJobs} onSelectJob={onSelectJob} />
      )}
      {viewMode === 'card' && (
        <JobCardGridView jobs={filteredJobs} onSelectJob={onSelectJob} />
      )}
    </div>
  )
}
