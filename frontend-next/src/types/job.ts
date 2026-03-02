export interface ApexJob {
  id: string
  user_id: string
  name: string
  status: 'active' | 'pending_insurance' | 'complete' | 'archived'
  client_name: string
  client_phone: string
  client_email: string
  client_street: string
  client_city: string
  client_state: string
  client_zip: string
  client_unit: string
  client_relation: string
  same_as_client: number
  prop_street: string
  prop_city: string
  prop_state: string
  prop_zip: string
  prop_unit: string
  prop_type: string
  occ_name: string
  occ_phone: string
  occ_email: string
  access_info: string
  ins_carrier: string
  ins_claim: string
  ins_policy: string
  deductible: number
  adj_name: string
  adj_phone: string
  adj_email: string
  loss_type: string
  loss_date: string
  water_category: string
  damage_class: string
  areas_affected: string
  hazards: string
  loss_description: string
  scope_notes: string
  urgent: number
  referral_source: string
  how_heard: string
  internal_notes: string
  referred_by: string
  source: string
  // Boolean flags (stored as 0/1 integers in DB)
  extraction_required: number
  ongoing_intrusion: number
  drywall_debris: number
  content_manipulation: number
  // Team assignment (JSON string arrays of user IDs)
  mitigation_pm: string
  reconstruction_pm: string
  estimator: string
  project_coordinator: string
  mitigation_techs: string
  // Multi-contact arrays (JSON string arrays)
  additional_clients: string
  additional_adjusters: string
  site_contacts: string
  // Property
  year_built: string
  contacted_date: string
  inspection_date: string
  work_auth_date: string
  start_date: string
  cos_date: string
  completion_date: string
  ready_to_invoice: number
  org_id: string | null
  created_at: string
  updated_at: string
  phases?: ApexJobPhase[]
}

export interface ApexJobPhase {
  id: string
  job_id: string
  job_type: string
  job_type_code: string
  job_number: string
  phase_status: 'not_started' | 'in_progress' | 'pending_approval' | 'approved' | 'complete'
  notes: string
  created_at: string
  updated_at: string
}

export interface ApexJobNote {
  id: string
  job_id: string
  phase_id: string | null
  subject: string
  note_type: 'general' | 'call' | 'email' | 'site_visit' | 'documentation'
  content: string
  author_id: string | null
  created_at: string
}

export interface ApexJobEstimate {
  id: string
  job_id: string
  phase_id: string | null
  estimate_type: 'mitigation' | 'reconstruction' | 'remediation' | 'abatement' | 'remodel'
  version: number
  amount: number
  original_amount: number
  status: 'draft' | 'submitted' | 'approved' | 'revision_requested' | 'denied'
  submitted_date: string | null
  approved_date: string | null
  file_path: string
  notes: string
  created_at: string
}

export interface ApexJobPayment {
  id: string
  job_id: string
  phase_id: string | null
  estimate_id: string | null
  amount: number
  payment_method: 'check' | 'ach' | 'credit' | 'cash'
  payment_type: 'initial' | 'progress' | 'supplement' | 'final' | 'deductible'
  check_number: string
  received_date: string | null
  deposited_date: string | null
  invoice_number: string
  notes: string
  created_at: string
}

export interface ApexJobLabor {
  id: string
  job_id: string
  phase_id: string | null
  employee_name: string
  work_date: string | null
  hours: number
  hourly_rate: number
  work_category: 'demo' | 'drying' | 'cleanup' | 'monitoring' | 'repair' | 'admin' | 'travel' | 'other'
  description: string
  billable: number
  author_id: string | null
  created_at: string
}

export interface ApexJobReceipt {
  id: string
  job_id: string
  phase_id: string | null
  amount: number
  expense_category: 'materials' | 'equipment_rental' | 'subcontractor' | 'disposal' | 'permit' | 'supplies' | 'other'
  description: string
  vendor: string
  paid_by: 'company_card' | 'cash' | 'personal_reimbursement' | 'vendor_invoice'
  reimbursable: number
  expense_date: string | null
  file_path: string
  author_id: string | null
  document_id: string | null
  created_at: string
}

export interface ApexJobWorkOrder {
  id: string
  job_id: string
  phase_id: string | null
  wo_number: string
  title: string
  description: string
  budget_amount: number
  status: 'draft' | 'approved' | 'in_progress' | 'completed' | 'cancelled'
  file_path: string
  author_id: string | null
  created_at: string
}

export interface JobAccountingData {
  total_estimates: number
  total_approved_estimates: number
  total_payments: number
  total_labor_cost: number
  total_receipts: number
  total_work_orders: number
  total_costs: number
  gross_profit: number
  gp_margin: number
  estimates: ApexJobEstimate[]
  payments: ApexJobPayment[]
}

export interface JobActivityEvent {
  id: string
  job_id: string
  event_type: string
  description: string
  amount: number | null
  metadata: string | null
  created_by: string | null
  created_at: string
}

export interface JobContactWithDetails {
  id: string
  job_id: string
  contact_id: string
  crm_organization_id: string | null
  job_role: string
  notes: string
  created_at: string
  first_name: string
  last_name: string
  phone: string
  email: string
  org_name: string | null
}

export interface ApexDocument {
  id: string
  job_id: string
  phase_id: string | null
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  document_type: string
  description: string
  uploaded_by: string | null
  created_at: string
}

export interface AdditionalContact {
  name: string
  phone: string
  email: string
}

export interface SiteContact {
  name: string
  phone: string
  email: string
  relation: string
}

export interface CrmContact {
  id: string
  first_name: string
  last_name: string
  phone: string
  ext: string
  alt_phone: string
  alt_ext: string
  email: string
  crm_organization_id: string | null
  org_name: string | null
}

export interface OrgMember {
  user_id: string
  name: string
  email: string
  role: string
  job_count?: number
}

export interface CreateCrmContactData {
  first_name: string
  last_name: string
  phone: string
  ext: string
  alt_phone: string
  alt_ext: string
  email: string
  crm_organization_id: string | null
}

export interface JobContactAssignment {
  contact_id: string
  job_role: string
  display_name: string
  org_name: string | null
  phone: string
}

export interface JobStats {
  active: number
  pending_insurance: number
  complete: number
  archived: number
  total: number
}

export interface JobsListResponse {
  projects: ApexJob[]
  stats: JobStats
  syncedAt: string
}

export type CreateApexJobData = Partial<Omit<ApexJob, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & {
  name: string
  client_name: string
}

export type UpdateApexJobData = Partial<Omit<ApexJob, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
