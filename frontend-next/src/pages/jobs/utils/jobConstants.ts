export const JOB_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'pending_insurance', label: 'Pending Insurance' },
  { value: 'complete', label: 'Complete' },
  { value: 'archived', label: 'Archived' },
] as const

export const LOSS_TYPES = [
  { value: 'water', label: 'Water' },
  { value: 'fire', label: 'Fire' },
  { value: 'mold', label: 'Mold' },
  { value: 'storm', label: 'Storm' },
  { value: 'vandalism', label: 'Vandalism' },
  { value: 'other', label: 'Other' },
] as const

export const JOB_TYPE_CODES = [
  { code: 'MIT', label: 'Mitigation', type: 'mitigation' },
  { code: 'RPR', label: 'Reconstruction', type: 'repair' },
  { code: 'RMD', label: 'Remodel', type: 'remodel' },
  { code: 'ABT', label: 'Abatement', type: 'abatement' },
  { code: 'REM', label: 'Remediation', type: 'remediation' },
  { code: 'FR', label: 'Fire', type: 'fire' },
] as const

export const NOTE_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'site_visit', label: 'Site Visit' },
  { value: 'documentation', label: 'Documentation' },
] as const

export const WORK_CATEGORIES = [
  { value: 'demo', label: 'Demo' },
  { value: 'drying', label: 'Drying' },
  { value: 'cleanup', label: 'Cleanup' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'repair', label: 'Repair' },
  { value: 'admin', label: 'Admin' },
  { value: 'travel', label: 'Travel' },
  { value: 'other', label: 'Other' },
] as const

export const EXPENSE_CATEGORIES = [
  { value: 'materials', label: 'Materials' },
  { value: 'equipment_rental', label: 'Equipment Rental' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'disposal', label: 'Disposal' },
  { value: 'permit', label: 'Permit' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'other', label: 'Other' },
] as const

export const PAID_BY_OPTIONS = [
  { value: 'company_card', label: 'Company Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'personal_reimbursement', label: 'Personal Reimbursement' },
  { value: 'vendor_invoice', label: 'Vendor Invoice' },
] as const

export const PAYMENT_METHODS = [
  { value: 'check', label: 'Check' },
  { value: 'ach', label: 'ACH' },
  { value: 'credit', label: 'Credit' },
  { value: 'cash', label: 'Cash' },
] as const

export const PAYMENT_TYPES = [
  { value: 'initial', label: 'Initial' },
  { value: 'progress', label: 'Progress' },
  { value: 'supplement', label: 'Supplement' },
  { value: 'final', label: 'Final' },
  { value: 'deductible', label: 'Deductible' },
] as const

export const ESTIMATE_TYPES = [
  { value: 'mitigation', label: 'Mitigation' },
  { value: 'reconstruction', label: 'Reconstruction' },
  { value: 'remediation', label: 'Remediation' },
  { value: 'abatement', label: 'Abatement' },
  { value: 'remodel', label: 'Remodel' },
] as const

export const ESTIMATE_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'revision_requested', label: 'Revision Requested' },
  { value: 'denied', label: 'Denied' },
] as const

export const WORK_ORDER_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

export const PHASE_STATUSES = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'complete', label: 'Complete' },
] as const

export const CLIENT_RELATIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'manager', label: 'Manager' },
  { value: 'other', label: 'Other' },
] as const

export const PROPERTY_TYPES = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'multi_family', label: 'Multi-Family' },
  { value: 'industrial', label: 'Industrial' },
] as const

export const WATER_CATEGORIES = [
  { value: '1', label: 'Cat 1 - Clean Water' },
  { value: '2', label: 'Cat 2 - Gray Water' },
  { value: '3', label: 'Cat 3 - Black Water' },
] as const

export const DAMAGE_CLASSES = [
  { value: '1', label: 'Class 1 - Minimal' },
  { value: '2', label: 'Class 2 - Significant' },
  { value: '3', label: 'Class 3 - Extensive' },
  { value: '4', label: 'Class 4 - Specialty' },
] as const

export const DATE_FIELDS = [
  { key: 'contacted_date', label: 'Contacted' },
  { key: 'inspection_date', label: 'Inspection' },
  { key: 'work_auth_date', label: 'Work Authorization' },
  { key: 'loss_date', label: 'Loss Date' },
  { key: 'start_date', label: 'Start Date' },
  { key: 'cos_date', label: 'Certificate of Satisfaction' },
  { key: 'completion_date', label: 'Completion' },
] as const

export const US_STATES = [
  { value: 'AZ', label: 'AZ' },
  { value: 'CA', label: 'CA' },
  { value: 'CO', label: 'CO' },
  { value: 'NM', label: 'NM' },
  { value: 'NV', label: 'NV' },
  { value: 'TX', label: 'TX' },
  { value: 'UT', label: 'UT' },
] as const

export const REFERRAL_SOURCES = [
  { value: 'insurance_company', label: 'Insurance Company' },
  { value: 'insurance_agent', label: 'Insurance Agent' },
  { value: 'past_client', label: 'Past Client' },
  { value: 'google_search', label: 'Google Search' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'nextdoor', label: 'Nextdoor' },
  { value: 'thumbtack', label: 'Thumbtack' },
  { value: 'yelp', label: 'Yelp' },
  { value: 'word_of_mouth', label: 'Word of Mouth' },
  { value: 'other', label: 'Other' },
] as const

export const JOB_CONTACT_ROLES = [
  { value: 'adjuster', label: 'Adjuster' },
  { value: 'client_representative', label: 'Client Representative' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'insurance_agent', label: 'Insurance Agent' },
  { value: 'property_manager', label: 'Property Manager' },
  { value: 'other', label: 'Other' },
] as const

export const SITE_CONTACT_RELATIONS = [
  { value: 'property_owner', label: 'Property Owner' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'property_manager', label: 'Property Manager' },
  { value: 'insurance_agent', label: 'Insurance Agent' },
  { value: 'other', label: 'Other' },
] as const

export const TEAM_ROLES = [
  { key: 'mitigation_pm', label: 'Mitigation PM', eligible: ['management', 'project_manager'] },
  { key: 'reconstruction_pm', label: 'Reconstruction PM', eligible: ['management', 'project_manager'] },
  { key: 'estimator', label: 'Estimator', eligible: ['management', 'estimator'] },
  { key: 'project_coordinator', label: 'Project Coordinator', eligible: ['management', 'office_coordinator'] },
  { key: 'mitigation_techs', label: 'Mitigation Techs', eligible: ['management', 'field_tech'] },
] as const
