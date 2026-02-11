const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

// Job type code mapping
const TYPE_CODES = {
  mitigation: 'MIT',
  reconstruction: 'RPR',
  remodel: 'RMD',
  abatement: 'ABT',
  remediation: 'REM',
  fire: 'FR'
};

/**
 * Generate a unique job number: YYYYMM-SEQ-TYPE
 * e.g., 202602-001-MIT
 */
function generateJobNumber(typeCode) {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Insert if not exists, then get and increment
  db.prepare('INSERT OR IGNORE INTO apex_job_number_seq (year_month, next_seq) VALUES (?, 1)').run(yearMonth);
  const row = db.prepare('SELECT next_seq FROM apex_job_number_seq WHERE year_month = ?').get(yearMonth);
  const seq = row.next_seq;
  db.prepare('UPDATE apex_job_number_seq SET next_seq = next_seq + 1 WHERE year_month = ?').run(yearMonth);

  return `${yearMonth}-${String(seq).padStart(3, '0')}-${typeCode}`;
}

/**
 * Ensure a value is a JSON string (for assignment array fields)
 */
function ensureJsonString(val) {
  if (Array.isArray(val)) return JSON.stringify(val);
  if (typeof val === 'string') {
    // If it's already a JSON string, return as-is
    try { JSON.parse(val); return val; } catch { return JSON.stringify([val]); }
  }
  return '[]';
}

/**
 * Create a new apex job with phases (transactional)
 */
function createJob(data, userId) {
  const create = db.transaction(() => {
    const id = uuidv4();
    const name = `${data.client_name} - ${data.prop_street || data.client_street || 'New Job'}`;

    db.prepare(`
      INSERT INTO apex_jobs (
        id, user_id, name, status,
        client_name, client_phone, client_email,
        client_street, client_city, client_state, client_zip, client_unit, client_relation,
        same_as_client,
        prop_street, prop_city, prop_state, prop_zip, prop_unit, prop_type, year_built,
        occ_name, occ_phone, occ_email, access_info,
        ins_carrier, ins_claim, ins_policy, deductible,
        adj_name, adj_phone, adj_email,
        loss_type, loss_date, water_category, damage_class,
        areas_affected, hazards, loss_description, scope_notes, urgent,
        extraction_required, ongoing_intrusion, drywall_debris, content_manipulation,
        mitigation_pm, reconstruction_pm, estimator, project_coordinator, mitigation_techs,
        referral_source, how_heard, internal_notes,
        source, zoho_id,
        additional_clients, additional_adjusters, site_contacts
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?
      )
    `).run(
      id, userId, name, data.status || 'active',
      data.client_name, data.client_phone || '', data.client_email || '',
      data.client_street || '', data.client_city || '', data.client_state || '', data.client_zip || '', data.client_unit || '', data.client_relation || 'owner',
      data.same_as_client ? 1 : 0,
      data.prop_street || '', data.prop_city || '', data.prop_state || '', data.prop_zip || '', data.prop_unit || '', data.prop_type || 'residential', data.year_built || '',
      data.occ_name || '', data.occ_phone || '', data.occ_email || '', data.access_info || '',
      data.ins_carrier || '', data.ins_claim || '', data.ins_policy || '', data.deductible || 0,
      data.adj_name || '', data.adj_phone || '', data.adj_email || '',
      data.loss_type || '', data.loss_date || '', data.water_category || '', data.damage_class || '',
      data.areas_affected || '', data.hazards || '', data.loss_description || '', data.scope_notes || '', data.urgent ? 1 : 0,
      data.extraction_required ? 1 : 0, data.ongoing_intrusion ? 1 : 0, data.drywall_debris ? 1 : 0, data.content_manipulation ? 1 : 0,
      ensureJsonString(data.mitigation_pm), ensureJsonString(data.reconstruction_pm),
      ensureJsonString(data.estimator), ensureJsonString(data.project_coordinator),
      ensureJsonString(data.mitigation_techs),
      data.referral_source || '', data.how_heard || '', data.internal_notes || '',
      data.source || 'local', data.zoho_id || '',
      ensureJsonString(data.additional_clients), ensureJsonString(data.additional_adjusters), ensureJsonString(data.site_contacts)
    );

    // Create phases for each selected job type
    const jobTypes = data.job_types || [];
    for (const jobType of jobTypes) {
      const typeCode = TYPE_CODES[jobType];
      if (!typeCode) continue;

      const phaseId = uuidv4();
      const jobNumber = generateJobNumber(typeCode);

      db.prepare(`
        INSERT INTO apex_job_phases (
          id, job_id, job_type, job_type_code, job_number
        ) VALUES (?, ?, ?, ?, ?)
      `).run(phaseId, id, jobType, typeCode, jobNumber);
    }

    return id;
  });

  const jobId = create();
  return getJobById(jobId, userId);
}

/**
 * Get all non-archived jobs for a user, with phases
 */
