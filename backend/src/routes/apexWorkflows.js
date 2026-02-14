const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { requireOrgMember, requireOrgRole } = require('../middleware/orgAuth');
const wf = require('../db/apexWorkflows');

// All routes require auth + org membership
router.use(authMiddleware, requireOrgMember);

// ============================================
// TEMPLATE ROUTES
// ============================================

// GET / — list templates
router.get('/', (req, res) => {
  try {
    const templates = wf.getAllTemplates(req.org.id, {
      status: req.query.status,
      jobType: req.query.jobType
    });
    res.json({ templates });
  } catch (err) {
    console.error('Error listing templates:', err);
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

// POST / — create template
router.post('/', requireOrgRole('management', 'office_coordinator'), (req, res) => {
  try {
    const template = wf.createTemplate(req.org.id, { ...req.body, created_by: req.user.id });
    res.status(201).json(template);
  } catch (err) {
    console.error('Error creating template:', err);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// GET /:id — get template with steps and gates
router.get('/:id', (req, res) => {
  try {
    const template = wf.getTemplateById(req.params.id, req.org.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (err) {
    console.error('Error getting template:', err);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

// PATCH /:id — update template
router.patch('/:id', requireOrgRole('management', 'office_coordinator'), (req, res) => {
  try {
    const template = wf.updateTemplate(req.params.id, req.body, req.org.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (err) {
    console.error('Error updating template:', err);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// POST /:id/publish — publish template
router.post('/:id/publish', requireOrgRole('management', 'office_coordinator'), (req, res) => {
  try {
    const template = wf.publishTemplate(req.params.id, req.org.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (err) {
    console.error('Error publishing template:', err);
    res.status(500).json({ error: 'Failed to publish template' });
  }
});

// POST /:id/duplicate — duplicate template
router.post('/:id/duplicate', requireOrgRole('management', 'office_coordinator'), (req, res) => {
  try {
    const template = wf.duplicateTemplate(req.params.id, req.org.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.status(201).json(template);
  } catch (err) {
    console.error('Error duplicating template:', err);
    res.status(500).json({ error: 'Failed to duplicate template' });
  }
});

// DELETE /:id — archive template
router.delete('/:id', requireOrgRole('management', 'office_coordinator'), (req, res) => {
  try {
    const template = wf.archiveTemplate(req.params.id, req.org.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (err) {
    console.error('Error archiving template:', err);
    res.status(500).json({ error: 'Failed to archive template' });
  }
});

// ============================================
// STEP ROUTES
// ============================================

// POST /:id/steps — add step
router.post('/:id/steps', requireOrgRole('management', 'office_coordinator'), (req, res) => {
  try {
    // Verify template belongs to org
    const template = wf.getTemplateById(req.params.id, req.org.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    const step = wf.addStep(req.params.id, req.body);
    res.status(201).json(step);
  } catch (err) {
    console.error('Error adding step:', err);
    res.status(500).json({ error: err.message || 'Failed to add step' });
  }
});

// PATCH /:id/steps/:stepId — update step
router.patch('/:id/steps/:stepId', requireOrgRole('management', 'office_coordinator'), (req, res) => {
  try {
    const template = wf.getTemplateById(req.params.id, req.org.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    const step = wf.updateStep(req.params.stepId, req.body);
    if (!step) return res.status(404).json({ error: 'Step not found' });
    res.json(step);
  } catch (err) {
    console.error('Error updating step:', err);
    res.status(500).json({ error: 'Failed to update step' });
  }
});

// DELETE /:id/steps/:stepId — delete step
router.delete('/:id/steps/:stepId', requireOrgRole('management', 'office_coordinator'), (req, res) => {
  try {
    const template = wf.getTemplateById(req.params.id, req.org.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    const success = wf.deleteStep(req.params.stepId);
    if (!success) return res.status(404).json({ error: 'Step not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting step:', err);
    res.status(500).json({ error: 'Failed to delete step' });
  }
});

// POST /:id/steps/reorder — bulk reorder
router.post('/:id/steps/reorder', requireOrgRole('management', 'office_coordinator'), (req, res) => {
  try {
    const template = wf.getTemplateById(req.params.id, req.org.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    const steps = wf.reorderSteps(req.params.id, req.body.stepIds);
    res.json({ steps });
  } catch (err) {
    console.error('Error reordering steps:', err);
    res.status(500).json({ error: 'Failed to reorder steps' });
  }
});

// ============================================
// GATE ROUTES
// ============================================

// POST /:id/steps/:stepId/gates — add gate
router.post('/:id/steps/:stepId/gates', requireOrgRole('management', 'office_coordinator'), (req, res) => {
  try {
    const template = wf.getTemplateById(req.params.id, req.org.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    const gate = wf.addGate(req.params.stepId, req.body);
    res.status(201).json(gate);
  } catch (err) {
    console.error('Error adding gate:', err);
    res.status(500).json({ error: 'Failed to add gate' });
  }
});

// PATCH /:id/steps/:stepId/gates/:gateId — update gate
router.patch('/:id/steps/:stepId/gates/:gateId', requireOrgRole('management', 'office_coordinator'), (req, res) => {
  try {
    const template = wf.getTemplateById(req.params.id, req.org.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    const gate = wf.updateGate(req.params.gateId, req.body);
    if (!gate) return res.status(404).json({ error: 'Gate not found' });
    res.json(gate);
  } catch (err) {
    console.error('Error updating gate:', err);
    res.status(500).json({ error: 'Failed to update gate' });
  }
});

// DELETE /:id/steps/:stepId/gates/:gateId — delete gate
router.delete('/:id/steps/:stepId/gates/:gateId', requireOrgRole('management', 'office_coordinator'), (req, res) => {
  try {
    const template = wf.getTemplateById(req.params.id, req.org.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    const success = wf.deleteGate(req.params.gateId);
    if (!success) return res.status(404).json({ error: 'Gate not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting gate:', err);
    res.status(500).json({ error: 'Failed to delete gate' });
  }
});

module.exports = router;
