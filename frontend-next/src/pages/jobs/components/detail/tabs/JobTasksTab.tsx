import { FileText } from 'lucide-react'

interface JobTasksTabProps {
  jobId: string
  selectedPhaseId: string | null
}

export function JobTasksTab({ jobId, selectedPhaseId }: JobTasksTabProps) {
  // Suppress unused vars — these will be used when the tasks API is wired up
  void jobId
  void selectedPhaseId

  return (
    <div className="py-12 text-center space-y-3">
      <FileText className="h-10 w-10 mx-auto text-text-muted" />
      <p className="text-sm text-text-muted">No tasks linked to this job</p>
      <p className="text-xs text-text-muted">Task management for jobs coming soon</p>
    </div>
  )
}