function getAllJobs(userId) {
  const jobs = db.prepare(
    'SELECT * FROM apex_jobs WHERE user_id = ? AND status != ? ORDER BY created_at DESC'
  ).all(userId, 'archived');

  const jobIds = jobs.map(j => j.id);
  if (jobIds.length === 0) return [];

  const placeholders = jobIds.map(() => '?').join(',');
  const phases = db.prepare(
    `SELECT * FROM apex_job_phases WHERE job_id IN (${placeholders}) ORDER BY created_at ASC`
  ).all(...jobIds);

  // Group phases by job_id
  const phaseMap = {};
  phases.forEach(p => {
    if (!phaseMap[p.job_id]) phaseMap[p.job_id] = [];
    phaseMap[p.job_id].push(p);
  });

  return jobs.map(j => ({ ...j, phases: phaseMap[j.id] || [] }));
}

/**
 * Get a single job by ID with phases
 */
function getJobById(id, userId) {
  const job = db.prepare(
    'SELECT * FROM apex_jobs WHERE id = ? AND user_id = ?'
  ).get(id, userId);
  if (!job) return null;

  const phases = db.prepare(
    'SELECT * FROM apex_job_phases WHERE job_id = ? ORDER BY created_at ASC'
  ).all(id);

  return { ...job, phases };
}

/**
 * Update job fields dynamically (only updates fields present in data)
 */
function updateJob(id, data, userId) {
  const existing = getJobById(id, userId);
  if (!existing) return null;

  // Fields that can be updated
  const allowedFields = [
    'name', 'status',
    'client_name', 'client_phone', 'client_email',
    'client_street', 'client_city', 'client_state', 'client_zip', 'client_unit', 'client_relation',
    'same_as_client',
    'prop_street', 'prop_city', 'prop_state', 'prop_zip', 'prop_unit', 'prop_type', 'year_built',
    'occ_name', 'occ_phone', 'occ_email', 'access_info',
    'ins_carrier', 'ins_claim', 'ins_policy', 'deductible',
    'adj_name', 'adj_phone', 'adj_email',
    'loss_type', 'loss_date', 'water_category', 'damage_class',
    'areas_affected', 'hazards', 'loss_description', 'scope_notes', 'urgent',
    'extraction_required', 'ongoing_intrusion', 'drywall_debris', 'content_manipulation',
    'mitigation_pm', 'reconstruction_pm', 'estimator', 'project_coordinator', 'mitigation_techs',
    'referral_source', 'how_heard', 'internal_notes',
    'source', 'zoho_id',
    'additional_clients', 'additional_adjusters', 'site_contacts'
  ];

  // Assignment fields that need JSON handling
  const jsonArrayFields = ['mitigation_pm', 'reconstruction_pm', 'estimator', 'project_coordinator', 'mitigation_techs',
    'additional_clients', 'additional_adjusters', 'site_contacts'];

  const updates = [];
  const values = [];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      if (jsonArrayFields.includes(field)) {
        values.push(ensureJsonString(data[field]));
      } else if (['same_as_client', 'urgent', 'extraction_required', 'ongoing_intrusion', 'drywall_debris', 'content_manipulation'].includes(field)) {
        values.push(data[field] ? 1 : 0);
      } else {
        values.push(data[field]);
      }
    }
  }

  if (updates.length === 0) return existing;

  // Always update updated_at
  updates.push("updated_at = datetime('now')");

  values.push(id, userId);

  db.prepare(
    `UPDATE apex_jobs SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
  ).run(...values);

  return getJobById(id, userId);
}

/**
 * Update a phase (verifies job ownership via JOIN)
 */
function updatePhase(phaseId, data, userId) {
  // Verify ownership
  const phase = db.prepare(`
    SELECT p.* FROM apex_job_phases p
    JOIN apex_jobs j ON p.job_id = j.id
    WHERE p.id = ? AND j.user_id = ?
  `).get(phaseId, userId);

  if (!phase) return null;

  const allowedFields = [
    'phase_status', 'documents', 'photos', 'estimates',
    'payments', 'labor_log', 'materials', 'notes', 'drying_logs'
  ];

  const jsonFields = ['documents', 'photos', 'estimates', 'payments', 'labor_log', 'materials', 'drying_logs'];

  const updates = [];
  const values = [];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      if (jsonFields.includes(field)) {
        values.push(typeof data[field] === 'string' ? data[field] : JSON.stringify(data[field]));
      } else {
        values.push(data[field]);
      }
    }
  }

  if (updates.length === 0) return phase;

  updates.push("updated_at = datetime('now')");
  values.push(phaseId);

  db.prepare(
    `UPDATE apex_job_phases SET ${updates.join(', ')} WHERE id = ?`
  ).run(...values);

  // Return updated phase
  return db.prepare('SELECT * FROM apex_job_phases WHERE id = ?').get(phaseId);
}

/**
 * Archive a job (soft delete)
 */
function archiveJob(id, userId) {
  const result = db.prepare(
    "UPDATE apex_jobs SET status = 'archived', updated_at = datetime('now') WHERE id = ? AND user_id = ?"
  ).run(id, userId);
  return result.changes > 0;
}

/**
 * Get job count stats grouped by status
 */
function getJobStats(userId) {
  const rows = db.prepare(
    'SELECT status, COUNT(*) as count FROM apex_jobs WHERE user_id = ? GROUP BY status'
  ).all(userId);

  const stats = { active: 0, pending_insurance: 0, complete: 0, archived: 0, total: 0 };
  rows.forEach(r => {
    stats[r.status] = r.count;
    stats.total += r.count;
  });
  return stats;
}

// ============================================
// ACTIVITY LOG
// ============================================

/**
 * Log an activity entry (internal, no ownership check)
 */
function logActivity(jobId, data) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO apex_job_activity (
      id, job_id, event_type, description, entity_type, entity_id,
      old_value, new_value, amount, actor_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, jobId,
    data.event_type || 'note',
    data.description || '',
    data.entity_type || '',
    data.entity_id || '',
    data.old_value || '',
    data.new_value || '',
    data.amount ?? null,
    data.actor_id || ''
  );
  return id;
}

/**
 * Get activity log for a job with optional type filter and pagination
 */
function getActivityByJob(jobId, userId, options = {}) {
  // Verify ownership
  const job = db.prepare('SELECT id FROM apex_jobs WHERE id = ? AND user_id = ?').get(jobId, userId);
  if (!job) return null;

  const params = [jobId];
  let where = 'WHERE job_id = ?';

  if (options.type) {
    where += ' AND event_type = ?';
    params.push(options.type);
  }

  const limit = options.limit || 50;
  const offset = options.offset || 0;
  params.push(limit, offset);

  return db.prepare(
    `SELECT * FROM apex_job_activity ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params);
}

