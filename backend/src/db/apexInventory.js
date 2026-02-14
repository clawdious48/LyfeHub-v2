const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

// ============================================
// CONSUMABLE ITEMS (CATALOG)
// ============================================

async function createItem(orgId, data, userId) {
  const id = uuidv4();
  await db.run(`
    INSERT INTO apex_consumable_items (id, org_id, name, description, category, unit_of_measure, unit_cost, is_active, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8)
  `, [id, orgId, data.name, data.description || '', data.category || 'misc', data.unit_of_measure || 'each', data.unit_cost || 0, userId]);
  return getItemById(id, orgId);
}

async function getItemById(id, orgId) {
  return await db.getOne(`SELECT * FROM apex_consumable_items WHERE id = $1 AND org_id = $2`, [id, orgId]);
}

async function getItems(orgId, { search, category, activeOnly = true, limit = 100, offset = 0 } = {}) {
  let sql = 'SELECT * FROM apex_consumable_items WHERE org_id = $1';
  const params = [orgId];
  let paramIdx = 2;

  if (activeOnly) {
    sql += ' AND is_active = 1';
  }
  if (category) {
    sql += ` AND category = $${paramIdx++}`;
    params.push(category);
  }
  if (search) {
    sql += ` AND (name ILIKE $${paramIdx} OR description ILIKE $${paramIdx + 1})`;
    params.push(`%${search}%`, `%${search}%`);
    paramIdx += 2;
  }

  sql += ` ORDER BY name ASC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
  params.push(limit, offset);

  return await db.getAll(sql, params);
}

async function updateItem(id, data, orgId) {
  const item = await getItemById(id, orgId);
  if (!item) return null;

  const fields = ['name', 'description', 'category', 'unit_of_measure', 'unit_cost', 'is_active'];
  const updates = [];
  const params = [];
  let paramIdx = 1;

  for (const f of fields) {
    if (data[f] !== undefined) {
      updates.push(`${f} = $${paramIdx++}`);
      params.push(data[f]);
    }
  }

  if (updates.length === 0) return item;

  updates.push(`updated_at = NOW()`);
  params.push(id, orgId);

  await db.run(`UPDATE apex_consumable_items SET ${updates.join(', ')} WHERE id = $${paramIdx++} AND org_id = $${paramIdx++}`, params);
  return getItemById(id, orgId);
}

async function deactivateItem(id, orgId) {
  const result = await db.run(`UPDATE apex_consumable_items SET is_active = 0, updated_at = NOW() WHERE id = $1 AND org_id = $2`, [id, orgId]);
  return result.rowCount > 0;
}

// ============================================
// INVENTORY PURCHASES
// ============================================

async function recordPurchase(orgId, data, userId) {
  return await db.transaction(async (client) => {
    const id = uuidv4();
    const quantity = data.quantity || 0;
    const unitCost = data.unit_cost || 0;
    const totalCost = data.total_cost != null ? data.total_cost : quantity * unitCost;

    await client.run(`
      INSERT INTO apex_inventory_purchases (id, org_id, item_id, quantity, unit_cost, total_cost, vendor_name, vendor_org_id, purchase_date, receipt_id, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [id, orgId, data.item_id, quantity, unitCost, totalCost, data.vendor_name || '', data.vendor_org_id || null, data.purchase_date, data.receipt_id || null, data.notes || '', userId]);

    // Upsert inventory level
    await client.run(`
      INSERT INTO apex_inventory_levels (id, org_id, item_id, quantity_on_hand, last_updated)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT(org_id, item_id) DO UPDATE SET
        quantity_on_hand = apex_inventory_levels.quantity_on_hand + $5,
        last_updated = NOW()
    `, [uuidv4(), orgId, data.item_id, quantity, quantity]);

    // Optionally update catalog unit_cost to latest purchase price
    if (unitCost > 0) {
      await client.run(`UPDATE apex_consumable_items SET unit_cost = $1, updated_at = NOW() WHERE id = $2 AND org_id = $3`, [unitCost, data.item_id, orgId]);
    }

    return await client.getOne('SELECT * FROM apex_inventory_purchases WHERE id = $1', [id]);
  });
}

