const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

// ============================================
// TEMPLATE CRUD
// ============================================

async function createTemplate(orgId, data) {
  const id = uuidv4();
  await db.run(`
    INSERT INTO apex_workflow_templates (id, org_id, name, description, job_types, created_by)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [id, orgId, data.name, data.description || '', JSON.stringify(data.job_types || []), data.created_by || null]);
  return getTemplateById(id, orgId);
}

async function getTemplateById(id, orgId) {
  const template = await db.getOne(`SELECT * FROM apex_workflow_templates WHERE id = $1 AND org_id = $2`, [id, orgId]);
  if (!template) return null;
  template.job_types = JSON.parse(template.job_types || '[]');
  template.steps = await getStepsByTemplate(id);
  return template;
}

async function getAllTemplates(orgId, filters = {}) {
  let sql = `SELECT * FROM apex_workflow_templates WHERE org_id = $1`;
  const params = [orgId];
  let paramIdx = 2;

  if (filters.status) {
    sql += ` AND status = $${paramIdx++}`;
    params.push(filters.status);
  }
  if (filters.jobType) {
    sql += ` AND (job_types = '[]' OR job_types ILIKE $${paramIdx++})`;
    params.push(`%"${filters.jobType}"%`);
  }
  sql += ` ORDER BY updated_at DESC`;

  const templates = await db.getAll(sql, params);
  return templates.map(t => {
    t.job_types = JSON.parse(t.job_types || '[]');
    return t;
  });
}

async function updateTemplate(id, data, orgId) {
  const fields = [];
  const params = [];
  let paramIdx = 1;
  const allowed = ['name', 'description', 'job_types', 'status'];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${paramIdx++}`);
      params.push(key === 'job_types' ? JSON.stringify(data[key]) : data[key]);
    }
  }
  if (fields.length === 0) return getTemplateById(id, orgId);
  fields.push(`updated_at = NOW()`);
  params.push(id, orgId);
  await db.run(`UPDATE apex_workflow_templates SET ${fields.join(', ')} WHERE id = $${paramIdx++} AND org_id = $${paramIdx++}`, params);
  return getTemplateById(id, orgId);
}

async function archiveTemplate(id, orgId) {
  await db.run(`UPDATE apex_workflow_templates SET status = 'archived', updated_at = NOW() WHERE id = $1 AND org_id = $2`, [id, orgId]);
  return getTemplateById(id, orgId);
}

async function publishTemplate(id, orgId) {
  const t = await db.getOne(`SELECT * FROM apex_workflow_templates WHERE id = $1 AND org_id = $2`, [id, orgId]);
  if (!t) return null;
  await db.run(`UPDATE apex_workflow_templates SET status = 'published', version = version + 1, updated_at = NOW() WHERE id = $1 AND org_id = $2`, [id, orgId]);
  return getTemplateById(id, orgId);
}

