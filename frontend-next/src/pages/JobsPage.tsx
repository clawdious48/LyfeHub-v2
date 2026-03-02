import { useState } from 'react'
import { useJobs } from '@/api/hooks/index.js'
import { JobListView } from '@/pages/jobs/components/list/JobListView.js'
import { JobDetailView } from '@/pages/jobs/components/detail/JobDetailView.js'
import { CreateJobModal } from '@/pages/jobs/components/modals/CreateJobModal.js'

export default function JobsPage() {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const { data: jobs = [], isLoading, refetch } = useJobs()

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-text-secondary text-sm">Loading jobs...</p>
      </div>
    )
  }

  if (selectedJobId) {
    return (
      <div className="p-6">
        <JobDetailView
          jobId={selectedJobId}
          onBack={() => setSelectedJobId(null)}
        />
      </div>
    )
  }

  return (
    <div className="p-6">
      <JobListView
        jobs={jobs}
        onSelectJob={setSelectedJobId}
        onCreateJob={() => setCreateModalOpen(true)}
      />
      <CreateJobModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={() => refetch()}
      />
    </div>
  )
}
