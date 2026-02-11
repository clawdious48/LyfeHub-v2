const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const basesDb = require('../db/bases');
const coreBasesDb = require('../db/coreBases');

// All routes require authentication
router.use(authMiddleware);

// Middleware to ensure user context
router.use((req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(403).json({ error: 'User authentication required for bases' });
  }
  next();
});

// ============================================
// BASES CRUD
// ============================================

// GET /api/bases - List all bases for user (with counts and column info)
router.get('/', (req, res) => {
  try {
    const bases = basesDb.getAllBases(req.user.id);
    
    // Enrich with record count and column info
    const enrichedBases = bases.map(base => {
      const records = basesDb.getRecordsByBase(base.id);
      const properties = basesDb.getPropertiesByBase(base.id);
      
      return {
        ...base,
        record_count: records.length,
        column_count: properties.length,
        columns: properties.slice(0, 6).map(p => ({
          name: p.name,
          type: p.type
        }))
      };
    });
    
    res.json(enrichedBases);
  } catch (error) {
    console.error('Error fetching bases:', error);
    res.status(500).json({ error: 'Failed to fetch bases' });
  }
});

// GET /api/bases/:id - Get single base with properties and records
// Query params: ?expandRelations=true to include resolved relation data

// ============================================
// CORE BASES ROUTES (must be before /:id routes!)
// ============================================

// GET /api/bases/core/list - List all core bases
router.get('/core/list', (req, res) => {
  try {
    const coreBases = coreBasesDb.getAllCoreBases(req.user.id);
    res.json(coreBases);
  } catch (error) {
    console.error('Error fetching core bases:', error);
    res.status(500).json({ error: 'Failed to fetch core bases' });
  }
});

// GET /api/bases/core/:id - Get single core base with records
router.get('/core/:id', (req, res) => {
  try {
    const baseId = req.params.id;
    const coreDef = coreBasesDb.getCoreBase(baseId);
    
    if (!coreDef) {
      return res.status(404).json({ error: 'Core base not found' });
    }
    
    const records = coreBasesDb.getCoreBaseRecords(baseId, req.user.id);
    
    res.json({
      ...coreDef,
      user_id: req.user.id,
      records: records
    });
  } catch (error) {
    console.error('Error fetching core base:', error);
    res.status(500).json({ error: 'Failed to fetch core base' });
  }
});

// POST /api/bases/core/:id/records - Create record in core base
router.post('/core/:id/records', (req, res) => {
  try {
    const baseId = req.params.id;
    const coreDef = coreBasesDb.getCoreBase(baseId);
    
    if (!coreDef) {
      return res.status(404).json({ error: 'Core base not found' });
    }
    
    const { values = {} } = req.body;
    const record = coreBasesDb.createCoreBaseRecord(baseId, values, req.user.id);
    
    if (!record) {
      return res.status(500).json({ error: 'Failed to create record' });
    }
    
    res.status(201).json(record);
  } catch (error) {
    console.error('Error creating core base record:', error);
    res.status(500).json({ error: 'Failed to create record' });
  }
});

// PUT /api/bases/core/:id/records/:recordId - Update record in core base
router.put('/core/:id/records/:recordId', (req, res) => {
  try {
    const baseId = req.params.id;
    const recordId = req.params.recordId;
    const coreDef = coreBasesDb.getCoreBase(baseId);
    
    if (!coreDef) {
      return res.status(404).json({ error: 'Core base not found' });
    }
    
    const { values = {} } = req.body;
    const record = coreBasesDb.updateCoreBaseRecord(baseId, recordId, values, req.user.id);
    
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    res.json(record);
  } catch (error) {
    console.error('Error updating core base record:', error);
    res.status(500).json({ error: 'Failed to update record' });
  }
});

