const express = require('express');
const router = express.Router({ mergeParams: true });
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const basesDb = require('../db/bases');
const db = require('../db/schema');

// All routes require authentication
router.use(authMiddleware);

// ============================================
// VIEWS CRUD for /api/bases/:baseId/views
// ============================================

// GET /api/bases/:baseId/views - List views for a base (scoped to user)
router.get('/', async (req, res) => {
  try {
    const base = await basesDb.getBaseById(req.params.baseId, req.user.id);
    if (!base) {
      return res.status(404).json({ error: 'Base not found' });
    }

    const views = await basesDb.getViewsByBase(req.params.baseId, req.user.id);
    const parsedViews = views.map(v => ({
      ...v,
      config: JSON.parse(v.config || '{}')
    }));

    res.json(parsedViews);
  } catch (error) {
    console.error('Error fetching views:', error);
    res.status(500).json({ error: 'Failed to fetch views' });
  }
});

// POST /api/bases/:baseId/views - Create view
router.post('/', async (req, res) => {
  try {
    const base = await basesDb.getBaseById(req.params.baseId, req.user.id);
    if (!base) {
      return res.status(404).json({ error: 'Base not found' });
    }

    const { name = 'Untitled View', view_type = 'table', config = {} } = req.body;

    // Get max position
    const views = await basesDb.getViewsByBase(req.params.baseId, req.user.id);
    const maxPosition = views.reduce((max, v) => Math.max(max, v.position), -1);

    const viewId = uuidv4();
    await basesDb.insertView(viewId, req.params.baseId, req.user.id, name.trim(), config, maxPosition + 1, view_type);

    const view = await basesDb.getViewById(viewId);
    res.status(201).json({
      ...view,
      config: JSON.parse(view.config || '{}')
    });
  } catch (error) {
    console.error('Error creating view:', error);
    res.status(500).json({ error: 'Failed to create view' });
  }
});

// GET /api/bases/:baseId/views/:viewId - Get single view
router.get('/:viewId', async (req, res) => {
  try {
    const view = await basesDb.getViewById(req.params.viewId);
    if (!view || view.base_id !== req.params.baseId || view.user_id !== req.user.id) {
      return res.status(404).json({ error: 'View not found' });
    }

    res.json({
      ...view,
      config: JSON.parse(view.config || '{}')
    });
  } catch (error) {
    console.error('Error fetching view:', error);
    res.status(500).json({ error: 'Failed to fetch view' });
  }
});

// PUT /api/bases/:baseId/views/:viewId - Update view
router.put('/:viewId', async (req, res) => {
  try {
    const existing = await basesDb.getViewById(req.params.viewId);
    if (!existing || existing.base_id !== req.params.baseId || existing.user_id !== req.user.id) {
      return res.status(404).json({ error: 'View not found' });
    }

    const { name, config, is_default, sort_order, view_type, position } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (config !== undefined) updates.config = config;
    if (is_default !== undefined) updates.is_default = is_default ? 1 : 0;
    if (sort_order !== undefined) updates.sort_order = sort_order;
    if (view_type !== undefined) updates.view_type = view_type;
    if (position !== undefined) updates.position = position;

    if (Object.keys(updates).length > 0) {
      await basesDb.updateView(req.params.viewId, updates);
    }

    const view = await basesDb.getViewById(req.params.viewId);
    res.json({
      ...view,
      config: JSON.parse(view.config || '{}')
    });
  } catch (error) {
    console.error('Error updating view:', error);
    res.status(500).json({ error: 'Failed to update view' });
  }
});