// ============================================
// NOTES
// ============================================

function createNote(jobId, data, userId) {
  const job = db.prepare('SELECT id FROM apex_jobs WHERE id = ? AND user_id = ?').get(jobId, userId);
  if (!job) return null;

  const id = uuidv4();
  db.prepare(`
    INSERT INTO apex_job_notes (id, job_id, phase_id, subject, note_type, content, author_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, jobId,
    data.phase_id || null,
    data.subject || '',
    data.note_type || 'general',
    data.content || '',
    data.author_id || userId
  );

  logActivity(jobId, {
    event_type: 'note',
    description: `Note added: ${data.subject || 'Untitled'}`,
    entity_type: 'note',
    entity_id: id,
    actor_id: userId
  });

  return db.prepare('SELECT * FROM apex_job_notes WHERE id = ?').get(id);
}

function getNotesByJob(jobId, userId) {
  const job = db.prepare('SELECT id FROM apex_jobs WHERE id = ? AND user_id = ?').get(jobId, userId);
  if (!job) return null;

  return db.prepare(
    'SELECT n.*, u.name as author_name FROM apex_job_notes n LEFT JOIN users u ON n.author_id = u.id WHERE n.job_id = ? ORDER BY n.created_at DESC'
  ).all(jobId);
}

function getNoteById(noteId) {
  return db.prepare('SELECT * FROM apex_job_notes WHERE id = ?').get(noteId);
}

function updateNote(noteId, data) {
  const note = getNoteById(noteId);
  if (!note) return null;

  const allowedFields = ['subject', 'note_type', 'content'];
  const updates = [];
  const values = [];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(data[field]);
    }
  }

  if (updates.length === 0) return note;
  values.push(noteId);

  db.prepare(
    `UPDATE apex_job_notes SET ${updates.join(', ')} WHERE id = ?`
  ).run(...values);

  return db.prepare('SELECT n.*, u.name as author_name FROM apex_job_notes n LEFT JOIN users u ON n.author_id = u.id WHERE n.id = ?').get(noteId);
}

function deleteNote(noteId, userId) {
  const note = db.prepare(`
    SELECT n.* FROM apex_job_notes n
    JOIN apex_jobs j ON n.job_id = j.id
    WHERE n.id = ? AND j.user_id = ?
  `).get(noteId, userId);
  if (!note) return false;

  db.prepare('DELETE FROM apex_job_notes WHERE id = ?').run(noteId);

  logActivity(note.job_id, {
    event_type: 'note',
    description: `Note deleted: ${note.subject || 'Untitled'}`,
    entity_type: 'note',
    entity_id: noteId,
    actor_id: userId
  });

  return true;
}

// ============================================
// ESTIMATES
// ============================================

function createEstimate(jobId, data, userId) {
  const job = db.prepare('SELECT id FROM apex_jobs WHERE id = ? AND user_id = ?').get(jobId, userId);
  if (!job) return null;

  // Auto-version: count existing estimates of same type for this job
  const existing = db.prepare(
    'SELECT COUNT(*) as cnt FROM apex_job_estimates WHERE job_id = ? AND estimate_type = ?'
  ).get(jobId, data.estimate_type || 'mitigation');
  const version = (existing.cnt || 0) + 1;

  const id = uuidv4();
  db.prepare(`
    INSERT INTO apex_job_estimates (
      id, job_id, phase_id, estimate_type, version, amount, original_amount,
      status, submitted_date, approved_date, file_path, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, jobId,
    data.phase_id || null,
    data.estimate_type || 'mitigation',
    version,
    data.amount || 0,
    data.original_amount || data.amount || 0,
    data.status || 'draft',
    data.submitted_date || null,
    data.approved_date || null,
    data.file_path || '',
    data.notes || ''
  );

  logActivity(jobId, {
    event_type: 'estimate',
    description: `Estimate created: ${data.estimate_type || 'mitigation'} v${version}`,
    entity_type: 'estimate',
    entity_id: id,
    amount: data.amount || 0,
    actor_id: userId
  });

  return db.prepare('SELECT * FROM apex_job_estimates WHERE id = ?').get(id);
}

function getEstimatesByJob(jobId, userId) {
  const job = db.prepare('SELECT id FROM apex_jobs WHERE id = ? AND user_id = ?').get(jobId, userId);
  if (!job) return null;

  return db.prepare(
    'SELECT * FROM apex_job_estimates WHERE job_id = ? ORDER BY estimate_type, version ASC'
  ).all(jobId);
}

function updateEstimate(estimateId, data, userId) {
  const est = db.prepare(`
    SELECT e.* FROM apex_job_estimates e
    JOIN apex_jobs j ON e.job_id = j.id
    WHERE e.id = ? AND j.user_id = ?
  `).get(estimateId, userId);
  if (!est) return null;

  const allowedFields = ['amount', 'original_amount', 'status', 'submitted_date', 'approved_date', 'file_path', 'notes'];
  const updates = [];
  const values = [];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(data[field]);
    }
  }

  if (updates.length === 0) return est;
  values.push(estimateId);

  db.prepare(
    `UPDATE apex_job_estimates SET ${updates.join(', ')} WHERE id = ?`
  ).run(...values);

  logActivity(est.job_id, {
    event_type: 'estimate',
    description: `Estimate updated: ${est.estimate_type} v${est.version}`,
    entity_type: 'estimate',
    entity_id: estimateId,
    old_value: data.status ? est.status : '',
    new_value: data.status || '',
    amount: data.amount ?? est.amount,
    actor_id: userId
  });

  return db.prepare('SELECT * FROM apex_job_estimates WHERE id = ?').get(estimateId);
}

