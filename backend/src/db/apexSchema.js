const db = require('./schema');

// ============================================
// APEX JOBS TABLE (parent — one per claim/property)
// ============================================
const apexJobsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_jobs'").get();
if (!apexJobsTable) {
  console.log('Creating apex_jobs table...');
  db.exec(`
    CREATE TABLE apex_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      name TEXT NOT NULL,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'pending_insurance', 'complete', 'archived')),
      -- Client
      client_name TEXT NOT NULL,
      client_phone TEXT DEFAULT '',
      client_email TEXT DEFAULT '',
      client_street TEXT DEFAULT '',
      client_city TEXT DEFAULT '',
      client_state TEXT DEFAULT '',
      client_zip TEXT DEFAULT '',
      client_relation TEXT DEFAULT 'owner',
      -- Property
      same_as_client INTEGER DEFAULT 0,
      prop_street TEXT DEFAULT '',
      prop_city TEXT DEFAULT '',
      prop_state TEXT DEFAULT '',
      prop_zip TEXT DEFAULT '',
      prop_type TEXT DEFAULT 'residential',
      occ_name TEXT DEFAULT '',
      occ_phone TEXT DEFAULT '',
      occ_email TEXT DEFAULT '',
      access_info TEXT DEFAULT '',
      -- Insurance
      ins_carrier TEXT DEFAULT '',
      ins_claim TEXT DEFAULT '',
      ins_policy TEXT DEFAULT '',
      deductible REAL DEFAULT 0,
      adj_name TEXT DEFAULT '',
      adj_phone TEXT DEFAULT '',
      adj_email TEXT DEFAULT '',
      -- Loss
      loss_type TEXT DEFAULT '',
      loss_date TEXT DEFAULT '',
      water_category TEXT DEFAULT '',
      damage_class TEXT DEFAULT '',
      areas_affected TEXT DEFAULT '',
      hazards TEXT DEFAULT '',
      loss_description TEXT DEFAULT '',
      scope_notes TEXT DEFAULT '',
      urgent INTEGER DEFAULT 0,
      -- Assignment (JSON arrays stored as TEXT)
      mitigation_pm TEXT DEFAULT '[]',
      reconstruction_pm TEXT DEFAULT '[]',
      estimator TEXT DEFAULT '[]',
      project_coordinator TEXT DEFAULT '[]',
      mitigation_techs TEXT DEFAULT '[]',
      -- Tracking
      referral_source TEXT DEFAULT '',
      how_heard TEXT DEFAULT '',
      internal_notes TEXT DEFAULT '',
      -- Source
      source TEXT DEFAULT 'local',
      zoho_id TEXT DEFAULT '',
      -- Timestamps
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_apex_jobs_user_id ON apex_jobs(user_id)`);
  db.exec(`CREATE INDEX idx_apex_jobs_status ON apex_jobs(status)`);
  db.exec(`CREATE INDEX idx_apex_jobs_source ON apex_jobs(source)`);
  console.log('Apex jobs table created');
}

// ============================================
// APEX JOB PHASES TABLE (child — one per job type)
// ============================================
const apexJobPhasesTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_job_phases'").get();
if (!apexJobPhasesTable) {
  console.log('Creating apex_job_phases table...');
  db.exec(`
    CREATE TABLE apex_job_phases (
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
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_apex_job_phases_job_id ON apex_job_phases(job_id)`);
  db.exec(`CREATE INDEX idx_apex_job_phases_job_type_code ON apex_job_phases(job_type_code)`);
  console.log('Apex job phases table created');
}

// ============================================
// APEX JOB NUMBER SEQUENCE TABLE
// ============================================
const apexJobNumberSeqTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_job_number_seq'").get();
if (!apexJobNumberSeqTable) {
  console.log('Creating apex_job_number_seq table...');
  db.exec(`
    CREATE TABLE apex_job_number_seq (
      year_month TEXT PRIMARY KEY,
      next_seq INTEGER DEFAULT 1
    )
  `);
  console.log('Apex job number sequence table created');
}

