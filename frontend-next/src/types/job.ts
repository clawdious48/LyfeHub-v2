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
  source: string
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

export type CreateApexJobData = Partial<Omit<ApexJob, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & {
  name: string
  client_name: string
}

export type UpdateApexJobData = Partial<Omit<ApexJob, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
