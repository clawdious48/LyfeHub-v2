import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.js'
import { useJob } from '@/api/hooks/index.js'
import { JobDetailHeader } from '@/pages/jobs/components/detail/JobDetailHeader.js'
import { JobInfoCards } from '@/pages/jobs/components/detail/JobInfoCards.js'
import { JobPhaseBar } from '@/pages/jobs/components/detail/JobPhaseBar.js'
import { JobDatesTab } from '@/pages/jobs/components/detail/tabs/JobDatesTab.js'
import { JobNotesTab } from '@/pages/jobs/components/detail/tabs/JobNotesTab.js'
import { JobDocumentsTab } from '@/pages/jobs/components/detail/tabs/JobDocumentsTab.js'
import { JobTasksTab } from '@/pages/jobs/components/detail/tabs/JobTasksTab.js'
import { JobExpensesTab } from '@/pages/jobs/components/detail/tabs/JobExpensesTab.js'
import { JobAccountingSidebar } from '@/pages/jobs/components/detail/sidebar/JobAccountingSidebar.js'
import { JobActivitySidebar } from '@/pages/jobs/components/detail/sidebar/JobActivitySidebar.js'
import { JobContactsSection } from '@/pages/jobs/components/detail/sidebar/JobContactsSection.js'
import { EditJobModal } from '@/pages/jobs/components/modals/EditJobModal.js'
import { AddEstimateModal } from '@/pages/jobs/components/modals/AddEstimateModal.js'
import { RecordPaymentModal } from '@/pages/jobs/components/modals/RecordPaymentModal.js'

interface JobDetailViewProps {
  jobId: string
  onBack: () => void
}

export function JobDetailView({ jobId, onBack }: JobDetailViewProps) {
  const { data: job, isLoading } = useJob(jobId)
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('dates')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [estimateModalOpen, setEstimateModalOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)

  if (isLoading || !job) {
    return (
      <div className="flex items-center justify-center py-12 text-text-muted">
        Loading...
      </div>
    )
  }

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-4">
        <JobDetailHeader
          job={job}
          onBack={onBack}
          onEdit={() => setEditModalOpen(true)}
        />
        <JobInfoCards job={job} />
        {job.phases && job.phases.length > 1 && (
          <JobPhaseBar
            phases={job.phases}
            selectedPhaseId={selectedPhaseId}
            onSelectPhase={setSelectedPhaseId}
          />
        )}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="dates">Dates</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
          </TabsList>
          <TabsContent value="dates">
            <JobDatesTab job={job} />
          </TabsContent>
          <TabsContent value="documents">
            <JobDocumentsTab jobId={jobId} selectedPhaseId={selectedPhaseId} />
          </TabsContent>
          <TabsContent value="tasks">
            <JobTasksTab jobId={jobId} selectedPhaseId={selectedPhaseId} />
          </TabsContent>
          <TabsContent value="notes">
            <JobNotesTab jobId={jobId} selectedPhaseId={selectedPhaseId} />
          </TabsContent>
          <TabsContent value="expenses">
            <JobExpensesTab jobId={jobId} selectedPhaseId={selectedPhaseId} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Sidebar */}
      <div className="w-72 shrink-0 flex flex-col gap-4 border-l border-border pl-4">
        <JobAccountingSidebar
          jobId={jobId}
          job={job}
          selectedPhaseId={selectedPhaseId}
          onAddEstimate={() => setEstimateModalOpen(true)}
          onRecordPayment={() => setPaymentModalOpen(true)}
        />
        <JobContactsSection jobId={jobId} />
        <JobActivitySidebar jobId={jobId} />
      </div>

      {/* Modals */}
      <EditJobModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        job={job}
      />
      <AddEstimateModal
        open={estimateModalOpen}
        onOpenChange={setEstimateModalOpen}
        jobId={jobId}
        selectedPhaseId={selectedPhaseId}
      />
      <RecordPaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        jobId={jobId}
        selectedPhaseId={selectedPhaseId}
      />
    </div>
  )
}
