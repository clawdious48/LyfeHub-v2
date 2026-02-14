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
async function generateJobNumber(typeCode, client) {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  const runner = client || db;

  // Insert if not exists, then get and increment
  await runner.run(
    'INSERT INTO apex_job_number_seq (year_month, next_seq) VALUES ($1, 1) ON CONFLICT (year_month) DO NOTHING',
    [yearMonth]
  );
  const row = await runner.getOne('SELECT next_seq FROM apex_job_number_seq WHERE year_month = $1', [yearMonth]);
  const seq = row.next_seq;
  await runner.run('UPDATE apex_job_number_seq SET next_seq = next_seq + 1 WHERE year_month = $1', [yearMonth]);

  return `${yearMonth}-${String(seq).padStart(3, '0')}-${typeCode}`;
}

/**
 * Ensure a value is a JSON string (for assignment array fields)
 */
function ensureJsonString(val) {
  if (Array.isArray(val)) return JSON.stringify(val);
  if (typeof val === 'string') {
    try { JSON.parse(val); return val; } catch { return JSON.stringify([val]); }
  }
  return '[]';
}

/**
 * Create a new apex job with phases (transactional)
 */
async function createJob(data, userId, orgId) {
  const jobId = await db.transaction(async (client) => {
    const id = uuidv4();
    const name = `${data.client_name} - ${data.prop_street || data.client_street || 'New Job'}`;

    await client.run(`
      INSERT INTO apex_jobs (
        id, user_id, org_id, name, status,
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
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10, $11, $12, $13, $14,
        $15,
        $16, $17, $18, $19, $20, $21, $22,
        $23, $24, $25, $26,
        $27, $28, $29, $30,
        $31, $32, $33,
        $34, $35, $36, $37,
        $38, $39, $40, $41, $42,
        $43, $44, $45, $46,
        $47, $48, $49, $50, $51,
        $52, $53, $54,
        $55, $56,
        $57, $58, $59
      )
    `, [
      id, userId, orgId, name, data.status || 'active',
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
    ]);

    // Create phases for each selected job type
    const jobTypes = data.job_types || [];
    for (const jobType of jobTypes) {
      const typeCode = TYPE_CODES[jobType];
      if (!typeCode) continue;

      const phaseId = uuidv4();
      const jobNumber = await generateJobNumber(typeCode, client);

      await client.run(`
        INSERT INTO apex_job_phases (
          id, job_id, job_type, job_type_code, job_number
        ) VALUES ($1, $2, $3, $4, $5)
      `, [phaseId, id, jobType, typeCode, jobNumber]);
    }

    return id;
  });

  return getJobById(jobId, orgId);
}

/**
 * Get all non-archived jobs for a user, with phases
 */
async function getAllJobs(orgId) {
  const jobs = await db.getAll(
    'SELECT * FROM apex_jobs WHERE org_id = $1 AND status != $2 ORDER BY created_at DESC',
    [orgId, 'archived']
  );

  const jobIds = jobs.map(j => j.id);
  if (jobIds.length === 0) return [];

  const placeholders = jobIds.map((_, i) => `$${i + 1}`).join(',');
  const phases = await db.getAll(
    `SELECT * FROM apex_job_phases WHERE job_id IN (${placeholders}) ORDER BY created_at ASC`,
    jobIds
  );

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
async function getJobById(id, orgId) {
  const job = await db.getOne(
    'SELECT * FROM apex_jobs WHERE id = $1 AND org_id = $2',
    [id, orgId]
  );
  if (!job) return null;

  const phases = await db.getAll(
    'SELECT * FROM apex_job_phases WHERE job_id = $1 ORDER BY created_at ASC',
    [id]
  );

  return { ...job, phases };
}

/**
 * Update job fields dynamically (only updates fields present in data)
 */
async function updateJob(id, data, orgId) {
  const existing = await getJobById(id, orgId);
  if (!existing) return null;

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

  const jsonArrayFields = ['mitigation_pm', 'reconstruction_pm', 'estimator', 'project_coordinator', 'mitigation_techs',
    'additional_clients', 'additional_adjusters', 'site_contacts'];

  const updates = [];
  const values = [];
  let paramIdx = 1;

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = $${paramIdx++}`);
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
  updates.push(`updated_at = NOW()`);

  values.push(id, orgId);

  await db.run(
    `UPDATE apex_jobs SET ${updates.join(', ')} WHERE id = $${paramIdx++} AND org_id = $${paramIdx++}`,
    values
  );

  return getJobById(id, orgId);
}

/**
 * Update a phase (verifies job ownership via JOIN)
 */
async function updatePhase(phaseId, data, orgId) {
  // Verify ownership
  const phase = await db.getOne(`
    SELECT p.* FROM apex_job_phases p
    JOIN apex_jobs j ON p.job_id = j.id
    WHERE p.id = $1 AND j.org_id = $2
  `, [phaseId, orgId]);

  if (!phase) return null;

  const allowedFields = [
    'phase_status', 'documents', 'photos', 'estimates',
    'payments', 'labor_log', 'materials', 'notes', 'drying_logs'
  ];

  const jsonFields = ['documents', 'photos', 'estimates', 'payments', 'labor_log', 'materials', 'drying_logs'];

  const updates = [];
  const values = [];
  let paramIdx = 1;

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = $${paramIdx++}`);
      if (jsonFields.includes(field)) {
        values.push(typeof data[field] === 'string' ? data[field] : JSON.stringify(data[field]));
      } else {
        values.push(data[field]);
      }
    }
  }

  if (updates.length === 0) return phase;

  updates.push(`updated_at = NOW()`);
  values.push(phaseId);

  await db.run(
    `UPDATE apex_job_phases SET ${updates.join(', ')} WHERE id = $${paramIdx++}`,
    values
  );

  // Return updated phase
  return await db.getOne('SELECT * FROM apex_job_phases WHERE id = $1', [phaseId]);
}

/**
 * Archive a job (soft delete)
 */
async function archiveJob(id, orgId) {
  const result = await db.run(
    "UPDATE apex_jobs SET status = 'archived', updated_at = NOW() WHERE id = $1 AND org_id = $2",
    [id, orgId]
  );
  return result.rowCount > 0;
}

/**
 * Get job count stats grouped by status
 */
