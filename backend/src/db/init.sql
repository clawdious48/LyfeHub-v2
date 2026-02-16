-- ============================================
-- LyfeHub v2 — PostgreSQL Schema
-- Converted from SQLite (better-sqlite3)
-- ============================================

-- ============================================
-- USERS
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'field_tech',
  settings TEXT DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- TASKS (Kanban board)
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  acceptance_criteria TEXT DEFAULT '[]',
  status TEXT DEFAULT 'planned' CHECK(status IN ('planned', 'ready', 'in_progress', 'blocked', 'review', 'done')),
  priority INTEGER DEFAULT 3 CHECK(priority >= 1 AND priority <= 5),
  context_links TEXT DEFAULT '[]',
  notes TEXT DEFAULT '',
  activity_log TEXT DEFAULT '[]',
  session_id TEXT,
  user_id TEXT REFERENCES users(id),
  scheduled_date TEXT,
  scheduled_start TEXT,
  scheduled_end TEXT,
  is_all_day INTEGER DEFAULT 0,
  review_state TEXT DEFAULT '{}',
  apex_job_ref TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON tasks(scheduled_date);

-- ============================================
-- TASK ITEMS (Personal tasks / My Day)
-- ============================================
CREATE TABLE IF NOT EXISTS task_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  due_date TEXT,
  due_time TEXT,
  due_time_end TEXT,
  recurring TEXT,
  recurring_days TEXT DEFAULT '[]',
  important INTEGER DEFAULT 0,
  completed INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  subtasks TEXT DEFAULT '[]',
  user_id TEXT REFERENCES users(id),
  my_day INTEGER DEFAULT 0,
  status TEXT DEFAULT 'todo',
  priority TEXT,
  snooze_date TEXT,
  project_id TEXT,
  energy TEXT,
  location TEXT,
  list_id TEXT,
  people_ids TEXT DEFAULT '[]',
  note_ids TEXT DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_task_items_user_id ON task_items(user_id);
CREATE INDEX IF NOT EXISTS idx_task_items_due_date ON task_items(due_date);
CREATE INDEX IF NOT EXISTS idx_task_items_important ON task_items(important);
CREATE INDEX IF NOT EXISTS idx_task_items_completed ON task_items(completed);
CREATE INDEX IF NOT EXISTS idx_task_items_my_day ON task_items(my_day);
CREATE INDEX IF NOT EXISTS idx_task_items_status ON task_items(status);
CREATE INDEX IF NOT EXISTS idx_task_items_priority ON task_items(priority);
CREATE INDEX IF NOT EXISTS idx_task_items_snooze_date ON task_items(snooze_date);
CREATE INDEX IF NOT EXISTS idx_task_items_project_id ON task_items(project_id);

-- ============================================
-- TASK LISTS
-- ============================================
CREATE TABLE IF NOT EXISTS task_lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📋',
  color TEXT DEFAULT '',
  user_id TEXT REFERENCES users(id),
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CALENDARS
-- ============================================
CREATE TABLE IF NOT EXISTS calendars (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  color TEXT DEFAULT '#00aaff',
  user_id TEXT REFERENCES users(id),
  is_default INTEGER DEFAULT 0,
  system_type TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_calendars_user_id ON calendars(user_id);

-- ============================================
-- TASK_ITEM_CALENDARS (junction)
-- ============================================
CREATE TABLE IF NOT EXISTS task_item_calendars (
  task_item_id TEXT REFERENCES task_items(id) ON DELETE CASCADE,
  calendar_id TEXT REFERENCES calendars(id) ON DELETE CASCADE,
  PRIMARY KEY (task_item_id, calendar_id)
);
CREATE INDEX IF NOT EXISTS idx_task_item_calendars_task ON task_item_calendars(task_item_id);
CREATE INDEX IF NOT EXISTS idx_task_item_calendars_calendar ON task_item_calendars(calendar_id);

-- ============================================
-- PEOPLE (Core Base)
-- ============================================
CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  name TEXT NOT NULL,
  nickname TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  birthday TEXT,
  gender TEXT DEFAULT '',
  email TEXT DEFAULT '',
  email_secondary TEXT DEFAULT '',
  phone_mobile TEXT DEFAULT '',
  phone_work TEXT DEFAULT '',
  phone_home TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  country TEXT DEFAULT '',
  zip TEXT DEFAULT '',
  timezone TEXT DEFAULT '',
  company TEXT DEFAULT '',
  job_title TEXT DEFAULT '',
  industry TEXT DEFAULT '',
  website TEXT DEFAULT '',
  linkedin TEXT DEFAULT '',
  twitter TEXT DEFAULT '',
  instagram TEXT DEFAULT '',
  relationship TEXT DEFAULT '',
  how_we_met TEXT DEFAULT '',
  tags TEXT DEFAULT '[]',
  introduced_by TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  last_contacted TEXT,
  follow_up TEXT,
  important INTEGER DEFAULT 0,
  mbti_type TEXT DEFAULT '',
  enneagram TEXT DEFAULT '',
  love_language TEXT DEFAULT '',
  communication_style TEXT DEFAULT '',
  preferred_contact_method TEXT DEFAULT '',
  best_time_to_reach TEXT DEFAULT '',
  relationship_strength TEXT DEFAULT '',
  energy_impact TEXT DEFAULT '',
  trust_level TEXT DEFAULT '',
  reciprocity TEXT DEFAULT '',
  contact_frequency TEXT DEFAULT '',
  desired_frequency TEXT DEFAULT '',
  what_i_admire TEXT DEFAULT '',
  what_i_can_learn TEXT DEFAULT '',
  how_they_make_me_feel TEXT DEFAULT '',
  shared_interests TEXT DEFAULT '[]',
  conversation_topics TEXT DEFAULT '[]',
  sensitive_topics TEXT DEFAULT '[]',
  date_met TEXT,
  how_relationship_evolved TEXT DEFAULT '',
  past_conflicts TEXT DEFAULT '',
  gift_ideas TEXT DEFAULT '[]',
  favorite_things TEXT DEFAULT '',
  allergies_dislikes TEXT DEFAULT '',
  relationship_goals TEXT DEFAULT '',
  how_i_can_support TEXT DEFAULT '',
  how_they_support_me TEXT DEFAULT '',
  group_id TEXT,
  position INTEGER DEFAULT 0,
  organization_id TEXT,
  score INTEGER DEFAULT 0,
  exchange_count INTEGER DEFAULT 0,
  meeting_count INTEGER DEFAULT 0,
  last_email_date TEXT,
  last_meeting_date TEXT,
  source TEXT DEFAULT 'manual',
  ai_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_people_user_id ON people(user_id);
CREATE INDEX IF NOT EXISTS idx_people_name ON people(name);
CREATE INDEX IF NOT EXISTS idx_people_relationship ON people(relationship);
CREATE INDEX IF NOT EXISTS idx_people_important ON people(important);
CREATE INDEX IF NOT EXISTS idx_people_score ON people(score);
CREATE INDEX IF NOT EXISTS idx_people_source ON people(source);
CREATE INDEX IF NOT EXISTS idx_people_email ON people(email);

-- ============================================
-- PEOPLE GROUPS
-- ============================================
CREATE TABLE IF NOT EXISTS people_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '👥',
  user_id TEXT REFERENCES users(id),
  position INTEGER DEFAULT 0,
  collapsed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_people_groups_user_id ON people_groups(user_id);

-- ============================================
-- ORGANIZATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  name TEXT NOT NULL,
  type TEXT DEFAULT '',
  industry TEXT DEFAULT '',
  description TEXT DEFAULT '',
  website TEXT DEFAULT '',
  linkedin TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  country TEXT DEFAULT '',
  zip TEXT DEFAULT '',
  parent_org_id TEXT REFERENCES organizations(id),
  founded_year INTEGER,
  employee_count INTEGER,
  notes TEXT DEFAULT '',
  tags TEXT DEFAULT '[]',
  important INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_organizations_user_id ON organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);