// ============================================
// ALTER apex_jobs — add milestone date columns
// ============================================
const dateColumns = [
  'contacted_date', 'inspection_date', 'work_auth_date',
  'start_date', 'cos_date', 'completion_date',
  'ready_to_invoice'
];
for (const col of dateColumns) {
  const colExists = db.prepare(
    `SELECT COUNT(*) as cnt FROM pragma_table_info('apex_jobs') WHERE name = ?`
  ).get(col);
  if (!colExists || colExists.cnt === 0) {
    const colType = col === 'ready_to_invoice' ? 'INTEGER DEFAULT 0' : "TEXT DEFAULT ''";
    db.exec(`ALTER TABLE apex_jobs ADD COLUMN ${col} ${colType}`);
    console.log(`Added column ${col} to apex_jobs`);
  }
}

// ============================================
// ALTER apex_jobs — add loss info flag columns
// ============================================
const flagColumns = [
  'extraction_required', 'ongoing_intrusion', 'drywall_debris', 'content_manipulation'
];
for (const col of flagColumns) {
  const colExists = db.prepare(
    `SELECT COUNT(*) as cnt FROM pragma_table_info('apex_jobs') WHERE name = ?`
  ).get(col);
  if (!colExists || colExists.cnt === 0) {
    db.exec(`ALTER TABLE apex_jobs ADD COLUMN ${col} INTEGER DEFAULT 0`);
    console.log(`Added column ${col} to apex_jobs`);
  }
}

// ============================================
// APEX JOB NOTES TABLE
// ============================================
const apexJobNotesTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_job_notes'").get();
if (!apexJobNotesTable) {
  console.log('Creating apex_job_notes table...');
  db.exec(`
    CREATE TABLE apex_job_notes (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES apex_jobs(id) ON DELETE CASCADE,
      phase_id TEXT,
      subject TEXT DEFAULT '',
      note_type TEXT DEFAULT 'general' CHECK(note_type IN ('general','call','email','site_visit','documentation')),
      content TEXT DEFAULT '',
      author_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_apex_job_notes_job_id ON apex_job_notes(job_id)`);
  console.log('Apex job notes table created');
}

// ============================================
// APEX JOB ESTIMATES TABLE
// ============================================
const apexJobEstimatesTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_job_estimates'").get();
if (!apexJobEstimatesTable) {
  console.log('Creating apex_job_estimates table...');
  db.exec(`
    CREATE TABLE apex_job_estimates (
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
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_apex_job_estimates_job_id ON apex_job_estimates(job_id)`);
  console.log('Apex job estimates table created');
}

// ============================================
// APEX JOB PAYMENTS TABLE
// ============================================
const apexJobPaymentsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_job_payments'").get();
if (!apexJobPaymentsTable) {
  console.log('Creating apex_job_payments table...');
  db.exec(`
    CREATE TABLE apex_job_payments (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES apex_jobs(id) ON DELETE CASCADE,
      estimate_id TEXT,
      amount REAL DEFAULT 0,
      payment_method TEXT DEFAULT 'check' CHECK(payment_method IN ('check','ach','credit','cash')),
      payment_type TEXT DEFAULT 'initial' CHECK(payment_type IN ('initial','progress','supplement','final','deductible')),
      check_number TEXT DEFAULT '',
      received_date TEXT,
      deposited_date TEXT,
      invoice_number TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_apex_job_payments_job_id ON apex_job_payments(job_id)`);
  console.log('Apex job payments table created');
}

// ============================================
// APEX JOB LABOR TABLE
// ============================================
const apexJobLaborTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_job_labor'").get();
if (!apexJobLaborTable) {
  console.log('Creating apex_job_labor table...');
  db.exec(`
    CREATE TABLE apex_job_labor (
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
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_apex_job_labor_job_id ON apex_job_labor(job_id)`);
  console.log('Apex job labor table created');
}