// ============================================
// PAYMENTS
// ============================================

function createPayment(jobId, data, userId) {
  const job = db.prepare('SELECT id FROM apex_jobs WHERE id = ? AND user_id = ?').get(jobId, userId);
  if (!job) return null;

  const id = uuidv4();
  db.prepare(`
    INSERT INTO apex_job_payments (
      id, job_id, estimate_id, amount, payment_method, payment_type,
      check_number, received_date, deposited_date, invoice_number, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, jobId,
    data.estimate_id || null,
    data.amount || 0,
    data.payment_method || 'check',
    data.payment_type || 'initial',
    data.check_number || '',
    data.received_date || null,
    data.deposited_date || null,
    data.invoice_number || '',
    data.notes || ''
  );

  logActivity(jobId, {
    event_type: 'payment',
    description: `Payment received: $${(data.amount || 0).toFixed(2)} (${data.payment_type || 'initial'})`,
    entity_type: 'payment',
    entity_id: id,
    amount: data.amount || 0,
    actor_id: userId
  });

  return db.prepare('SELECT * FROM apex_job_payments WHERE id = ?').get(id);
}

function getPaymentsByJob(jobId, userId) {
  const job = db.prepare('SELECT id FROM apex_jobs WHERE id = ? AND user_id = ?').get(jobId, userId);
  if (!job) return null;

  return db.prepare(
    'SELECT * FROM apex_job_payments WHERE job_id = ? ORDER BY received_date DESC, created_at DESC'
  ).all(jobId);
}

// ============================================
// LABOR
// ============================================

function createLaborEntry(jobId, data, userId) {
  const job = db.prepare('SELECT id FROM apex_jobs WHERE id = ? AND user_id = ?').get(jobId, userId);
  if (!job) return null;

  const id = uuidv4();
  db.prepare(`
    INSERT INTO apex_job_labor (
      id, job_id, phase_id, employee_name, work_date, hours, hourly_rate,
      work_category, description, billable, author_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, jobId,
    data.phase_id || null,
    data.employee_name || '',
    data.work_date || null,
    data.hours || 0,
    data.hourly_rate || 0,
    data.work_category || 'other',
    data.description || '',
    data.billable !== undefined ? (data.billable ? 1 : 0) : 1,
    data.author_id || userId
  );

  logActivity(jobId, {
    event_type: 'labor',
    description: `Labor logged: ${data.employee_name || 'Unknown'} - ${data.hours || 0}h`,
    entity_type: 'labor',
    entity_id: id,
    amount: (data.hours || 0) * (data.hourly_rate || 0),
    actor_id: userId
  });

  return db.prepare('SELECT * FROM apex_job_labor WHERE id = ?').get(id);
}

function getLaborByJob(jobId, userId) {
  const job = db.prepare('SELECT id FROM apex_jobs WHERE id = ? AND user_id = ?').get(jobId, userId);
  if (!job) return null;

  return db.prepare(
    'SELECT * FROM apex_job_labor WHERE job_id = ? ORDER BY work_date DESC, created_at DESC'
  ).all(jobId);
}

function updateLaborEntry(entryId, data, userId) {
  const entry = db.prepare(`
    SELECT l.* FROM apex_job_labor l
    JOIN apex_jobs j ON l.job_id = j.id
    WHERE l.id = ? AND j.user_id = ?
  `).get(entryId, userId);
  if (!entry) return null;

  const allowedFields = ['employee_name', 'work_date', 'hours', 'hourly_rate', 'work_category', 'description', 'billable', 'phase_id'];
  const updates = [];
  const values = [];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      if (field === 'billable') {
        values.push(data[field] ? 1 : 0);
      } else {
        values.push(data[field]);
      }
    }
  }

  if (updates.length === 0) return entry;
  values.push(entryId);

  db.prepare(
    `UPDATE apex_job_labor SET ${updates.join(', ')} WHERE id = ?`
  ).run(...values);

  logActivity(entry.job_id, {
    event_type: 'labor',
    description: `Labor entry updated: ${data.employee_name || entry.employee_name}`,
    entity_type: 'labor',
    entity_id: entryId,
    actor_id: userId
  });

  return db.prepare('SELECT * FROM apex_job_labor WHERE id = ?').get(entryId);
}

