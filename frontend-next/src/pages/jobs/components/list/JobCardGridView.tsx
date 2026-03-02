import type { ApexJob } from '@/types/index.js'
import { JobCard } from '@/pages/jobs/components/list/JobCard.js'

interface JobCardGridViewProps {
  jobs: ApexJob[]
  onSelectJob: (id: string) => void
}

export function JobCardGridView({ jobs, onSelectJob }: JobCardGridViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          onClick={() => onSelectJob(job.id)}
        />
      ))}
    </div>
  )
}