// ============================================
// APEX JOB RECEIPTS TABLE
// ============================================
const apexJobReceiptsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_job_receipts'").get();
if (!apexJobReceiptsTable) {
  console.log('Creating apex_job_receipts table...');
  db.exec(`
    CREATE TABLE apex_job_receipts (
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
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_apex_job_receipts_job_id ON apex_job_receipts(job_id)`);
  console.log('Apex job receipts table created');
}

// ============================================
// APEX JOB WORK ORDERS TABLE
// ============================================
const apexJobWorkOrdersTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_job_work_orders'").get();
if (!apexJobWorkOrdersTable) {
  console.log('Creating apex_job_work_orders table...');
  db.exec(`
    CREATE TABLE apex_job_work_orders (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES apex_jobs(id) ON DELETE CASCADE,
      phase_id TEXT,
      wo_number TEXT DEFAULT '',
      title TEXT DEFAULT '',
      description TEXT DEFAULT '',
      budget_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','approved','in_progress','completed','cancelled')),
      file_path TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_apex_job_work_orders_job_id ON apex_job_work_orders(job_id)`);
  console.log('Apex job work orders table created');
}

// ============================================
// APEX JOB CONTACTS (junction table)
// ============================================
const apexJobContactsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_job_contacts'").get();
if (!apexJobContactsTable) {
  console.log('Creating apex_job_contacts table...');
  db.exec(`
    CREATE TABLE apex_job_contacts (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES apex_jobs(id) ON DELETE CASCADE,
      contact_id TEXT NOT NULL,
      role TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_apex_job_contacts_job_id ON apex_job_contacts(job_id)`);
  console.log('Apex job contacts table created');
}

// ============================================
// APEX JOB ACTIVITY TABLE
// ============================================
const apexJobActivityTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_job_activity'").get();
if (!apexJobActivityTable) {
  console.log('Creating apex_job_activity table...');
  db.exec(`
    CREATE TABLE apex_job_activity (
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
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_apex_job_activity_job_id ON apex_job_activity(job_id)`);
  console.log('Apex job activity table created');
}

// ============================================
// ALTER apex_jobs — add multi-contact JSON columns
// ============================================
try {
  db.exec(`ALTER TABLE apex_jobs ADD COLUMN additional_clients TEXT DEFAULT '[]'`);
  console.log('Added additional_clients column to apex_jobs');
} catch (e) {
  // Column already exists, ignore
}

try {
  db.exec(`ALTER TABLE apex_jobs ADD COLUMN additional_adjusters TEXT DEFAULT '[]'`);
  console.log('Added additional_adjusters column to apex_jobs');
} catch (e) {
  // Column already exists, ignore
}

try {
  db.exec(`ALTER TABLE apex_jobs ADD COLUMN site_contacts TEXT DEFAULT '[]'`);
  console.log('Added site_contacts column to apex_jobs');
} catch (e) {
  // Column already exists, ignore
}

try {
  db.exec('ALTER TABLE apex_jobs ADD COLUMN year_built TEXT DEFAULT ""');
  console.log('Added year_built column to apex_jobs');
} catch (e) {
  // Column already exists, ignore
}

try {
  db.exec('ALTER TABLE apex_jobs ADD COLUMN client_unit TEXT DEFAULT ""');
  console.log('Added client_unit column to apex_jobs');
} catch (e) {
  // Column already exists, ignore
}

try {
  db.exec('ALTER TABLE apex_jobs ADD COLUMN prop_unit TEXT DEFAULT ""');
  console.log('Added prop_unit column to apex_jobs');
} catch (e) {
  // Column already exists, ignore
}

// ============================================
// PHASE ASSIGNMENTS TABLE (RBAC — user-to-phase mapping)
// ============================================
const phaseAssignmentsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='phase_assignments'").get();
if (!phaseAssignmentsTable) {
  console.log('Creating phase_assignments table...');
  db.exec(`
    CREATE TABLE phase_assignments (
      id TEXT PRIMARY KEY,
      phase_id TEXT NOT NULL REFERENCES apex_job_phases(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assignment_role TEXT DEFAULT 'tech',
      assigned_at TEXT DEFAULT (datetime('now')),
      UNIQUE(phase_id, user_id)
    )
  `);
  db.exec(`CREATE INDEX idx_phase_assignments_phase_id ON phase_assignments(phase_id)`);
  db.exec(`CREATE INDEX idx_phase_assignments_user_id ON phase_assignments(user_id)`);
  console.log('Phase assignments table created');
}