// DELETE /api/bases/:baseId/views/:viewId - Delete view
router.delete('/:viewId', async (req, res) => {
  try {
    const existing = await basesDb.getViewById(req.params.viewId);
    if (!existing || existing.base_id !== req.params.baseId || existing.user_id !== req.user.id) {
      return res.status(404).json({ error: 'View not found' });
    }

    await basesDb.deleteView(req.params.viewId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting view:', error);
    res.status(500).json({ error: 'Failed to delete view' });
  }
});

// ============================================
// GET /api/bases/:baseId/views/:viewId/data
// Fetch records with view filters and sorts applied server-side
// ============================================
router.get('/:viewId/data', async (req, res) => {
  try {
    const base = await basesDb.getBaseById(req.params.baseId, req.user.id);
    if (!base) {
      return res.status(404).json({ error: 'Base not found' });
    }

    const view = await basesDb.getViewById(req.params.viewId);
    if (!view || view.base_id !== req.params.baseId || view.user_id !== req.user.id) {
      return res.status(404).json({ error: 'View not found' });
    }

    const config = JSON.parse(view.config || '{}');
    const properties = await basesDb.getPropertiesByBase(req.params.baseId);

    // Build property lookup by id
    const propMap = {};
    for (const p of properties) {
      propMap[p.id] = p;
    }

    // Start building the query
    const conditions = ['base_id = $1'];
    const params = [req.params.baseId];
    let paramIdx = 2;

    // Apply filters from config
    const filters = config.filters || [];
    for (const filter of filters) {
      if (!filter.field_id || !filter.operator) continue;
      const prop = propMap[filter.field_id];
      if (!prop) continue;

      // Records store data as JSON text in `data` column
      // Use JSON extraction: data::jsonb ->> 'field_id'
      const jsonPath = `data::jsonb ->> $${paramIdx++}`;
      params.push(filter.field_id);

      switch (filter.operator) {
        case 'eq':
          conditions.push(`${jsonPath} = $${paramIdx++}`);
          params.push(String(filter.value));
          break;
        case 'neq':
          conditions.push(`(${jsonPath} IS NULL OR ${jsonPath} != $${paramIdx++})`);
          params.push(String(filter.value));
          break;
        case 'contains':
          conditions.push(`${jsonPath} ILIKE $${paramIdx++}`);
          params.push(`%${filter.value}%`);
          break;
        case 'gt':
          conditions.push(`(${jsonPath})::numeric > $${paramIdx++}`);
          params.push(filter.value);
          break;
        case 'lt':
          conditions.push(`(${jsonPath})::numeric < $${paramIdx++}`);
          params.push(filter.value);
          break;
        case 'is_empty':
          conditions.push(`(${jsonPath} IS NULL OR ${jsonPath} = '')`);
          break;
        case 'is_not_empty':
          conditions.push(`(${jsonPath} IS NOT NULL AND ${jsonPath} != '')`);
          break;
        default:
          // Unknown operator, skip
          break;
      }
    }

    const whereClause = conditions.join(' AND ');

    // Apply sorts from config
    const sorts = config.sorts || [];
    const orderParts = [];
    for (const sort of sorts) {
      if (!sort.field_id || !propMap[sort.field_id]) continue;
      const dir = sort.direction === 'desc' ? 'DESC' : 'ASC';
      orderParts.push(`data::jsonb ->> $${paramIdx++} ${dir}`);
      params.push(sort.field_id);
    }

    // Default sort by position
    if (orderParts.length === 0) {
      orderParts.push('position ASC');
    }

    const orderClause = orderParts.join(', ');

    const sql = `SELECT * FROM base_records WHERE ${whereClause} ORDER BY ${orderClause}`;
    const records = await db.getAll(sql, params);

    // Parse records and apply visible_columns filtering
    const visibleColumns = config.visible_columns || null;
    const columnOrder = config.column_order || null;

    const parsedRecords = records.map(r => {
      const values = JSON.parse(r.data || '{}');

      // If visible_columns specified, filter values
      let filteredValues = values;
      if (visibleColumns && Array.isArray(visibleColumns) && visibleColumns.length > 0) {
        filteredValues = {};
        for (const colId of visibleColumns) {
          if (colId in values) {
            filteredValues[colId] = values[colId];
          }
        }
      }

      return {
        id: r.id,
        base_id: r.base_id,
        global_id: r.global_id,
        position: r.position,
        created_at: r.created_at,
        updated_at: r.updated_at,
        values: filteredValues
      };
    });

    // Return properties in column_order if specified
    let orderedProperties = properties.map(p => ({
      ...p,
      options: JSON.parse(p.options || '[]')
    }));

    if (columnOrder && Array.isArray(columnOrder) && columnOrder.length > 0) {
      const orderMap = {};
      columnOrder.forEach((id, idx) => { orderMap[id] = idx; });
      orderedProperties.sort((a, b) => {
        const aIdx = orderMap[a.id] ?? 9999;
        const bIdx = orderMap[b.id] ?? 9999;
        return aIdx - bIdx;
      });
    }

    if (visibleColumns && Array.isArray(visibleColumns) && visibleColumns.length > 0) {
      const visSet = new Set(visibleColumns);
      orderedProperties = orderedProperties.filter(p => visSet.has(p.id));
    }

    res.json({
      view: {
        ...view,
        config
      },
      properties: orderedProperties,
      records: parsedRecords,
      total: parsedRecords.length
    });
  } catch (error) {
    console.error('Error fetching view data:', error);
    res.status(500).json({ error: 'Failed to fetch view data' });
  }
});

module.exports = router;