async function getJobStats(orgId) {
  const rows = await db.getAll(
    'SELECT status, COUNT(*) as count FROM apex_jobs WHERE org_id = $1 GROUP BY status',
    [orgId]
  );

  const stats = { active: 0, pending_insurance: 0, complete: 0, archived: 0, total: 0 };
  rows.forEach(r => {
    stats[r.status] = parseInt(r.count);
    stats.total += parseInt(r.count);
  });
  return stats;
}

// ============================================
// ACTIVITY LOG
// ============================================

/**
 * Log an activity entry (internal, no ownership check)
 */
async function logActivity(jobId, data) {
  const id = uuidv4();
  await db.run(`
    INSERT INTO apex_job_activity (
      id, job_id, event_type, description, entity_type, entity_id,
      old_value, new_value, amount, actor_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `, [
    id, jobId,
    data.event_type || 'note',
    data.description || '',
    data.entity_type || '',
    data.entity_id || '',
    data.old_value || '',
    data.new_value || '',
    data.amount ?? null,
    data.actor_id || ''
  ]);
  return id;
}

/**
 * Get activity log for a job with optional type filter and pagination
 */
async function getActivityByJob(jobId, orgId, options = {}) {
  // Verify ownership
  const job = await db.getOne('SELECT id FROM apex_jobs WHERE id = $1 AND org_id = $2', [jobId, orgId]);
  if (!job) return null;

  const params = [jobId];
  let paramIdx = 2;
  let where = 'WHERE job_id = $1';

  if (options.type) {
    where += ` AND event_type = $${paramIdx++}`;
    params.push(options.type);
  }

  const limit = options.limit || 50;
  const offset = options.offset || 0;
  params.push(limit, offset);

  return await db.getAll(
    `SELECT * FROM apex_job_activity ${where} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    params
  );
}

// ============================================
// NOTES
// ============================================

async function createNote(jobId, data, userId, orgId) {
  const job = await db.getOne('SELECT id FROM apex_jobs WHERE id = $1 AND org_id = $2', [jobId, orgId]);
  if (!job) return null;

  const id = uuidv4();
  await db.run(`
    INSERT INTO apex_job_notes (id, job_id, phase_id, subject, note_type, content, author_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [
    id, jobId,
    data.phase_id || null,
    data.subject || '',
    data.note_type || 'general',
    data.content || '',
    data.author_id || userId
  ]);

  await logActivity(jobId, {
    event_type: 'note',
    description: `Note added: ${data.subject || 'Untitled'}`,
    entity_type: 'note',
    entity_id: id,
    actor_id: userId
  });

  return await db.getOne('SELECT * FROM apex_job_notes WHERE id = $1', [id]);
}

async function getNotesByJob(jobId, orgId) {
  const job = await db.getOne('SELECT id FROM apex_jobs WHERE id = $1 AND org_id = $2', [jobId, orgId]);
  if (!job) return null;

  return await db.getAll(
    'SELECT n.*, u.name as author_name FROM apex_job_notes n LEFT JOIN users u ON n.author_id = u.id WHERE n.job_id = $1 ORDER BY n.created_at DESC',
    [jobId]
  );
}

async function getNoteById(noteId) {
  return await db.getOne('SELECT * FROM apex_job_notes WHERE id = $1', [noteId]);
}

async function updateNote(noteId, data) {
  const note = await getNoteById(noteId);
  if (!note) return null;

  const allowedFields = ['subject', 'note_type', 'content'];
  const updates = [];
  const values = [];
  let paramIdx = 1;

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = $${paramIdx++}`);
      values.push(data[field]);
    }
  }

  if (updates.length === 0) return note;
  values.push(noteId);

  await db.run(
    `UPDATE apex_job_notes SET ${updates.join(', ')} WHERE id = $${paramIdx++}`,
    values
  );

  return await db.getOne('SELECT n.*, u.name as author_name FROM apex_job_notes n LEFT JOIN users u ON n.author_id = u.id WHERE n.id = $1', [noteId]);
}

async function deleteNote(noteId, userId, orgId) {
  const note = await db.getOne(`
    SELECT n.* FROM apex_job_notes n
    JOIN apex_jobs j ON n.job_id = j.id
    WHERE n.id = $1 AND j.org_id = $2
  `, [noteId, orgId]);
  if (!note) return false;

  await db.run('DELETE FROM apex_job_notes WHERE id = $1', [noteId]);

  await logActivity(note.job_id, {
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

async function createEstimate(jobId, data, userId, orgId) {
  const job = await db.getOne('SELECT id FROM apex_jobs WHERE id = $1 AND org_id = $2', [jobId, orgId]);
  if (!job) return null;

  // Auto-version: count existing estimates of same type for this job
  const existing = await db.getOne(
    'SELECT COUNT(*) as cnt FROM apex_job_estimates WHERE job_id = $1 AND estimate_type = $2',
    [jobId, data.estimate_type || 'mitigation']
  );
  const version = (parseInt(existing.cnt) || 0) + 1;

  const id = uuidv4();
  await db.run(`
    INSERT INTO apex_job_estimates (
      id, job_id, phase_id, estimate_type, version, amount, original_amount,
      status, submitted_date, approved_date, file_path, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
  `, [
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
  ]);

  await logActivity(jobId, {
    event_type: 'estimate',
    description: `Estimate created: ${data.estimate_type || 'mitigation'} v${version}`,
    entity_type: 'estimate',
    entity_id: id,
    amount: data.amount || 0,
    actor_id: userId
  });

  return await db.getOne('SELECT * FROM apex_job_estimates WHERE id = $1', [id]);
}

async function getEstimatesByJob(jobId, orgId) {
  const job = await db.getOne('SELECT id FROM apex_jobs WHERE id = $1 AND org_id = $2', [jobId, orgId]);
  if (!job) return null;

  return await db.getAll(
    'SELECT * FROM apex_job_estimates WHERE job_id = $1 ORDER BY estimate_type, version ASC',
    [jobId]
  );
}

async function updateEstimate(estimateId, data, userId, orgId) {
  const est = await db.getOne(`
    SELECT e.* FROM apex_job_estimates e
    JOIN apex_jobs j ON e.job_id = j.id
    WHERE e.id = $1 AND j.org_id = $2
  `, [estimateId, orgId]);
  if (!est) return null;

  const allowedFields = ['amount', 'original_amount', 'status', 'submitted_date', 'approved_date', 'file_path', 'notes'];
  const updates = [];
  const values = [];
  let paramIdx = 1;

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = $${paramIdx++}`);
      values.push(data[field]);
    }
  }

  if (updates.length === 0) return est;
  values.push(estimateId);

  await db.run(
    `UPDATE apex_job_estimates SET ${updates.join(', ')} WHERE id = $${paramIdx++}`,
    values
  );

  await logActivity(est.job_id, {
    event_type: 'estimate',
    description: `Estimate updated: ${est.estimate_type} v${est.version}`,
    entity_type: 'estimate',
    entity_id: estimateId,
    old_value: data.status ? est.status : '',
    new_value: data.status || '',
    amount: data.amount ?? est.amount,
    actor_id: userId
  });

  return await db.getOne('SELECT * FROM apex_job_estimates WHERE id = $1', [estimateId]);
}