function deleteLaborEntry(entryId, userId) {
  const entry = db.prepare(`
    SELECT l.* FROM apex_job_labor l
    JOIN apex_jobs j ON l.job_id = j.id
    WHERE l.id = ? AND j.user_id = ?
  `).get(entryId, userId);
  if (!entry) return false;

  db.prepare('DELETE FROM apex_job_labor WHERE id = ?').run(entryId);

  logActivity(entry.job_id, {
    event_type: 'labor',
    description: `Labor entry deleted: ${entry.employee_name} - ${entry.hours}h`,
    entity_type: 'labor',
    entity_id: entryId,
    actor_id: userId
  });

  return true;
}

// ============================================
// RECEIPTS
// ============================================

function createReceipt(jobId, data, userId) {
  const job = db.prepare('SELECT id FROM apex_jobs WHERE id = ? AND user_id = ?').get(jobId, userId);
  if (!job) return null;

  const id = uuidv4();
  db.prepare(`
    INSERT INTO apex_job_receipts (
      id, job_id, phase_id, amount, expense_category, description,
      vendor, paid_by, reimbursable, expense_date, file_path, author_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, jobId,
    data.phase_id || null,
    data.amount || 0,
    data.expense_category || 'materials',
    data.description || '',
    data.vendor || '',
    data.paid_by || 'company_card',
    data.reimbursable ? 1 : 0,
    data.expense_date || null,
    data.file_path || '',
    data.author_id || userId
  );

  logActivity(jobId, {
    event_type: 'receipt',
    description: `Receipt added: $${(data.amount || 0).toFixed(2)} - ${data.vendor || 'Unknown vendor'}`,
    entity_type: 'receipt',
    entity_id: id,
    amount: data.amount || 0,
    actor_id: userId
  });

  return db.prepare('SELECT * FROM apex_job_receipts WHERE id = ?').get(id);
}

function getReceiptsByJob(jobId, userId) {
  const job = db.prepare('SELECT id FROM apex_jobs WHERE id = ? AND user_id = ?').get(jobId, userId);
  if (!job) return null;

  return db.prepare(
    'SELECT * FROM apex_job_receipts WHERE job_id = ? ORDER BY expense_date DESC, created_at DESC'
  ).all(jobId);
}

function updateReceipt(receiptId, data, userId) {
  const receipt = db.prepare(`
    SELECT r.* FROM apex_job_receipts r
    JOIN apex_jobs j ON r.job_id = j.id
    WHERE r.id = ? AND j.user_id = ?
  `).get(receiptId, userId);
  if (!receipt) return null;

  const allowedFields = ['amount', 'expense_category', 'description', 'vendor', 'paid_by', 'reimbursable', 'expense_date', 'file_path', 'phase_id'];
  const updates = [];
  const values = [];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      if (field === 'reimbursable') {
        values.push(data[field] ? 1 : 0);
      } else {
        values.push(data[field]);
      }
    }
  }

  if (updates.length === 0) return receipt;
  values.push(receiptId);

  db.prepare(
    `UPDATE apex_job_receipts SET ${updates.join(', ')} WHERE id = ?`
  ).run(...values);

  logActivity(receipt.job_id, {
    event_type: 'receipt',
    description: `Receipt updated: ${data.vendor || receipt.vendor}`,
    entity_type: 'receipt',
    entity_id: receiptId,
    amount: data.amount ?? receipt.amount,
    actor_id: userId
  });

  return db.prepare('SELECT * FROM apex_job_receipts WHERE id = ?').get(receiptId);
}

function deleteReceipt(receiptId, userId) {
  const receipt = db.prepare(`
    SELECT r.* FROM apex_job_receipts r
    JOIN apex_jobs j ON r.job_id = j.id
    WHERE r.id = ? AND j.user_id = ?
  `).get(receiptId, userId);
  if (!receipt) return false;

  db.prepare('DELETE FROM apex_job_receipts WHERE id = ?').run(receiptId);

  logActivity(receipt.job_id, {
    event_type: 'receipt',
    description: `Receipt deleted: $${receipt.amount} - ${receipt.vendor}`,
    entity_type: 'receipt',
    entity_id: receiptId,
    actor_id: userId
  });

  return true;
}

// ============================================
// WORK ORDERS
// ============================================

function createWorkOrder(jobId, data, userId) {
  const job = db.prepare('SELECT id FROM apex_jobs WHERE id = ? AND user_id = ?').get(jobId, userId);
  if (!job) return null;

  const id = uuidv4();
  db.prepare(`
    INSERT INTO apex_job_work_orders (
      id, job_id, phase_id, wo_number, title, description,
      budget_amount, status, file_path
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, jobId,
    data.phase_id || null,
    data.wo_number || '',
    data.title || '',
    data.description || '',
    data.budget_amount || 0,
    data.status || 'draft',
    data.file_path || ''
  );

  logActivity(jobId, {
    event_type: 'work_order',
    description: `Work order created: ${data.title || data.wo_number || 'Untitled'}`,
    entity_type: 'work_order',
    entity_id: id,
    amount: data.budget_amount || 0,
    actor_id: userId
  });

  return db.prepare('SELECT * FROM apex_job_work_orders WHERE id = ?').get(id);
}

function getWorkOrdersByJob(jobId, userId) {
  const job = db.prepare('SELECT id FROM apex_jobs WHERE id = ? AND user_id = ?').get(jobId, userId);
  if (!job) return null;

  return db.prepare(
    'SELECT * FROM apex_job_work_orders WHERE job_id = ? ORDER BY created_at DESC'
  ).all(jobId);
}

function updateWorkOrder(woId, data, userId) {
  const wo = db.prepare(`
    SELECT w.* FROM apex_job_work_orders w
    JOIN apex_jobs j ON w.job_id = j.id
    WHERE w.id = ? AND j.user_id = ?
  `).get(woId, userId);
  if (!wo) return null;

  const allowedFields = ['wo_number', 'title', 'description', 'budget_amount', 'status', 'file_path', 'phase_id'];
  const updates = [];
  const values = [];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(data[field]);
    }
  }

  if (updates.length === 0) return wo;
  values.push(woId);

  db.prepare(
    `UPDATE apex_job_work_orders SET ${updates.join(', ')} WHERE id = ?`
  ).run(...values);

  logActivity(wo.job_id, {
    event_type: 'work_order',
    description: `Work order updated: ${data.title || wo.title}`,
    entity_type: 'work_order',
    entity_id: woId,
    old_value: data.status ? wo.status : '',
    new_value: data.status || '',
    actor_id: userId
  });

  return db.prepare('SELECT * FROM apex_job_work_orders WHERE id = ?').get(woId);
}

