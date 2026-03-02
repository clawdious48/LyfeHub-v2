import type { ApexJob } from '@/types/index.js'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.js'
import { Badge } from '@/components/ui/badge.js'
import { StatusBadge } from '@/components/shared/StatusBadge.js'
import { formatDate } from '@/pages/jobs/utils/jobFormatters.js'

interface JobListTableViewProps {
  jobs: ApexJob[]
  onSelectJob: (id: string) => void
}

export function JobListTableView({ jobs, onSelectJob }: JobListTableViewProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Loss Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Phases</TableHead>
          <TableHead>Start Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow
            key={job.id}
            className="cursor-pointer hover:bg-bg-hover"
            onClick={() => onSelectJob(job.id)}
          >
            <TableCell className="font-medium">{job.name}</TableCell>
            <TableCell>{job.client_name}</TableCell>
            <TableCell className="capitalize">{job.loss_type}</TableCell>
            <TableCell>
              <StatusBadge status={job.status} />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                {job.phases?.map((phase) => (
                  <Badge key={phase.id} variant="outline" className="text-[10px] px-1.5 py-0">
                    {phase.job_type_code}
                  </Badge>
                ))}
              </div>
            </TableCell>
            <TableCell>{formatDate(job.start_date)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
