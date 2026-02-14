const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

// ============================================
// TEMPLATE CRUD
// ============================================

function createTemplate(orgId, data) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO apex_workflow_templates (id, org_id, name, description, job_types, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, orgId, data.name, data.description || '', JSON.stringify(data.job_types || []), data.created_by || null);
  return getTemplateById(id, orgId);
}

function getTemplateById(id, orgId) {
  const template = db.prepare(`SELECT * FROM apex_workflow_templates WHERE id = ? AND org_id = ?`).get(id, orgId);
  if (!template) return null;
  template.job_types = JSON.parse(template.job_types || '[]');
  template.steps = getStepsByTemplate(id);
  return template;
}

function getAllTemplates(orgId, filters = {}) {
  let sql = `SELECT * FROM apex_workflow_templates WHERE org_id = ?`;
  const params = [orgId];

  if (filters.status) {
    sql += ` AND status = ?`;
    params.push(filters.status);
  }
  if (filters.jobType) {
    // Match templates that include this job type OR are universal (empty array)
    sql += ` AND (job_types = '[]' OR job_types LIKE ?)`;
    params.push(`%"${filters.jobType}"%`);
  }
  sql += ` ORDER BY updated_at DESC`;

  const templates = db.prepare(sql).all(...params);
  return templates.map(t => {
    t.job_types = JSON.parse(t.job_types || '[]');
    return t;
  });
}

function updateTemplate(id, data, orgId) {
  const fields = [];
  const params = [];
  const allowed = ['name', 'description', 'job_types', 'status'];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      params.push(key === 'job_types' ? JSON.stringify(data[key]) : data[key]);
    }
  }
  if (fields.length === 0) return getTemplateById(id, orgId);
  fields.push(`updated_at = datetime('now')`);
  params.push(id, orgId);
  db.prepare(`UPDATE apex_workflow_templates SET ${fields.join(', ')} WHERE id = ? AND org_id = ?`).run(...params);
  return getTemplateById(id, orgId);
}

function archiveTemplate(id, orgId) {
  db.prepare(`UPDATE apex_workflow_templates SET status = 'archived', updated_at = datetime('now') WHERE id = ? AND org_id = ?`).run(id, orgId);
  return getTemplateById(id, orgId);
}

function publishTemplate(id, orgId) {
  const t = db.prepare(`SELECT * FROM apex_workflow_templates WHERE id = ? AND org_id = ?`).get(id, orgId);
  if (!t) return null;
  db.prepare(`UPDATE apex_workflow_templates SET status = 'published', version = version + 1, updated_at = datetime('now') WHERE id = ? AND org_id = ?`).run(id, orgId);
  return getTemplateById(id, orgId);
}