function deleteWorkOrder(woId, userId) {
  const wo = db.prepare(`
    SELECT w.* FROM apex_job_work_orders w
    JOIN apex_jobs j ON w.job_id = j.id
    WHERE w.id = ? AND j.user_id = ?
  `).get(woId, userId);
  if (!wo) return false;

  db.prepare('DELETE FROM apex_job_work_orders WHERE id = ?').run(woId);

  logActivity(wo.job_id, {
    event_type: 'work_order',
    description: `Work order deleted: ${wo.title || wo.wo_number}`,
    entity_type: 'work_order',
    entity_id: woId,
    actor_id: userId
  });

  return true;
}

// ============================================
// CONTACTS (junction — assign contacts to jobs)
// ============================================

function assignContact(jobId, contactId, role, userId) {
  const job = db.prepare('SELECT id FROM apex_jobs WHERE id = ? AND user_id = ?').get(jobId, userId);
  if (!job) return null;

  // Check if already assigned
  const existing = db.prepare(
    'SELECT id FROM apex_job_contacts WHERE job_id = ? AND contact_id = ?'
  ).get(jobId, contactId);
  if (existing) return existing;

  const id = uuidv4();
  db.prepare(`
    INSERT INTO apex_job_contacts (id, job_id, contact_id, role)
    VALUES (?, ?, ?, ?)
  `).run(id, jobId, contactId, role || '');

  logActivity(jobId, {
    event_type: 'status',
    description: `Contact assigned with role: ${role || 'none'}`,
    entity_type: 'contact',
    entity_id: contactId,
    actor_id: userId
  });

  return { id, job_id: jobId, contact_id: contactId, role: role || '' };
}

function removeContact(jobId, contactId, userId) {
  const job = db.prepare('SELECT id FROM apex_jobs WHERE id = ? AND user_id = ?').get(jobId, userId);
  if (!job) return false;

  const result = db.prepare(
    'DELETE FROM apex_job_contacts WHERE job_id = ? AND contact_id = ?'
  ).run(jobId, contactId);

  if (result.changes > 0) {
    logActivity(jobId, {
      event_type: 'status',
      description: 'Contact removed from job',
      entity_type: 'contact',
      entity_id: contactId,
      actor_id: userId
    });
  }

  return result.changes > 0;
}

function getContactsByJob(jobId, userId) {
  const job = db.prepare('SELECT id FROM apex_jobs WHERE id = ? AND user_id = ?').get(jobId, userId);
  if (!job) return null;

  return db.prepare(
    'SELECT * FROM apex_job_contacts WHERE job_id = ? ORDER BY created_at ASC'
  ).all(jobId);
}

// ============================================
// ACCOUNTING SUMMARY
// ============================================