// DELETE /api/bases/core/:id/records/:recordId - Delete record from core base
router.delete('/core/:id/records/:recordId', (req, res) => {
  try {
    const baseId = req.params.id;
    const recordId = req.params.recordId;
    const coreDef = coreBasesDb.getCoreBase(baseId);

    if (!coreDef) {
      return res.status(404).json({ error: 'Core base not found' });
    }

    const success = coreBasesDb.deleteCoreBaseRecord(baseId, recordId, req.user.id);

    if (!success) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting core base record:', error);
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

// GET /api/bases/core/:id/readme - Get README/help content for core base
router.get('/core/:id/readme', (req, res) => {
  try {
    const baseId = req.params.id;
    const readme = coreBasesDb.getCoreBaseReadme(baseId);

    if (!readme) {
      return res.status(404).json({ error: 'README not found for this core base' });
    }

    res.json({ readme });
  } catch (error) {
    console.error('Error fetching core base readme:', error);
    res.status(500).json({ error: 'Failed to fetch readme' });
  }
});

// ============================================
// CORE BASE VIEWS (user-specific saved views for core bases)
// ============================================

// GET /api/bases/core/:id/views - List all views for a core base (user-specific)
router.get('/core/:id/views', (req, res) => {
  try {
    const baseId = req.params.id;
    const coreDef = coreBasesDb.getCoreBase(baseId);
    
    if (!coreDef) {
      return res.status(404).json({ error: 'Core base not found' });
    }
    
    // Use same view storage as regular bases, just with core base ID
    const views = basesDb.getViewsByBase(baseId, req.user.id);
    const parsedViews = views.map(v => ({
      ...v,
      config: JSON.parse(v.config || '{}')
    }));
    
    res.json(parsedViews);
  } catch (error) {
    console.error('Error fetching core base views:', error);
    res.status(500).json({ error: 'Failed to fetch views' });
  }
});

// POST /api/bases/core/:id/views - Create new view for a core base
router.post('/core/:id/views', (req, res) => {
  try {
    const baseId = req.params.id;
    const coreDef = coreBasesDb.getCoreBase(baseId);
    
    if (!coreDef) {
      return res.status(404).json({ error: 'Core base not found' });
    }
    
    const { name, config = {} } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    // Get max position
    const views = basesDb.getViewsByBase(baseId, req.user.id);
    const maxPosition = views.reduce((max, v) => Math.max(max, v.position), -1);
    
    const viewId = uuidv4();
    basesDb.insertView(viewId, baseId, req.user.id, name.trim(), config, maxPosition + 1);
    
    const view = basesDb.getViewById(viewId);
    res.status(201).json({
      ...view,
      config: JSON.parse(view.config || '{}')
    });
  } catch (error) {
    console.error('Error creating core base view:', error);
    res.status(500).json({ error: 'Failed to create view' });
  }
});

// PUT /api/bases/core/:id/views/:viewId - Update view for a core base
router.put('/core/:id/views/:viewId', (req, res) => {
  try {
    const baseId = req.params.id;
    const coreDef = coreBasesDb.getCoreBase(baseId);
    
    if (!coreDef) {
      return res.status(404).json({ error: 'Core base not found' });
    }
    
    const existing = basesDb.getViewById(req.params.viewId);
    if (!existing || existing.base_id !== baseId || existing.user_id !== req.user.id) {
      return res.status(404).json({ error: 'View not found' });
    }
    
    const { name, config, position } = req.body;
    const existingConfig = JSON.parse(existing.config || '{}');
    
    basesDb.updateView(
      req.params.viewId,
      name ?? existing.name,
      config ?? existingConfig,
      position ?? existing.position
    );
    
    const view = basesDb.getViewById(req.params.viewId);
    res.json({
      ...view,
      config: JSON.parse(view.config || '{}')
    });
  } catch (error) {
    console.error('Error updating core base view:', error);
    res.status(500).json({ error: 'Failed to update view' });
  }
});

// DELETE /api/bases/core/:id/views/:viewId - Delete view for a core base
router.delete('/core/:id/views/:viewId', (req, res) => {
  try {
    const baseId = req.params.id;
    const coreDef = coreBasesDb.getCoreBase(baseId);
    
    if (!coreDef) {
      return res.status(404).json({ error: 'Core base not found' });
    }
    
    const existing = basesDb.getViewById(req.params.viewId);
    if (!existing || existing.base_id !== baseId || existing.user_id !== req.user.id) {
      return res.status(404).json({ error: 'View not found' });
    }
    
    basesDb.deleteView(req.params.viewId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting core base view:', error);
    res.status(500).json({ error: 'Failed to delete view' });
  }
});

// ============================================
// USER BASES ROUTES
// ============================================
router.get('/:id', (req, res) => {
  try {
    const base = basesDb.getBaseById(req.params.id, req.user.id);
    if (!base) {
      return res.status(404).json({ error: 'Base not found' });
    }
    
    const properties = basesDb.getPropertiesByBase(base.id);
    const records = basesDb.getRecordsByBase(base.id);
    const expandRelations = req.query.expandRelations === 'true';
    
    // Parse JSON fields
    const parsedProperties = properties.map(p => ({
      ...p,
      options: JSON.parse(p.options || '[]')
    }));
    
    // Map 'data' field to 'values' for API consistency, include global_id
    const parsedRecords = records.map(r => {
      const record = {
        id: r.id,
        base_id: r.base_id,
        global_id: r.global_id,
        position: r.position,
        created_at: r.created_at,
        updated_at: r.updated_at,
        values: JSON.parse(r.data || '{}')
      };
      
      // Optionally expand relations
      if (expandRelations) {
        record._expandedRelations = basesDb.expandRelations(record, parsedProperties);
      }
      
      return record;
    });
    
    res.json({
      ...base,
      properties: parsedProperties,
      records: parsedRecords
    });
  } catch (error) {
    console.error('Error fetching base:', error);
    res.status(500).json({ error: 'Failed to fetch base' });
  }
});

// POST /api/bases - Create new base
router.post('/', (req, res) => {
  try {
    const { name, description = '', icon = '📊' } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const id = uuidv4();
    basesDb.insertBase(id, name.trim(), description, icon, req.user.id);
    
    // Create a default "Name" property for every new base
    const propId = uuidv4();
    basesDb.insertProperty(propId, id, 'Name', 'text', [], 0);
    
    const base = basesDb.getBaseById(id, req.user.id);
    const properties = basesDb.getPropertiesByBase(id);
    
    res.status(201).json({
      ...base,
      properties: properties.map(p => ({ ...p, options: JSON.parse(p.options || '[]') })),
      records: []
    });
  } catch (error) {
    console.error('Error creating base:', error);
    res.status(500).json({ error: 'Failed to create base' });
  }
});

// PUT /api/bases/:id - Update base
router.put('/:id', (req, res) => {
  try {
    const { name, description, icon } = req.body;
    const existing = basesDb.getBaseById(req.params.id, req.user.id);
    
    if (!existing) {
      return res.status(404).json({ error: 'Base not found' });
    }
    
    basesDb.updateBase(
      req.params.id,
      name ?? existing.name,
      description ?? existing.description,
      icon ?? existing.icon,
      req.user.id
    );
    
    const base = basesDb.getBaseById(req.params.id, req.user.id);
    res.json(base);
  } catch (error) {
    console.error('Error updating base:', error);
    res.status(500).json({ error: 'Failed to update base' });
  }
});

// DELETE /api/bases/:id - Delete base (cascades to properties and records)
// Also cleans up orphaned relation properties in other bases
router.delete('/:id', (req, res) => {
  try {
    const existing = basesDb.getBaseById(req.params.id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Base not found' });
    }

    basesDb.deleteBaseWithCleanup(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting base:', error);
    res.status(500).json({ error: 'Failed to delete base' });
  }
});

// ============================================
// PROPERTIES CRUD
// ============================================

// POST /api/bases/:id/properties - Add property
router.post('/:id/properties', (req, res) => {
  try {
    const base = basesDb.getBaseById(req.params.id, req.user.id);
    if (!base) {
      return res.status(404).json({ error: 'Base not found' });
    }
    
    const { name, type = 'text', options = [], createReverse = false, reverseName = '' } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const validTypes = ['text', 'number', 'select', 'multi_select', 'date', 'checkbox', 'url', 'relation'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid property type' });
    }
    
    // Get max position
    const properties = basesDb.getPropertiesByBase(req.params.id);
    const maxPosition = properties.reduce((max, p) => Math.max(max, p.position), -1);
    
    const propId = uuidv4();
    basesDb.insertProperty(propId, req.params.id, name.trim(), type, options, maxPosition + 1);
    
    let reverseProperty = null;
    
    // Handle two-way relation creation
    if (type === 'relation' && createReverse && options.relatedBaseId) {
      const targetBaseId = options.relatedBaseId;
      
      // Verify target base exists and user has access
      const targetBase = basesDb.getBaseById(targetBaseId, req.user.id);
      if (!targetBase) {
        // Rollback the source property
        basesDb.deleteProperty(propId);
        return res.status(400).json({ error: 'Target base not found or access denied' });
      }
      
      // Generate reverse name if not provided
      const actualReverseName = reverseName.trim() || `Related ${base.name}`;
      
      // Create the reverse property and link them
      reverseProperty = basesDb.createReverseRelationProperty(
        propId,
        req.params.id,  // source base
        targetBaseId,   // target base
        actualReverseName,
        true  // reverse always allows multiple
      );
    }
    
    const property = basesDb.getPropertyById(propId);
    const response = {
      ...property,
      options: JSON.parse(property.options || '[]')
    };
    
    // Include reverse property info if created
    if (reverseProperty) {
      response.reverseProperty = {
        ...reverseProperty,
        options: JSON.parse(reverseProperty.options || '{}')
      };
    }
    
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ error: 'Failed to create property' });
  }
});

// PUT /api/bases/:id/properties/:propId - Update property
router.put('/:id/properties/:propId', (req, res) => {
  try {
    const base = basesDb.getBaseById(req.params.id, req.user.id);
    if (!base) {
      return res.status(404).json({ error: 'Base not found' });
    }
    
    const existing = basesDb.getPropertyById(req.params.propId);
    if (!existing || existing.base_id !== req.params.id) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    const { name, type, options, position, width } = req.body;
    
    basesDb.updateProperty(
      req.params.propId,
      name ?? existing.name,
      type ?? existing.type,
      options ?? JSON.parse(existing.options || '[]'),
      position ?? existing.position,
      width ?? existing.width
    );
    
    const property = basesDb.getPropertyById(req.params.propId);
    res.json({
      ...property,
      options: JSON.parse(property.options || '[]')
    });
  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({ error: 'Failed to update property' });
  }
});

// DELETE /api/bases/:id/properties/:propId - Delete property
router.delete('/:id/properties/:propId', (req, res) => {
  try {
    const base = basesDb.getBaseById(req.params.id, req.user.id);
    if (!base) {
      return res.status(404).json({ error: 'Base not found' });
    }
    
    const existing = basesDb.getPropertyById(req.params.propId);
    if (!existing || existing.base_id !== req.params.id) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    // Unlink reverse property if this is a paired relation
    if (existing.type === 'relation') {
      basesDb.unlinkReverseProperty(req.params.propId);
    }
    
    basesDb.deleteProperty(req.params.propId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({ error: 'Failed to delete property' });
  }
});

// POST /api/bases/:id/properties/reorder - Reorder properties
router.post('/:id/properties/reorder', (req, res) => {
  try {
    const base = basesDb.getBaseById(req.params.id, req.user.id);
    if (!base) {
      return res.status(404).json({ error: 'Base not found' });
    }
    
    const { order } = req.body; // Array of { id, position }
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'Order must be an array' });
    }
    
    basesDb.reorderProperties(order);
    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering properties:', error);
    res.status(500).json({ error: 'Failed to reorder properties' });
  }
});

// ============================================
// RECORDS CRUD
// ============================================

// POST /api/bases/:id/records - Add record
router.post('/:id/records', (req, res) => {
  try {
    const base = basesDb.getBaseById(req.params.id, req.user.id);
    if (!base) {
      return res.status(404).json({ error: 'Base not found' });
    }
    
    const { values = {} } = req.body;
    
    // Validate relation values and parse properties
    const properties = basesDb.getPropertiesByBase(req.params.id);
    const parsedProperties = properties.map(p => ({
      ...p,
      options: JSON.parse(p.options || '{}')
    }));
    
    for (const prop of parsedProperties) {
      if (prop.type !== 'relation') continue;
      const propValue = values[prop.id];
      if (!propValue) continue;
      
      const validation = basesDb.validateRelationValues(prop.options, propValue);
      if (!validation.valid) {
        return res.status(400).json({ 
          error: validation.error || `Invalid relation values for property "${prop.name}"`,
          invalidIds: validation.invalidIds
        });
      }
    }
    
    // Get max position
    const records = basesDb.getRecordsByBase(req.params.id);
    const maxPosition = records.reduce((max, r) => Math.max(max, r.position), -1);
    
    const recordId = uuidv4();
    basesDb.insertRecord(recordId, req.params.id, values, maxPosition + 1);
    
    // Sync reverse relations for any relation values in the new record
    for (const prop of parsedProperties) {
      if (prop.type !== 'relation') continue;
      if (!prop.options.reversePropertyId) continue;
      
      const propValue = values[prop.id];
      if (!propValue) continue;
      
      // Sync: oldValues is empty, newValues is what was set
      basesDb.syncReverseRelation(recordId, prop.id, [], propValue);
    }
    
    const record = basesDb.getRecordById(recordId);
    res.status(201).json({
      id: record.id,
      base_id: record.base_id,
      global_id: record.global_id,
      position: record.position,
      created_at: record.created_at,
      updated_at: record.updated_at,
      values: JSON.parse(record.data || '{}')
    });
  } catch (error) {
    console.error('Error creating record:', error);
    res.status(500).json({ error: 'Failed to create record' });
  }
});

// PUT /api/bases/:id/records/:recordId - Update record
router.put('/:id/records/:recordId', (req, res) => {
  try {
    const base = basesDb.getBaseById(req.params.id, req.user.id);
    if (!base) {
      return res.status(404).json({ error: 'Base not found' });
    }
    
    const existing = basesDb.getRecordById(req.params.recordId);
    if (!existing || existing.base_id !== req.params.id) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    const { values } = req.body;
    
    if (values !== undefined) {
      // Validate relation values
      const properties = basesDb.getPropertiesByBase(req.params.id);
      // Parse property options for all properties
      const parsedProperties = properties.map(p => ({
        ...p,
        options: JSON.parse(p.options || '{}')
      }));
      
      for (const prop of parsedProperties) {
        if (prop.type !== 'relation') continue;
        const propValue = values[prop.id];
        if (propValue === undefined) continue; // Not updating this field
        
        if (propValue !== null) {
          const validation = basesDb.validateRelationValues(prop.options, propValue);
          if (!validation.valid) {
            return res.status(400).json({ 
              error: validation.error || `Invalid relation values for property "${prop.name}"`,
              invalidIds: validation.invalidIds
            });
          }
        }
      }
      
      // Get old values for sync comparison
      const oldValues = JSON.parse(existing.data || '{}');
      
      // Update record with reverse relation sync
      basesDb.updateRecordWithSync(req.params.recordId, values, oldValues, parsedProperties);
    }
    
    const record = basesDb.getRecordById(req.params.recordId);
    res.json({
      id: record.id,
      base_id: record.base_id,
      global_id: record.global_id,
      position: record.position,
      created_at: record.created_at,
      updated_at: record.updated_at,
      values: JSON.parse(record.data || '{}')
    });
  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({ error: 'Failed to update record' });
  }
});

// DELETE /api/bases/:id/records/:recordId - Delete record
router.delete('/:id/records/:recordId', (req, res) => {
  try {
    const base = basesDb.getBaseById(req.params.id, req.user.id);
    if (!base) {
      return res.status(404).json({ error: 'Base not found' });
    }
    
    const existing = basesDb.getRecordById(req.params.recordId);
    if (!existing || existing.base_id !== req.params.id) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    // Clean up reverse relations for this record
    // For each relation property with a reversePropertyId, remove this record from targets
    const properties = basesDb.getPropertiesByBase(req.params.id);
    const existingData = JSON.parse(existing.data || '{}');
    
    for (const prop of properties) {
      if (prop.type !== 'relation') continue;
      const options = JSON.parse(prop.options || '{}');
      if (!options.reversePropertyId) continue;
      
      const linkedIds = existingData[prop.id];
      if (!linkedIds) continue;
      
      // Sync with empty new values = remove from all linked records
      basesDb.syncReverseRelation(req.params.recordId, prop.id, linkedIds, []);
    }
    
    // Clean up any relation references to this record in other bases
    basesDb.cleanupRelationReferences(req.params.recordId, req.params.id);
    
    basesDb.deleteRecord(req.params.recordId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

// ============================================
// RELATION PICKER
// ============================================

// GET /api/bases/:id/relation-options - Get records from a base for relation picker
// This is a lightweight endpoint that returns just id, displayValue, and global_id
router.get('/:id/relation-options', (req, res) => {
  try {
    // Note: We check if the target base exists, but don't require ownership
    // This allows linking to shared bases in the future
    const baseExists = basesDb.getBaseById(req.params.id, req.user.id);
    if (!baseExists) {
      // For now, only allow linking to own bases
      return res.status(404).json({ error: 'Base not found' });
    }
    
    const options = basesDb.getRelationPickerOptions(req.params.id);
    res.json(options);
  } catch (error) {
    console.error('Error fetching relation options:', error);
    res.status(500).json({ error: 'Failed to fetch relation options' });
  }
});

// ============================================
// VIEWS CRUD (Saved filters, column visibility, column order)
// ============================================

// GET /api/bases/:id/views - List all views for a base
router.get('/:id/views', (req, res) => {
  try {
    const base = basesDb.getBaseById(req.params.id, req.user.id);
    if (!base) {
      return res.status(404).json({ error: 'Base not found' });
    }
    
    const views = basesDb.getViewsByBase(req.params.id, req.user.id);
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

// POST /api/bases/:id/views - Create new view
router.post('/:id/views', (req, res) => {
  try {
    const base = basesDb.getBaseById(req.params.id, req.user.id);
    if (!base) {
      return res.status(404).json({ error: 'Base not found' });
    }
    
    const { name, config = {} } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    // Get max position
    const views = basesDb.getViewsByBase(req.params.id, req.user.id);
    const maxPosition = views.reduce((max, v) => Math.max(max, v.position), -1);
    
    const viewId = uuidv4();
    basesDb.insertView(viewId, req.params.id, req.user.id, name.trim(), config, maxPosition + 1);
    
    const view = basesDb.getViewById(viewId);
    res.status(201).json({
      ...view,
      config: JSON.parse(view.config || '{}')
    });
  } catch (error) {
    console.error('Error creating view:', error);
    res.status(500).json({ error: 'Failed to create view' });
  }
});

// PUT /api/bases/:id/views/:viewId - Update view
router.put('/:id/views/:viewId', (req, res) => {
  try {
    const base = basesDb.getBaseById(req.params.id, req.user.id);
    if (!base) {
      return res.status(404).json({ error: 'Base not found' });
    }
    
    const existing = basesDb.getViewById(req.params.viewId);
    if (!existing || existing.base_id !== req.params.id || existing.user_id !== req.user.id) {
      return res.status(404).json({ error: 'View not found' });
    }
    
    const { name, config, position } = req.body;
    const existingConfig = JSON.parse(existing.config || '{}');
    
    basesDb.updateView(
      req.params.viewId,
      name ?? existing.name,
      config ?? existingConfig,
      position ?? existing.position
    );
    
    const view = basesDb.getViewById(req.params.viewId);
    res.json({
      ...view,
      config: JSON.parse(view.config || '{}')
    });
  } catch (error) {
    console.error('Error updating view:', error);
    res.status(500).json({ error: 'Failed to update view' });
  }
});

// DELETE /api/bases/:id/views/:viewId - Delete view
router.delete('/:id/views/:viewId', (req, res) => {
  try {
    const base = basesDb.getBaseById(req.params.id, req.user.id);
    if (!base) {
      return res.status(404).json({ error: 'Base not found' });
    }
    
    const existing = basesDb.getViewById(req.params.viewId);
    if (!existing || existing.base_id !== req.params.id || existing.user_id !== req.user.id) {
      return res.status(404).json({ error: 'View not found' });
    }
    
    basesDb.deleteView(req.params.viewId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting view:', error);
    res.status(500).json({ error: 'Failed to delete view' });
  }
});

// ============================================
// GROUPS CRUD
// ============================================

// GET /api/bases/groups - List all groups for user
router.get('/groups/list', (req, res) => {
  try {
    const groups = basesDb.getAllGroups(req.user.id);
    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// POST /api/bases/groups - Create new group
router.post('/groups', (req, res) => {
  try {
    const { name, icon = '📁' } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    // Get max position
    const groups = basesDb.getAllGroups(req.user.id);
    const maxPosition = groups.reduce((max, g) => Math.max(max, g.position), -1);
    
    const id = uuidv4();
    basesDb.insertGroup(id, name.trim(), icon, req.user.id, maxPosition + 1);
    
    const group = basesDb.getGroupById(id, req.user.id);
    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// PUT /api/bases/groups/:groupId - Update group
router.put('/groups/:groupId', (req, res) => {
  try {
    const existing = basesDb.getGroupById(req.params.groupId, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    const { name, icon, position, collapsed } = req.body;
    
    basesDb.updateGroup(
      req.params.groupId,
      name ?? existing.name,
      icon ?? existing.icon,
      position ?? existing.position,
      collapsed ?? existing.collapsed,
      req.user.id
    );
    
    const group = basesDb.getGroupById(req.params.groupId, req.user.id);
    res.json(group);
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
});

// PUT /api/bases/groups/:groupId/toggle - Toggle group collapsed state
router.put('/groups/:groupId/toggle', (req, res) => {
  try {
    const existing = basesDb.getGroupById(req.params.groupId, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    const newCollapsed = !existing.collapsed;
    basesDb.updateGroupCollapsed(req.params.groupId, newCollapsed, req.user.id);
    
    const group = basesDb.getGroupById(req.params.groupId, req.user.id);
    res.json(group);
  } catch (error) {
    console.error('Error toggling group:', error);
    res.status(500).json({ error: 'Failed to toggle group' });
  }
});

// POST /api/bases/groups/collapse-all - Collapse all groups
router.post('/groups/collapse-all', (req, res) => {
  try {
    basesDb.collapseAllGroups(req.user.id);
    const groups = basesDb.getAllGroups(req.user.id);
    res.json(groups);
  } catch (error) {
    console.error('Error collapsing groups:', error);
    res.status(500).json({ error: 'Failed to collapse groups' });
  }
});

// POST /api/bases/groups/expand-all - Expand all groups
router.post('/groups/expand-all', (req, res) => {
  try {
    basesDb.expandAllGroups(req.user.id);
    const groups = basesDb.getAllGroups(req.user.id);
    res.json(groups);
  } catch (error) {
    console.error('Error expanding groups:', error);
    res.status(500).json({ error: 'Failed to expand groups' });
  }
});

// POST /api/bases/groups/reorder - Reorder groups
router.post('/groups/reorder', (req, res) => {
  try {
    const { order } = req.body; // Array of { id, position }
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'Order must be an array' });
    }
    
    // Validate all groups belong to user
    for (const item of order) {
      const group = basesDb.getGroupById(item.id, req.user.id);
      if (!group) {
        return res.status(404).json({ error: `Group ${item.id} not found` });
      }
    }
    
    basesDb.reorderGroups(order, req.user.id);
    const groups = basesDb.getAllGroups(req.user.id);
    res.json(groups);
  } catch (error) {
    console.error('Error reordering groups:', error);
    res.status(500).json({ error: 'Failed to reorder groups' });
  }
});

// DELETE /api/bases/groups/:groupId - Delete group (bases become ungrouped)
router.delete('/groups/:groupId', (req, res) => {
  try {
    const existing = basesDb.getGroupById(req.params.groupId, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // First, ungroup all bases in this group
    const bases = basesDb.getAllBases(req.user.id);
    for (const base of bases) {
      if (base.group_id === req.params.groupId) {
        basesDb.updateBaseGroup(base.id, null, 0, req.user.id);
      }
    }
    
    basesDb.deleteGroup(req.params.groupId, req.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// PUT /api/bases/:id/group - Assign base to group
router.put('/:id/group', (req, res) => {
  try {
    const base = basesDb.getBaseById(req.params.id, req.user.id);
    if (!base) {
      return res.status(404).json({ error: 'Base not found' });
    }
    
    const { group_id, position = 0 } = req.body;
    
    // Validate group exists if provided
    if (group_id) {
      const group = basesDb.getGroupById(group_id, req.user.id);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }
    }
    
    basesDb.updateBaseGroup(req.params.id, group_id || null, position, req.user.id);
    
    const updatedBase = basesDb.getBaseById(req.params.id, req.user.id);
    res.json(updatedBase);
  } catch (error) {
    console.error('Error updating base group:', error);
    res.status(500).json({ error: 'Failed to update base group' });
  }
});

// ============================================

module.exports = router;
