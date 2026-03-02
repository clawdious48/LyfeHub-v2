import { ArrowLeft, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button.js'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.js'
import { StatusBadge } from '@/components/shared/StatusBadge.js'
import { useUpdateJobStatus } from '@/api/hooks/index.js'
import { JOB_STATUSES } from '@/pages/jobs/utils/jobConstants.js'
import type { ApexJob } from '@/types/index.js'

interface JobDetailHeaderProps {
  job: ApexJob
  onBack: () => void
  onEdit: () => void
}

export function JobDetailHeader({ job, onBack, onEdit }: JobDetailHeaderProps) {
  const updateStatus = useUpdateJobStatus()

  return (
    <div className="space-y-2">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="size-4" />
        Back
      </Button>
      <div className="flex justify-between items-start">
        <h1 className="font-heading text-xl text-text-primary">{job.name}</h1>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 cursor-pointer">
                <StatusBadge status={job.status} />
                <ChevronDown className="size-3 text-text-muted" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {JOB_STATUSES.map((s) => (
                <DropdownMenuItem
                  key={s.value}
                  onClick={() =>
                    updateStatus.mutate({ id: job.id, status: s.value })
                  }
                >
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={onEdit}>
            Edit
          </Button>
        </div>
      </div>
    </div>
  )
}