// ============================================
// PAYMENTS
// ============================================

async function createPayment(jobId, data, userId, orgId) {
  const job = await db.getOne('SELECT id FROM apex_jobs WHERE id = $1 AND org_id = $2', [jobId, orgId]);
  if (!job) return null;

  const id = uuidv4();
  await db.run(`
    INSERT INTO apex_job_payments (
      id, job_id, estimate_id, amount, payment_method, payment_type,
      check_number, received_date, deposited_date, invoice_number, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [
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
  ]);

  await logActivity(jobId, {
    event_type: 'payment',
    description: `Payment received: $${(data.amount || 0).toFixed(2)} (${data.payment_type || 'initial'})`,
    entity_type: 'payment',
    entity_id: id,
    amount: data.amount || 0,
    actor_id: userId
  });

  return await db.getOne('SELECT * FROM apex_job_payments WHERE id = $1', [id]);
}

async function getPaymentsByJob(jobId, orgId) {
  const job = await db.getOne('SELECT id FROM apex_jobs WHERE id = $1 AND org_id = $2', [jobId, orgId]);
  if (!job) return null;

  return await db.getAll(
    'SELECT * FROM apex_job_payments WHERE job_id = $1 ORDER BY received_date DESC, created_at DESC',
    [jobId]
  );
}

// ============================================
// LABOR
// ============================================

async function createLaborEntry(jobId, data, userId, orgId) {
  const job = await db.getOne('SELECT id FROM apex_jobs WHERE id = $1 AND org_id = $2', [jobId, orgId]);
  if (!job) return null;

  const id = uuidv4();
  await db.run(`
    INSERT INTO apex_job_labor (
      id, job_id, phase_id, employee_name, work_date, hours, hourly_rate,
      work_category, description, billable, author_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [
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
  ]);

  await logActivity(jobId, {
    event_type: 'labor',
    description: `Labor logged: ${data.employee_name || 'Unknown'} - ${data.hours || 0}h`,
    entity_type: 'labor',
    entity_id: id,
    amount: (data.hours || 0) * (data.hourly_rate || 0),
    actor_id: userId
  });

  return await db.getOne('SELECT * FROM apex_job_labor WHERE id = $1', [id]);
}

async function getLaborByJob(jobId, orgId) {
  const job = await db.getOne('SELECT id FROM apex_jobs WHERE id = $1 AND org_id = $2', [jobId, orgId]);
  if (!job) return null;

  return await db.getAll(
    'SELECT * FROM apex_job_labor WHERE job_id = $1 ORDER BY work_date DESC, created_at DESC',
    [jobId]
  );
}

async function updateLaborEntry(entryId, data, userId, orgId) {
  const entry = await db.getOne(`
    SELECT l.* FROM apex_job_labor l
    JOIN apex_jobs j ON l.job_id = j.id
    WHERE l.id = $1 AND j.org_id = $2
  `, [entryId, orgId]);
  if (!entry) return null;

  const allowedFields = ['employee_name', 'work_date', 'hours', 'hourly_rate', 'work_category', 'description', 'billable', 'phase_id'];
  const updates = [];
  const values = [];
  let paramIdx = 1;

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = $${paramIdx++}`);
      if (field === 'billable') {
        values.push(data[field] ? 1 : 0);
      } else {
        values.push(data[field]);
      }
    }
  }

  if (updates.length === 0) return entry;
  values.push(entryId);

  await db.run(
    `UPDATE apex_job_labor SET ${updates.join(', ')} WHERE id = $${paramIdx++}`,
    values
  );

  await logActivity(entry.job_id, {
    event_type: 'labor',
    description: `Labor entry updated: ${data.employee_name || entry.employee_name}`,
    entity_type: 'labor',
    entity_id: entryId,
    actor_id: userId
  });

  return await db.getOne('SELECT * FROM apex_job_labor WHERE id = $1', [entryId]);
}

async function deleteLaborEntry(entryId, userId, orgId) {
  const entry = await db.getOne(`
    SELECT l.* FROM apex_job_labor l
    JOIN apex_jobs j ON l.job_id = j.id
    WHERE l.id = $1 AND j.org_id = $2
  `, [entryId, orgId]);
  if (!entry) return false;

  await db.run('DELETE FROM apex_job_labor WHERE id = $1', [entryId]);

  await logActivity(entry.job_id, {
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

async function createReceipt(jobId, data, userId, orgId) {
  const job = await db.getOne('SELECT id FROM apex_jobs WHERE id = $1 AND org_id = $2', [jobId, orgId]);
  if (!job) return null;

  const id = uuidv4();
  await db.run(`
    INSERT INTO apex_job_receipts (
      id, job_id, phase_id, amount, expense_category, description,
      vendor, paid_by, reimbursable, expense_date, file_path, author_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
  `, [
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
  ]);

  await logActivity(jobId, {
    event_type: 'receipt',
    description: `Receipt added: $${(data.amount || 0).toFixed(2)} - ${data.vendor || 'Unknown vendor'}`,
    entity_type: 'receipt',
    entity_id: id,
    amount: data.amount || 0,
    actor_id: userId
  });

  return await db.getOne('SELECT * FROM apex_job_receipts WHERE id = $1', [id]);
}

async function getReceiptsByJob(jobId, orgId) {
  const job = await db.getOne('SELECT id FROM apex_jobs WHERE id = $1 AND org_id = $2', [jobId, orgId]);
  if (!job) return null;

  return await db.getAll(
    'SELECT * FROM apex_job_receipts WHERE job_id = $1 ORDER BY expense_date DESC, created_at DESC',
    [jobId]
  );
}

async function updateReceipt(receiptId, data, userId, orgId) {
  const receipt = await db.getOne(`
    SELECT r.* FROM apex_job_receipts r
    JOIN apex_jobs j ON r.job_id = j.id
    WHERE r.id = $1 AND j.org_id = $2
  `, [receiptId, orgId]);
  if (!receipt) return null;

  const allowedFields = ['amount', 'expense_category', 'description', 'vendor', 'paid_by', 'reimbursable', 'expense_date', 'file_path', 'phase_id'];
  const updates = [];
  const values = [];
  let paramIdx = 1;

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = $${paramIdx++}`);
      if (field === 'reimbursable') {
        values.push(data[field] ? 1 : 0);
      } else {
        values.push(data[field]);
      }
    }
  }

  if (updates.length === 0) return receipt;
  values.push(receiptId);

  await db.run(
    `UPDATE apex_job_receipts SET ${updates.join(', ')} WHERE id = $${paramIdx++}`,
    values
  );

  await logActivity(receipt.job_id, {
    event_type: 'receipt',
    description: `Receipt updated: ${data.vendor || receipt.vendor}`,
    entity_type: 'receipt',
    entity_id: receiptId,
    amount: data.amount ?? receipt.amount,
    actor_id: userId
  });

  return await db.getOne('SELECT * FROM apex_job_receipts WHERE id = $1', [receiptId]);
}

