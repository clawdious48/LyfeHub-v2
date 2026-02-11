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

console.log('Apex jobs schema initialized');

module.exports = db;
