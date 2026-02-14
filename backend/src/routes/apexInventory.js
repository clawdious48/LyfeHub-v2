const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { requireOrgMember, requireOrgRole } = require('../middleware/orgAuth');
const inv = require('../db/apexInventory');

// All routes require auth + org membership
router.use(authMiddleware, requireOrgMember);

// ============================================
// CATALOG ITEMS
// ============================================

// GET /items
router.get('/items', async (req, res) => {
  try {
    const items = await inv.getItems(req.org.id, {
      search: req.query.search,
      category: req.query.category,
      activeOnly: req.query.active_only !== 'false',
      limit: parseInt(req.query.limit) || 100,
      offset: parseInt(req.query.offset) || 0,
    });
    res.json(items);
  } catch (err) {
    console.error('Error listing items:', err);
    res.status(500).json({ error: 'Failed to list items' });
  }
});

// POST /items
router.post('/items', requireOrgRole('management', 'office_coordinator'), async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ error: 'name is required' });
    const item = await inv.createItem(req.org.id, req.body, req.user.id);
    res.status(201).json(item);
  } catch (err) {
    console.error('Error creating item:', err);
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'An item with that name already exists' });
    }
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// GET /items/:id
router.get('/items/:id', async (req, res) => {
  try {
    const item = await inv.getItemById(req.params.id, req.org.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    console.error('Error getting item:', err);
    res.status(500).json({ error: 'Failed to get item' });
  }
});

// PATCH /items/:id
router.patch('/items/:id', requireOrgRole('management', 'office_coordinator'), async (req, res) => {
  try {
    const item = await inv.updateItem(req.params.id, req.body, req.org.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    console.error('Error updating item:', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE /items/:id (soft delete)
router.delete('/items/:id', requireOrgRole('management'), async (req, res) => {
  try {
    const success = await inv.deactivateItem(req.params.id, req.org.id);
    if (!success) return res.status(404).json({ error: 'Item not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deactivating item:', err);
    res.status(500).json({ error: 'Failed to deactivate item' });
  }
});

// ============================================
// PURCHASES
// ============================================

// GET /purchases
router.get('/purchases', requireOrgRole('management', 'office_coordinator'), async (req, res) => {
  try {
    const purchases = await inv.getPurchases(req.org.id, {
      itemId: req.query.item_id,
      startDate: req.query.start_date,
      endDate: req.query.end_date,
      limit: parseInt(req.query.limit) || 100,
      offset: parseInt(req.query.offset) || 0,
    });
    res.json(purchases);
  } catch (err) {
    console.error('Error listing purchases:', err);
    res.status(500).json({ error: 'Failed to list purchases' });
  }
});

// POST /purchases
router.post('/purchases', requireOrgRole('management', 'office_coordinator'), async (req, res) => {
  try {
    if (!req.body.item_id || !req.body.purchase_date) {
      return res.status(400).json({ error: 'item_id and purchase_date are required' });
    }
    const purchase = await inv.recordPurchase(req.org.id, req.body, req.user.id);
    res.status(201).json(purchase);
  } catch (err) {
    console.error('Error recording purchase:', err);
    res.status(500).json({ error: 'Failed to record purchase' });
  }
});

// DELETE /purchases/:id
router.delete('/purchases/:id', requireOrgRole('management'), async (req, res) => {
  try {
    const success = await inv.deletePurchase(req.params.id, req.org.id);
    if (!success) return res.status(404).json({ error: 'Purchase not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting purchase:', err);
    res.status(500).json({ error: 'Failed to delete purchase' });
  }
});

// ============================================
// STOCK LEVELS
// ============================================

// GET /levels
router.get('/levels', async (req, res) => {
  try {
    const levels = await inv.getLevels(req.org.id);
    res.json(levels);
  } catch (err) {
    console.error('Error getting levels:', err);
    res.status(500).json({ error: 'Failed to get stock levels' });
  }
});

// PATCH /levels/:itemId (manual adjustment)
router.patch('/levels/:itemId', requireOrgRole('management'), async (req, res) => {
  try {
    if (req.body.adjustment == null) {
      return res.status(400).json({ error: 'adjustment is required' });
    }
    const level = await inv.adjustLevel(req.org.id, req.params.itemId, req.body.adjustment, req.body.reason || '');
    res.json(level);
  } catch (err) {
    console.error('Error adjusting level:', err);
    res.status(500).json({ error: 'Failed to adjust stock level' });
  }
});

// ============================================
// JOB MATERIAL ALLOCATIONS
// ============================================

// GET /jobs/:jobId/materials
router.get('/jobs/:jobId/materials', async (req, res) => {
  try {
    const allocations = await inv.getJobAllocations(req.params.jobId, { phaseId: req.query.phase_id });
    res.json(allocations);
  } catch (err) {
    console.error('Error getting job allocations:', err);
    res.status(500).json({ error: 'Failed to get job materials' });
  }
});

// POST /jobs/:jobId/materials
router.post('/jobs/:jobId/materials', requireOrgRole('management', 'office_coordinator', 'project_manager', 'field_tech'), async (req, res) => {
  try {
    if (!req.body.item_id) return res.status(400).json({ error: 'item_id is required' });
    const alloc = await inv.allocateMaterial(req.params.jobId, { ...req.body, used_by: req.user.id });
    res.status(201).json(alloc);
  } catch (err) {
    console.error('Error allocating material:', err);
    res.status(500).json({ error: 'Failed to allocate material' });
  }
});

// DELETE /jobs/:jobId/materials/:id
router.delete('/jobs/:jobId/materials/:id', requireOrgRole('management', 'office_coordinator'), async (req, res) => {
  try {
    const success = await inv.deallocateMaterial(req.params.id);
    if (!success) return res.status(404).json({ error: 'Allocation not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deallocating material:', err);
    res.status(500).json({ error: 'Failed to return material to stock' });
  }
});

module.exports = router;