async function deleteReceipt(receiptId, userId, orgId) {
  const receipt = await db.getOne(`
    SELECT r.* FROM apex_job_receipts r
    JOIN apex_jobs j ON r.job_id = j.id
    WHERE r.id = $1 AND j.org_id = $2
  `, [receiptId, orgId]);
  if (!receipt) return false;

  await db.run('DELETE FROM apex_job_receipts WHERE id = $1', [receiptId]);

  await logActivity(receipt.job_id, {
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

async function createWorkOrder(jobId, data, userId, orgId) {
  const job = await db.getOne('SELECT id FROM apex_jobs WHERE id = $1 AND org_id = $2', [jobId, orgId]);
  if (!job) return null;

  const id = uuidv4();
  await db.run(`
    INSERT INTO apex_job_work_orders (
      id, job_id, phase_id, wo_number, title, description,
      budget_amount, status, file_path
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `, [
    id, jobId,
    data.phase_id || null,
    data.wo_number || '',
    data.title || '',
    data.description || '',
    data.budget_amount || 0,
    data.status || 'draft',
    data.file_path || ''
  ]);

  await logActivity(jobId, {
    event_type: 'work_order',
    description: `Work order created: ${data.title || data.wo_number || 'Untitled'}`,
    entity_type: 'work_order',
    entity_id: id,
    amount: data.budget_amount || 0,
    actor_id: userId
  });

  return await db.getOne('SELECT * FROM apex_job_work_orders WHERE id = $1', [id]);
}

async function getWorkOrdersByJob(jobId, orgId) {
  const job = await db.getOne('SELECT id FROM apex_jobs WHERE id = $1 AND org_id = $2', [jobId, orgId]);
  if (!job) return null;

  return await db.getAll(
    'SELECT * FROM apex_job_work_orders WHERE job_id = $1 ORDER BY created_at DESC',
    [jobId]
  );
}

async function updateWorkOrder(woId, data, userId, orgId) {
  const wo = await db.getOne(`
    SELECT w.* FROM apex_job_work_orders w
    JOIN apex_jobs j ON w.job_id = j.id
    WHERE w.id = $1 AND j.org_id = $2
  `, [woId, orgId]);
  if (!wo) return null;

  const allowedFields = ['wo_number', 'title', 'description', 'budget_amount', 'status', 'file_path', 'phase_id'];
  const updates = [];
  const values = [];
  let paramIdx = 1;

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = $${paramIdx++}`);
      values.push(data[field]);
    }
  }

  if (updates.length === 0) return wo;
  values.push(woId);

  await db.run(
    `UPDATE apex_job_work_orders SET ${updates.join(', ')} WHERE id = $${paramIdx++}`,
    values
  );

  await logActivity(wo.job_id, {
    event_type: 'work_order',
    description: `Work order updated: ${data.title || wo.title}`,
    entity_type: 'work_order',
    entity_id: woId,
    old_value: data.status ? wo.status : '',
    new_value: data.status || '',
    actor_id: userId
  });

  return await db.getOne('SELECT * FROM apex_job_work_orders WHERE id = $1', [woId]);
}

async function deleteWorkOrder(woId, userId, orgId) {
  const wo = await db.getOne(`
    SELECT w.* FROM apex_job_work_orders w
    JOIN apex_jobs j ON w.job_id = j.id
    WHERE w.id = $1 AND j.org_id = $2
  `, [woId, orgId]);
  if (!wo) return false;

  await db.run('DELETE FROM apex_job_work_orders WHERE id = $1', [woId]);

  await logActivity(wo.job_id, {
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

async function assignContact(jobId, contactId, role, userId, orgId) {
  const job = await db.getOne('SELECT id FROM apex_jobs WHERE id = $1 AND org_id = $2', [jobId, orgId]);
  if (!job) return null;

  // Check if already assigned
  const existing = await db.getOne(
    'SELECT id FROM apex_job_contacts WHERE job_id = $1 AND contact_id = $2',
    [jobId, contactId]
  );
  if (existing) return existing;

  const id = uuidv4();
  await db.run(`
    INSERT INTO apex_job_contacts (id, job_id, contact_id, role)
    VALUES ($1, $2, $3, $4)
  `, [id, jobId, contactId, role || '']);

  await logActivity(jobId, {
    event_type: 'status',
    description: `Contact assigned with role: ${role || 'none'}`,
    entity_type: 'contact',
    entity_id: contactId,
    actor_id: userId
  });

  return { id, job_id: jobId, contact_id: contactId, role: role || '' };
}

async function removeContact(jobId, contactId, userId, orgId) {
  const job = await db.getOne('SELECT id FROM apex_jobs WHERE id = $1 AND org_id = $2', [jobId, orgId]);
  if (!job) return false;

  const result = await db.run(
    'DELETE FROM apex_job_contacts WHERE job_id = $1 AND contact_id = $2',
    [jobId, contactId]
  );

  if (result.rowCount > 0) {
    await logActivity(jobId, {
      event_type: 'status',
      description: 'Contact removed from job',
      entity_type: 'contact',
      entity_id: contactId,
      actor_id: userId
    });
  }

  return result.rowCount > 0;
}

async function getContactsByJob(jobId, orgId) {
  const job = await db.getOne('SELECT id FROM apex_jobs WHERE id = $1 AND org_id = $2', [jobId, orgId]);
  if (!job) return null;

  return await db.getAll(
    'SELECT * FROM apex_job_contacts WHERE job_id = $1 ORDER BY created_at ASC',
    [jobId]
  );
}

// ============================================
// SUPPLEMENTS (JC-01)
// ============================================

async function createSupplement(jobId, data, userId, orgId) {
  const job = await db.getOne('SELECT id FROM apex_jobs WHERE id = $1 AND org_id = $2', [jobId, orgId]);
  if (!job) return null;

  const numRow = await db.getOne('SELECT COALESCE(MAX(supplement_number), 0) + 1 as next FROM apex_job_supplements WHERE job_id = $1', [jobId]);
  const id = uuidv4();
  await db.run(`
    INSERT INTO apex_job_supplements (
      id, job_id, supplement_number, description, amount_requested, amount_approved,
      status, submitted_date, approved_date, document_id, notes, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
  `, [
    id, jobId, numRow.next,
    data.description || '',
    data.amount_requested || 0,
    data.amount_approved ?? null,
    data.status || 'draft',
    data.submitted_date || null,
    data.approved_date || null,
    data.document_id || null,
    data.notes || '',
    userId
  ]);

  await logActivity(jobId, {
    event_type: 'supplement',
    description: `Supplement #${numRow.next} created: $${(data.amount_requested || 0).toFixed(2)}`,
    entity_type: 'supplement',
    entity_id: id,
    amount: data.amount_requested || 0,
    actor_id: userId
  });

  return await db.getOne('SELECT * FROM apex_job_supplements WHERE id = $1', [id]);
}

async function getSupplementsByJob(jobId, orgId) {
  const job = await db.getOne('SELECT id FROM apex_jobs WHERE id = $1 AND org_id = $2', [jobId, orgId]);
  if (!job) return null;
  return await db.getAll('SELECT * FROM apex_job_supplements WHERE job_id = $1 ORDER BY supplement_number ASC', [jobId]);
}

async function updateSupplement(id, data, userId, orgId) {
  const sup = await db.getOne(`
    SELECT s.* FROM apex_job_supplements s
    JOIN apex_jobs j ON s.job_id = j.id
    WHERE s.id = $1 AND j.org_id = $2
  `, [id, orgId]);
  if (!sup) return null;

  const allowedFields = ['description', 'amount_requested', 'amount_approved', 'status', 'submitted_date', 'approved_date', 'document_id', 'notes'];
  const updates = [];
  const values = [];
  let paramIdx = 1;

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = $${paramIdx++}`);
      values.push(data[field]);
    }
  }
  if (updates.length === 0) return sup;
  values.push(id);

  await db.run(`UPDATE apex_job_supplements SET ${updates.join(', ')} WHERE id = $${paramIdx++}`, values);

  await logActivity(sup.job_id, {
    event_type: 'supplement',
    description: `Supplement #${sup.supplement_number} updated`,
    entity_type: 'supplement',
    entity_id: id,
    old_value: data.status ? sup.status : '',
    new_value: data.status || '',
    actor_id: userId
  });

  return await db.getOne('SELECT * FROM apex_job_supplements WHERE id = $1', [id]);
}