async function getPurchases(orgId, { itemId, startDate, endDate, limit = 100, offset = 0 } = {}) {
  let sql = `SELECT p.*, i.name as item_name, i.unit_of_measure
    FROM apex_inventory_purchases p
    JOIN apex_consumable_items i ON i.id = p.item_id
    WHERE p.org_id = $1`;
  const params = [orgId];
  let paramIdx = 2;

  if (itemId) {
    sql += ` AND p.item_id = $${paramIdx++}`;
    params.push(itemId);
  }
  if (startDate) {
    sql += ` AND p.purchase_date >= $${paramIdx++}`;
    params.push(startDate);
  }
  if (endDate) {
    sql += ` AND p.purchase_date <= $${paramIdx++}`;
    params.push(endDate);
  }

  sql += ` ORDER BY p.purchase_date DESC, p.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
  params.push(limit, offset);

  return await db.getAll(sql, params);
}

async function deletePurchase(id, orgId) {
  return await db.transaction(async (client) => {
    const purchase = await client.getOne('SELECT * FROM apex_inventory_purchases WHERE id = $1 AND org_id = $2', [id, orgId]);
    if (!purchase) return false;

    // Decrement inventory level
    await client.run(`
      UPDATE apex_inventory_levels SET quantity_on_hand = quantity_on_hand - $1, last_updated = NOW()
      WHERE org_id = $2 AND item_id = $3
    `, [purchase.quantity, orgId, purchase.item_id]);

    await client.run('DELETE FROM apex_inventory_purchases WHERE id = $1', [id]);
    return true;
  });
}

// ============================================
// INVENTORY LEVELS
// ============================================

async function getLevels(orgId) {
  return await db.getAll(`
    SELECT l.*, i.name, i.description, i.category, i.unit_of_measure, i.unit_cost, i.is_active
    FROM apex_inventory_levels l
    JOIN apex_consumable_items i ON i.id = l.item_id
    WHERE l.org_id = $1
    ORDER BY i.name ASC
  `, [orgId]);
}

async function getLevelByItem(orgId, itemId) {
  return await db.getOne(`
    SELECT l.*, i.name, i.description, i.category, i.unit_of_measure, i.unit_cost
    FROM apex_inventory_levels l
    JOIN apex_consumable_items i ON i.id = l.item_id
    WHERE l.org_id = $1 AND l.item_id = $2
  `, [orgId, itemId]);
}

async function adjustLevel(orgId, itemId, adjustment, reason) {
  // Upsert
  await db.run(`
    INSERT INTO apex_inventory_levels (id, org_id, item_id, quantity_on_hand, last_updated)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT(org_id, item_id) DO UPDATE SET
      quantity_on_hand = apex_inventory_levels.quantity_on_hand + $5,
      last_updated = NOW()
  `, [uuidv4(), orgId, itemId, adjustment, adjustment]);

  return getLevelByItem(orgId, itemId);
}

// ============================================
// JOB MATERIAL ALLOCATIONS
// ============================================

async function allocateMaterial(jobId, data) {
  return await db.transaction(async (client) => {
    const id = uuidv4();
    const item = await client.getOne('SELECT * FROM apex_consumable_items WHERE id = $1', [data.item_id]);
    const unitCost = data.unit_cost_at_use != null ? data.unit_cost_at_use : (item ? item.unit_cost : 0);
    const qtyUsed = data.quantity_used || 0;
    const totalCost = qtyUsed * unitCost;

    await client.run(`
      INSERT INTO apex_job_material_allocations (id, job_id, phase_id, item_id, quantity_used, unit_cost_at_use, total_cost, used_date, used_by, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [id, jobId, data.phase_id || null, data.item_id, qtyUsed, unitCost, totalCost, data.used_date || new Date().toISOString().slice(0, 10), data.used_by || null, data.notes || '']);

    // Decrement inventory — get org_id from the item
    if (item) {
      await client.run(`
        UPDATE apex_inventory_levels SET quantity_on_hand = quantity_on_hand - $1, last_updated = NOW()
        WHERE org_id = $2 AND item_id = $3
      `, [qtyUsed, item.org_id, data.item_id]);
    }

    return await client.getOne(`
      SELECT a.*, i.name as item_name, i.unit_of_measure
      FROM apex_job_material_allocations a
      JOIN apex_consumable_items i ON i.id = a.item_id
      WHERE a.id = $1
    `, [id]);
  });
}

async function deallocateMaterial(id) {
  return await db.transaction(async (client) => {
    const alloc = await client.getOne(`
      SELECT a.*, i.org_id FROM apex_job_material_allocations a
      JOIN apex_consumable_items i ON i.id = a.item_id
      WHERE a.id = $1
    `, [id]);
    if (!alloc) return false;

    // Return stock
    await client.run(`
      UPDATE apex_inventory_levels SET quantity_on_hand = quantity_on_hand + $1, last_updated = NOW()
      WHERE org_id = $2 AND item_id = $3
    `, [alloc.quantity_used, alloc.org_id, alloc.item_id]);

    await client.run('DELETE FROM apex_job_material_allocations WHERE id = $1', [id]);
    return true;
  });
}

async function getJobAllocations(jobId, { phaseId } = {}) {
  let sql = `
    SELECT a.*, i.name as item_name, i.unit_of_measure, i.category as item_category
    FROM apex_job_material_allocations a
    JOIN apex_consumable_items i ON i.id = a.item_id
    WHERE a.job_id = $1`;
  const params = [jobId];

  if (phaseId) {
    sql += ' AND a.phase_id = $2';
    params.push(phaseId);
  }

  sql += ' ORDER BY a.used_date DESC, a.created_at DESC';
  return await db.getAll(sql, params);
}

async function getItemAllocations(itemId, orgId) {
  return await db.getAll(`
    SELECT a.*, j.name as job_name
    FROM apex_job_material_allocations a
    JOIN apex_jobs j ON j.id = a.job_id
    JOIN apex_consumable_items i ON i.id = a.item_id
    WHERE a.item_id = $1 AND i.org_id = $2
    ORDER BY a.used_date DESC
  `, [itemId, orgId]);
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
