const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

// ============================================
// CONSUMABLE ITEMS (CATALOG)
// ============================================

function createItem(orgId, data, userId) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO apex_consumable_items (id, org_id, name, description, category, unit_of_measure, unit_cost, is_active, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(id, orgId, data.name, data.description || '', data.category || 'misc', data.unit_of_measure || 'each', data.unit_cost || 0, userId);
  return getItemById(id, orgId);
}

function getItemById(id, orgId) {
  return db.prepare(`SELECT * FROM apex_consumable_items WHERE id = ? AND org_id = ?`).get(id, orgId);
}

function getItems(orgId, { search, category, activeOnly = true, limit = 100, offset = 0 } = {}) {
  let sql = 'SELECT * FROM apex_consumable_items WHERE org_id = ?';
  const params = [orgId];

  if (activeOnly) {
    sql += ' AND is_active = 1';
  }
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (search) {
    sql += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY name ASC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return db.prepare(sql).all(...params);
}

function updateItem(id, data, orgId) {
  const item = getItemById(id, orgId);
  if (!item) return null;

  const fields = ['name', 'description', 'category', 'unit_of_measure', 'unit_cost', 'is_active'];
  const updates = [];
  const params = [];

  for (const f of fields) {
    if (data[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(data[f]);
    }
  }

  if (updates.length === 0) return item;

  updates.push("updated_at = datetime('now')");
  params.push(id, orgId);

  db.prepare(`UPDATE apex_consumable_items SET ${updates.join(', ')} WHERE id = ? AND org_id = ?`).run(...params);
  return getItemById(id, orgId);
}

function deactivateItem(id, orgId) {
  const result = db.prepare(`UPDATE apex_consumable_items SET is_active = 0, updated_at = datetime('now') WHERE id = ? AND org_id = ?`).run(id, orgId);
  return result.changes > 0;
}

// ============================================
// INVENTORY PURCHASES
// ============================================

const recordPurchase = db.transaction((orgId, data, userId) => {
  const id = uuidv4();
  const quantity = data.quantity || 0;
  const unitCost = data.unit_cost || 0;
  const totalCost = data.total_cost != null ? data.total_cost : quantity * unitCost;

  db.prepare(`
    INSERT INTO apex_inventory_purchases (id, org_id, item_id, quantity, unit_cost, total_cost, vendor_name, vendor_org_id, purchase_date, receipt_id, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, orgId, data.item_id, quantity, unitCost, totalCost, data.vendor_name || '', data.vendor_org_id || null, data.purchase_date, data.receipt_id || null, data.notes || '', userId);

  // Upsert inventory level
  db.prepare(`
    INSERT INTO apex_inventory_levels (id, org_id, item_id, quantity_on_hand, last_updated)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(org_id, item_id) DO UPDATE SET
      quantity_on_hand = quantity_on_hand + ?,
      last_updated = datetime('now')
  `).run(uuidv4(), orgId, data.item_id, quantity, quantity);

  // Optionally update catalog unit_cost to latest purchase price
  if (unitCost > 0) {
    db.prepare(`UPDATE apex_consumable_items SET unit_cost = ?, updated_at = datetime('now') WHERE id = ? AND org_id = ?`).run(unitCost, data.item_id, orgId);
  }

  return db.prepare('SELECT * FROM apex_inventory_purchases WHERE id = ?').get(id);
});

function getPurchases(orgId, { itemId, startDate, endDate, limit = 100, offset = 0 } = {}) {
  let sql = `SELECT p.*, i.name as item_name, i.unit_of_measure
    FROM apex_inventory_purchases p
    JOIN apex_consumable_items i ON i.id = p.item_id
    WHERE p.org_id = ?`;
  const params = [orgId];

  if (itemId) {
    sql += ' AND p.item_id = ?';
    params.push(itemId);
  }
  if (startDate) {
    sql += ' AND p.purchase_date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    sql += ' AND p.purchase_date <= ?';
    params.push(endDate);
  }

  sql += ' ORDER BY p.purchase_date DESC, p.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return db.prepare(sql).all(...params);
}

const deletePurchase = db.transaction((id, orgId) => {
  const purchase = db.prepare('SELECT * FROM apex_inventory_purchases WHERE id = ? AND org_id = ?').get(id, orgId);
  if (!purchase) return false;

  // Decrement inventory level
  db.prepare(`
    UPDATE apex_inventory_levels SET quantity_on_hand = quantity_on_hand - ?, last_updated = datetime('now')
    WHERE org_id = ? AND item_id = ?
  `).run(purchase.quantity, orgId, purchase.item_id);

  db.prepare('DELETE FROM apex_inventory_purchases WHERE id = ?').run(id);
  return true;
});

// ============================================
// INVENTORY LEVELS
// ============================================

function getLevels(orgId) {
  return db.prepare(`
    SELECT l.*, i.name, i.description, i.category, i.unit_of_measure, i.unit_cost, i.is_active
    FROM apex_inventory_levels l
    JOIN apex_consumable_items i ON i.id = l.item_id
    WHERE l.org_id = ?
    ORDER BY i.name ASC
  `).all(orgId);
}

function getLevelByItem(orgId, itemId) {
  return db.prepare(`
    SELECT l.*, i.name, i.description, i.category, i.unit_of_measure, i.unit_cost
    FROM apex_inventory_levels l
    JOIN apex_consumable_items i ON i.id = l.item_id
    WHERE l.org_id = ? AND l.item_id = ?
  `).get(orgId, itemId);
}

function adjustLevel(orgId, itemId, adjustment, reason) {
  // Upsert
  db.prepare(`
    INSERT INTO apex_inventory_levels (id, org_id, item_id, quantity_on_hand, last_updated)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(org_id, item_id) DO UPDATE SET
      quantity_on_hand = quantity_on_hand + ?,
      last_updated = datetime('now')
  `).run(uuidv4(), orgId, itemId, adjustment, adjustment);

  return getLevelByItem(orgId, itemId);
}

// ============================================
// JOB MATERIAL ALLOCATIONS
// ============================================

const allocateMaterial = db.transaction((jobId, data) => {
  const id = uuidv4();
  const item = db.prepare('SELECT * FROM apex_consumable_items WHERE id = ?').get(data.item_id);
  const unitCost = data.unit_cost_at_use != null ? data.unit_cost_at_use : (item ? item.unit_cost : 0);
  const qtyUsed = data.quantity_used || 0;
  const totalCost = qtyUsed * unitCost;

  db.prepare(`
    INSERT INTO apex_job_material_allocations (id, job_id, phase_id, item_id, quantity_used, unit_cost_at_use, total_cost, used_date, used_by, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, jobId, data.phase_id || null, data.item_id, qtyUsed, unitCost, totalCost, data.used_date || new Date().toISOString().slice(0, 10), data.used_by || null, data.notes || '');

  // Decrement inventory — get org_id from the item
  if (item) {
    db.prepare(`
      UPDATE apex_inventory_levels SET quantity_on_hand = quantity_on_hand - ?, last_updated = datetime('now')
      WHERE org_id = ? AND item_id = ?
    `).run(qtyUsed, item.org_id, data.item_id);
  }

  return db.prepare(`
    SELECT a.*, i.name as item_name, i.unit_of_measure
    FROM apex_job_material_allocations a
    JOIN apex_consumable_items i ON i.id = a.item_id
    WHERE a.id = ?
  `).get(id);
});

const deallocateMaterial = db.transaction((id) => {
  const alloc = db.prepare(`
    SELECT a.*, i.org_id FROM apex_job_material_allocations a
    JOIN apex_consumable_items i ON i.id = a.item_id
    WHERE a.id = ?
  `).get(id);
  if (!alloc) return false;

  // Return stock
  db.prepare(`
    UPDATE apex_inventory_levels SET quantity_on_hand = quantity_on_hand + ?, last_updated = datetime('now')
    WHERE org_id = ? AND item_id = ?
  `).run(alloc.quantity_used, alloc.org_id, alloc.item_id);

  db.prepare('DELETE FROM apex_job_material_allocations WHERE id = ?').run(id);
  return true;
});

function getJobAllocations(jobId, { phaseId } = {}) {
  let sql = `
    SELECT a.*, i.name as item_name, i.unit_of_measure, i.category as item_category
    FROM apex_job_material_allocations a
    JOIN apex_consumable_items i ON i.id = a.item_id
    WHERE a.job_id = ?`;
  const params = [jobId];

  if (phaseId) {
    sql += ' AND a.phase_id = ?';
    params.push(phaseId);
  }

  sql += ' ORDER BY a.used_date DESC, a.created_at DESC';
  return db.prepare(sql).all(...params);
}

function getItemAllocations(itemId, orgId) {
  return db.prepare(`
    SELECT a.*, j.name as job_name
    FROM apex_job_material_allocations a
    JOIN apex_jobs j ON j.id = a.job_id
    JOIN apex_consumable_items i ON i.id = a.item_id
    WHERE a.item_id = ? AND i.org_id = ?
    ORDER BY a.used_date DESC
  `).all(itemId, orgId);
}

module.exports = {
  // Catalog
  createItem,
  getItemById,
  getItems,
  updateItem,
  deactivateItem,
  // Purchases
  recordPurchase,
  getPurchases,
  deletePurchase,
  // Levels
  getLevels,
  getLevelByItem,
  adjustLevel,
  // Job Allocations
  allocateMaterial,
  deallocateMaterial,
  getJobAllocations,
  getItemAllocations,
};