async function deleteSupplement(id, userId, orgId) {
  const sup = await db.getOne(`
    SELECT s.* FROM apex_job_supplements s
    JOIN apex_jobs j ON s.job_id = j.id
    WHERE s.id = $1 AND j.org_id = $2
  `, [id, orgId]);
  if (!sup) return false;

  await db.run('DELETE FROM apex_job_supplements WHERE id = $1', [id]);

  await logActivity(sup.job_id, {
    event_type: 'supplement',
    description: `Supplement #${sup.supplement_number} deleted`,
    entity_type: 'supplement',
    entity_id: id,
    actor_id: userId
  });

  return true;
}

async function getSupplementById(id) {
  return await db.getOne('SELECT * FROM apex_job_supplements WHERE id = $1', [id]);
}

// ============================================
// SUB INVOICES (JC-02)
// ============================================

async function createSubInvoice(jobId, data, userId, orgId) {
  const job = await db.getOne('SELECT id FROM apex_jobs WHERE id = $1 AND org_id = $2', [jobId, orgId]);
  if (!job) return null;

  const id = uuidv4();
  const amount = data.amount || 0;
  const retainagePct = data.retainage_pct || 0;
  const retainageAmount = amount * (retainagePct / 100);

  await db.run(`
    INSERT INTO apex_sub_invoices (
      id, job_id, phase_id, sub_org_id, sub_contact_id, work_order_id,
      invoice_number, description, amount, retainage_pct, retainage_amount,
      amount_paid, status, invoice_date, due_date, paid_date, document_id, notes, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
  `, [
    id, jobId,
    data.phase_id || null,
    data.sub_org_id || null,
    data.sub_contact_id || null,
    data.work_order_id || null,
    data.invoice_number || '',
    data.description || '',
    amount,
    retainagePct,
    retainageAmount,
    data.amount_paid || 0,
    data.status || 'pending',
    data.invoice_date || null,
    data.due_date || null,
    data.paid_date || null,
    data.document_id || null,
    data.notes || '',
    userId
  ]);

  await logActivity(jobId, {
    event_type: 'sub_invoice',
    description: `Sub invoice created: $${amount.toFixed(2)} - ${data.description || data.invoice_number || ''}`,
    entity_type: 'sub_invoice',
    entity_id: id,
    amount: amount,
    actor_id: userId
  });

  return await db.getOne('SELECT * FROM apex_sub_invoices WHERE id = $1', [id]);
}

async function getSubInvoicesByJob(jobId, orgId) {
  const job = await db.getOne('SELECT id FROM apex_jobs WHERE id = $1 AND org_id = $2', [jobId, orgId]);
  if (!job) return null;
  return await db.getAll(`
    SELECT si.*, co.name as sub_org_name
    FROM apex_sub_invoices si
    LEFT JOIN apex_crm_organizations co ON si.sub_org_id = co.id
    WHERE si.job_id = $1
    ORDER BY si.created_at DESC
  `, [jobId]);
}

