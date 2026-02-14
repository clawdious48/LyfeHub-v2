const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');
const { requireOrgMember, requireOrgRole } = require('../middleware/orgAuth');
const { canEditEntry } = require('../middleware/permissions');
const apexJobsDb = require('../db/apexJobs');

// Require authentication + org membership for all Apex routes
router.use(authMiddleware, requireOrgMember);

// Helper: read Zoho JSON file
function readZohoJobs() {
  try {
    const dataPath = '/data/apex-jobs.json';
    if (!fs.existsSync(dataPath)) return { projects: [], stats: {}, syncedAt: null };
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    // Add source marker to Zoho jobs
    if (data.projects) {
      data.projects = data.projects.map(p => ({ ...p, source: 'zoho' }));
    }
    return data;
  } catch (err) {
    console.error('Error reading Zoho jobs:', err);
    return { projects: [], stats: {}, syncedAt: null };
  }
}

// Helper: format DB job to match frontend shape
function formatDbJob(job) {
  const address = [job.client_street, job.client_city, job.client_state, job.client_zip].filter(Boolean).join(', ');

  // Parse PM field for owner display
  let ownerName = '';
  try {
    const pmArr = JSON.parse(job.mitigation_pm || '[]');
    ownerName = Array.isArray(pmArr) ? pmArr[0] || '' : '';
  } catch { ownerName = job.mitigation_pm || ''; }

  return {
    id: job.id,
    name: job.name,
    client: {
      name: job.client_name,
      phone: job.client_phone,
      email: job.client_email,
      address: address
    },
    clientName: job.client_name,
    lossType: job.loss_type,
    status: job.status,
    owner: { name: ownerName },
    jobNumbers: {
      mitigation: (job.phases || []).find(p => p.job_type_code === 'MIT')?.job_number || '',
      repair: (job.phases || []).find(p => p.job_type_code === 'RPR')?.job_number || ''
    },
    insurance: {
      carrier: job.ins_carrier,
      claimNumber: job.ins_claim,
      adjusterName: job.adj_name,
      adjusterEmail: job.adj_email
    },
    additional_clients: (() => { try { return JSON.parse(job.additional_clients || '[]'); } catch { return []; } })(),
    additional_adjusters: (() => { try { return JSON.parse(job.additional_adjusters || '[]'); } catch { return []; } })(),
    site_contacts: (() => { try { return JSON.parse(job.site_contacts || '[]'); } catch { return []; } })(),
    client_unit: job.client_unit,
    prop_unit: job.prop_unit,
    year_built: job.year_built,
    taskSummary: { total: 0, completed: 0 },
    tasks: [],
    phases: job.phases || [],
    source: 'local',
    createdAt: job.created_at
  };
}

// GET / - List all jobs (merge DB + Zoho)
// ORG-07: getAllJobs receives role info for field_tech filtering (DB layer handles filtering)
router.get('/', (req, res) => {
  try {
    const zohoData = readZohoJobs();
    const dbJobs = apexJobsDb.getAllJobs(req.org.id, { memberRole: req.org.role, userId: req.user.id });
    const formattedDbJobs = dbJobs.map(formatDbJob);

    // Tag Zoho projects with the requesting user's org_id
    const zohoProjects = (zohoData.projects || []).map(p => ({
      ...p,
      org_id: req.org.id
    }));

    let merged = [...formattedDbJobs, ...zohoProjects];

    // ORG-07: field_tech filtering — if DB layer doesn't filter, apply here as fallback
    // TODO: Once DB layer implements field_tech filtering, this client-side filter can be removed
    if (req.org.role === 'field_tech') {
      // field_techs should only see jobs they're assigned to
      // For now, Zoho projects are unfiltered — future: filter by assignment
    }

    const stats = apexJobsDb.getJobStats(req.org.id);

    res.json({
      projects: merged,
      stats: stats,
      syncedAt: zohoData.syncedAt || new Date().toISOString()
    });
  } catch (err) {
    console.error('Error loading apex jobs:', err);
    res.status(500).json({ error: 'Failed to load jobs' });
  }
});