function duplicateTemplate(id, orgId) {
  const original = getTemplateById(id, orgId);
  if (!original) return null;

  const dup = db.transaction(() => {
    const newId = uuidv4();
    db.prepare(`
      INSERT INTO apex_workflow_templates (id, org_id, name, description, job_types, status, created_by)
      VALUES (?, ?, ?, ?, ?, 'draft', ?)
    `).run(newId, orgId, `${original.name} (Copy)`, original.description, JSON.stringify(original.job_types), original.created_by);

    // Copy steps and gates
    for (const step of original.steps) {
      const newStepId = uuidv4();
      db.prepare(`
        INSERT INTO apex_workflow_template_steps (id, template_id, name, description, sequence_number, assigned_role, is_required, allow_override, estimated_duration_hours)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(newStepId, newId, step.name, step.description, step.sequence_number, step.assigned_role, step.is_required, step.allow_override, step.estimated_duration_hours);

      if (step.gates) {
        for (const gate of step.gates) {
          db.prepare(`
            INSERT INTO apex_workflow_step_gates (id, step_id, gate_type, gate_config, description)
            VALUES (?, ?, ?, ?, ?)
          `).run(uuidv4(), newStepId, gate.gate_type, gate.gate_config, gate.description);
        }
      }
    }
    return getTemplateById(newId, orgId);
  })();

  return dup;
}

// ============================================
// TEMPLATE STEPS
// ============================================

function addStep(templateId, data) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO apex_workflow_template_steps (id, template_id, name, description, sequence_number, assigned_role, is_required, allow_override, estimated_duration_hours)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, templateId, data.name, data.description || '', data.sequence_number,
    data.assigned_role, data.is_required ?? 1, data.allow_override ?? 0,
    data.estimated_duration_hours ?? null
  );
  db.prepare(`UPDATE apex_workflow_templates SET updated_at = datetime('now') WHERE id = ?`).run(templateId);
  return db.prepare(`SELECT * FROM apex_workflow_template_steps WHERE id = ?`).get(id);
}

function updateStep(stepId, data) {
  const fields = [];
  const params = [];
  const allowed = ['name', 'description', 'sequence_number', 'assigned_role', 'is_required', 'allow_override', 'estimated_duration_hours'];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      params.push(data[key]);
    }
  }
  if (fields.length === 0) return db.prepare(`SELECT * FROM apex_workflow_template_steps WHERE id = ?`).get(stepId);
  params.push(stepId);
  db.prepare(`UPDATE apex_workflow_template_steps SET ${fields.join(', ')} WHERE id = ?`).run(...params);

  const step = db.prepare(`SELECT * FROM apex_workflow_template_steps WHERE id = ?`).get(stepId);
  if (step) db.prepare(`UPDATE apex_workflow_templates SET updated_at = datetime('now') WHERE id = ?`).run(step.template_id);
  return step;
}

function deleteStep(stepId) {
  const step = db.prepare(`SELECT * FROM apex_workflow_template_steps WHERE id = ?`).get(stepId);
  if (!step) return false;
  db.prepare(`DELETE FROM apex_workflow_template_steps WHERE id = ?`).run(stepId);
  db.prepare(`UPDATE apex_workflow_templates SET updated_at = datetime('now') WHERE id = ?`).run(step.template_id);
  return true;
}

function reorderSteps(templateId, stepIds) {
  const reorder = db.transaction(() => {
    for (let i = 0; i < stepIds.length; i++) {
      db.prepare(`UPDATE apex_workflow_template_steps SET sequence_number = ? WHERE id = ? AND template_id = ?`).run(i + 1, stepIds[i], templateId);
    }
    db.prepare(`UPDATE apex_workflow_templates SET updated_at = datetime('now') WHERE id = ?`).run(templateId);
  });
  reorder();
  return getStepsByTemplate(templateId);
}

function getStepsByTemplate(templateId) {
  const steps = db.prepare(`SELECT * FROM apex_workflow_template_steps WHERE template_id = ? ORDER BY sequence_number`).all(templateId);
  for (const step of steps) {
    step.gates = getGatesByStep(step.id);
  }
  return steps;
}

// ============================================
// STEP GATES
// ============================================

function addGate(stepId, data) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO apex_workflow_step_gates (id, step_id, gate_type, gate_config, description)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, stepId, data.gate_type, JSON.stringify(data.gate_config || {}), data.description || '');
  return db.prepare(`SELECT * FROM apex_workflow_step_gates WHERE id = ?`).get(id);
}

function updateGate(gateId, data) {
  const fields = [];
  const params = [];
  if (data.gate_type !== undefined) { fields.push('gate_type = ?'); params.push(data.gate_type); }
  if (data.gate_config !== undefined) { fields.push('gate_config = ?'); params.push(JSON.stringify(data.gate_config)); }
  if (data.description !== undefined) { fields.push('description = ?'); params.push(data.description); }
  if (fields.length === 0) return db.prepare(`SELECT * FROM apex_workflow_step_gates WHERE id = ?`).get(gateId);
  params.push(gateId);
  db.prepare(`UPDATE apex_workflow_step_gates SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return db.prepare(`SELECT * FROM apex_workflow_step_gates WHERE id = ?`).get(gateId);
}

function deleteGate(gateId) {
  const result = db.prepare(`DELETE FROM apex_workflow_step_gates WHERE id = ?`).run(gateId);
  return result.changes > 0;
}

function getGatesByStep(stepId) {
  return db.prepare(`SELECT * FROM apex_workflow_step_gates WHERE step_id = ? ORDER BY created_at`).all(stepId);
}

// ============================================
// JOB WORKFLOW INSTANCES
// ============================================

/**
 * Stamp a workflow template onto a job — copies all steps and gates
 */
function stampWorkflow(jobId, templateId, phaseId, orgId) {
  const template = getTemplateById(templateId, orgId);
  if (!template) throw new Error('Template not found');
  if (template.status !== 'published') throw new Error('Only published templates can be stamped onto jobs');

  // Verify job exists
  const job = db.prepare(`SELECT id FROM apex_jobs WHERE id = ?`).get(jobId);
  if (!job) throw new Error('Job not found');

  const stamp = db.transaction(() => {
    const workflowId = uuidv4();
    db.prepare(`
      INSERT INTO apex_job_workflows (id, job_id, template_id, phase_id)
      VALUES (?, ?, ?, ?)
    `).run(workflowId, jobId, templateId, phaseId || null);

    for (const step of template.steps) {
      const jobStepId = uuidv4();
      db.prepare(`
        INSERT INTO apex_job_workflow_steps (id, workflow_id, template_step_id, name, description, sequence_number, assigned_role)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(jobStepId, workflowId, step.id, step.name, step.description, step.sequence_number, step.assigned_role);

      for (const gate of (step.gates || [])) {
        db.prepare(`
          INSERT INTO apex_job_workflow_step_gates (id, job_step_id, gate_type, gate_config, description)
          VALUES (?, ?, ?, ?, ?)
        `).run(uuidv4(), jobStepId, gate.gate_type, gate.gate_config, gate.description);
      }
    }

    // Evaluate all gates to set initial step availability
    evaluateAllGates(workflowId);

    return workflowId;
  })();

  return getWorkflowByJob(jobId);
}

/**
 * Get workflow instance with all steps and gates
 */
function getWorkflowByJob(jobId) {
  const workflow = db.prepare(`SELECT * FROM apex_job_workflows WHERE job_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1`).get(jobId);
  if (!workflow) return null;

  workflow.steps = db.prepare(`SELECT * FROM apex_job_workflow_steps WHERE workflow_id = ? ORDER BY sequence_number`).all(workflow.id);
  for (const step of workflow.steps) {
    step.gates = db.prepare(`SELECT * FROM apex_job_workflow_step_gates WHERE job_step_id = ? ORDER BY created_at`).all(step.id);
  }
  return workflow;
}

/**
 * Evaluate all gates for a single step — update is_met flags and step status
 */
function evaluateGates(jobStepId) {
  const step = db.prepare(`SELECT * FROM apex_job_workflow_steps WHERE id = ?`).get(jobStepId);
  if (!step) return false;
  // Don't re-evaluate completed/skipped/overridden steps
  if (['complete', 'skipped', 'overridden'].includes(step.status)) return true;

  const gates = db.prepare(`SELECT * FROM apex_job_workflow_step_gates WHERE job_step_id = ?`).all(jobStepId);
  const workflow = db.prepare(`SELECT * FROM apex_job_workflows WHERE id = ?`).get(step.workflow_id);

  for (const gate of gates) {
    if (gate.is_met || gate.override) continue; // Already satisfied

    let met = false;
    const config = JSON.parse(gate.gate_config || '{}');

    switch (gate.gate_type) {
      case 'previous_step': {
        const prevStep = db.prepare(`
          SELECT * FROM apex_job_workflow_steps
          WHERE workflow_id = ? AND sequence_number = ?
        `).get(step.workflow_id, step.sequence_number - 1);
        met = !prevStep || ['complete', 'skipped', 'overridden'].includes(prevStep.status);
        break;
      }
      case 'specific_step': {
        if (config.step_id) {
          // Find the job step that was copied from this template step
          const targetStep = db.prepare(`
            SELECT * FROM apex_job_workflow_steps
            WHERE workflow_id = ? AND template_step_id = ?
          `).get(step.workflow_id, config.step_id);
          met = targetStep && ['complete', 'skipped', 'overridden'].includes(targetStep.status);
        }
        break;
      }
      case 'manual_approval': {
        // Manual gates stay unmet until explicitly approved
        met = false;
        break;
      }
      case 'custom': {
        // Custom gates stay unmet until manually verified
        met = false;
        break;
      }
      case 'field_not_empty': {
        if (config.field && workflow) {
          const job = db.prepare(`SELECT * FROM apex_jobs WHERE id = ?`).get(workflow.job_id);
          if (job) {
            met = !!job[config.field] && job[config.field] !== '';
          }
        }
        break;
      }
      case 'document_exists': {
        if (config.document_type && workflow) {
          const doc = db.prepare(`
            SELECT id FROM apex_documents WHERE job_id = ? AND document_type = ? LIMIT 1
          `).get(workflow.job_id, config.document_type);
          met = !!doc;
        }
        break;
      }
      case 'estimate_exists': {
        if (workflow) {
          let sql = `SELECT id FROM apex_job_estimates WHERE job_id = ?`;
          const params = [workflow.job_id];
          if (config.estimate_type) {
            sql += ` AND estimate_type = ?`;
            params.push(config.estimate_type);
          }
          sql += ` LIMIT 1`;
          const est = db.prepare(sql).get(...params);
          met = !!est;
        }
        break;
      }
      case 'payment_received': {
        if (workflow) {
          const pay = db.prepare(`SELECT id FROM apex_job_payments WHERE job_id = ? LIMIT 1`).get(workflow.job_id);
          met = !!pay;
        }
        break;
      }
      case 'drying_standard_met': {
        // Check drying logs — for now, check if any drying readings exist with goal_met
        if (workflow) {
          try {
            const reading = db.prepare(`
              SELECT id FROM apex_drying_readings
              WHERE job_id = ? AND goal_met = 0 LIMIT 1
            `).get(workflow.job_id);
            // Met if no unmet readings exist (and at least one reading exists)
            const anyReading = db.prepare(`SELECT id FROM apex_drying_readings WHERE job_id = ? LIMIT 1`).get(workflow.job_id);
            met = !!anyReading && !reading;
          } catch {
            met = false; // Table might not exist
          }
        }
        break;
      }
    }

    if (met) {
      db.prepare(`UPDATE apex_job_workflow_step_gates SET is_met = 1, met_at = datetime('now') WHERE id = ?`).run(gate.id);
    }
  }

  // Re-fetch gates after evaluation
  const updatedGates = db.prepare(`SELECT * FROM apex_job_workflow_step_gates WHERE job_step_id = ?`).all(jobStepId);
  const allMet = updatedGates.length === 0 || updatedGates.every(g => g.is_met || g.override);

  // Update step status if needed
  if (allMet && step.status === 'locked') {
    db.prepare(`UPDATE apex_job_workflow_steps SET status = 'available' WHERE id = ?`).run(jobStepId);
  } else if (!allMet && step.status === 'available') {
    db.prepare(`UPDATE apex_job_workflow_steps SET status = 'locked' WHERE id = ?`).run(jobStepId);
  }

  return allMet;
}

/**
 * Evaluate gates for ALL steps in a workflow
 */
function evaluateAllGates(workflowId) {
  const steps = db.prepare(`SELECT id FROM apex_job_workflow_steps WHERE workflow_id = ? ORDER BY sequence_number`).all(workflowId);
  for (const step of steps) {
    evaluateGates(step.id);
  }
}

/**
 * Complete a step, then re-evaluate downstream gates
 */
function completeStep(jobStepId, userId) {
  const step = db.prepare(`SELECT * FROM apex_job_workflow_steps WHERE id = ?`).get(jobStepId);
  if (!step) throw new Error('Step not found');
  if (!['available', 'in_progress'].includes(step.status)) throw new Error(`Cannot complete step in status: ${step.status}`);

  db.prepare(`
    UPDATE apex_job_workflow_steps
    SET status = 'complete', completed_at = datetime('now'), completed_by = ?
    WHERE id = ?
  `).run(userId, jobStepId);

  // Re-evaluate all downstream gates
  evaluateAllGates(step.workflow_id);

  // Check if all steps are done
  _checkWorkflowCompletion(step.workflow_id);

  return db.prepare(`SELECT * FROM apex_job_workflow_steps WHERE id = ?`).get(jobStepId);
}

/**
 * Skip a step (if allowed)
 */
function skipStep(jobStepId, userId, reason) {
  const step = db.prepare(`SELECT * FROM apex_job_workflow_steps WHERE id = ?`).get(jobStepId);
  if (!step) throw new Error('Step not found');

  // Check if step template allows skipping
  const templateStep = db.prepare(`SELECT * FROM apex_workflow_template_steps WHERE id = ?`).get(step.template_step_id);
  if (templateStep && templateStep.is_required) throw new Error('This step is required and cannot be skipped');

  db.prepare(`
    UPDATE apex_job_workflow_steps
    SET status = 'skipped', completed_at = datetime('now'), completed_by = ?, notes = ?
    WHERE id = ?
  `).run(userId, reason || '', jobStepId);

  evaluateAllGates(step.workflow_id);
  _checkWorkflowCompletion(step.workflow_id);

  return db.prepare(`SELECT * FROM apex_job_workflow_steps WHERE id = ?`).get(jobStepId);
}

/**
 * Management override — bypass all gates and mark step as overridden
 */
function overrideStep(jobStepId, userId, reason) {
  const step = db.prepare(`SELECT * FROM apex_job_workflow_steps WHERE id = ?`).get(jobStepId);
  if (!step) throw new Error('Step not found');

  db.prepare(`
    UPDATE apex_job_workflow_steps
    SET status = 'overridden', completed_at = datetime('now'), overridden_by = ?, override_reason = ?
    WHERE id = ?
  `).run(userId, reason || '', jobStepId);

  // Override all gates on this step
  db.prepare(`
    UPDATE apex_job_workflow_step_gates
    SET override = 1, met_at = datetime('now'), met_by = ?
    WHERE job_step_id = ?
  `).run(userId, jobStepId);

  evaluateAllGates(step.workflow_id);
  _checkWorkflowCompletion(step.workflow_id);

  return db.prepare(`SELECT * FROM apex_job_workflow_steps WHERE id = ?`).get(jobStepId);
}

/**
 * Reassign a step to a specific user
 */
function reassignStep(jobStepId, userId) {
  db.prepare(`UPDATE apex_job_workflow_steps SET assigned_user_id = ? WHERE id = ?`).run(userId, jobStepId);
  return db.prepare(`SELECT * FROM apex_job_workflow_steps WHERE id = ?`).get(jobStepId);
}

/**
 * Manually approve a gate (for manual_approval and custom gates)
 */
function approveGate(gateId, userId) {
  db.prepare(`
    UPDATE apex_job_workflow_step_gates SET is_met = 1, met_at = datetime('now'), met_by = ? WHERE id = ?
  `).run(userId, gateId);

  const gate = db.prepare(`SELECT * FROM apex_job_workflow_step_gates WHERE id = ?`).get(gateId);
  if (gate) {
    evaluateGates(gate.job_step_id);
  }
  return gate;
}

/**
 * Get workflow progress summary
 */
function getWorkflowProgress(jobId) {
  const workflow = db.prepare(`SELECT * FROM apex_job_workflows WHERE job_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1`).get(jobId);
  if (!workflow) return null;

  const steps = db.prepare(`SELECT * FROM apex_job_workflow_steps WHERE workflow_id = ? ORDER BY sequence_number`).all(workflow.id);
  const total = steps.length;
  const completed = steps.filter(s => ['complete', 'skipped', 'overridden'].includes(s.status)).length;
  const current = steps.filter(s => ['available', 'in_progress'].includes(s.status));

  return {
    workflow_id: workflow.id,
    status: workflow.status,
    total_steps: total,
    completed_steps: completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    current_steps: current.map(s => ({ id: s.id, name: s.name, assigned_role: s.assigned_role, status: s.status }))
  };
}

/**
 * Check if all steps are done and mark workflow complete
 */
function _checkWorkflowCompletion(workflowId) {
  const steps = db.prepare(`SELECT status FROM apex_job_workflow_steps WHERE workflow_id = ?`).all(workflowId);
  const allDone = steps.every(s => ['complete', 'skipped', 'overridden'].includes(s.status));
  if (allDone && steps.length > 0) {
    db.prepare(`UPDATE apex_job_workflows SET status = 'complete', completed_at = datetime('now') WHERE id = ?`).run(workflowId);
  }
}

module.exports = {
  // Templates
  createTemplate,
  getTemplateById,
  getAllTemplates,
  updateTemplate,
  archiveTemplate,
  publishTemplate,
  duplicateTemplate,
  // Steps
  addStep,
  updateStep,
  deleteStep,
  reorderSteps,
  getStepsByTemplate,
  // Gates
  addGate,
  updateGate,
  deleteGate,
  getGatesByStep,
  // Job workflow instances
  stampWorkflow,
  getWorkflowByJob,
  evaluateGates,
  evaluateAllGates,
  completeStep,
  skipStep,
  overrideStep,
  reassignStep,
  approveGate,
  getWorkflowProgress
};