async function updateSubInvoice(id, data, userId, orgId) {
  const inv = await db.getOne(`
    SELECT si.* FROM apex_sub_invoices si
    JOIN apex_jobs j ON si.job_id = j.id
    WHERE si.id = $1 AND j.org_id = $2
  `, [id, orgId]);
  if (!inv) return null;

  const allowedFields = ['phase_id', 'sub_org_id', 'sub_contact_id', 'work_order_id', 'invoice_number', 'description', 'amount', 'retainage_pct', 'amount_paid', 'status', 'invoice_date', 'due_date', 'paid_date', 'document_id', 'notes'];
  const updates = [];
  const values = [];
  let paramIdx = 1;

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = $${paramIdx++}`);
      values.push(data[field]);
    }
  }

  // Recalculate retainage if amount or pct changed
  const newAmount = data.amount !== undefined ? data.amount : inv.amount;
  const newPct = data.retainage_pct !== undefined ? data.retainage_pct : inv.retainage_pct;
  if (data.amount !== undefined || data.retainage_pct !== undefined) {
    updates.push(`retainage_amount = $${paramIdx++}`);
    values.push(newAmount * (newPct / 100));
  }

  if (updates.length === 0) return inv;
  values.push(id);

  await db.run(`UPDATE apex_sub_invoices SET ${updates.join(', ')} WHERE id = $${paramIdx++}`, values);

  await logActivity(inv.job_id, {
    event_type: 'sub_invoice',
    description: `Sub invoice updated: ${data.invoice_number || inv.invoice_number || ''}`,
    entity_type: 'sub_invoice',
    entity_id: id,
    old_value: data.status ? inv.status : '',
    new_value: data.status || '',
    actor_id: userId
  });

  return await db.getOne('SELECT * FROM apex_sub_invoices WHERE id = $1', [id]);
}

async function deleteSubInvoice(id, userId, orgId) {
  const inv = await db.getOne(`
    SELECT si.* FROM apex_sub_invoices si
    JOIN apex_jobs j ON si.job_id = j.id
    WHERE si.id = $1 AND j.org_id = $2
  `, [id, orgId]);
  if (!inv) return false;

  await db.run('DELETE FROM apex_sub_invoices WHERE id = $1', [id]);

  await logActivity(inv.job_id, {
    event_type: 'sub_invoice',
    description: `Sub invoice deleted: $${inv.amount} - ${inv.invoice_number || ''}`,
    entity_type: 'sub_invoice',
    entity_id: id,
    actor_id: userId
  });

  return true;
}

async function recordSubPayment(id, paymentAmount, userId, orgId) {
  const inv = await db.getOne(`
    SELECT si.* FROM apex_sub_invoices si
    JOIN apex_jobs j ON si.job_id = j.id
    WHERE si.id = $1 AND j.org_id = $2
  `, [id, orgId]);
  if (!inv) return null;

  const newPaid = (inv.amount_paid || 0) + paymentAmount;
  const netDue = inv.amount - inv.retainage_amount;
  const newStatus = newPaid >= netDue ? 'paid' : newPaid > 0 ? 'partial_paid' : inv.status;

  await db.run(
    `UPDATE apex_sub_invoices SET amount_paid = $1, status = $2, paid_date = CASE WHEN $3 >= $4 THEN NOW() ELSE paid_date END WHERE id = $5`,
    [newPaid, newStatus, newPaid, netDue, id]
  );

  await logActivity(inv.job_id, {
    event_type: 'sub_invoice',
    description: `Sub payment recorded: $${paymentAmount.toFixed(2)} on invoice ${inv.invoice_number || id}`,
    entity_type: 'sub_invoice',
    entity_id: id,
    amount: paymentAmount,
    actor_id: userId
  });

  return await db.getOne('SELECT * FROM apex_sub_invoices WHERE id = $1', [id]);
}

async function getSubInvoiceById(id) {
  return await db.getOne('SELECT * FROM apex_sub_invoices WHERE id = $1', [id]);
}

// ============================================
// FUEL / MILEAGE (JC-03)
// ============================================

async function createFuelEntry(jobId, data, userId, orgId) {
  const job = await db.getOne('SELECT id FROM apex_jobs WHERE id = $1 AND org_id = $2', [jobId, orgId]);
  if (!job) return null;

  const id = uuidv4();
  const type = data.type || 'mileage';
  let totalCost = 0;
  if (type === 'mileage') {
    totalCost = (data.miles || 0) * (data.mileage_rate || 0);
  } else {
    totalCost = data.fuel_cost || 0;
  }

  await db.run(`
    INSERT INTO apex_job_fuel_mileage (
      id, job_id, employee_id, date, type, miles, mileage_rate,
      fuel_cost, total_cost, document_id, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [
    id, jobId,
    data.employee_id || userId,
    data.date || null,
    type,
    data.miles || 0,
    data.mileage_rate || 0,
    data.fuel_cost || 0,
    totalCost,
    data.document_id || null,
    data.notes || ''
  ]);

  await logActivity(jobId, {
    event_type: 'fuel_mileage',
    description: `${type === 'mileage' ? 'Mileage' : 'Fuel'} entry: $${totalCost.toFixed(2)}`,
    entity_type: 'fuel_mileage',
    entity_id: id,
    amount: totalCost,
    actor_id: userId
  });

  return await db.getOne(`
    SELECT fm.*, u.name as employee_name
    FROM apex_job_fuel_mileage fm
    LEFT JOIN users u ON fm.employee_id = u.id
    WHERE fm.id = $1
  `, [id]);
}

async function getFuelByJob(jobId, orgId) {
  const job = await db.getOne('SELECT id FROM apex_jobs WHERE id = $1 AND org_id = $2', [jobId, orgId]);
  if (!job) return null;
  return await db.getAll(`
    SELECT fm.*, u.name as employee_name
    FROM apex_job_fuel_mileage fm
    LEFT JOIN users u ON fm.employee_id = u.id
    WHERE fm.job_id = $1
    ORDER BY fm.date DESC, fm.created_at DESC
  `, [jobId]);
}