// POST / - Create job
router.post('/', requireOrgRole('management', 'office_coordinator'), (req, res) => {
  try {
    const job = apexJobsDb.createJob(req.body, req.user.id, req.org.id);
    res.status(201).json(job);
  } catch (err) {
    console.error('Error creating job:', err);
    res.status(500).json({ error: 'Failed to create job: ' + err.message });
  }
});

// GET /:id - Get single job
router.get('/:id', (req, res) => {
  try {
    const job = apexJobsDb.getJobById(req.params.id, req.org.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    console.error('Error getting job:', err);
    res.status(500).json({ error: 'Failed to get job' });
  }
});

// PATCH /:id - Update job
router.patch('/:id', requireOrgRole('management', 'office_coordinator'), (req, res) => {
  try {
    const job = apexJobsDb.updateJob(req.params.id, req.body, req.org.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    console.error('Error updating job:', err);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// PATCH /:id/status - Update job status
router.patch('/:id/status', (req, res) => {
  try {
    const job = apexJobsDb.updateJob(req.params.id, { status: req.body.status }, req.org.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    console.error('Error updating job status:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// DELETE /:id - Archive job (soft delete)
router.delete('/:id', (req, res) => {
  try {
    const success = apexJobsDb.archiveJob(req.params.id, req.org.id);
    if (!success) return res.status(404).json({ error: 'Job not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error archiving job:', err);
    res.status(500).json({ error: 'Failed to archive job' });
  }
});

// PATCH /:id/phases/:phaseId - Update phase
router.patch('/:id/phases/:phaseId', (req, res) => {
  try {
    const phase = apexJobsDb.updatePhase(req.params.phaseId, req.body, req.org.id);
    if (!phase) return res.status(404).json({ error: 'Phase not found' });
    res.json(phase);
  } catch (err) {
    console.error('Error updating phase:', err);
    res.status(500).json({ error: 'Failed to update phase' });
  }
});

// POST /:id/phases - Add phase to existing job
router.post('/:id/phases', (req, res) => {
  try {
    // Future: add phase to existing job
    res.status(501).json({ error: 'Not yet implemented' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add phase' });
  }
});

// ============================================
// DATES
// ============================================

// PATCH /:id/dates - Update milestone dates
router.patch('/:id/dates', (req, res) => {
  try {
    const job = apexJobsDb.updateJobDates(req.params.id, req.body, req.org.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    console.error('Error updating job dates:', err);
    res.status(500).json({ error: 'Failed to update dates' });
  }
});

// ============================================
// NOTES
// ============================================

// GET /:id/notes
router.get('/:id/notes', (req, res) => {
  try {
    const notes = apexJobsDb.getNotesByJob(req.params.id, req.org.id);
    if (notes === null) return res.status(404).json({ error: 'Job not found' });
    res.json(notes);
  } catch (err) {
    console.error('Error getting notes:', err);
    res.status(500).json({ error: 'Failed to get notes' });
  }
});

// POST /:id/notes
router.post('/:id/notes', (req, res) => {
  try {
    const note = apexJobsDb.createNote(req.params.id, { ...req.body, author_id: req.user.id }, req.org.id);
    if (!note) return res.status(404).json({ error: 'Job not found' });
    res.status(201).json(note);
  } catch (err) {
    console.error('Error creating note:', err);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// PATCH /:id/notes/:noteId
router.patch('/:id/notes/:noteId', (req, res) => {
  try {
    const existing = apexJobsDb.getNoteById(req.params.noteId);
    if (!existing) return res.status(404).json({ error: 'Note not found' });
    if (!canEditEntry(req, existing)) return res.status(403).json({ error: 'Insufficient permissions' });
    const note = apexJobsDb.updateNote(req.params.noteId, req.body);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (err) {
    console.error('Error updating note:', err);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// DELETE /:id/notes/:noteId
router.delete('/:id/notes/:noteId', requireOrgRole('management'), (req, res) => {
  try {
    const success = apexJobsDb.deleteNote(req.params.noteId, req.org.id);
    if (!success) return res.status(404).json({ error: 'Note not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting note:', err);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// ============================================
// ESTIMATES (ORG-08: financial read filtering)
// ============================================

// GET /:id/estimates
router.get('/:id/estimates', requireOrgRole('management', 'office_coordinator', 'estimator'), (req, res) => {
  try {
    const estimates = apexJobsDb.getEstimatesByJob(req.params.id, req.org.id);
    if (estimates === null) return res.status(404).json({ error: 'Job not found' });
    res.json(estimates);
  } catch (err) {
    console.error('Error getting estimates:', err);
    res.status(500).json({ error: 'Failed to get estimates' });
  }
});

// POST /:id/estimates
router.post('/:id/estimates', requireOrgRole('management', 'office_coordinator', 'estimator'), (req, res) => {
  try {
    const estimate = apexJobsDb.createEstimate(req.params.id, req.body, req.org.id);
    if (!estimate) return res.status(404).json({ error: 'Job not found' });
    res.status(201).json(estimate);
  } catch (err) {
    console.error('Error creating estimate:', err);
    res.status(500).json({ error: 'Failed to create estimate' });
  }
});

// PATCH /:id/estimates/:estId
router.patch('/:id/estimates/:estId', requireOrgRole('management', 'office_coordinator', 'estimator'), (req, res) => {
  try {
    const estimate = apexJobsDb.updateEstimate(req.params.estId, req.body, req.org.id);
    if (!estimate) return res.status(404).json({ error: 'Estimate not found' });
    res.json(estimate);
  } catch (err) {
    console.error('Error updating estimate:', err);
    res.status(500).json({ error: 'Failed to update estimate' });
  }
});

// ============================================
// PAYMENTS (ORG-08: financial read filtering)
// ============================================

// GET /:id/payments
router.get('/:id/payments', requireOrgRole('management', 'office_coordinator'), (req, res) => {
  try {
    const payments = apexJobsDb.getPaymentsByJob(req.params.id, req.org.id);
    if (payments === null) return res.status(404).json({ error: 'Job not found' });
    res.json(payments);
  } catch (err) {
    console.error('Error getting payments:', err);
    res.status(500).json({ error: 'Failed to get payments' });
  }
});

// POST /:id/payments
router.post('/:id/payments', requireOrgRole('management', 'office_coordinator'), (req, res) => {
  try {
    const payment = apexJobsDb.createPayment(req.params.id, req.body, req.org.id);
    if (!payment) return res.status(404).json({ error: 'Job not found' });
    res.status(201).json(payment);
  } catch (err) {
    console.error('Error creating payment:', err);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// ============================================
// LABOR
// ============================================

// GET /:id/labor
router.get('/:id/labor', (req, res) => {
  try {
    const labor = apexJobsDb.getLaborByJob(req.params.id, req.org.id);
    if (labor === null) return res.status(404).json({ error: 'Job not found' });
    res.json(labor);
  } catch (err) {
    console.error('Error getting labor entries:', err);
    res.status(500).json({ error: 'Failed to get labor entries' });
  }
});

// POST /:id/labor
router.post('/:id/labor', requireOrgRole('management', 'office_coordinator', 'project_manager', 'field_tech'), (req, res) => {
  try {
    const entry = apexJobsDb.createLaborEntry(req.params.id, { ...req.body, author_id: req.user.id }, req.org.id);
    if (!entry) return res.status(404).json({ error: 'Job not found' });
    res.status(201).json(entry);
  } catch (err) {
    console.error('Error creating labor entry:', err);
    res.status(500).json({ error: 'Failed to create labor entry' });
  }
});

// PATCH /:id/labor/:entryId
router.patch('/:id/labor/:entryId', (req, res) => {
  try {
    const existing = apexJobsDb.getLaborEntryById(req.params.entryId);
    if (!existing) return res.status(404).json({ error: 'Labor entry not found' });
    if (!canEditEntry(req, existing)) return res.status(403).json({ error: 'Insufficient permissions' });
    const entry = apexJobsDb.updateLaborEntry(req.params.entryId, req.body, req.org.id);
    if (!entry) return res.status(404).json({ error: 'Labor entry not found' });
    res.json(entry);
  } catch (err) {
    console.error('Error updating labor entry:', err);
    res.status(500).json({ error: 'Failed to update labor entry' });
  }
});

// DELETE /:id/labor/:entryId
router.delete('/:id/labor/:entryId', (req, res) => {
  try {
    const existing = apexJobsDb.getLaborEntryById(req.params.entryId);
    if (!existing) return res.status(404).json({ error: 'Labor entry not found' });
    if (!canEditEntry(req, existing)) return res.status(403).json({ error: 'Insufficient permissions' });
    const success = apexJobsDb.deleteLaborEntry(req.params.entryId, req.org.id);
    if (!success) return res.status(404).json({ error: 'Labor entry not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting labor entry:', err);
    res.status(500).json({ error: 'Failed to delete labor entry' });
  }
});

// ============================================
// RECEIPTS
// ============================================

// GET /:id/receipts
router.get('/:id/receipts', (req, res) => {
  try {
    const receipts = apexJobsDb.getReceiptsByJob(req.params.id, req.org.id);
    if (receipts === null) return res.status(404).json({ error: 'Job not found' });
    res.json(receipts);
  } catch (err) {
    console.error('Error getting receipts:', err);
    res.status(500).json({ error: 'Failed to get receipts' });
  }
});

// POST /:id/receipts
router.post('/:id/receipts', (req, res) => {
  try {
    const receipt = apexJobsDb.createReceipt(req.params.id, { ...req.body, author_id: req.user.id }, req.org.id);
    if (!receipt) return res.status(404).json({ error: 'Job not found' });
    res.status(201).json(receipt);
  } catch (err) {
    console.error('Error creating receipt:', err);
    res.status(500).json({ error: 'Failed to create receipt' });
  }
});

// PATCH /:id/receipts/:receiptId
router.patch('/:id/receipts/:receiptId', (req, res) => {
  try {
    const existing = apexJobsDb.getReceiptById(req.params.receiptId);
    if (!existing) return res.status(404).json({ error: 'Receipt not found' });
    if (!canEditEntry(req, existing)) return res.status(403).json({ error: 'Insufficient permissions' });
    const receipt = apexJobsDb.updateReceipt(req.params.receiptId, req.body, req.org.id);
    if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
    res.json(receipt);
  } catch (err) {
    console.error('Error updating receipt:', err);
    res.status(500).json({ error: 'Failed to update receipt' });
  }
});

// DELETE /:id/receipts/:receiptId
router.delete('/:id/receipts/:receiptId', (req, res) => {
  try {
    const existing = apexJobsDb.getReceiptById(req.params.receiptId);
    if (!existing) return res.status(404).json({ error: 'Receipt not found' });
    if (!canEditEntry(req, existing)) return res.status(403).json({ error: 'Insufficient permissions' });
    const success = apexJobsDb.deleteReceipt(req.params.receiptId, req.org.id);
    if (!success) return res.status(404).json({ error: 'Receipt not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting receipt:', err);
    res.status(500).json({ error: 'Failed to delete receipt' });
  }
});

// ============================================
// WORK ORDERS (ORG-08: financial read filtering)
// ============================================

// GET /:id/work-orders
router.get('/:id/work-orders', requireOrgRole('management', 'office_coordinator', 'project_manager'), (req, res) => {
  try {
    const workOrders = apexJobsDb.getWorkOrdersByJob(req.params.id, req.org.id);
    if (workOrders === null) return res.status(404).json({ error: 'Job not found' });
    res.json(workOrders);
  } catch (err) {
    console.error('Error getting work orders:', err);
    res.status(500).json({ error: 'Failed to get work orders' });
  }
});

// POST /:id/work-orders
router.post('/:id/work-orders', requireOrgRole('management', 'office_coordinator', 'project_manager'), (req, res) => {
  try {
    const wo = apexJobsDb.createWorkOrder(req.params.id, req.body, req.org.id);
    if (!wo) return res.status(404).json({ error: 'Job not found' });
    res.status(201).json(wo);
  } catch (err) {
    console.error('Error creating work order:', err);
    res.status(500).json({ error: 'Failed to create work order' });
  }
});

// PATCH /:id/work-orders/:woId
router.patch('/:id/work-orders/:woId', requireOrgRole('management', 'office_coordinator', 'project_manager'), (req, res) => {
  try {
    const wo = apexJobsDb.updateWorkOrder(req.params.woId, req.body, req.org.id);
    if (!wo) return res.status(404).json({ error: 'Work order not found' });
    res.json(wo);
  } catch (err) {
    console.error('Error updating work order:', err);
    res.status(500).json({ error: 'Failed to update work order' });
  }
});

// DELETE /:id/work-orders/:woId
router.delete('/:id/work-orders/:woId', requireOrgRole('management', 'office_coordinator'), (req, res) => {
  try {
    const success = apexJobsDb.deleteWorkOrder(req.params.woId, req.org.id);
    if (!success) return res.status(404).json({ error: 'Work order not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting work order:', err);
    res.status(500).json({ error: 'Failed to delete work order' });
  }
});

// ============================================
// ACTIVITY LOG
// ============================================

// GET /:id/activity
router.get('/:id/activity', (req, res) => {
  try {
    const options = {
      type: req.query.type || null,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };
    const activity = apexJobsDb.getActivityByJob(req.params.id, req.org.id, options);
    if (activity === null) return res.status(404).json({ error: 'Job not found' });
    res.json(activity);
  } catch (err) {
    console.error('Error getting activity:', err);
    res.status(500).json({ error: 'Failed to get activity' });
  }
});

// ============================================
// ACCOUNTING (ORG-08: financial read filtering)
// ============================================

// GET /:id/accounting
router.get('/:id/accounting', requireOrgRole('management', 'office_coordinator', 'estimator'), (req, res) => {
  try {
    const summary = apexJobsDb.getAccountingSummary(req.params.id, req.org.id);
    if (!summary) return res.status(404).json({ error: 'Job not found' });
    res.json(summary);
  } catch (err) {
    console.error('Error getting accounting summary:', err);
    res.status(500).json({ error: 'Failed to get accounting summary' });
  }
});

// ============================================
// CONTACTS
// ============================================

// POST /:id/contacts
router.post('/:id/contacts', (req, res) => {
  try {
    const { contact_id, role } = req.body;
    if (!contact_id) return res.status(400).json({ error: 'contact_id is required' });
    const result = apexJobsDb.assignContact(req.params.id, contact_id, role, req.org.id);
    if (!result) return res.status(404).json({ error: 'Job not found' });
    res.status(201).json(result);
  } catch (err) {
    console.error('Error assigning contact:', err);
    res.status(500).json({ error: 'Failed to assign contact' });
  }
});

// DELETE /:id/contacts/:contactId
router.delete('/:id/contacts/:contactId', (req, res) => {
  try {
    const success = apexJobsDb.removeContact(req.params.id, req.params.contactId, req.org.id);
    if (!success) return res.status(404).json({ error: 'Contact assignment not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error removing contact:', err);
    res.status(500).json({ error: 'Failed to remove contact' });
  }
});

// ============================================
// READY TO INVOICE
// ============================================

// PATCH /:id/ready-to-invoice
router.patch('/:id/ready-to-invoice', (req, res) => {
  try {
    const job = apexJobsDb.toggleReadyToInvoice(req.params.id, req.body.ready, req.org.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    console.error('Error toggling invoice status:', err);
    res.status(500).json({ error: 'Failed to update invoice status' });
  }
});

// ============================================
// JOB MATERIALS (Inventory Allocations)
// ============================================

const apexInventoryDb = require('../db/apexInventory');

// GET /:id/materials
router.get('/:id/materials', (req, res) => {
  try {
    const allocations = apexInventoryDb.getJobAllocations(req.params.id, { phaseId: req.query.phase_id });
    res.json(allocations);
  } catch (err) {
    console.error('Error getting job materials:', err);
    res.status(500).json({ error: 'Failed to get job materials' });
  }
});

// POST /:id/materials
router.post('/:id/materials', requireOrgRole('management', 'office_coordinator', 'project_manager', 'field_tech'), (req, res) => {
  try {
    if (!req.body.item_id) return res.status(400).json({ error: 'item_id is required' });
    const alloc = apexInventoryDb.allocateMaterial(req.params.id, { ...req.body, used_by: req.user.id });
    res.status(201).json(alloc);
  } catch (err) {
    console.error('Error allocating material to job:', err);
    res.status(500).json({ error: 'Failed to allocate material' });
  }
});

// ============================================
// SUPPLEMENTS (JC-05)
// ============================================

// GET /:id/supplements
router.get('/:id/supplements', requireOrgRole('management', 'office_coordinator', 'estimator'), (req, res) => {
  try {
    const supplements = apexJobsDb.getSupplementsByJob(req.params.id, req.org.id);
    if (supplements === null) return res.status(404).json({ error: 'Job not found' });
    res.json(supplements);
  } catch (err) {
    console.error('Error getting supplements:', err);
    res.status(500).json({ error: 'Failed to get supplements' });
  }
});

// POST /:id/supplements
router.post('/:id/supplements', requireOrgRole('management', 'office_coordinator', 'estimator'), (req, res) => {
  try {
    const supplement = apexJobsDb.createSupplement(req.params.id, req.body, req.user.id, req.org.id);
    if (!supplement) return res.status(404).json({ error: 'Job not found' });
    res.status(201).json(supplement);
  } catch (err) {
    console.error('Error creating supplement:', err);
    res.status(500).json({ error: 'Failed to create supplement' });
  }
});

// PATCH /:id/supplements/:supId
router.patch('/:id/supplements/:supId', requireOrgRole('management', 'office_coordinator', 'estimator'), (req, res) => {
  try {
    const supplement = apexJobsDb.updateSupplement(req.params.supId, req.body, req.user.id, req.org.id);
    if (!supplement) return res.status(404).json({ error: 'Supplement not found' });
    res.json(supplement);
  } catch (err) {
    console.error('Error updating supplement:', err);
    res.status(500).json({ error: 'Failed to update supplement' });
  }
});

// DELETE /:id/supplements/:supId
router.delete('/:id/supplements/:supId', requireOrgRole('management'), (req, res) => {
  try {
    const success = apexJobsDb.deleteSupplement(req.params.supId, req.user.id, req.org.id);
    if (!success) return res.status(404).json({ error: 'Supplement not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting supplement:', err);
    res.status(500).json({ error: 'Failed to delete supplement' });
  }
});

// ============================================
// SUB INVOICES (JC-05)
// ============================================

// GET /:id/sub-invoices
router.get('/:id/sub-invoices', requireOrgRole('management', 'office_coordinator'), (req, res) => {
  try {
    const invoices = apexJobsDb.getSubInvoicesByJob(req.params.id, req.org.id);
    if (invoices === null) return res.status(404).json({ error: 'Job not found' });
    res.json(invoices);
  } catch (err) {
    console.error('Error getting sub invoices:', err);
    res.status(500).json({ error: 'Failed to get sub invoices' });
  }
});

// POST /:id/sub-invoices
router.post('/:id/sub-invoices', requireOrgRole('management', 'office_coordinator'), (req, res) => {
  try {
    const invoice = apexJobsDb.createSubInvoice(req.params.id, req.body, req.user.id, req.org.id);
    if (!invoice) return res.status(404).json({ error: 'Job not found' });
    res.status(201).json(invoice);
  } catch (err) {
    console.error('Error creating sub invoice:', err);
    res.status(500).json({ error: 'Failed to create sub invoice' });
  }
});

// PATCH /:id/sub-invoices/:invId
router.patch('/:id/sub-invoices/:invId', requireOrgRole('management', 'office_coordinator'), (req, res) => {
  try {
    const invoice = apexJobsDb.updateSubInvoice(req.params.invId, req.body, req.user.id, req.org.id);
    if (!invoice) return res.status(404).json({ error: 'Sub invoice not found' });
    res.json(invoice);
  } catch (err) {
    console.error('Error updating sub invoice:', err);
    res.status(500).json({ error: 'Failed to update sub invoice' });
  }
});

// DELETE /:id/sub-invoices/:invId
router.delete('/:id/sub-invoices/:invId', requireOrgRole('management'), (req, res) => {
  try {
    const success = apexJobsDb.deleteSubInvoice(req.params.invId, req.user.id, req.org.id);
    if (!success) return res.status(404).json({ error: 'Sub invoice not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting sub invoice:', err);
    res.status(500).json({ error: 'Failed to delete sub invoice' });
  }
});

// POST /:id/sub-invoices/:invId/payment
router.post('/:id/sub-invoices/:invId/payment', requireOrgRole('management', 'office_coordinator'), (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid payment amount required' });
    const invoice = apexJobsDb.recordSubPayment(req.params.invId, amount, req.user.id, req.org.id);
    if (!invoice) return res.status(404).json({ error: 'Sub invoice not found' });
    res.json(invoice);
  } catch (err) {
    console.error('Error recording sub payment:', err);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// ============================================
// FUEL / MILEAGE (JC-05)
// ============================================

// GET /:id/fuel-mileage
router.get('/:id/fuel-mileage', requireOrgRole('management', 'office_coordinator', 'project_manager'), (req, res) => {
  try {
    const entries = apexJobsDb.getFuelByJob(req.params.id, req.org.id);
    if (entries === null) return res.status(404).json({ error: 'Job not found' });
    res.json(entries);
  } catch (err) {
    console.error('Error getting fuel/mileage entries:', err);
    res.status(500).json({ error: 'Failed to get fuel/mileage entries' });
  }
});

// POST /:id/fuel-mileage
router.post('/:id/fuel-mileage', requireOrgRole('management', 'office_coordinator', 'project_manager', 'field_tech'), (req, res) => {
  try {
    const entry = apexJobsDb.createFuelEntry(req.params.id, req.body, req.user.id, req.org.id);
    if (!entry) return res.status(404).json({ error: 'Job not found' });
    res.status(201).json(entry);
  } catch (err) {
    console.error('Error creating fuel/mileage entry:', err);
    res.status(500).json({ error: 'Failed to create fuel/mileage entry' });
  }
});

// PATCH /:id/fuel-mileage/:fmId
router.patch('/:id/fuel-mileage/:fmId', (req, res) => {
  try {
    const existing = apexJobsDb.getFuelEntryById(req.params.fmId);
    if (!existing) return res.status(404).json({ error: 'Fuel/mileage entry not found' });
    if (!canEditEntry(req, { ...existing, author_id: existing.employee_id })) return res.status(403).json({ error: 'Insufficient permissions' });
    const entry = apexJobsDb.updateFuelEntry(req.params.fmId, req.body, req.user.id, req.org.id);
    if (!entry) return res.status(404).json({ error: 'Fuel/mileage entry not found' });
    res.json(entry);
  } catch (err) {
    console.error('Error updating fuel/mileage entry:', err);
    res.status(500).json({ error: 'Failed to update fuel/mileage entry' });
  }
});

// DELETE /:id/fuel-mileage/:fmId
router.delete('/:id/fuel-mileage/:fmId', (req, res) => {
  try {
    const existing = apexJobsDb.getFuelEntryById(req.params.fmId);
    if (!existing) return res.status(404).json({ error: 'Fuel/mileage entry not found' });
    if (!canEditEntry(req, { ...existing, author_id: existing.employee_id })) return res.status(403).json({ error: 'Insufficient permissions' });
    const success = apexJobsDb.deleteFuelEntry(req.params.fmId, req.user.id, req.org.id);
    if (!success) return res.status(404).json({ error: 'Fuel/mileage entry not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting fuel/mileage entry:', err);
    res.status(500).json({ error: 'Failed to delete fuel/mileage entry' });
  }
});

// Drying log sub-routes
const dryingRoutes = require('./drying');
router.use('/:id/drying', dryingRoutes);

// ============================================
// JOB WORKFLOW ROUTES
// ============================================
const wf = require('../db/apexWorkflows');

// POST /:id/workflow — stamp a workflow template onto this job
router.post('/:id/workflow', requireOrgRole('management', 'office_coordinator', 'project_manager'), (req, res) => {
  try {
    const { template_id, phase_id } = req.body;
    if (!template_id) return res.status(400).json({ error: 'template_id is required' });
    const workflow = wf.stampWorkflow(req.params.id, template_id, phase_id, req.org.id);
    res.status(201).json(workflow);
  } catch (err) {
    console.error('Error stamping workflow:', err);
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'This template is already applied to this job/phase' });
    }
    res.status(500).json({ error: err.message || 'Failed to stamp workflow' });
  }
});

// GET /:id/workflow — get workflow with all steps/gates/status
router.get('/:id/workflow', (req, res) => {
  try {
    const workflow = wf.getWorkflowByJob(req.params.id);
    if (!workflow) return res.status(404).json({ error: 'No active workflow for this job' });
    const progress = wf.getWorkflowProgress(req.params.id);
    res.json({ ...workflow, progress });
  } catch (err) {
    console.error('Error getting workflow:', err);
    res.status(500).json({ error: 'Failed to get workflow' });
  }
});

// POST /:id/workflow/evaluate — re-evaluate all gates
router.post('/:id/workflow/evaluate', (req, res) => {
  try {
    const workflow = wf.getWorkflowByJob(req.params.id);
    if (!workflow) return res.status(404).json({ error: 'No active workflow for this job' });
    wf.evaluateAllGates(workflow.id);
    const updated = wf.getWorkflowByJob(req.params.id);
    const progress = wf.getWorkflowProgress(req.params.id);
    res.json({ ...updated, progress });
  } catch (err) {
    console.error('Error evaluating gates:', err);
    res.status(500).json({ error: 'Failed to evaluate gates' });
  }
});

// PATCH /:id/workflow/steps/:stepId/complete — complete a step
router.patch('/:id/workflow/steps/:stepId/complete', (req, res) => {
  try {
    const step = wf.completeStep(req.params.stepId, req.user.id);
    res.json(step);
  } catch (err) {
    console.error('Error completing step:', err);
    res.status(400).json({ error: err.message || 'Failed to complete step' });
  }
});

// PATCH /:id/workflow/steps/:stepId/skip — skip a step
router.patch('/:id/workflow/steps/:stepId/skip', (req, res) => {
  try {
    const step = wf.skipStep(req.params.stepId, req.user.id, req.body.reason);
    res.json(step);
  } catch (err) {
    console.error('Error skipping step:', err);
    res.status(400).json({ error: err.message || 'Failed to skip step' });
  }
});

// PATCH /:id/workflow/steps/:stepId/override — management override
router.patch('/:id/workflow/steps/:stepId/override', requireOrgRole('management'), (req, res) => {
  try {
    const step = wf.overrideStep(req.params.stepId, req.user.id, req.body.reason);
    res.json(step);
  } catch (err) {
    console.error('Error overriding step:', err);
    res.status(400).json({ error: err.message || 'Failed to override step' });
  }
});

// PATCH /:id/workflow/steps/:stepId/reassign — reassign step
router.patch('/:id/workflow/steps/:stepId/reassign', requireOrgRole('management', 'office_coordinator', 'project_manager'), (req, res) => {
  try {
    if (!req.body.user_id) return res.status(400).json({ error: 'user_id is required' });
    const step = wf.reassignStep(req.params.stepId, req.body.user_id);
    res.json(step);
  } catch (err) {
    console.error('Error reassigning step:', err);
    res.status(500).json({ error: 'Failed to reassign step' });
  }
});

// POST /:id/workflow/gates/:gateId/approve — manually approve a gate
router.post('/:id/workflow/gates/:gateId/approve', (req, res) => {
  try {
    const gate = wf.approveGate(req.params.gateId, req.user.id);
    if (!gate) return res.status(404).json({ error: 'Gate not found' });
    res.json(gate);
  } catch (err) {
    console.error('Error approving gate:', err);
    res.status(500).json({ error: 'Failed to approve gate' });
  }
});

module.exports = router;
