const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');
const { requireRole, canEditEntry } = require('../middleware/permissions');
const apexJobsDb = require('../db/apexJobs');

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
router.get('/', authMiddleware, (req, res) => {
  try {
    const zohoData = readZohoJobs();
    const dbJobs = req.user ? apexJobsDb.getAllJobs(req.user.id) : [];
    const formattedDbJobs = dbJobs.map(formatDbJob);

    const merged = [...formattedDbJobs, ...(zohoData.projects || [])];
    const stats = req.user ? apexJobsDb.getJobStats(req.user.id) : {};

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
router.post('/', authMiddleware, requireRole('management', 'office_coordinator'), (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const job = apexJobsDb.createJob(req.body, req.user.id);
    res.status(201).json(job);
  } catch (err) {
    console.error('Error creating job:', err);
    res.status(500).json({ error: 'Failed to create job: ' + err.message });
  }
});

// GET /:id - Get single job
router.get('/:id', authMiddleware, (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const job = apexJobsDb.getJobById(req.params.id, req.user.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    console.error('Error getting job:', err);
    res.status(500).json({ error: 'Failed to get job' });
  }
});

// PATCH /:id - Update job
router.patch('/:id', authMiddleware, requireRole('management', 'office_coordinator'), (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const job = apexJobsDb.updateJob(req.params.id, req.body, req.user.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    console.error('Error updating job:', err);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// PATCH /:id/status - Update job status
router.patch('/:id/status', authMiddleware, (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const job = apexJobsDb.updateJob(req.params.id, { status: req.body.status }, req.user.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    console.error('Error updating job status:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// DELETE /:id - Archive job (soft delete)
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const success = apexJobsDb.archiveJob(req.params.id, req.user.id);
    if (!success) return res.status(404).json({ error: 'Job not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error archiving job:', err);
    res.status(500).json({ error: 'Failed to archive job' });
  }
});

// PATCH /:id/phases/:phaseId - Update phase
router.patch('/:id/phases/:phaseId', authMiddleware, (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const phase = apexJobsDb.updatePhase(req.params.phaseId, req.body, req.user.id);
    if (!phase) return res.status(404).json({ error: 'Phase not found' });
    res.json(phase);
  } catch (err) {
    console.error('Error updating phase:', err);
    res.status(500).json({ error: 'Failed to update phase' });
  }
});

// POST /:id/phases - Add phase to existing job
router.post('/:id/phases', authMiddleware, (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
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
router.patch('/:id/dates', authMiddleware, (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const job = apexJobsDb.updateJobDates(req.params.id, req.body, req.user.id);
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
router.get('/:id/notes', authMiddleware, (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const notes = apexJobsDb.getNotesByJob(req.params.id, req.user.id);
    if (notes === null) return res.status(404).json({ error: 'Job not found' });
    res.json(notes);
  } catch (err) {
    console.error('Error getting notes:', err);
    res.status(500).json({ error: 'Failed to get notes' });
  }
});

// POST /:id/notes
router.post('/:id/notes', authMiddleware, (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const note = apexJobsDb.createNote(req.params.id, { ...req.body, author_id: req.user.id }, req.user.id);
    if (!note) return res.status(404).json({ error: 'Job not found' });
    res.status(201).json(note);
  } catch (err) {
    console.error('Error creating note:', err);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// PATCH /:id/notes/:noteId
router.patch('/:id/notes/:noteId', authMiddleware, (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
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
router.delete('/:id/notes/:noteId', authMiddleware, requireRole('management'), (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const success = apexJobsDb.deleteNote(req.params.noteId, req.user.id);
    if (!success) return res.status(404).json({ error: 'Note not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting note:', err);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// ============================================
// ESTIMATES
// ============================================

// GET /:id/estimates
router.get('/:id/estimates', authMiddleware, (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const estimates = apexJobsDb.getEstimatesByJob(req.params.id, req.user.id);
    if (estimates === null) return res.status(404).json({ error: 'Job not found' });
    res.json(estimates);
  } catch (err) {
    console.error('Error getting estimates:', err);
    res.status(500).json({ error: 'Failed to get estimates' });
  }
});

// POST /:id/estimates
router.post('/:id/estimates', authMiddleware, requireRole('management', 'office_coordinator', 'estimator'), (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const estimate = apexJobsDb.createEstimate(req.params.id, req.body, req.user.id);
    if (!estimate) return res.status(404).json({ error: 'Job not found' });
    res.status(201).json(estimate);
  } catch (err) {
    console.error('Error creating estimate:', err);
    res.status(500).json({ error: 'Failed to create estimate' });
  }
});

// PATCH /:id/estimates/:estId
router.patch('/:id/estimates/:estId', authMiddleware, requireRole('management', 'office_coordinator', 'estimator'), (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const estimate = apexJobsDb.updateEstimate(req.params.estId, req.body, req.user.id);
    if (!estimate) return res.status(404).json({ error: 'Estimate not found' });
    res.json(estimate);
  } catch (err) {
    console.error('Error updating estimate:', err);
    res.status(500).json({ error: 'Failed to update estimate' });
  }
});

// ============================================
// PAYMENTS
// ============================================

// GET /:id/payments
router.get('/:id/payments', authMiddleware, (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const payments = apexJobsDb.getPaymentsByJob(req.params.id, req.user.id);
    if (payments === null) return res.status(404).json({ error: 'Job not found' });
    res.json(payments);
  } catch (err) {
    console.error('Error getting payments:', err);
    res.status(500).json({ error: 'Failed to get payments' });
  }
});

// POST /:id/payments
router.post('/:id/payments', authMiddleware, requireRole('management', 'office_coordinator'), (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const payment = apexJobsDb.createPayment(req.params.id, req.body, req.user.id);
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
router.get('/:id/labor', authMiddleware, (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const labor = apexJobsDb.getLaborByJob(req.params.id, req.user.id);
    if (labor === null) return res.status(404).json({ error: 'Job not found' });
    res.json(labor);
  } catch (err) {
    console.error('Error getting labor entries:', err);
    res.status(500).json({ error: 'Failed to get labor entries' });
  }
});

// POST /:id/labor
router.post('/:id/labor', authMiddleware, requireRole('management', 'office_coordinator', 'project_manager', 'field_tech'), (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const entry = apexJobsDb.createLaborEntry(req.params.id, { ...req.body, author_id: req.user.id }, req.user.id);
    if (!entry) return res.status(404).json({ error: 'Job not found' });
    res.status(201).json(entry);
  } catch (err) {
    console.error('Error creating labor entry:', err);
    res.status(500).json({ error: 'Failed to create labor entry' });
  }
});

// PATCH /:id/labor/:entryId
router.patch('/:id/labor/:entryId', authMiddleware, (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const existing = apexJobsDb.getLaborEntryById(req.params.entryId);
    if (!existing) return res.status(404).json({ error: 'Labor entry not found' });
    if (!canEditEntry(req, existing)) return res.status(403).json({ error: 'Insufficient permissions' });
    const entry = apexJobsDb.updateLaborEntry(req.params.entryId, req.body, req.user.id);
    if (!entry) return res.status(404).json({ error: 'Labor entry not found' });
    res.json(entry);
  } catch (err) {
    console.error('Error updating labor entry:', err);
    res.status(500).json({ error: 'Failed to update labor entry' });
  }
});

// DELETE /:id/labor/:entryId
router.delete('/:id/labor/:entryId', authMiddleware, (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const existing = apexJobsDb.getLaborEntryById(req.params.entryId);
    if (!existing) return res.status(404).json({ error: 'Labor entry not found' });
    if (!canEditEntry(req, existing)) return res.status(403).json({ error: 'Insufficient permissions' });
    const success = apexJobsDb.deleteLaborEntry(req.params.entryId, req.user.id);
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
router.get('/:id/receipts', authMiddleware, (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const receipts = apexJobsDb.getReceiptsByJob(req.params.id, req.user.id);
    if (receipts === null) return res.status(404).json({ error: 'Job not found' });
    res.json(receipts);
  } catch (err) {
    console.error('Error getting receipts:', err);
    res.status(500).json({ error: 'Failed to get receipts' });
  }
});

// POST /:id/receipts
router.post('/:id/receipts', authMiddleware, (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const receipt = apexJobsDb.createReceipt(req.params.id, { ...req.body, author_id: req.user.id }, req.user.id);
    if (!receipt) return res.status(404).json({ error: 'Job not found' });
    res.status(201).json(receipt);
  } catch (err) {
    console.error('Error creating receipt:', err);
    res.status(500).json({ error: 'Failed to create receipt' });
  }
});

// PATCH /:id/receipts/:receiptId
router.patch('/:id/receipts/:receiptId', authMiddleware, (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const existing = apexJobsDb.getReceiptById(req.params.receiptId);
    if (!existing) return res.status(404).json({ error: 'Receipt not found' });
    if (!canEditEntry(req, existing)) return res.status(403).json({ error: 'Insufficient permissions' });
    const receipt = apexJobsDb.updateReceipt(req.params.receiptId, req.body, req.user.id);
    if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
    res.json(receipt);
  } catch (err) {
    console.error('Error updating receipt:', err);
    res.status(500).json({ error: 'Failed to update receipt' });
  }
});

// DELETE /:id/receipts/:receiptId
router.delete('/:id/receipts/:receiptId', authMiddleware, (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const existing = apexJobsDb.getReceiptById(req.params.receiptId);
    if (!existing) return res.status(404).json({ error: 'Receipt not found' });
    if (!canEditEntry(req, existing)) return res.status(403).json({ error: 'Insufficient permissions' });
    const success = apexJobsDb.deleteReceipt(req.params.receiptId, req.user.id);
    if (!success) return res.status(404).json({ error: 'Receipt not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting receipt:', err);
    res.status(500).json({ error: 'Failed to delete receipt' });
  }
});

// ============================================
// WORK ORDERS
// ============================================

// GET /:id/work-orders
router.get('/:id/work-orders', authMiddleware, (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const workOrders = apexJobsDb.getWorkOrdersByJob(req.params.id, req.user.id);
    if (workOrders === null) return res.status(404).json({ error: 'Job not found' });
    res.json(workOrders);
  } catch (err) {
    console.error('Error getting work orders:', err);
    res.status(500).json({ error: 'Failed to get work orders' });
  }
});

// POST /:id/work-orders
router.post('/:id/work-orders', authMiddleware, requireRole('management', 'office_coordinator', 'project_manager'), (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const wo = apexJobsDb.createWorkOrder(req.params.id, req.body, req.user.id);
    if (!wo) return res.status(404).json({ error: 'Job not found' });
    res.status(201).json(wo);
  } catch (err) {
    console.error('Error creating work order:', err);
    res.status(500).json({ error: 'Failed to create work order' });
  }
});

// PATCH /:id/work-orders/:woId
router.patch('/:id/work-orders/:woId', authMiddleware, requireRole('management', 'office_coordinator', 'project_manager'), (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const wo = apexJobsDb.updateWorkOrder(req.params.woId, req.body, req.user.id);
    if (!wo) return res.status(404).json({ error: 'Work order not found' });
    res.json(wo);
  } catch (err) {
    console.error('Error updating work order:', err);
    res.status(500).json({ error: 'Failed to update work order' });
  }
});

// DELETE /:id/work-orders/:woId
router.delete('/:id/work-orders/:woId', authMiddleware, requireRole('management', 'office_coordinator'), (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const success = apexJobsDb.deleteWorkOrder(req.params.woId, req.user.id);
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
router.get('/:id/activity', authMiddleware, (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const options = {
      type: req.query.type || null,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };
    const activity = apexJobsDb.getActivityByJob(req.params.id, req.user.id, options);
    if (activity === null) return res.status(404).json({ error: 'Job not found' });
    res.json(activity);
  } catch (err) {
    console.error('Error getting activity:', err);
    res.status(500).json({ error: 'Failed to get activity' });
  }
});

// ============================================
// ACCOUNTING
// ============================================

// GET /:id/accounting
router.get('/:id/accounting', authMiddleware, (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const summary = apexJobsDb.getAccountingSummary(req.params.id, req.user.id);
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
router.post('/:id/contacts', authMiddleware, (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const { contact_id, role } = req.body;
    if (!contact_id) return res.status(400).json({ error: 'contact_id is required' });
    const result = apexJobsDb.assignContact(req.params.id, contact_id, role, req.user.id);
    if (!result) return res.status(404).json({ error: 'Job not found' });
    res.status(201).json(result);
  } catch (err) {
    console.error('Error assigning contact:', err);
    res.status(500).json({ error: 'Failed to assign contact' });
  }
});

// DELETE /:id/contacts/:contactId
router.delete('/:id/contacts/:contactId', authMiddleware, (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const success = apexJobsDb.removeContact(req.params.id, req.params.contactId, req.user.id);
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
router.patch('/:id/ready-to-invoice', authMiddleware, (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const job = apexJobsDb.toggleReadyToInvoice(req.params.id, req.body.ready, req.user.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    console.error('Error toggling invoice status:', err);
    res.status(500).json({ error: 'Failed to update invoice status' });
  }
});

module.exports = router;