CREATE INDEX IF NOT EXISTS idx_organizations_industry ON organizations(industry);

-- Add FK after both tables exist
DO $$ BEGIN
  ALTER TABLE people ADD CONSTRAINT fk_people_group FOREIGN KEY (group_id) REFERENCES people_groups(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE people ADD CONSTRAINT fk_people_org FOREIGN KEY (organization_id) REFERENCES organizations(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_people_organization_id ON people(organization_id);

-- ============================================
-- NOTES
-- ============================================
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  type TEXT DEFAULT '',
  archived INTEGER DEFAULT 0,
  favorite INTEGER DEFAULT 0,
  note_date TEXT,
  review_date TEXT,
  url TEXT DEFAULT '',
  content TEXT DEFAULT '',
  tags TEXT DEFAULT '[]',
  attachments TEXT DEFAULT '[]',
  project_id TEXT,
  domain TEXT DEFAULT '[]',
  apex_job_ref TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type);
CREATE INDEX IF NOT EXISTS idx_notes_archived ON notes(archived);
CREATE INDEX IF NOT EXISTS idx_notes_favorite ON notes(favorite);
CREATE INDEX IF NOT EXISTS idx_notes_note_date ON notes(note_date);

-- ============================================
-- PROJECTS
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'planned' CHECK(status IN ('planned', 'on_hold', 'doing', 'ongoing', 'done')),
  target_deadline TEXT,
  completed_date TEXT,
  archived INTEGER DEFAULT 0,
  review_notes TEXT DEFAULT '',
  tag_id TEXT,
  goal_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_archived ON projects(archived);

-- ============================================
-- TAGS
-- ============================================
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'resource' CHECK(type IN ('area', 'resource', 'entity')),
  archived INTEGER DEFAULT 0,
  favorite INTEGER DEFAULT 0,
  parent_tag_id TEXT REFERENCES tags(id),
  url TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_type ON tags(type);
CREATE INDEX IF NOT EXISTS idx_tags_archived ON tags(archived);
CREATE INDEX IF NOT EXISTS idx_tags_favorite ON tags(favorite);
CREATE INDEX IF NOT EXISTS idx_tags_parent_tag_id ON tags(parent_tag_id);

-- ============================================
-- API KEYS
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_encrypted TEXT,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

-- ============================================
-- BASES (Notion/Airtable-style databases)
-- ============================================
CREATE TABLE IF NOT EXISTS bases (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT '📊',
  user_id TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bases_user_id ON bases(user_id);

-- ============================================
-- BASE PROPERTIES (Columns in a base)
-- ============================================
CREATE TABLE IF NOT EXISTS base_properties (
  id TEXT PRIMARY KEY,
  base_id TEXT REFERENCES bases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('text', 'number', 'select', 'multi_select', 'date', 'checkbox', 'url', 'relation')),
  options TEXT DEFAULT '[]',
  position INTEGER DEFAULT 0,
  width INTEGER DEFAULT 200,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_base_properties_base_id ON base_properties(base_id);

-- ============================================
-- BASE RECORDS (Rows in a base)
-- ============================================
CREATE TABLE IF NOT EXISTS base_records (
  id TEXT PRIMARY KEY,
  base_id TEXT REFERENCES bases(id) ON DELETE CASCADE,
  values_json TEXT DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_base_records_base_id ON base_records(base_id);

-- ============================================
-- BASE VIEWS
-- ============================================
CREATE TABLE IF NOT EXISTS base_views (
  id TEXT PRIMARY KEY,
  base_id TEXT REFERENCES bases(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled View',
  view_type TEXT NOT NULL DEFAULT 'table',
  config TEXT DEFAULT '{}',
  is_default INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration: Add new columns to base_views if upgrading from old schema
DO $$ BEGIN
  ALTER TABLE base_views ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE base_views ADD COLUMN view_type TEXT NOT NULL DEFAULT 'table';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE base_views ADD COLUMN is_default INTEGER DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE base_views ADD COLUMN sort_order INTEGER DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_base_views_base_id ON base_views(base_id);
CREATE INDEX IF NOT EXISTS idx_base_views_user_id ON base_views(user_id);

-- ============================================
-- BASE RELATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS base_relations (
  id TEXT PRIMARY KEY,
  source_base_id TEXT REFERENCES bases(id) ON DELETE CASCADE,
  target_base_id TEXT REFERENCES bases(id) ON DELETE CASCADE,
  source_property_id TEXT REFERENCES base_properties(id) ON DELETE CASCADE,
  target_property_id TEXT REFERENCES base_properties(id) ON DELETE SET NULL,
  relation_type TEXT DEFAULT 'one_to_many' CHECK(relation_type IN ('one_to_many', 'many_to_many')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BASE RELATION LINKS
-- ============================================
CREATE TABLE IF NOT EXISTS base_relation_links (
  id TEXT PRIMARY KEY,
  relation_id TEXT REFERENCES base_relations(id) ON DELETE CASCADE,
  source_record_id TEXT REFERENCES base_records(id) ON DELETE CASCADE,
  target_record_id TEXT REFERENCES base_records(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(relation_id, source_record_id, target_record_id)
);
CREATE INDEX IF NOT EXISTS idx_relation_links_relation ON base_relation_links(relation_id);
CREATE INDEX IF NOT EXISTS idx_relation_links_source ON base_relation_links(source_record_id);
CREATE INDEX IF NOT EXISTS idx_relation_links_target ON base_relation_links(target_record_id);

-- ============================================
-- APEX JOBS
-- ============================================
CREATE TABLE IF NOT EXISTS apex_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'pending_insurance', 'complete', 'archived')),
  client_name TEXT NOT NULL,
  client_phone TEXT DEFAULT '',
  client_email TEXT DEFAULT '',
  client_street TEXT DEFAULT '',
  client_city TEXT DEFAULT '',
  client_state TEXT DEFAULT '',
  client_zip TEXT DEFAULT '',
  client_unit TEXT DEFAULT '',
  client_relation TEXT DEFAULT 'owner',
  same_as_client INTEGER DEFAULT 0,
  prop_street TEXT DEFAULT '',
  prop_city TEXT DEFAULT '',
  prop_state TEXT DEFAULT '',
  prop_zip TEXT DEFAULT '',
  prop_unit TEXT DEFAULT '',
  prop_type TEXT DEFAULT 'residential',
  occ_name TEXT DEFAULT '',
  occ_phone TEXT DEFAULT '',
  occ_email TEXT DEFAULT '',
  access_info TEXT DEFAULT '',
  ins_carrier TEXT DEFAULT '',
  ins_claim TEXT DEFAULT '',
  ins_policy TEXT DEFAULT '',
  deductible REAL DEFAULT 0,
  adj_name TEXT DEFAULT '',
  adj_phone TEXT DEFAULT '',
  adj_email TEXT DEFAULT '',
  loss_type TEXT DEFAULT '',
  loss_date TEXT DEFAULT '',
  water_category TEXT DEFAULT '',
  damage_class TEXT DEFAULT '',
  areas_affected TEXT DEFAULT '',
  hazards TEXT DEFAULT '',
  loss_description TEXT DEFAULT '',
  scope_notes TEXT DEFAULT '',
  urgent INTEGER DEFAULT 0,
  mitigation_pm TEXT DEFAULT '[]',
  reconstruction_pm TEXT DEFAULT '[]',
  estimator TEXT DEFAULT '[]',
  project_coordinator TEXT DEFAULT '[]',
  mitigation_techs TEXT DEFAULT '[]',
  referral_source TEXT DEFAULT '',
  how_heard TEXT DEFAULT '',
  internal_notes TEXT DEFAULT '',
  source TEXT DEFAULT 'local',
  zoho_id TEXT DEFAULT '',
  contacted_date TEXT DEFAULT '',
  inspection_date TEXT DEFAULT '',
  work_auth_date TEXT DEFAULT '',
  start_date TEXT DEFAULT '',
  cos_date TEXT DEFAULT '',
  completion_date TEXT DEFAULT '',
  ready_to_invoice INTEGER DEFAULT 0,
  extraction_required INTEGER DEFAULT 0,
  ongoing_intrusion INTEGER DEFAULT 0,
  drywall_debris INTEGER DEFAULT 0,
  content_manipulation INTEGER DEFAULT 0,
  additional_clients TEXT DEFAULT '[]',
  additional_adjusters TEXT DEFAULT '[]',
  site_contacts TEXT DEFAULT '[]',
  year_built TEXT DEFAULT '',
  org_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_apex_jobs_user_id ON apex_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_apex_jobs_status ON apex_jobs(status);
CREATE INDEX IF NOT EXISTS idx_apex_jobs_source ON apex_jobs(source);
CREATE INDEX IF NOT EXISTS idx_apex_jobs_org_id ON apex_jobs(org_id);

-- ============================================
-- APEX JOB PHASES
-- ============================================
CREATE TABLE IF NOT EXISTS apex_job_phases (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES apex_jobs(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  job_type_code TEXT NOT NULL,
  job_number TEXT NOT NULL,
  phase_status TEXT DEFAULT 'not_started' CHECK(phase_status IN ('not_started', 'in_progress', 'pending_approval', 'approved', 'complete')),
  documents TEXT DEFAULT '[]',
  photos TEXT DEFAULT '[]',
  estimates TEXT DEFAULT '[]',
  payments TEXT DEFAULT '[]',
  labor_log TEXT DEFAULT '[]',
  materials TEXT DEFAULT '[]',
  notes TEXT DEFAULT '',
  drying_logs TEXT DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_apex_job_phases_job_id ON apex_job_phases(job_id);
CREATE INDEX IF NOT EXISTS idx_apex_job_phases_job_type_code ON apex_job_phases(job_type_code);

-- ============================================
-- APEX JOB NUMBER SEQUENCE
-- ============================================
CREATE TABLE IF NOT EXISTS apex_job_number_seq (
  year_month TEXT PRIMARY KEY,
  next_seq INTEGER DEFAULT 1
);

-- ============================================
-- APEX JOB NOTES
-- ============================================
CREATE TABLE IF NOT EXISTS apex_job_notes (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES apex_jobs(id) ON DELETE CASCADE,
  phase_id TEXT,
  subject TEXT DEFAULT '',
  note_type TEXT DEFAULT 'general' CHECK(note_type IN ('general','call','email','site_visit','documentation')),
  content TEXT DEFAULT '',
  author_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_apex_job_notes_job_id ON apex_job_notes(job_id);

-- ============================================
-- APEX JOB ESTIMATES
-- ============================================
CREATE TABLE IF NOT EXISTS apex_job_estimates (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES apex_jobs(id) ON DELETE CASCADE,
  phase_id TEXT,
  estimate_type TEXT DEFAULT 'mitigation' CHECK(estimate_type IN ('mitigation','reconstruction','remediation','abatement','remodel')),
  version INTEGER DEFAULT 1,
  amount REAL DEFAULT 0,
  original_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','submitted','approved','revision_requested','denied')),
  submitted_date TEXT,
  approved_date TEXT,
  file_path TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_apex_job_estimates_job_id ON apex_job_estimates(job_id);

-- ============================================
-- APEX JOB PAYMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS apex_job_payments (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES apex_jobs(id) ON DELETE CASCADE,
  phase_id TEXT,
  estimate_id TEXT,
  amount REAL DEFAULT 0,
  payment_method TEXT DEFAULT 'check' CHECK(payment_method IN ('check','ach','credit','cash')),
  payment_type TEXT DEFAULT 'initial' CHECK(payment_type IN ('initial','progress','supplement','final','deductible')),
  check_number TEXT DEFAULT '',
  received_date TEXT,
  deposited_date TEXT,
  invoice_number TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_apex_job_payments_job_id ON apex_job_payments(job_id);

-- ============================================
-- APEX JOB LABOR
-- ============================================
CREATE TABLE IF NOT EXISTS apex_job_labor (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES apex_jobs(id) ON DELETE CASCADE,
  phase_id TEXT,
  employee_name TEXT DEFAULT '',
  work_date TEXT,
  hours REAL DEFAULT 0,
  hourly_rate REAL DEFAULT 0,
  work_category TEXT DEFAULT 'other' CHECK(work_category IN ('demo','drying','cleanup','monitoring','repair','admin','travel','other')),
  description TEXT DEFAULT '',
  billable INTEGER DEFAULT 1,
  author_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_apex_job_labor_job_id ON apex_job_labor(job_id);

-- ============================================
-- APEX JOB RECEIPTS
-- ============================================
CREATE TABLE IF NOT EXISTS apex_job_receipts (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES apex_jobs(id) ON DELETE CASCADE,
  phase_id TEXT,
  amount REAL DEFAULT 0,
  expense_category TEXT DEFAULT 'materials' CHECK(expense_category IN ('materials','equipment_rental','subcontractor','disposal','permit','supplies','other')),
  description TEXT DEFAULT '',
  vendor TEXT DEFAULT '',
  paid_by TEXT DEFAULT 'company_card' CHECK(paid_by IN ('company_card','cash','personal_reimbursement','vendor_invoice')),
  reimbursable INTEGER DEFAULT 0,
  expense_date TEXT,
  file_path TEXT DEFAULT '',
  author_id TEXT,
  document_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_apex_job_receipts_job_id ON apex_job_receipts(job_id);

-- ============================================
-- APEX JOB WORK ORDERS
-- ============================================
CREATE TABLE IF NOT EXISTS apex_job_work_orders (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES apex_jobs(id) ON DELETE CASCADE,
  phase_id TEXT,
  wo_number TEXT DEFAULT '',
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  budget_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','approved','in_progress','completed','cancelled')),
  file_path TEXT DEFAULT '',
  author_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_apex_job_work_orders_job_id ON apex_job_work_orders(job_id);

-- ============================================
-- APEX JOB CONTACTS (junction)
-- ============================================
CREATE TABLE IF NOT EXISTS apex_job_contacts (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES apex_jobs(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL,
  role TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_apex_job_contacts_job_id ON apex_job_contacts(job_id);

-- ============================================
-- APEX JOB ACTIVITY
-- ============================================
CREATE TABLE IF NOT EXISTS apex_job_activity (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES apex_jobs(id) ON DELETE CASCADE,
  event_type TEXT DEFAULT 'note' CHECK(event_type IN ('note','estimate','payment','labor','receipt','work_order','media','status')),
  description TEXT DEFAULT '',
  entity_type TEXT DEFAULT '',
  entity_id TEXT DEFAULT '',
  old_value TEXT DEFAULT '',
  new_value TEXT DEFAULT '',
  amount REAL,
  actor_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_apex_job_activity_job_id ON apex_job_activity(job_id);

-- ============================================
-- PHASE ASSIGNMENTS (RBAC)
-- ============================================
CREATE TABLE IF NOT EXISTS phase_assignments (
  id TEXT PRIMARY KEY,
  phase_id TEXT NOT NULL REFERENCES apex_job_phases(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignment_role TEXT DEFAULT 'tech',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(phase_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_phase_assignments_phase_id ON phase_assignments(phase_id);
CREATE INDEX IF NOT EXISTS idx_phase_assignments_user_id ON phase_assignments(user_id);

-- ============================================
-- APEX ORGANIZATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS apex_organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK for apex_jobs.org_id
DO $$ BEGIN
  ALTER TABLE apex_jobs ADD CONSTRAINT fk_apex_jobs_org FOREIGN KEY (org_id) REFERENCES apex_organizations(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- APEX ORG MEMBERS
-- ============================================
CREATE TABLE IF NOT EXISTS apex_org_members (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES apex_organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('management','office_coordinator','project_manager','estimator','field_tech')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_apex_org_members_org_id ON apex_org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_apex_org_members_user_id ON apex_org_members(user_id);

-- ============================================
-- CRM: ORGANIZATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS apex_crm_organizations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES apex_organizations(id),
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  website TEXT DEFAULT '',
  address_line1 TEXT DEFAULT '',
  address_line2 TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  zip TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_orgs_org_id ON apex_crm_organizations(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_orgs_name ON apex_crm_organizations(org_id, name);

-- ============================================
-- CRM: ORG TAGS
-- ============================================
CREATE TABLE IF NOT EXISTS apex_crm_org_tags (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES apex_organizations(id),
  name TEXT NOT NULL,
  color TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, name)
);
CREATE INDEX IF NOT EXISTS idx_crm_org_tags_org ON apex_crm_org_tags(org_id);

-- ============================================
-- CRM: ORG TAG MAP
-- ============================================
CREATE TABLE IF NOT EXISTS apex_crm_organization_tag_map (
  crm_organization_id TEXT NOT NULL REFERENCES apex_crm_organizations(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES apex_crm_org_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (crm_organization_id, tag_id)
);

-- ============================================
-- CRM: CONTACTS
-- ============================================
CREATE TABLE IF NOT EXISTS apex_crm_contacts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES apex_organizations(id),
  first_name TEXT NOT NULL,
  last_name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  phone_alt TEXT DEFAULT '',
  address_line1 TEXT DEFAULT '',
  address_line2 TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  zip TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_org ON apex_crm_contacts(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_name ON apex_crm_contacts(org_id, last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON apex_crm_contacts(org_id, email);

-- ============================================
-- CRM: CONTACT TAGS
-- ============================================
CREATE TABLE IF NOT EXISTS apex_crm_contact_tags (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES apex_organizations(id),
  name TEXT NOT NULL,
  color TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, name)
);

-- ============================================
-- CRM: CONTACT TAG MAP
-- ============================================
CREATE TABLE IF NOT EXISTS apex_crm_contact_tag_map (
  contact_id TEXT NOT NULL REFERENCES apex_crm_contacts(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES apex_crm_contact_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, tag_id)
);

-- ============================================
-- CRM: CONTACT ORG MEMBERSHIPS
-- ============================================
CREATE TABLE IF NOT EXISTS apex_crm_contact_org_memberships (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL REFERENCES apex_crm_contacts(id) ON DELETE CASCADE,
  crm_organization_id TEXT NOT NULL REFERENCES apex_crm_organizations(id) ON DELETE CASCADE,
  role_title TEXT DEFAULT '',
  is_primary INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, crm_organization_id)
);
CREATE INDEX IF NOT EXISTS idx_contact_org_contact ON apex_crm_contact_org_memberships(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_org_org ON apex_crm_contact_org_memberships(crm_organization_id);

-- ============================================
-- CRM: JOB CONTACTS
-- ============================================
CREATE TABLE IF NOT EXISTS apex_crm_job_contacts (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES apex_jobs(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL REFERENCES apex_crm_contacts(id) ON DELETE CASCADE,
  crm_organization_id TEXT REFERENCES apex_crm_organizations(id),
  job_role TEXT NOT NULL DEFAULT 'other',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, contact_id, job_role)
);
CREATE INDEX IF NOT EXISTS idx_crm_job_contacts_job ON apex_crm_job_contacts(job_id);
CREATE INDEX IF NOT EXISTS idx_crm_job_contacts_contact ON apex_crm_job_contacts(contact_id);

-- ============================================
-- INVENTORY: CONSUMABLE ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS apex_consumable_items (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES apex_organizations(id),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'misc',
  unit_of_measure TEXT NOT NULL DEFAULT 'each',
  unit_cost REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT REFERENCES users(id),
  UNIQUE(org_id, name)
);
CREATE INDEX IF NOT EXISTS idx_consumables_org ON apex_consumable_items(org_id);
CREATE INDEX IF NOT EXISTS idx_consumables_category ON apex_consumable_items(org_id, category);

-- ============================================
-- INVENTORY: PURCHASES
-- ============================================
CREATE TABLE IF NOT EXISTS apex_inventory_purchases (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES apex_organizations(id),
  item_id TEXT NOT NULL REFERENCES apex_consumable_items(id),
  quantity REAL NOT NULL DEFAULT 0,
  unit_cost REAL DEFAULT 0,
  total_cost REAL DEFAULT 0,
  vendor_name TEXT DEFAULT '',
  vendor_org_id TEXT REFERENCES apex_crm_organizations(id),
  purchase_date TEXT NOT NULL,
  receipt_id TEXT,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_inv_purchases_org ON apex_inventory_purchases(org_id);
CREATE INDEX IF NOT EXISTS idx_inv_purchases_item ON apex_inventory_purchases(item_id);
CREATE INDEX IF NOT EXISTS idx_inv_purchases_date ON apex_inventory_purchases(purchase_date);

-- ============================================
-- INVENTORY: LEVELS
-- ============================================
CREATE TABLE IF NOT EXISTS apex_inventory_levels (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES apex_organizations(id),
  item_id TEXT NOT NULL REFERENCES apex_consumable_items(id),
  quantity_on_hand REAL NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, item_id)
);

-- ============================================
-- INVENTORY: JOB MATERIAL ALLOCATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS apex_job_material_allocations (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES apex_jobs(id) ON DELETE CASCADE,
  phase_id TEXT REFERENCES apex_job_phases(id),
  item_id TEXT NOT NULL REFERENCES apex_consumable_items(id),
  quantity_used REAL NOT NULL DEFAULT 0,
  unit_cost_at_use REAL DEFAULT 0,
  total_cost REAL DEFAULT 0,
  used_date TEXT,
  used_by TEXT REFERENCES users(id),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_job_materials_job ON apex_job_material_allocations(job_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_item ON apex_job_material_allocations(item_id);

-- ============================================
-- JOB COSTING: SUPPLEMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS apex_job_supplements (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES apex_jobs(id) ON DELETE CASCADE,
  supplement_number INTEGER NOT NULL,
  description TEXT DEFAULT '',
  amount_requested REAL DEFAULT 0,
  amount_approved REAL,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','submitted','approved','denied','partial')),
  submitted_date TEXT,
  approved_date TEXT,
  document_id TEXT,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT REFERENCES users(id),
  UNIQUE(job_id, supplement_number)
);
CREATE INDEX IF NOT EXISTS idx_supplements_job ON apex_job_supplements(job_id);

-- ============================================
-- JOB COSTING: SUB INVOICES
-- ============================================
CREATE TABLE IF NOT EXISTS apex_sub_invoices (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES apex_jobs(id) ON DELETE CASCADE,
  phase_id TEXT REFERENCES apex_job_phases(id),
  sub_org_id TEXT REFERENCES apex_crm_organizations(id),
  sub_contact_id TEXT REFERENCES apex_crm_contacts(id),
  work_order_id TEXT REFERENCES apex_job_work_orders(id),
  invoice_number TEXT DEFAULT '',
  description TEXT DEFAULT '',
  amount REAL NOT NULL DEFAULT 0,
  retainage_pct REAL DEFAULT 0,
  retainage_amount REAL DEFAULT 0,
  amount_paid REAL DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','partial_paid','paid','disputed')),
  invoice_date TEXT,
  due_date TEXT,
  paid_date TEXT,
  document_id TEXT,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_sub_invoices_job ON apex_sub_invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_sub_invoices_sub ON apex_sub_invoices(sub_org_id);
CREATE INDEX IF NOT EXISTS idx_sub_invoices_status ON apex_sub_invoices(status);

-- ============================================
-- JOB COSTING: FUEL/MILEAGE
-- ============================================
CREATE TABLE IF NOT EXISTS apex_job_fuel_mileage (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES apex_jobs(id) ON DELETE CASCADE,
  employee_id TEXT REFERENCES users(id),
  date TEXT NOT NULL,
  type TEXT DEFAULT 'mileage' CHECK(type IN ('fuel','mileage')),
  miles REAL DEFAULT 0,
  mileage_rate REAL DEFAULT 0,
  fuel_cost REAL DEFAULT 0,
  total_cost REAL DEFAULT 0,
  document_id TEXT,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fuel_mileage_job ON apex_job_fuel_mileage(job_id);
CREATE INDEX IF NOT EXISTS idx_fuel_mileage_employee ON apex_job_fuel_mileage(employee_id);

-- ============================================
-- DOCUMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS apex_documents (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES apex_organizations(id),
  job_id TEXT NOT NULL REFERENCES apex_jobs(id) ON DELETE CASCADE,
  phase_id TEXT REFERENCES apex_job_phases(id),
  entity_type TEXT DEFAULT 'job',
  entity_id TEXT DEFAULT '',
  document_type TEXT NOT NULL DEFAULT 'other',
  title TEXT DEFAULT '',
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  mime_type TEXT DEFAULT '',
  description TEXT DEFAULT '',
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by TEXT REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_docs_job ON apex_documents(job_id);
CREATE INDEX IF NOT EXISTS idx_docs_type ON apex_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_docs_entity ON apex_documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_docs_org ON apex_documents(org_id);

-- ============================================
-- WORKFLOW: TEMPLATES
-- ============================================
CREATE TABLE IF NOT EXISTS apex_workflow_templates (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES apex_organizations(id),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  job_types TEXT DEFAULT '[]',
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
  version INTEGER DEFAULT 1,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_org ON apex_workflow_templates(org_id);

-- ============================================
-- WORKFLOW: TEMPLATE STEPS
-- ============================================
CREATE TABLE IF NOT EXISTS apex_workflow_template_steps (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES apex_workflow_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  sequence_number INTEGER NOT NULL,
  assigned_role TEXT NOT NULL,
  is_required INTEGER DEFAULT 1,
  allow_override INTEGER DEFAULT 0,
  estimated_duration_hours REAL DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, sequence_number)
);
CREATE INDEX IF NOT EXISTS idx_wf_template_steps_template ON apex_workflow_template_steps(template_id);

-- ============================================
-- WORKFLOW: STEP GATES
-- ============================================
CREATE TABLE IF NOT EXISTS apex_workflow_step_gates (
  id TEXT PRIMARY KEY,
  step_id TEXT NOT NULL REFERENCES apex_workflow_template_steps(id) ON DELETE CASCADE,
  gate_type TEXT NOT NULL CHECK(gate_type IN ('previous_step','specific_step','field_not_empty','document_exists','manual_approval','drying_standard_met','estimate_exists','payment_received','custom')),
  gate_config TEXT DEFAULT '{}',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wf_step_gates_step ON apex_workflow_step_gates(step_id);

-- ============================================
-- WORKFLOW: JOB WORKFLOWS
-- ============================================
CREATE TABLE IF NOT EXISTS apex_job_workflows (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES apex_jobs(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES apex_workflow_templates(id),
  phase_id TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','complete','cancelled')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(job_id, template_id, phase_id)
);
CREATE INDEX IF NOT EXISTS idx_job_workflows_job ON apex_job_workflows(job_id);

-- ============================================
-- WORKFLOW: JOB WORKFLOW STEPS
-- ============================================
CREATE TABLE IF NOT EXISTS apex_job_workflow_steps (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES apex_job_workflows(id) ON DELETE CASCADE,
  template_step_id TEXT NOT NULL REFERENCES apex_workflow_template_steps(id),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  sequence_number INTEGER NOT NULL,
  assigned_role TEXT NOT NULL,
  assigned_user_id TEXT REFERENCES users(id),
  status TEXT DEFAULT 'locked' CHECK(status IN ('locked','available','in_progress','complete','skipped','overridden')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by TEXT REFERENCES users(id),
  override_reason TEXT DEFAULT '',
  overridden_by TEXT REFERENCES users(id),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_job_wf_steps_workflow ON apex_job_workflow_steps(workflow_id);

-- ============================================
-- WORKFLOW: JOB WORKFLOW STEP GATES
-- ============================================
CREATE TABLE IF NOT EXISTS apex_job_workflow_step_gates (
  id TEXT PRIMARY KEY,
  job_step_id TEXT NOT NULL REFERENCES apex_job_workflow_steps(id) ON DELETE CASCADE,
  gate_type TEXT NOT NULL,
  gate_config TEXT DEFAULT '{}',
  description TEXT DEFAULT '',
  is_met INTEGER DEFAULT 0,
  met_at TIMESTAMPTZ,
  met_by TEXT REFERENCES users(id),
  override INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_job_wf_step_gates_step ON apex_job_workflow_step_gates(job_step_id);

-- ============================================
-- DRYING LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS drying_logs (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL UNIQUE REFERENCES apex_jobs(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'complete')),
  setup_complete INTEGER DEFAULT 0,
  next_ref_number INTEGER DEFAULT 1,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_drying_logs_job_id ON drying_logs(job_id);

-- ============================================
-- DRYING CHAMBERS
-- ============================================
CREATE TABLE IF NOT EXISTS drying_chambers (
  id TEXT PRIMARY KEY,
  log_id TEXT NOT NULL REFERENCES drying_logs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '',
  position INTEGER DEFAULT 0,
  floor_level TEXT DEFAULT 'main_level',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_drying_chambers_log_id ON drying_chambers(log_id);

-- ============================================
-- DRYING ROOMS
-- ============================================
CREATE TABLE IF NOT EXISTS drying_rooms (
  id TEXT PRIMARY KEY,
  chamber_id TEXT NOT NULL REFERENCES drying_chambers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_drying_rooms_chamber_id ON drying_rooms(chamber_id);

-- ============================================
-- DRYING REF POINTS
-- ============================================
CREATE TABLE IF NOT EXISTS drying_ref_points (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES drying_rooms(id) ON DELETE CASCADE,
  log_id TEXT NOT NULL REFERENCES drying_logs(id) ON DELETE CASCADE,
  ref_number INTEGER NOT NULL,
  material_code TEXT NOT NULL DEFAULT '',
  label TEXT DEFAULT '',
  demolished_at TIMESTAMPTZ,
  demolished_visit_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(log_id, ref_number)
);
CREATE INDEX IF NOT EXISTS idx_drying_ref_points_room_id ON drying_ref_points(room_id);
CREATE INDEX IF NOT EXISTS idx_drying_ref_points_log_id ON drying_ref_points(log_id);

-- ============================================
-- DRYING BASELINES
-- ============================================
CREATE TABLE IF NOT EXISTS drying_baselines (
  id TEXT PRIMARY KEY,
  log_id TEXT NOT NULL REFERENCES drying_logs(id) ON DELETE CASCADE,
  material_code TEXT NOT NULL,
  baseline_value REAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(log_id, material_code)
);
CREATE INDEX IF NOT EXISTS idx_drying_baselines_log_id ON drying_baselines(log_id);

-- ============================================
-- DRYING VISITS
-- ============================================
CREATE TABLE IF NOT EXISTS drying_visits (
  id TEXT PRIMARY KEY,
  log_id TEXT NOT NULL REFERENCES drying_logs(id) ON DELETE CASCADE,
  visit_number INTEGER NOT NULL,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(log_id, visit_number)
);
CREATE INDEX IF NOT EXISTS idx_drying_visits_log_id ON drying_visits(log_id);

-- ============================================
-- DRYING ATMOSPHERIC READINGS
-- ============================================
CREATE TABLE IF NOT EXISTS drying_atmospheric_readings (
  id TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL REFERENCES drying_visits(id) ON DELETE CASCADE,
  reading_type TEXT NOT NULL CHECK(reading_type IN ('chamber_intake', 'chamber_dehu_exhaust', 'dehu_exhaust', 'unaffected', 'outside')),
  chamber_id TEXT REFERENCES drying_chambers(id) ON DELETE SET NULL,
  dehu_number INTEGER,
  temp_f REAL,
  rh_percent REAL,
  gpp REAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_drying_atmospheric_visit_id ON drying_atmospheric_readings(visit_id);

-- ============================================
-- DRYING MOISTURE READINGS
-- ============================================
CREATE TABLE IF NOT EXISTS drying_moisture_readings (
  id TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL REFERENCES drying_visits(id) ON DELETE CASCADE,
  ref_point_id TEXT NOT NULL REFERENCES drying_ref_points(id) ON DELETE CASCADE,
  reading_value REAL,
  meets_dry_standard INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(visit_id, ref_point_id)
);
CREATE INDEX IF NOT EXISTS idx_drying_moisture_visit_id ON drying_moisture_readings(visit_id);
CREATE INDEX IF NOT EXISTS idx_drying_moisture_ref_point_id ON drying_moisture_readings(ref_point_id);

-- ============================================
-- DRYING EQUIPMENT
-- ============================================
CREATE TABLE IF NOT EXISTS drying_equipment (
  id TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL REFERENCES drying_visits(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL REFERENCES drying_rooms(id) ON DELETE CASCADE,
  equipment_type TEXT NOT NULL DEFAULT 'AM',
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_drying_equipment_visit_id ON drying_equipment(visit_id);
CREATE INDEX IF NOT EXISTS idx_drying_equipment_room_id ON drying_equipment(room_id);

-- ============================================
-- DRYING VISIT NOTES
-- ============================================
CREATE TABLE IF NOT EXISTS drying_visit_notes (
  id TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL REFERENCES drying_visits(id) ON DELETE CASCADE,
  content TEXT DEFAULT '',
  photos TEXT DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_drying_visit_notes_visit_id ON drying_visit_notes(visit_id);

-- ============================================
-- AREAS (Life Areas for task tagging)
-- ============================================

CREATE TABLE IF NOT EXISTS areas (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#FF8C00',
    icon VARCHAR(10) DEFAULT '📁',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_areas_user ON areas(user_id);

-- Add area_id to task_items
ALTER TABLE task_items ADD COLUMN IF NOT EXISTS area_id TEXT REFERENCES areas(id) ON DELETE SET NULL;

-- ============================================
-- ROLES (RBAC)
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default roles
INSERT INTO roles (name, display_name, description, permissions, is_default, is_system) VALUES
  ('developer', 'Developer', 'Full system access', '{"*": ["*"]}', false, true),
  ('management', 'Management', 'Full business access', '{"tasks": ["create","read","update","delete"], "notes": ["create","read","update","delete"], "people": ["create","read","update","delete"], "bases": ["create","read","update","delete"], "records": ["create","read","update","delete"], "calendar": ["create","read","update","delete"], "jobs": ["create","read","update","delete"], "users": ["create","read","update","delete"], "api_keys": ["create","read","update","delete"], "org": ["create","read","update","delete"]}', false, true),
  ('office_coordinator', 'Office Coordinator', 'Office operations access', '{"tasks": ["create","read","update","delete"], "notes": ["create","read","update","delete"], "people": ["create","read","update","delete"], "bases": ["create","read","update","delete"], "records": ["create","read","update","delete"], "calendar": ["create","read","update","delete"], "jobs": ["create","read","update","delete"], "users": ["read","update"], "api_keys": ["read"], "org": ["read"]}', false, true),
  ('project_manager', 'Project Manager', 'Project and job management', '{"tasks": ["create","read","update","delete"], "notes": ["create","read","update"], "people": ["create","read","update"], "bases": ["read"], "records": ["create","read","update"], "calendar": ["create","read","update"], "jobs": ["create","read","update"], "users": ["read"], "api_keys": ["read"], "org": ["read"]}', false, true),
  ('estimator', 'Estimator', 'Estimating and job access', '{"tasks": ["create","read","update"], "notes": ["create","read","update"], "people": ["read"], "bases": ["read"], "records": ["create","read","update"], "calendar": ["create","read","update"], "jobs": ["create","read","update"], "users": ["read"], "api_keys": ["read"], "org": ["read"]}', false, true),
  ('field_tech', 'Field Tech', 'Field operations access', '{"tasks": ["create","read","update"], "notes": ["create","read","update"], "people": ["read"], "bases": ["read"], "records": ["read"], "calendar": ["read"], "jobs": ["read"], "users": ["read"], "api_keys": ["read"], "org": ["read"]}', true, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- ROLE DEFAULTS (for revert)
-- ============================================
CREATE TABLE IF NOT EXISTS role_defaults (
  role_name TEXT PRIMARY KEY,
  permissions JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed role defaults (same as initial role permissions)
INSERT INTO role_defaults (role_name, permissions) VALUES
  ('developer', '{"*": ["*"]}'),
  ('management', '{"tasks": ["create","read","update","delete"], "notes": ["create","read","update","delete"], "people": ["create","read","update","delete"], "bases": ["create","read","update","delete"], "records": ["create","read","update","delete"], "calendar": ["create","read","update","delete"], "jobs": ["create","read","update","delete"], "users": ["create","read","update","delete"], "api_keys": ["create","read","update","delete"], "org": ["create","read","update","delete"]}'),
  ('office_coordinator', '{"tasks": ["create","read","update","delete"], "notes": ["create","read","update","delete"], "people": ["create","read","update","delete"], "bases": ["create","read","update","delete"], "records": ["create","read","update","delete"], "calendar": ["create","read","update","delete"], "jobs": ["create","read","update","delete"], "users": ["read","update"], "api_keys": ["read"], "org": ["read"]}'),
  ('project_manager', '{"tasks": ["create","read","update","delete"], "notes": ["create","read","update"], "people": ["create","read","update"], "bases": ["read"], "records": ["create","read","update"], "calendar": ["create","read","update"], "jobs": ["create","read","update"], "users": ["read"], "api_keys": ["read"], "org": ["read"]}'),
  ('estimator', '{"tasks": ["create","read","update"], "notes": ["create","read","update"], "people": ["read"], "bases": ["read"], "records": ["create","read","update"], "calendar": ["create","read","update"], "jobs": ["create","read","update"], "users": ["read"], "api_keys": ["read"], "org": ["read"]}'),
  ('field_tech', '{"tasks": ["create","read","update"], "notes": ["create","read","update"], "people": ["read"], "bases": ["read"], "records": ["read"], "calendar": ["read"], "jobs": ["read"], "users": ["read"], "api_keys": ["read"], "org": ["read"]}')
ON CONFLICT (role_name) DO NOTHING;

-- ============================================
-- API KEYS: scopes column
-- ============================================
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS scopes JSONB DEFAULT '["*:*"]';

-- ============================================
-- USERS: status column
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- ============================================
-- AUDIT LOG
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  actor_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id);

-- ============================================
-- DONE
-- ============================================