async function updateFuelEntry(id, data, userId, orgId) {
  const entry = await db.getOne(`
    SELECT fm.* FROM apex_job_fuel_mileage fm
    JOIN apex_jobs j ON fm.job_id = j.id
    WHERE fm.id = $1 AND j.org_id = $2
  `, [id, orgId]);
  if (!entry) return null;

  const allowedFields = ['employee_id', 'date', 'type', 'miles', 'mileage_rate', 'fuel_cost', 'document_id', 'notes'];
  const updates = [];
  const values = [];
  let paramIdx = 1;

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = $${paramIdx++}`);
      values.push(data[field]);
    }
  }

  // Recalculate total_cost
  const type = data.type !== undefined ? data.type : entry.type;
  let totalCost;
  if (type === 'mileage') {
    const miles = data.miles !== undefined ? data.miles : entry.miles;
    const rate = data.mileage_rate !== undefined ? data.mileage_rate : entry.mileage_rate;
    totalCost = miles * rate;
  } else {
    totalCost = data.fuel_cost !== undefined ? data.fuel_cost : entry.fuel_cost;
  }
  updates.push(`total_cost = $${paramIdx++}`);
  values.push(totalCost);

  values.push(id);
  await db.run(`UPDATE apex_job_fuel_mileage SET ${updates.join(', ')} WHERE id = $${paramIdx++}`, values);

  await logActivity(entry.job_id, {
    event_type: 'fuel_mileage',
    description: `Fuel/mileage entry updated: $${totalCost.toFixed(2)}`,
    entity_type: 'fuel_mileage',
    entity_id: id,
    amount: totalCost,
    actor_id: userId
  });

  return await db.getOne(`
    SELECT fm.*, u.name as employee_name
    FROM apex_job_fuel_mileage fm
    LEFT JOIN users u ON fm.employee_id = u.id
    WHERE fm.id = $1
  `, [id]);
}

async function deleteFuelEntry(id, userId, orgId) {
  const entry = await db.getOne(`
    SELECT fm.* FROM apex_job_fuel_mileage fm
    JOIN apex_jobs j ON fm.job_id = j.id
    WHERE fm.id = $1 AND j.org_id = $2
  `, [id, orgId]);
  if (!entry) return false;

  await db.run('DELETE FROM apex_job_fuel_mileage WHERE id = $1', [id]);

  await logActivity(entry.job_id, {
    event_type: 'fuel_mileage',
    description: `Fuel/mileage entry deleted: $${entry.total_cost}`,
    entity_type: 'fuel_mileage',
    entity_id: id,
    actor_id: userId
  });

  return true;
}

async function getFuelEntryById(id) {
  return await db.getOne('SELECT * FROM apex_job_fuel_mileage WHERE id = $1', [id]);
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
 */
async function computeMetrics(jobId, opts = {}) {
  const { estimate_type, phase_id } = opts;

  // Total estimates — sum only the LATEST version per estimate_type (dedup)
  const estFilter = estimate_type ? 'AND e1.estimate_type = $2' : '';
  const estParams = estimate_type ? [jobId, estimate_type] : [jobId];
  const totalEstimatesRow = await db.getOne(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM apex_job_estimates e1
    WHERE e1.job_id = $1
    ${estFilter}
    AND e1.version = (
      SELECT MAX(e2.version) FROM apex_job_estimates e2
      WHERE e2.job_id = e1.job_id
      AND COALESCE(e2.estimate_type, '') = COALESCE(e1.estimate_type, '')
    )
  `, estParams);

  // Approved estimates
  const approvedEstimatesRow = await db.getOne(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM apex_job_estimates e1
    WHERE e1.job_id = $1
    AND e1.status = 'approved'
    ${estFilter}
    AND e1.version = (
      SELECT MAX(e2.version) FROM apex_job_estimates e2
      WHERE e2.job_id = e1.job_id
      AND COALESCE(e2.estimate_type, '') = COALESCE(e1.estimate_type, '')
    )
  `, estParams);

  // Estimate count
  const estimateCountRow = await db.getOne(`
    SELECT COUNT(*) as cnt
    FROM apex_job_estimates e1
    WHERE e1.job_id = $1
    ${estFilter}
    AND e1.version = (
      SELECT MAX(e2.version) FROM apex_job_estimates e2
      WHERE e2.job_id = e1.job_id
      AND COALESCE(e2.estimate_type, '') = COALESCE(e1.estimate_type, '')
    )
  `, estParams);

  // Payments
  let paymentsRow;
  if (estimate_type) {
    paymentsRow = await db.getOne(`
      SELECT COALESCE(SUM(p.amount), 0) as total
      FROM apex_job_payments p
      WHERE p.estimate_id IN (
        SELECT id FROM apex_job_estimates WHERE job_id = $1 AND estimate_type = $2
      )
    `, [jobId, estimate_type]);
  } else {
    paymentsRow = await db.getOne(
      'SELECT COALESCE(SUM(amount), 0) as total FROM apex_job_payments WHERE job_id = $1',
      [jobId]
    );
  }

  // Labor cost (billable only)
  const laborParams = phase_id ? [jobId, phase_id] : [jobId];
  const laborFilter = phase_id ? 'AND phase_id = $2' : '';
  const laborRow = await db.getOne(`
    SELECT COALESCE(SUM(hours * hourly_rate), 0) as total
    FROM apex_job_labor WHERE job_id = $1 AND billable = 1 ${laborFilter}
  `, laborParams);

  // Materials/receipts cost
  const receiptsParams = phase_id ? [jobId, phase_id] : [jobId];
  const receiptsFilter = phase_id ? 'AND phase_id = $2' : '';
  const receiptsRow = await db.getOne(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM apex_job_receipts WHERE job_id = $1 ${receiptsFilter}
  `, receiptsParams);

  // Work order budget
  const woParams = phase_id ? [jobId, phase_id] : [jobId];
  const woFilter = phase_id ? 'AND phase_id = $2' : '';
  const workOrdersRow = await db.getOne(`
    SELECT COALESCE(SUM(budget_amount), 0) as total
    FROM apex_job_work_orders WHERE job_id = $1 AND status != 'cancelled' ${woFilter}
  `, woParams);

  // Approved supplements revenue
  const supplementsRow = await db.getOne(`
    SELECT COALESCE(SUM(amount_approved), 0) as total
    FROM apex_job_supplements WHERE job_id = $1 AND status = 'approved'
  `, [jobId]);

  // Material allocation costs
  const matParams = phase_id ? [jobId, phase_id] : [jobId];
  const phaseFilterMat = phase_id ? 'AND phase_id = $2' : '';
  const materialsAllocRow = await db.getOne(`
    SELECT COALESCE(SUM(total_cost), 0) as total
    FROM apex_job_material_allocations WHERE job_id = $1 ${phaseFilterMat}
  `, matParams);

  // Sub invoice costs
  const subInvoicesRow = await db.getOne(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM apex_sub_invoices WHERE job_id = $1
  `, [jobId]);

  // Fuel/mileage costs
  const fuelMileageRow = await db.getOne(`
    SELECT COALESCE(SUM(total_cost), 0) as total
    FROM apex_job_fuel_mileage WHERE job_id = $1
  `, [jobId]);

  const totalEstimates = parseFloat(totalEstimatesRow.total);
  const approvedEstimates = parseFloat(approvedEstimatesRow.total);
  const supplementRevenue = parseFloat(supplementsRow.total);
  const totalRevenue = approvedEstimates + supplementRevenue;
  const totalPaid = parseFloat(paymentsRow.total);
  const laborCost = parseFloat(laborRow.total);
  const materialsCost = parseFloat(receiptsRow.total);
  const materialAllocationCost = parseFloat(materialsAllocRow.total);
  const subInvoiceCost = parseFloat(subInvoicesRow.total);
  const fuelMileageCost = parseFloat(fuelMileageRow.total);
  const totalCost = laborCost + materialsCost + materialAllocationCost + subInvoiceCost + fuelMileageCost;
  const workOrderBudget = parseFloat(workOrdersRow.total);
  const grossProfit = totalRevenue - totalCost;
  const gpMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  return {
    total_estimates: totalEstimates,
    approved_estimates: approvedEstimates,
    supplement_revenue: supplementRevenue,
    total_revenue: totalRevenue,
    total_paid: totalPaid,
    balance_due: totalEstimates - totalPaid,
    labor_cost: laborCost,
    materials_cost: materialsCost,
    material_allocation_cost: materialAllocationCost,
    sub_invoice_cost: subInvoiceCost,
    fuel_mileage_cost: fuelMileageCost,
    total_cost: totalCost,
    work_order_budget: workOrderBudget,
    gross_profit: grossProfit,
    gp_margin: Math.round(gpMargin * 100) / 100,
    estimate_count: parseInt(estimateCountRow.cnt)
  };
}

async function getAccountingSummary(jobId, orgId) {
  const job = await db.getOne('SELECT id FROM apex_jobs WHERE id = $1 AND org_id = $2', [jobId, orgId]);
  if (!job) return null;

  // Get all phases for this job
  const phases = await db.getAll(
    'SELECT * FROM apex_job_phases WHERE job_id = $1 ORDER BY created_at ASC',
    [jobId]
  );

  // All-phases metrics (unfiltered)
  const all = await computeMetrics(jobId);

  // Per-phase metrics keyed by long type name
  const by_type = {};
  for (const phase of phases) {
    const typeName = REVERSE_TYPE_CODES[phase.job_type_code] || phase.job_type;
    by_type[typeName] = await computeMetrics(jobId, {
      estimate_type: typeName,
      phase_id: phase.id
    });
  }

  return { all, by_type };
}

// ============================================
// DATES
// ============================================

async function updateJobDates(jobId, dates, userId, orgId) {
  const job = await db.getOne('SELECT id FROM apex_jobs WHERE id = $1 AND org_id = $2', [jobId, orgId]);
  if (!job) return null;

  const allowedDateFields = [
    'contacted_date', 'inspection_date', 'work_auth_date',
    'start_date', 'cos_date', 'completion_date'
  ];

  const updates = [];
  const values = [];
  let paramIdx = 1;

  for (const field of allowedDateFields) {
    if (dates[field] !== undefined) {
      updates.push(`${field} = $${paramIdx++}`);
      values.push(dates[field]);
    }
  }

  if (updates.length === 0) return getJobById(jobId, orgId);

  updates.push(`updated_at = NOW()`);
  values.push(jobId, orgId);

  await db.run(
    `UPDATE apex_jobs SET ${updates.join(', ')} WHERE id = $${paramIdx++} AND org_id = $${paramIdx++}`,
    values
  );

  await logActivity(jobId, {
    event_type: 'status',
    description: `Milestone dates updated: ${Object.keys(dates).filter(k => allowedDateFields.includes(k)).join(', ')}`,
    entity_type: 'job',
    entity_id: jobId,
    actor_id: userId
  });

  return getJobById(jobId, orgId);
}

// ============================================
// READY TO INVOICE
// ============================================

async function toggleReadyToInvoice(jobId, ready, userId, orgId) {
  const job = await db.getOne('SELECT id FROM apex_jobs WHERE id = $1 AND org_id = $2', [jobId, orgId]);
  if (!job) return null;

  await db.run(
    "UPDATE apex_jobs SET ready_to_invoice = $1, updated_at = NOW() WHERE id = $2 AND org_id = $3",
    [ready ? 1 : 0, jobId, orgId]
  );

  await logActivity(jobId, {
    event_type: 'status',
    description: `Invoice status: ${ready ? 'Ready to invoice' : 'Not ready to invoice'}`,
    entity_type: 'job',
    entity_id: jobId,
    actor_id: userId
  });

  return getJobById(jobId, orgId);
}

// ============================================
// SINGLE-ENTRY LOOKUPS (for permission checks)
// ============================================

async function getLaborEntryById(entryId) {
  return await db.getOne('SELECT * FROM apex_job_labor WHERE id = $1', [entryId]);
}

async function getReceiptById(receiptId) {
  return await db.getOne('SELECT * FROM apex_job_receipts WHERE id = $1', [receiptId]);
}

/**
 * Get assignment counts per user across all active (non-archived) jobs.
 */
async function getAssignmentCounts() {
  const jobs = await db.getAll(
    "SELECT mitigation_pm, reconstruction_pm, estimator, project_coordinator, mitigation_techs FROM apex_jobs WHERE status != 'archived'"
  );

  const fields = ['mitigation_pm', 'reconstruction_pm', 'estimator', 'project_coordinator', 'mitigation_techs'];
  const counts = {};

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
  getAssignmentCounts,
  // Supplements (JC-01)
  createSupplement,
  getSupplementsByJob,
  getSupplementById,
  updateSupplement,
  deleteSupplement,
  // Sub Invoices (JC-02)
  createSubInvoice,
  getSubInvoicesByJob,
  getSubInvoiceById,
  updateSubInvoice,
  deleteSubInvoice,
  recordSubPayment,
  // Fuel/Mileage (JC-03)
  createFuelEntry,
  getFuelByJob,
  getFuelEntryById,
  updateFuelEntry,
  deleteFuelEntry
};