async function duplicateTemplate(id, orgId) {
  const original = await getTemplateById(id, orgId);
  if (!original) return null;

  return await db.transaction(async (client) => {
    const newId = uuidv4();
    await client.run(`
      INSERT INTO apex_workflow_templates (id, org_id, name, description, job_types, status, created_by)
      VALUES ($1, $2, $3, $4, $5, 'draft', $6)
    `, [newId, orgId, `${original.name} (Copy)`, original.description, JSON.stringify(original.job_types), original.created_by]);

    // Copy steps and gates
    for (const step of original.steps) {
      const newStepId = uuidv4();
      await client.run(`
        INSERT INTO apex_workflow_template_steps (id, template_id, name, description, sequence_number, assigned_role, is_required, allow_override, estimated_duration_hours)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [newStepId, newId, step.name, step.description, step.sequence_number, step.assigned_role, step.is_required, step.allow_override, step.estimated_duration_hours]);

      if (step.gates) {
        for (const gate of step.gates) {
          await client.run(`
            INSERT INTO apex_workflow_step_gates (id, step_id, gate_type, gate_config, description)
            VALUES ($1, $2, $3, $4, $5)
          `, [uuidv4(), newStepId, gate.gate_type, gate.gate_config, gate.description]);
        }
      }
    }
    // Note: getTemplateById uses the pool, not the transaction client, but that's fine
    // since the transaction will be committed before this returns
    return newId;
  }).then(async (newId) => {
    return getTemplateById(newId, orgId);
  });
}

// ============================================
// TEMPLATE STEPS
// ============================================

async function addStep(templateId, data) {
  const id = uuidv4();
  await db.run(`
    INSERT INTO apex_workflow_template_steps (id, template_id, name, description, sequence_number, assigned_role, is_required, allow_override, estimated_duration_hours)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `, [
    id, templateId, data.name, data.description || '', data.sequence_number,
    data.assigned_role, data.is_required ?? 1, data.allow_override ?? 0,
    data.estimated_duration_hours ?? null
  ]);
  await db.run(`UPDATE apex_workflow_templates SET updated_at = NOW() WHERE id = $1`, [templateId]);
  return await db.getOne(`SELECT * FROM apex_workflow_template_steps WHERE id = $1`, [id]);
}

async function updateStep(stepId, data) {
  const fields = [];
  const params = [];
  let paramIdx = 1;
  const allowed = ['name', 'description', 'sequence_number', 'assigned_role', 'is_required', 'allow_override', 'estimated_duration_hours'];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${paramIdx++}`);
      params.push(data[key]);
    }
  }
  if (fields.length === 0) return await db.getOne(`SELECT * FROM apex_workflow_template_steps WHERE id = $1`, [stepId]);
  params.push(stepId);
  await db.run(`UPDATE apex_workflow_template_steps SET ${fields.join(', ')} WHERE id = $${paramIdx++}`, params);

  const step = await db.getOne(`SELECT * FROM apex_workflow_template_steps WHERE id = $1`, [stepId]);
  if (step) await db.run(`UPDATE apex_workflow_templates SET updated_at = NOW() WHERE id = $1`, [step.template_id]);
  return step;
}

async function deleteStep(stepId) {
  const step = await db.getOne(`SELECT * FROM apex_workflow_template_steps WHERE id = $1`, [stepId]);
  if (!step) return false;
  await db.run(`DELETE FROM apex_workflow_template_steps WHERE id = $1`, [stepId]);
  await db.run(`UPDATE apex_workflow_templates SET updated_at = NOW() WHERE id = $1`, [step.template_id]);
  return true;
}

async function reorderSteps(templateId, stepIds) {
  await db.transaction(async (client) => {
    for (let i = 0; i < stepIds.length; i++) {
      await client.run(`UPDATE apex_workflow_template_steps SET sequence_number = $1 WHERE id = $2 AND template_id = $3`, [i + 1, stepIds[i], templateId]);
    }
    await client.run(`UPDATE apex_workflow_templates SET updated_at = NOW() WHERE id = $1`, [templateId]);
  });
  return getStepsByTemplate(templateId);
}

async function getStepsByTemplate(templateId) {
  const steps = await db.getAll(`SELECT * FROM apex_workflow_template_steps WHERE template_id = $1 ORDER BY sequence_number`, [templateId]);
  for (const step of steps) {
    step.gates = await getGatesByStep(step.id);
  }
  return steps;
}

// ============================================
// STEP GATES
// ============================================

async function addGate(stepId, data) {
  const id = uuidv4();
  await db.run(`
    INSERT INTO apex_workflow_step_gates (id, step_id, gate_type, gate_config, description)
    VALUES ($1, $2, $3, $4, $5)
  `, [id, stepId, data.gate_type, JSON.stringify(data.gate_config || {}), data.description || '']);
  return await db.getOne(`SELECT * FROM apex_workflow_step_gates WHERE id = $1`, [id]);
}

async function updateGate(gateId, data) {
  const fields = [];
  const params = [];
  let paramIdx = 1;
  if (data.gate_type !== undefined) { fields.push(`gate_type = $${paramIdx++}`); params.push(data.gate_type); }
  if (data.gate_config !== undefined) { fields.push(`gate_config = $${paramIdx++}`); params.push(JSON.stringify(data.gate_config)); }
  if (data.description !== undefined) { fields.push(`description = $${paramIdx++}`); params.push(data.description); }
  if (fields.length === 0) return await db.getOne(`SELECT * FROM apex_workflow_step_gates WHERE id = $1`, [gateId]);
  params.push(gateId);
  await db.run(`UPDATE apex_workflow_step_gates SET ${fields.join(', ')} WHERE id = $${paramIdx++}`, params);
  return await db.getOne(`SELECT * FROM apex_workflow_step_gates WHERE id = $1`, [gateId]);
}

async function deleteGate(gateId) {
  const result = await db.run(`DELETE FROM apex_workflow_step_gates WHERE id = $1`, [gateId]);
  return result.rowCount > 0;
}

async function getGatesByStep(stepId) {
  return await db.getAll(`SELECT * FROM apex_workflow_step_gates WHERE step_id = $1 ORDER BY created_at`, [stepId]);
}

// ============================================
// JOB WORKFLOW INSTANCES
// ============================================

/**
 * Stamp a workflow template onto a job — copies all steps and gates
 */
async function stampWorkflow(jobId, templateId, phaseId, orgId) {
  const template = await getTemplateById(templateId, orgId);
  if (!template) throw new Error('Template not found');
  if (template.status !== 'published') throw new Error('Only published templates can be stamped onto jobs');

  // Verify job exists
  const job = await db.getOne(`SELECT id FROM apex_jobs WHERE id = $1`, [jobId]);
  if (!job) throw new Error('Job not found');

  await db.transaction(async (client) => {
    const workflowId = uuidv4();
    await client.run(`
      INSERT INTO apex_job_workflows (id, job_id, template_id, phase_id)
      VALUES ($1, $2, $3, $4)
    `, [workflowId, jobId, templateId, phaseId || null]);

    for (const step of template.steps) {
      const jobStepId = uuidv4();
      await client.run(`
        INSERT INTO apex_job_workflow_steps (id, workflow_id, template_step_id, name, description, sequence_number, assigned_role)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [jobStepId, workflowId, step.id, step.name, step.description, step.sequence_number, step.assigned_role]);

      for (const gate of (step.gates || [])) {
        await client.run(`
          INSERT INTO apex_job_workflow_step_gates (id, job_step_id, gate_type, gate_config, description)
          VALUES ($1, $2, $3, $4, $5)
        `, [uuidv4(), jobStepId, gate.gate_type, gate.gate_config, gate.description]);
      }
    }
  });

  // Evaluate all gates to set initial step availability
  const workflow = await getWorkflowByJob(jobId);
  if (workflow) {
    await evaluateAllGates(workflow.id);
  }

  return getWorkflowByJob(jobId);
}

/**
 * Get workflow instance with all steps and gates
 */
async function getWorkflowByJob(jobId) {
  const workflow = await db.getOne(`SELECT * FROM apex_job_workflows WHERE job_id = $1 AND status = 'active' ORDER BY started_at DESC LIMIT 1`, [jobId]);
  if (!workflow) return null;

  workflow.steps = await db.getAll(`SELECT * FROM apex_job_workflow_steps WHERE workflow_id = $1 ORDER BY sequence_number`, [workflow.id]);
  for (const step of workflow.steps) {
    step.gates = await db.getAll(`SELECT * FROM apex_job_workflow_step_gates WHERE job_step_id = $1 ORDER BY created_at`, [step.id]);
  }
  return workflow;
}

/**
 * Evaluate all gates for a single step — update is_met flags and step status
 */
async function evaluateGates(jobStepId) {
  const step = await db.getOne(`SELECT * FROM apex_job_workflow_steps WHERE id = $1`, [jobStepId]);
  if (!step) return false;
  // Don't re-evaluate completed/skipped/overridden steps
  if (['complete', 'skipped', 'overridden'].includes(step.status)) return true;

  const gates = await db.getAll(`SELECT * FROM apex_job_workflow_step_gates WHERE job_step_id = $1`, [jobStepId]);
  const workflow = await db.getOne(`SELECT * FROM apex_job_workflows WHERE id = $1`, [step.workflow_id]);

  for (const gate of gates) {
    if (gate.is_met || gate.override) continue; // Already satisfied

    let met = false;
    const config = JSON.parse(gate.gate_config || '{}');

    switch (gate.gate_type) {
      case 'previous_step': {
        const prevStep = await db.getOne(`
          SELECT * FROM apex_job_workflow_steps
          WHERE workflow_id = $1 AND sequence_number = $2
        `, [step.workflow_id, step.sequence_number - 1]);
        met = !prevStep || ['complete', 'skipped', 'overridden'].includes(prevStep.status);
        break;
      }
      case 'specific_step': {
        if (config.step_id) {
          const targetStep = await db.getOne(`
            SELECT * FROM apex_job_workflow_steps
            WHERE workflow_id = $1 AND template_step_id = $2
          `, [step.workflow_id, config.step_id]);
          met = targetStep && ['complete', 'skipped', 'overridden'].includes(targetStep.status);
        }
        break;
      }
      case 'manual_approval': {
        met = false;
        break;
      }
      case 'custom': {
        met = false;
        break;
      }
      case 'field_not_empty': {
        if (config.field && workflow) {
          const job = await db.getOne(`SELECT * FROM apex_jobs WHERE id = $1`, [workflow.job_id]);
          if (job) {
            met = !!job[config.field] && job[config.field] !== '';
          }
        }
        break;
      }
      case 'document_exists': {
        if (config.document_type && workflow) {
          const doc = await db.getOne(`
            SELECT id FROM apex_documents WHERE job_id = $1 AND document_type = $2 LIMIT 1
          `, [workflow.job_id, config.document_type]);
          met = !!doc;
        }
        break;
      }
      case 'estimate_exists': {
        if (workflow) {
          let sql = `SELECT id FROM apex_job_estimates WHERE job_id = $1`;
          const params = [workflow.job_id];
          let paramIdx = 2;
          if (config.estimate_type) {
            sql += ` AND estimate_type = $${paramIdx++}`;
            params.push(config.estimate_type);
          }
          sql += ` LIMIT 1`;
          const est = await db.getOne(sql, params);
          met = !!est;
        }
        break;
      }
      case 'payment_received': {
        if (workflow) {
          const pay = await db.getOne(`SELECT id FROM apex_job_payments WHERE job_id = $1 LIMIT 1`, [workflow.job_id]);
          met = !!pay;
        }
        break;
      }
      case 'drying_standard_met': {
        if (workflow) {
          try {
            const reading = await db.getOne(`
              SELECT id FROM apex_drying_readings
              WHERE job_id = $1 AND goal_met = 0 LIMIT 1
            `, [workflow.job_id]);
            const anyReading = await db.getOne(`SELECT id FROM apex_drying_readings WHERE job_id = $1 LIMIT 1`, [workflow.job_id]);
            met = !!anyReading && !reading;
          } catch {
            met = false;
          }
        }
        break;
      }
    }

    if (met) {
      await db.run(`UPDATE apex_job_workflow_step_gates SET is_met = 1, met_at = NOW() WHERE id = $1`, [gate.id]);
    }
  }

  // Re-fetch gates after evaluation
  const updatedGates = await db.getAll(`SELECT * FROM apex_job_workflow_step_gates WHERE job_step_id = $1`, [jobStepId]);
  const allMet = updatedGates.length === 0 || updatedGates.every(g => g.is_met || g.override);

  // Update step status if needed
  if (allMet && step.status === 'locked') {
    await db.run(`UPDATE apex_job_workflow_steps SET status = 'available' WHERE id = $1`, [jobStepId]);
  } else if (!allMet && step.status === 'available') {
    await db.run(`UPDATE apex_job_workflow_steps SET status = 'locked' WHERE id = $1`, [jobStepId]);
  }

  return allMet;
}

/**
 * Evaluate gates for ALL steps in a workflow
 */
async function evaluateAllGates(workflowId) {
  const steps = await db.getAll(`SELECT id FROM apex_job_workflow_steps WHERE workflow_id = $1 ORDER BY sequence_number`, [workflowId]);
  for (const step of steps) {
    await evaluateGates(step.id);
  }
}

/**
 * Complete a step, then re-evaluate downstream gates
 */
async function completeStep(jobStepId, userId) {
  const step = await db.getOne(`SELECT * FROM apex_job_workflow_steps WHERE id = $1`, [jobStepId]);
  if (!step) throw new Error('Step not found');
  if (!['available', 'in_progress'].includes(step.status)) throw new Error(`Cannot complete step in status: ${step.status}`);

  await db.run(`
    UPDATE apex_job_workflow_steps
    SET status = 'complete', completed_at = NOW(), completed_by = $1
    WHERE id = $2
  `, [userId, jobStepId]);

  // Re-evaluate all downstream gates
  await evaluateAllGates(step.workflow_id);

  // Check if all steps are done
  await _checkWorkflowCompletion(step.workflow_id);

  return await db.getOne(`SELECT * FROM apex_job_workflow_steps WHERE id = $1`, [jobStepId]);
}

/**
 * Skip a step (if allowed)
 */
async function skipStep(jobStepId, userId, reason) {
  const step = await db.getOne(`SELECT * FROM apex_job_workflow_steps WHERE id = $1`, [jobStepId]);
  if (!step) throw new Error('Step not found');

  const templateStep = await db.getOne(`SELECT * FROM apex_workflow_template_steps WHERE id = $1`, [step.template_step_id]);
  if (templateStep && templateStep.is_required) throw new Error('This step is required and cannot be skipped');

  await db.run(`
    UPDATE apex_job_workflow_steps
    SET status = 'skipped', completed_at = NOW(), completed_by = $1, notes = $2
    WHERE id = $3
  `, [userId, reason || '', jobStepId]);

  await evaluateAllGates(step.workflow_id);
  await _checkWorkflowCompletion(step.workflow_id);

  return await db.getOne(`SELECT * FROM apex_job_workflow_steps WHERE id = $1`, [jobStepId]);
}

/**
 * Management override — bypass all gates and mark step as overridden
 */
async function overrideStep(jobStepId, userId, reason) {
  const step = await db.getOne(`SELECT * FROM apex_job_workflow_steps WHERE id = $1`, [jobStepId]);
  if (!step) throw new Error('Step not found');

  await db.run(`
    UPDATE apex_job_workflow_steps
    SET status = 'overridden', completed_at = NOW(), overridden_by = $1, override_reason = $2
    WHERE id = $3
  `, [userId, reason || '', jobStepId]);

  // Override all gates on this step
  await db.run(`
    UPDATE apex_job_workflow_step_gates
    SET override = 1, met_at = NOW(), met_by = $1
    WHERE job_step_id = $2
  `, [userId, jobStepId]);

  await evaluateAllGates(step.workflow_id);
  await _checkWorkflowCompletion(step.workflow_id);

  return await db.getOne(`SELECT * FROM apex_job_workflow_steps WHERE id = $1`, [jobStepId]);
}

/**
 * Reassign a step to a specific user
 */
async function reassignStep(jobStepId, userId) {
  await db.run(`UPDATE apex_job_workflow_steps SET assigned_user_id = $1 WHERE id = $2`, [userId, jobStepId]);
  return await db.getOne(`SELECT * FROM apex_job_workflow_steps WHERE id = $1`, [jobStepId]);
}

/**
 * Manually approve a gate (for manual_approval and custom gates)
 */
async function approveGate(gateId, userId) {
  await db.run(`
    UPDATE apex_job_workflow_step_gates SET is_met = 1, met_at = NOW(), met_by = $1 WHERE id = $2
  `, [userId, gateId]);

  const gate = await db.getOne(`SELECT * FROM apex_job_workflow_step_gates WHERE id = $1`, [gateId]);
  if (gate) {
    await evaluateGates(gate.job_step_id);
  }
  return gate;
}

/**
 * Get workflow progress summary
 */
async function getWorkflowProgress(jobId) {
  const workflow = await db.getOne(`SELECT * FROM apex_job_workflows WHERE job_id = $1 AND status = 'active' ORDER BY started_at DESC LIMIT 1`, [jobId]);
  if (!workflow) return null;

  const steps = await db.getAll(`SELECT * FROM apex_job_workflow_steps WHERE workflow_id = $1 ORDER BY sequence_number`, [workflow.id]);
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
async function _checkWorkflowCompletion(workflowId) {
  const steps = await db.getAll(`SELECT status FROM apex_job_workflow_steps WHERE workflow_id = $1`, [workflowId]);
  const allDone = steps.every(s => ['complete', 'skipped', 'overridden'].includes(s.status));
  if (allDone && steps.length > 0) {
    await db.run(`UPDATE apex_job_workflows SET status = 'complete', completed_at = NOW() WHERE id = $1`, [workflowId]);
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
