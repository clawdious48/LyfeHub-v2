import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog.js'
import { Button } from '@/components/ui/button.js'
import { Separator } from '@/components/ui/separator.js'
import { apiClient } from '@/api/client.js'
import { useCreateJobForm } from '@/pages/jobs/hooks/useCreateJobForm.js'
import type { CreateJobFormState } from '@/pages/jobs/hooks/useCreateJobForm.js'
import type { CreateApexJobData } from '@/types/index.js'

import { JobSetupSection } from './sections/JobSetupSection.js'
import { ClientInfoSection } from './sections/ClientInfoSection.js'
import { InsuranceInfoSection } from './sections/InsuranceInfoSection.js'
import { PropertyInfoSection } from './sections/PropertyInfoSection.js'
import { LossInfoSection } from './sections/LossInfoSection.js'
import { TeamSection } from './sections/TeamSection.js'
import { ReferralSection } from './sections/ReferralSection.js'

interface CreateJobModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateJobModal({ open, onOpenChange, onSuccess }: CreateJobModalProps) {
  const {
    form,
    updateField,
    toggleJobType,
    addClient,
    removeClient,
    updateClient,
    addAdjuster,
    removeAdjuster,
    updateAdjuster,
    addSiteContact,
    removeSiteContact,
    updateSiteContact,
    addContactAssignment,
    removeContactAssignment,
    isValid,
    reset,
    buildSubmitData,
    createJob,
  } = useCreateJobForm()

  // Wrapper that bridges the section components' (field: string, value: T) signature
  // to the hook's generic <K extends keyof CreateJobFormState>(field: K, value: CreateJobFormState[K])
  function handleUpdateField(field: string, value: CreateJobFormState[keyof CreateJobFormState]) {
    updateField(field as keyof CreateJobFormState, value as never)
  }

  async function handleSubmit() {
    const data = buildSubmitData()
    createJob.mutate(data as unknown as CreateApexJobData, {
      onSuccess: async (newJob) => {
        // Link CRM contacts to the newly created job
        for (const assignment of form.contact_assignments) {
          try {
            await apiClient.post(`/apex-crm/jobs/${newJob.id}/contacts`, {
              contact_id: assignment.contact_id,
              job_role: assignment.job_role,
            })
          } catch (err) {
            console.error('Failed to link contact:', err)
          }
        }
        reset()
        onOpenChange(false)
        onSuccess?.()
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Job</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Row 0: Job Setup (full width) */}
          <JobSetupSection
            jobTypes={form.jobTypes}
            onToggleJobType={toggleJobType}
          />

          <Separator />

          {/* Row 1: Three Columns — Client | Insurance | Property */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            <ClientInfoSection
              client_name={form.client_name}
              client_phone={form.client_phone}
              client_email={form.client_email}
              client_street={form.client_street}
              client_unit={form.client_unit}
              client_city={form.client_city}
              client_state={form.client_state}
              client_zip={form.client_zip}
              additional_clients={form.additional_clients}
              onUpdateField={handleUpdateField}
              onAddClient={addClient}
              onRemoveClient={removeClient}
              onUpdateClient={updateClient}
            />
            <InsuranceInfoSection
              ins_carrier={form.ins_carrier}
              ins_claim={form.ins_claim}
              ins_policy={form.ins_policy}
              deductible={form.deductible}
              adj_name={form.adj_name}
              adj_phone={form.adj_phone}
              adj_email={form.adj_email}
              additional_adjusters={form.additional_adjusters}
              onUpdateField={handleUpdateField}
              onAddAdjuster={addAdjuster}
              onRemoveAdjuster={removeAdjuster}
              onUpdateAdjuster={updateAdjuster}
            />
            <PropertyInfoSection
              same_as_client={form.same_as_client}
              year_built={form.year_built}
              prop_type={form.prop_type}
              prop_street={form.prop_street}
              prop_unit={form.prop_unit}
              prop_city={form.prop_city}
              prop_state={form.prop_state}
              prop_zip={form.prop_zip}
              access_info={form.access_info}
              client_street={form.client_street}
              client_unit={form.client_unit}
              client_city={form.client_city}
              client_state={form.client_state}
              client_zip={form.client_zip}
              site_contacts={form.site_contacts}
              onUpdateField={handleUpdateField}
              onAddSiteContact={addSiteContact}
              onRemoveSiteContact={removeSiteContact}
              onUpdateSiteContact={updateSiteContact}
            />
          </div>

          <Separator />

          {/* Row 2: Loss Info (full width) */}
          <LossInfoSection
            loss_type={form.loss_type}
            loss_date={form.loss_date}
            water_category={form.water_category}
            damage_class={form.damage_class}
            areas_affected={form.areas_affected}
            hazards={form.hazards}
            loss_description={form.loss_description}
            extraction_required={form.extraction_required}
            ongoing_intrusion={form.ongoing_intrusion}
            drywall_debris={form.drywall_debris}
            content_manipulation={form.content_manipulation}
            onUpdateField={handleUpdateField}
          />

          <Separator />

          {/* Row 3: Team (full width, internally 2 columns) */}
          <TeamSection
            mitigation_pm={form.mitigation_pm}
            reconstruction_pm={form.reconstruction_pm}
            estimator={form.estimator}
            project_coordinator={form.project_coordinator}
            mitigation_techs={form.mitigation_techs}
            onUpdateField={handleUpdateField}
            contact_assignments={form.contact_assignments}
            onAddContactAssignment={addContactAssignment}
            onRemoveContactAssignment={removeContactAssignment}
          />

          <Separator />

          {/* Row 4: Referral & Tracking (full width) */}
          <ReferralSection
            referral_source={form.referral_source}
            referred_by={form.referred_by}
            how_heard={form.how_heard}
            internal_notes={form.internal_notes}
            onUpdateField={handleUpdateField}
          />
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <span className="text-xs text-text-muted">* Required field</span>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              disabled={!isValid || createJob.isPending}
              onClick={handleSubmit}
            >
              {createJob.isPending ? 'Creating...' : 'Create Job'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
