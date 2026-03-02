import type { ApexJob } from '@/types/index.js'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card.js'
import { Badge } from '@/components/ui/badge.js'
import { StatusBadge } from '@/components/shared/StatusBadge.js'
import { formatDate } from '@/pages/jobs/utils/jobFormatters.js'

interface JobCardProps {
  job: ApexJob
  onClick: () => void
}

export function JobCard({ job, onClick }: JobCardProps) {
  return (
    <Card
      className="cursor-pointer hover:border-accent transition py-3 gap-2"
      onClick={onClick}
    >
      <CardHeader className="gap-1 px-3">
        <CardTitle className="font-medium text-sm truncate">
          {job.name}
        </CardTitle>
        <CardAction>
          <StatusBadge status={job.status} />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-1 px-3 text-xs">
        {job.client_name && (
          <div className="flex items-center gap-2">
            <span className="text-text-secondary">Client:</span>
            <span className="text-text-primary truncate">{job.client_name}</span>
          </div>
        )}
        {job.loss_type && (
          <div className="flex items-center gap-2">
            <span className="text-text-secondary">Loss:</span>
            <span className="text-text-primary capitalize">{job.loss_type}</span>
          </div>
        )}
        {job.phases && job.phases.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {job.phases.map((phase) => (
              <Badge key={phase.id} variant="outline" className="text-[10px] px-1.5 py-0">
                {phase.job_type_code}
              </Badge>
            ))}
          </div>
        )}
        {job.start_date && (
          <div className="flex items-center gap-2">
            <span className="text-text-secondary">Start:</span>
            <span className="text-text-primary">{formatDate(job.start_date)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