// Reverse map: code → long name (e.g. 'MIT' → 'mitigation')
const REVERSE_TYPE_CODES = Object.fromEntries(
  Object.entries(TYPE_CODES).map(([name, code]) => [code, name])
);

/**
 * Compute accounting metrics for a job, optionally filtered by estimate_type and/or phase_id.
 * @param {string} jobId
 * @param {{ estimate_type?: string, phase_id?: string }} opts
 */
function computeMetrics(jobId, opts = {}) {
  const { estimate_type, phase_id } = opts;

  // Total estimates — sum only the LATEST version per estimate_type (dedup)
  const estFilter = estimate_type ? 'AND e1.estimate_type = ?' : '';
  const estParams = estimate_type ? [jobId, estimate_type] : [jobId];
  const totalEstimatesRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM apex_job_estimates e1
    WHERE e1.job_id = ?
    ${estFilter}
    AND e1.version = (
      SELECT MAX(e2.version) FROM apex_job_estimates e2
      WHERE e2.job_id = e1.job_id
      AND COALESCE(e2.estimate_type, '') = COALESCE(e1.estimate_type, '')
    )
  `).get(...estParams);

  // Approved estimates — same dedup but only approved (for GP calculation)
  const approvedEstimatesRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM apex_job_estimates e1
    WHERE e1.job_id = ?
    AND e1.status = 'approved'
    ${estFilter}
    AND e1.version = (
      SELECT MAX(e2.version) FROM apex_job_estimates e2
      WHERE e2.job_id = e1.job_id
      AND COALESCE(e2.estimate_type, '') = COALESCE(e1.estimate_type, '')
    )
  `).get(...estParams);

  // Estimate count (latest versions only)
  const estimateCountRow = db.prepare(`
    SELECT COUNT(*) as cnt
    FROM apex_job_estimates e1
    WHERE e1.job_id = ?
    ${estFilter}
    AND e1.version = (
      SELECT MAX(e2.version) FROM apex_job_estimates e2
      WHERE e2.job_id = e1.job_id
      AND COALESCE(e2.estimate_type, '') = COALESCE(e1.estimate_type, '')
    )
  `).get(...estParams);

  // Payments — joined through estimates when filtered by type
  let paymentsRow;
  if (estimate_type) {
    paymentsRow = db.prepare(`
      SELECT COALESCE(SUM(p.amount), 0) as total
      FROM apex_job_payments p
      WHERE p.estimate_id IN (
        SELECT id FROM apex_job_estimates WHERE job_id = ? AND estimate_type = ?
      )
    `).get(jobId, estimate_type);
  } else {
    paymentsRow = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) as total FROM apex_job_payments WHERE job_id = ?'
    ).get(jobId);
  }

  // Labor cost (billable only)
  const laborFilter = phase_id ? 'AND phase_id = ?' : '';
  const laborParams = phase_id ? [jobId, phase_id] : [jobId];
  const laborRow = db.prepare(`
    SELECT COALESCE(SUM(hours * hourly_rate), 0) as total
    FROM apex_job_labor WHERE job_id = ? AND billable = 1 ${laborFilter}
  `).get(...laborParams);

  // Materials/receipts cost
  const receiptsFilter = phase_id ? 'AND phase_id = ?' : '';
  const receiptsParams = phase_id ? [jobId, phase_id] : [jobId];
  const receiptsRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM apex_job_receipts WHERE job_id = ? ${receiptsFilter}
  `).get(...receiptsParams);

  // Work order budget
  const woFilter = phase_id ? 'AND phase_id = ?' : '';
  const woParams = phase_id ? [jobId, phase_id] : [jobId];
  const workOrdersRow = db.prepare(`
    SELECT COALESCE(SUM(budget_amount), 0) as total
    FROM apex_job_work_orders WHERE job_id = ? AND status != 'cancelled' ${woFilter}
  `).get(...woParams);

  const totalEstimates = totalEstimatesRow.total;
  const approvedEstimates = approvedEstimatesRow.total;
  const totalPaid = paymentsRow.total;
  const laborCost = laborRow.total;
  const materialsCost = receiptsRow.total;
  const totalCost = laborCost + materialsCost;
  const workOrderBudget = workOrdersRow.total;
  const grossProfit = approvedEstimates - totalCost;
  const gpMargin = approvedEstimates > 0 ? (grossProfit / approvedEstimates) * 100 : 0;

  return {
    total_estimates: totalEstimates,
    approved_estimates: approvedEstimates,
    total_paid: totalPaid,
    balance_due: totalEstimates - totalPaid,
    labor_cost: laborCost,
    materials_cost: materialsCost,
    total_cost: totalCost,
    work_order_budget: workOrderBudget,
    gross_profit: grossProfit,
    gp_margin: Math.round(gpMargin * 100) / 100,
    estimate_count: estimateCountRow.cnt
  };
}

function getAccountingSummary(jobId, userId) {
  const job = db.prepare('SELECT id FROM apex_jobs WHERE id = ? AND user_id = ?').get(jobId, userId);
  if (!job) return null;

  // Get all phases for this job
  const phases = db.prepare(
    'SELECT * FROM apex_job_phases WHERE job_id = ? ORDER BY created_at ASC'
  ).all(jobId);

  // All-phases metrics (unfiltered)
  const all = computeMetrics(jobId);

  // Per-phase metrics keyed by long type name
  const by_type = {};
  for (const phase of phases) {
    const typeName = REVERSE_TYPE_CODES[phase.job_type_code] || phase.job_type;
    by_type[typeName] = computeMetrics(jobId, {
      estimate_type: typeName,
      phase_id: phase.id
    });
  }

  return { all, by_type };
}

// ============================================
// DATES
// ============================================

function updateJobDates(jobId, dates, userId) {
  const job = db.prepare('SELECT id FROM apex_jobs WHERE id = ? AND user_id = ?').get(jobId, userId);
  if (!job) return null;

  const allowedDateFields = [
    'contacted_date', 'inspection_date', 'work_auth_date',
    'start_date', 'cos_date', 'completion_date'
  ];

  const updates = [];
  const values = [];

  for (const field of allowedDateFields) {
    if (dates[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(dates[field]);
    }
  }

  if (updates.length === 0) return getJobById(jobId, userId);

  updates.push("updated_at = datetime('now')");
  values.push(jobId, userId);

  db.prepare(
    `UPDATE apex_jobs SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
  ).run(...values);

  logActivity(jobId, {
    event_type: 'status',
    description: `Milestone dates updated: ${Object.keys(dates).filter(k => allowedDateFields.includes(k)).join(', ')}`,
    entity_type: 'job',
    entity_id: jobId,
    actor_id: userId
  });

  return getJobById(jobId, userId);
}