// ============================================
// ALTER apex_job_payments — add phase_id column
// ============================================
try {
  db.exec("ALTER TABLE apex_job_payments ADD COLUMN phase_id TEXT");
  console.log('Added phase_id column to apex_job_payments');
} catch (e) {
  // Column already exists, ignore
}

// ============================================
// ALTER labor/receipts/work_orders — add author_id column
// ============================================
try {
  db.exec("ALTER TABLE apex_job_labor ADD COLUMN author_id TEXT");
  console.log('Added author_id column to apex_job_labor');
} catch (e) {
  // Column already exists, ignore
}

try {
  db.exec("ALTER TABLE apex_job_receipts ADD COLUMN author_id TEXT");
  console.log('Added author_id column to apex_job_receipts');
} catch (e) {
  // Column already exists, ignore
}

try {
  db.exec("ALTER TABLE apex_job_work_orders ADD COLUMN author_id TEXT");
  console.log('Added author_id column to apex_job_work_orders');
} catch (e) {
  // Column already exists, ignore
}

// ============================================
// APEX ORGANIZATIONS TABLE
// ============================================
const apexOrgsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_organizations'").get();
if (!apexOrgsTable) {
  console.log('Creating apex_organizations table...');
  db.exec(`
    CREATE TABLE apex_organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  console.log('Apex organizations table created');
}

// ============================================
// APEX ORG MEMBERS TABLE
// ============================================
const apexOrgMembersTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_org_members'").get();
if (!apexOrgMembersTable) {
  console.log('Creating apex_org_members table...');
  db.exec(`
    CREATE TABLE apex_org_members (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES apex_organizations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('management','office_coordinator','project_manager','estimator','field_tech')),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(org_id, user_id)
    )
  `);
  db.exec(`CREATE INDEX idx_apex_org_members_org_id ON apex_org_members(org_id)`);
  db.exec(`CREATE INDEX idx_apex_org_members_user_id ON apex_org_members(user_id)`);
  console.log('Apex org members table created');
}

// ============================================
// ALTER apex_jobs — add org_id column
// ============================================
try {
  db.exec("ALTER TABLE apex_jobs ADD COLUMN org_id TEXT REFERENCES apex_organizations(id)");
  db.exec("CREATE INDEX idx_apex_jobs_org_id ON apex_jobs(org_id)");
  console.log('Added org_id column to apex_jobs');
} catch (e) {
  // Column already exists, ignore
}

// ============================================
// DATA MIGRATION: Seed default org + assign existing jobs
// ============================================
const orgCount = db.prepare('SELECT COUNT(*) as cnt FROM apex_organizations').get();
if (orgCount.cnt === 0) {
  console.log('Running org data migration...');
  const { v4: uuidv4 } = require('uuid');

  // Find the first management user
  const mgmtUser = db.prepare("SELECT id FROM users WHERE role = 'management' ORDER BY created_at ASC LIMIT 1").get();
  if (mgmtUser) {
    const orgId = uuidv4();
    const memberId = uuidv4();

    db.prepare(`
      INSERT INTO apex_organizations (id, name, slug, created_by)
      VALUES (?, ?, ?, ?)
    `).run(orgId, 'Apex Restoration', 'apex-restoration', mgmtUser.id);

    db.prepare(`
      INSERT INTO apex_org_members (id, org_id, user_id, role)
      VALUES (?, ?, ?, ?)
    `).run(memberId, orgId, mgmtUser.id, 'management');

    // Assign all existing jobs to this org
    const result = db.prepare('UPDATE apex_jobs SET org_id = ? WHERE org_id IS NULL').run(orgId);
    console.log(`Org migration complete: created "Apex Restoration" org, assigned ${result.changes} jobs`);
  } else {
    console.log('Org migration skipped: no management user found');
  }
}

// ============================================
// SCH-01: CRM TABLES
// ============================================

// apex_crm_organizations
const crmOrgsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_crm_organizations'").get();
if (!crmOrgsTable) {
  console.log('Creating apex_crm_organizations table...');
  db.exec(`
    CREATE TABLE apex_crm_organizations (
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
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      created_by TEXT REFERENCES users(id)
    )
  `);
  db.exec(`CREATE INDEX idx_crm_orgs_org_id ON apex_crm_organizations(org_id)`);
  db.exec(`CREATE INDEX idx_crm_orgs_name ON apex_crm_organizations(org_id, name)`);
  console.log('apex_crm_organizations table created');
}

// apex_crm_org_tags
const crmOrgTagsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_crm_org_tags'").get();
if (!crmOrgTagsTable) {
  console.log('Creating apex_crm_org_tags table...');
  db.exec(`
    CREATE TABLE apex_crm_org_tags (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES apex_organizations(id),
      name TEXT NOT NULL,
      color TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(org_id, name)
    )
  `);
  db.exec(`CREATE INDEX idx_crm_org_tags_org ON apex_crm_org_tags(org_id)`);
  console.log('apex_crm_org_tags table created');
}

// apex_crm_organization_tag_map
const crmOrgTagMapTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_crm_organization_tag_map'").get();
if (!crmOrgTagMapTable) {
  console.log('Creating apex_crm_organization_tag_map table...');
  db.exec(`
    CREATE TABLE apex_crm_organization_tag_map (
      crm_organization_id TEXT NOT NULL REFERENCES apex_crm_organizations(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES apex_crm_org_tags(id) ON DELETE CASCADE,
      PRIMARY KEY (crm_organization_id, tag_id)
    )
  `);
  console.log('apex_crm_organization_tag_map table created');
}

// apex_crm_contacts
const crmContactsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_crm_contacts'").get();
if (!crmContactsTable) {
  console.log('Creating apex_crm_contacts table...');
  db.exec(`
    CREATE TABLE apex_crm_contacts (
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
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      created_by TEXT REFERENCES users(id)
    )
  `);
  db.exec(`CREATE INDEX idx_crm_contacts_org ON apex_crm_contacts(org_id)`);
  db.exec(`CREATE INDEX idx_crm_contacts_name ON apex_crm_contacts(org_id, last_name, first_name)`);
  db.exec(`CREATE INDEX idx_crm_contacts_email ON apex_crm_contacts(org_id, email)`);
  console.log('apex_crm_contacts table created');
}

// apex_crm_contact_tags
const crmContactTagsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_crm_contact_tags'").get();
if (!crmContactTagsTable) {
  console.log('Creating apex_crm_contact_tags table...');
  db.exec(`
    CREATE TABLE apex_crm_contact_tags (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES apex_organizations(id),
      name TEXT NOT NULL,
      color TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(org_id, name)
    )
  `);
  console.log('apex_crm_contact_tags table created');
}

// apex_crm_contact_tag_map
const crmContactTagMapTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_crm_contact_tag_map'").get();
if (!crmContactTagMapTable) {
  console.log('Creating apex_crm_contact_tag_map table...');
  db.exec(`
    CREATE TABLE apex_crm_contact_tag_map (
      contact_id TEXT NOT NULL REFERENCES apex_crm_contacts(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES apex_crm_contact_tags(id) ON DELETE CASCADE,
      PRIMARY KEY (contact_id, tag_id)
    )
  `);
  console.log('apex_crm_contact_tag_map table created');
}

// apex_crm_contact_org_memberships
const crmContactOrgMembershipsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_crm_contact_org_memberships'").get();
if (!crmContactOrgMembershipsTable) {
  console.log('Creating apex_crm_contact_org_memberships table...');
  db.exec(`
    CREATE TABLE apex_crm_contact_org_memberships (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL REFERENCES apex_crm_contacts(id) ON DELETE CASCADE,
      crm_organization_id TEXT NOT NULL REFERENCES apex_crm_organizations(id) ON DELETE CASCADE,
      role_title TEXT DEFAULT '',
      is_primary INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(contact_id, crm_organization_id)
    )
  `);
  db.exec(`CREATE INDEX idx_contact_org_contact ON apex_crm_contact_org_memberships(contact_id)`);
  db.exec(`CREATE INDEX idx_contact_org_org ON apex_crm_contact_org_memberships(crm_organization_id)`);
  console.log('apex_crm_contact_org_memberships table created');
}

// apex_crm_job_contacts
const crmJobContactsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_crm_job_contacts'").get();
if (!crmJobContactsTable) {
  console.log('Creating apex_crm_job_contacts table...');
  db.exec(`
    CREATE TABLE apex_crm_job_contacts (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES apex_jobs(id) ON DELETE CASCADE,
      contact_id TEXT NOT NULL REFERENCES apex_crm_contacts(id) ON DELETE CASCADE,
      crm_organization_id TEXT REFERENCES apex_crm_organizations(id),
      job_role TEXT NOT NULL DEFAULT 'other',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(job_id, contact_id, job_role)
    )
  `);
  db.exec(`CREATE INDEX idx_crm_job_contacts_job ON apex_crm_job_contacts(job_id)`);
  db.exec(`CREATE INDEX idx_crm_job_contacts_contact ON apex_crm_job_contacts(contact_id)`);
  console.log('apex_crm_job_contacts table created');
}

// ============================================
// SCH-02: INVENTORY TABLES
// ============================================

// apex_consumable_items
const consumableItemsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_consumable_items'").get();
if (!consumableItemsTable) {
  console.log('Creating apex_consumable_items table...');
  db.exec(`
    CREATE TABLE apex_consumable_items (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES apex_organizations(id),
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT DEFAULT 'misc',
      unit_of_measure TEXT NOT NULL DEFAULT 'each',
      unit_cost REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      created_by TEXT REFERENCES users(id),
      UNIQUE(org_id, name)
    )
  `);
  db.exec(`CREATE INDEX idx_consumables_org ON apex_consumable_items(org_id)`);
  db.exec(`CREATE INDEX idx_consumables_category ON apex_consumable_items(org_id, category)`);
  console.log('apex_consumable_items table created');
}

// apex_inventory_purchases
const inventoryPurchasesTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_inventory_purchases'").get();
if (!inventoryPurchasesTable) {
  console.log('Creating apex_inventory_purchases table...');
  db.exec(`
    CREATE TABLE apex_inventory_purchases (
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
      created_at TEXT DEFAULT (datetime('now')),
      created_by TEXT REFERENCES users(id)
    )
  `);
  db.exec(`CREATE INDEX idx_inv_purchases_org ON apex_inventory_purchases(org_id)`);
  db.exec(`CREATE INDEX idx_inv_purchases_item ON apex_inventory_purchases(item_id)`);
  db.exec(`CREATE INDEX idx_inv_purchases_date ON apex_inventory_purchases(purchase_date)`);
  console.log('apex_inventory_purchases table created');
}

// apex_inventory_levels
const inventoryLevelsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_inventory_levels'").get();
if (!inventoryLevelsTable) {
  console.log('Creating apex_inventory_levels table...');
  db.exec(`
    CREATE TABLE apex_inventory_levels (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES apex_organizations(id),
      item_id TEXT NOT NULL REFERENCES apex_consumable_items(id),
      quantity_on_hand REAL NOT NULL DEFAULT 0,
      last_updated TEXT DEFAULT (datetime('now')),
      UNIQUE(org_id, item_id)
    )
  `);
  console.log('apex_inventory_levels table created');
}

// apex_job_material_allocations
const jobMaterialAllocationsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_job_material_allocations'").get();
if (!jobMaterialAllocationsTable) {
  console.log('Creating apex_job_material_allocations table...');
  db.exec(`
    CREATE TABLE apex_job_material_allocations (
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
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_job_materials_job ON apex_job_material_allocations(job_id)`);
  db.exec(`CREATE INDEX idx_job_materials_item ON apex_job_material_allocations(item_id)`);
  console.log('apex_job_material_allocations table created');
}

// ============================================
// SCH-03: JOB COSTING TABLES
// ============================================

// apex_job_supplements
const jobSupplementsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_job_supplements'").get();
if (!jobSupplementsTable) {
  console.log('Creating apex_job_supplements table...');
  db.exec(`
    CREATE TABLE apex_job_supplements (
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
      created_at TEXT DEFAULT (datetime('now')),
      created_by TEXT REFERENCES users(id),
      UNIQUE(job_id, supplement_number)
    )
  `);
  db.exec(`CREATE INDEX idx_supplements_job ON apex_job_supplements(job_id)`);
  console.log('apex_job_supplements table created');
}

// apex_sub_invoices
const subInvoicesTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_sub_invoices'").get();
if (!subInvoicesTable) {
  console.log('Creating apex_sub_invoices table...');
  db.exec(`
    CREATE TABLE apex_sub_invoices (
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
      created_at TEXT DEFAULT (datetime('now')),
      created_by TEXT REFERENCES users(id)
    )
  `);
  db.exec(`CREATE INDEX idx_sub_invoices_job ON apex_sub_invoices(job_id)`);
  db.exec(`CREATE INDEX idx_sub_invoices_sub ON apex_sub_invoices(sub_org_id)`);
  db.exec(`CREATE INDEX idx_sub_invoices_status ON apex_sub_invoices(status)`);
  console.log('apex_sub_invoices table created');
}

// apex_job_fuel_mileage
const jobFuelMileageTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_job_fuel_mileage'").get();
if (!jobFuelMileageTable) {
  console.log('Creating apex_job_fuel_mileage table...');
  db.exec(`
    CREATE TABLE apex_job_fuel_mileage (
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
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_fuel_mileage_job ON apex_job_fuel_mileage(job_id)`);
  db.exec(`CREATE INDEX idx_fuel_mileage_employee ON apex_job_fuel_mileage(employee_id)`);
  console.log('apex_job_fuel_mileage table created');
}

// ============================================
// SCH-04: DOCUMENTS TABLE
// ============================================

const apexDocumentsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_documents'").get();
if (!apexDocumentsTable) {
  console.log('Creating apex_documents table...');
  db.exec(`
    CREATE TABLE apex_documents (
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
      uploaded_at TEXT DEFAULT (datetime('now')),
      uploaded_by TEXT REFERENCES users(id)
    )
  `);
  db.exec(`CREATE INDEX idx_docs_job ON apex_documents(job_id)`);
  db.exec(`CREATE INDEX idx_docs_type ON apex_documents(document_type)`);
  db.exec(`CREATE INDEX idx_docs_entity ON apex_documents(entity_type, entity_id)`);
  db.exec(`CREATE INDEX idx_docs_org ON apex_documents(org_id)`);
  console.log('apex_documents table created');
}

// ============================================
// SCH-05: ALTER apex_job_receipts — add document_id
// ============================================
try {
  db.exec("ALTER TABLE apex_job_receipts ADD COLUMN document_id TEXT");
  console.log('Added document_id column to apex_job_receipts');
} catch (e) { /* already exists */ }

// ============================================
// SCH-06: WORKFLOW ENGINE TABLES
// ============================================

// apex_workflow_templates
const wfTemplatesTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_workflow_templates'").get();
if (!wfTemplatesTable) {
  console.log('Creating apex_workflow_templates table...');
  db.exec(`
    CREATE TABLE apex_workflow_templates (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES apex_organizations(id),
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      job_types TEXT DEFAULT '[]',
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
      version INTEGER DEFAULT 1,
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_workflow_templates_org ON apex_workflow_templates(org_id)`);
  console.log('apex_workflow_templates table created');
}

// apex_workflow_template_steps
const wfTemplateStepsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_workflow_template_steps'").get();
if (!wfTemplateStepsTable) {
  console.log('Creating apex_workflow_template_steps table...');
  db.exec(`
    CREATE TABLE apex_workflow_template_steps (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL REFERENCES apex_workflow_templates(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      sequence_number INTEGER NOT NULL,
      assigned_role TEXT NOT NULL,
      is_required INTEGER DEFAULT 1,
      allow_override INTEGER DEFAULT 0,
      estimated_duration_hours REAL DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(template_id, sequence_number)
    )
  `);
  db.exec(`CREATE INDEX idx_wf_template_steps_template ON apex_workflow_template_steps(template_id)`);
  console.log('apex_workflow_template_steps table created');
}

// apex_workflow_step_gates
const wfStepGatesTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_workflow_step_gates'").get();
if (!wfStepGatesTable) {
  console.log('Creating apex_workflow_step_gates table...');
  db.exec(`
    CREATE TABLE apex_workflow_step_gates (
      id TEXT PRIMARY KEY,
      step_id TEXT NOT NULL REFERENCES apex_workflow_template_steps(id) ON DELETE CASCADE,
      gate_type TEXT NOT NULL CHECK(gate_type IN ('previous_step','specific_step','field_not_empty','document_exists','manual_approval','drying_standard_met','estimate_exists','payment_received','custom')),
      gate_config TEXT DEFAULT '{}',
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_wf_step_gates_step ON apex_workflow_step_gates(step_id)`);
  console.log('apex_workflow_step_gates table created');
}

// apex_job_workflows
const jobWorkflowsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_job_workflows'").get();
if (!jobWorkflowsTable) {
  console.log('Creating apex_job_workflows table...');
  db.exec(`
    CREATE TABLE apex_job_workflows (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES apex_jobs(id) ON DELETE CASCADE,
      template_id TEXT NOT NULL REFERENCES apex_workflow_templates(id),
      phase_id TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','complete','cancelled')),
      started_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      UNIQUE(job_id, template_id, phase_id)
    )
  `);
  db.exec(`CREATE INDEX idx_job_workflows_job ON apex_job_workflows(job_id)`);
  console.log('apex_job_workflows table created');
}

// apex_job_workflow_steps
const jobWfStepsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_job_workflow_steps'").get();
if (!jobWfStepsTable) {
  console.log('Creating apex_job_workflow_steps table...');
  db.exec(`
    CREATE TABLE apex_job_workflow_steps (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL REFERENCES apex_job_workflows(id) ON DELETE CASCADE,
      template_step_id TEXT NOT NULL REFERENCES apex_workflow_template_steps(id),
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      sequence_number INTEGER NOT NULL,
      assigned_role TEXT NOT NULL,
      assigned_user_id TEXT REFERENCES users(id),
      status TEXT DEFAULT 'locked' CHECK(status IN ('locked','available','in_progress','complete','skipped','overridden')),
      started_at TEXT,
      completed_at TEXT,
      completed_by TEXT REFERENCES users(id),
      override_reason TEXT DEFAULT '',
      overridden_by TEXT REFERENCES users(id),
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_job_wf_steps_workflow ON apex_job_workflow_steps(workflow_id)`);
  console.log('apex_job_workflow_steps table created');
}

// apex_job_workflow_step_gates
const jobWfStepGatesTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='apex_job_workflow_step_gates'").get();
if (!jobWfStepGatesTable) {
  console.log('Creating apex_job_workflow_step_gates table...');
  db.exec(`
    CREATE TABLE apex_job_workflow_step_gates (
      id TEXT PRIMARY KEY,
      job_step_id TEXT NOT NULL REFERENCES apex_job_workflow_steps(id) ON DELETE CASCADE,
      gate_type TEXT NOT NULL,
      gate_config TEXT DEFAULT '{}',
      description TEXT DEFAULT '',
      is_met INTEGER DEFAULT 0,
      met_at TEXT,
      met_by TEXT REFERENCES users(id),
      override INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_job_wf_step_gates_step ON apex_job_workflow_step_gates(job_step_id)`);
  console.log('apex_job_workflow_step_gates table created');
}

console.log('Apex jobs schema initialized');

require('./dryingSchema'); // Initialize drying log tables

module.exports = db;