// ============================================
// READY TO INVOICE
// ============================================

function toggleReadyToInvoice(jobId, ready, userId) {
  const job = db.prepare('SELECT id FROM apex_jobs WHERE id = ? AND user_id = ?').get(jobId, userId);
  if (!job) return null;

  db.prepare(
    "UPDATE apex_jobs SET ready_to_invoice = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?"
  ).run(ready ? 1 : 0, jobId, userId);

  logActivity(jobId, {
    event_type: 'status',
    description: `Invoice status: ${ready ? 'Ready to invoice' : 'Not ready to invoice'}`,
    entity_type: 'job',
    entity_id: jobId,
    actor_id: userId
  });

  return getJobById(jobId, userId);
}

// ============================================
// SINGLE-ENTRY LOOKUPS (for permission checks)
// ============================================

function getLaborEntryById(entryId) {
  return db.prepare('SELECT * FROM apex_job_labor WHERE id = ?').get(entryId);
}

function getReceiptById(receiptId) {
  return db.prepare('SELECT * FROM apex_job_receipts WHERE id = ?').get(receiptId);
}

/**
 * Get assignment counts per user across all active (non-archived) jobs.
 * Returns a map of lowercase user name → { mitigation_pm, reconstruction_pm, estimator, project_coordinator, mitigation_techs, total }
 */
function getAssignmentCounts() {
  const jobs = db.prepare(
    "SELECT mitigation_pm, reconstruction_pm, estimator, project_coordinator, mitigation_techs FROM apex_jobs WHERE status != 'archived'"
  ).all();

  const fields = ['mitigation_pm', 'reconstruction_pm', 'estimator', 'project_coordinator', 'mitigation_techs'];
  const counts = {}; // keyed by lowercase name

  for (const job of jobs) {
    for (const field of fields) {
      let arr = [];
      try { arr = JSON.parse(job[field] || '[]'); } catch { arr = []; }
      if (!Array.isArray(arr)) arr = [];
      for (const name of arr) {
        const key = (name || '').toLowerCase().trim();
        if (!key) continue;
        if (!counts[key]) counts[key] = { mitigation_pm: 0, reconstruction_pm: 0, estimator: 0, project_coordinator: 0, mitigation_techs: 0, total: 0 };
        counts[key][field]++;
        counts[key].total++;
      }
    }
  }

  return counts;
}

module.exports = {
  TYPE_CODES,
  generateJobNumber,
  createJob,
  getAllJobs,
  getJobById,
  updateJob,
  updatePhase,
  archiveJob,
  getJobStats,
  // Activity
  logActivity,
  getActivityByJob,
  // Notes
  createNote,
  getNotesByJob,
  getNoteById,
  updateNote,
  deleteNote,
  // Estimates
  createEstimate,
  getEstimatesByJob,
  updateEstimate,
  // Payments
  createPayment,
  getPaymentsByJob,
  // Labor
  createLaborEntry,
  getLaborByJob,
  updateLaborEntry,
  deleteLaborEntry,
  // Receipts
  createReceipt,
  getReceiptsByJob,
  updateReceipt,
  deleteReceipt,
  // Single-entry lookups
  getLaborEntryById,
  getReceiptById,
  // Work Orders
  createWorkOrder,
  getWorkOrdersByJob,
  updateWorkOrder,
  deleteWorkOrder,
  // Contacts
  assignContact,
  removeContact,
  getContactsByJob,
  // Accounting
  getAccountingSummary,
  // Dates
  updateJobDates,
  // Invoice
  toggleReadyToInvoice,
  // Team assignments
  getAssignmentCounts
};
