const db = require('./schema');

// ============================================
// BASES TABLE (Notion/Airtable-style databases)
// ============================================
const basesTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bases'").get();
if (!basesTable) {
  console.log('Creating bases table...');
  db.exec(`
    CREATE TABLE bases (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      icon TEXT DEFAULT '📊',
      user_id TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_bases_user_id ON bases(user_id)`);
  console.log('Bases table created');
}

// ============================================
// PROPERTIES TABLE (Columns in a base)
// ============================================
const propertiesTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='base_properties'").get();
if (!propertiesTable) {
  console.log('Creating base_properties table...');
  db.exec(`
    CREATE TABLE base_properties (
      id TEXT PRIMARY KEY,
      base_id TEXT REFERENCES bases(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('text', 'number', 'select', 'multi_select', 'date', 'checkbox', 'url', 'relation')),
      options TEXT DEFAULT '[]',
      position INTEGER DEFAULT 0,
      width INTEGER DEFAULT 200,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_properties_base_id ON base_properties(base_id)`);
  console.log('Base properties table created');
}

// ============================================
// RECORDS TABLE (Rows in a base)
// ============================================
const recordsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='base_records'").get();
if (!recordsTable) {
  console.log('Creating base_records table...');
  db.exec(`
    CREATE TABLE base_records (
      id TEXT PRIMARY KEY,
      base_id TEXT REFERENCES bases(id) ON DELETE CASCADE,
      global_id INTEGER,
      data TEXT DEFAULT '{}',
      position INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_records_base_id ON base_records(base_id)`);
  db.exec(`CREATE UNIQUE INDEX idx_records_global_id ON base_records(global_id)`);
  console.log('Base records table created');
}

// ============================================
// MIGRATION: Add global_id column to base_records
// ============================================
// Check if global_id column exists
const columnsInfo = db.prepare("PRAGMA table_info(base_records)").all();
const hasGlobalId = columnsInfo.some(col => col.name === 'global_id');

if (!hasGlobalId) {
  console.log('Adding global_id column to base_records...');
  // SQLite doesn't support adding UNIQUE columns directly, so we add without constraint first
  db.exec(`ALTER TABLE base_records ADD COLUMN global_id INTEGER`);
  console.log('Added global_id column');
}

// Assign global_ids to existing records that don't have one
const recordsWithoutGlobalId = db.prepare(`SELECT id FROM base_records WHERE global_id IS NULL ORDER BY created_at ASC`).all();
if (recordsWithoutGlobalId.length > 0) {
  // Get the max existing global_id (or start at 0)
  const maxResult = db.prepare(`SELECT MAX(global_id) as max_id FROM base_records`).get();
  let nextId = (maxResult.max_id || 0) + 1;
  
  const updateStmt = db.prepare(`UPDATE base_records SET global_id = ? WHERE id = ?`);
  const transaction = db.transaction(() => {
    for (const record of recordsWithoutGlobalId) {
      updateStmt.run(nextId++, record.id);
    }
  });
  transaction();
  console.log(`Assigned global_ids to ${recordsWithoutGlobalId.length} existing records`);
}

// Create unique index for global_id if it doesn't exist (for existing tables that were migrated)
try {
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_records_global_id ON base_records(global_id)`);
} catch (e) {
  // Index might already exist
}

// ============================================
// Query Helpers
// ============================================

// Bases
const getAllBases = db.prepare('SELECT * FROM bases WHERE user_id = ? ORDER BY created_at DESC');
const getBaseById = db.prepare('SELECT * FROM bases WHERE id = ? AND user_id = ?');
const insertBase = db.prepare(`
  INSERT INTO bases (id, name, description, icon, user_id)
  VALUES (?, ?, ?, ?, ?)
`);
const updateBase = db.prepare(`
  UPDATE bases SET name = ?, description = ?, icon = ?, updated_at = datetime('now')
  WHERE id = ? AND user_id = ?
`);
const deleteBase = db.prepare('DELETE FROM bases WHERE id = ? AND user_id = ?');

// Properties
const getPropertiesByBase = db.prepare('SELECT * FROM base_properties WHERE base_id = ? ORDER BY position ASC');
const getPropertyById = db.prepare('SELECT * FROM base_properties WHERE id = ?');
const insertProperty = db.prepare(`
  INSERT INTO base_properties (id, base_id, name, type, options, position)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const updateProperty = db.prepare(`
  UPDATE base_properties SET name = ?, type = ?, options = ?, position = ?, width = ?, updated_at = datetime('now')
  WHERE id = ?
`);
const deleteProperty = db.prepare('DELETE FROM base_properties WHERE id = ?');
const reorderProperties = db.prepare('UPDATE base_properties SET position = ? WHERE id = ?');

// Records - NOW these are safe to create since migration has run
const getRecordsByBase = db.prepare('SELECT * FROM base_records WHERE base_id = ? ORDER BY position ASC');
const getRecordById = db.prepare('SELECT * FROM base_records WHERE id = ?');
const getMaxGlobalId = db.prepare('SELECT MAX(global_id) as max_id FROM base_records');
const insertRecord = db.prepare(`
  INSERT INTO base_records (id, base_id, global_id, data, position)
  VALUES (?, ?, ?, ?, ?)
`);
const updateRecordData = db.prepare(`
  UPDATE base_records SET data = ?, updated_at = datetime('now')
  WHERE id = ?
`);
const updateRecordPosition = db.prepare('UPDATE base_records SET position = ? WHERE id = ?');
const deleteRecord = db.prepare('DELETE FROM base_records WHERE id = ?');

// Helper to get next global_id
function getNextGlobalId() {
  const result = getMaxGlobalId.get();
  return (result.max_id || 0) + 1;
}

// ============================================
// BASE GROUPS TABLE (Organize bases into collapsible groups)
// ============================================
const groupsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='base_groups'").get();
if (!groupsTable) {
  console.log('Creating base_groups table...');
  db.exec(`
    CREATE TABLE base_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '📁',
      user_id TEXT REFERENCES users(id),
      position INTEGER DEFAULT 0,
      collapsed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_groups_user_id ON base_groups(user_id)`);
  console.log('Base groups table created');
}

// Add group_id column to bases if it doesn't exist
try {
  db.exec(`ALTER TABLE bases ADD COLUMN group_id TEXT REFERENCES base_groups(id)`);
  console.log('Added group_id column to bases');
} catch (e) {
  // Column already exists, ignore
}

// Add position column to bases if it doesn't exist (for ordering within groups)
try {
  db.exec(`ALTER TABLE bases ADD COLUMN position INTEGER DEFAULT 0`);
  console.log('Added position column to bases');
} catch (e) {
  // Column already exists, ignore
}

// Groups queries
const getAllGroups = db.prepare('SELECT * FROM base_groups WHERE user_id = ? ORDER BY position ASC');
const getGroupById = db.prepare('SELECT * FROM base_groups WHERE id = ? AND user_id = ?');
const insertGroup = db.prepare(`
  INSERT INTO base_groups (id, name, icon, user_id, position, collapsed)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const updateGroup = db.prepare(`
  UPDATE base_groups SET name = ?, icon = ?, position = ?, collapsed = ?, updated_at = datetime('now')
  WHERE id = ? AND user_id = ?
`);
const deleteGroup = db.prepare('DELETE FROM base_groups WHERE id = ? AND user_id = ?');
const updateGroupCollapsed = db.prepare(`
  UPDATE base_groups SET collapsed = ?, updated_at = datetime('now')
  WHERE id = ? AND user_id = ?
`);
const collapseAllGroups = db.prepare(`
  UPDATE base_groups SET collapsed = 1, updated_at = datetime('now')
  WHERE user_id = ?
`);
const expandAllGroups = db.prepare(`
  UPDATE base_groups SET collapsed = 0, updated_at = datetime('now')
  WHERE user_id = ?
`);

// Update bases to set group
const updateBaseGroup = db.prepare(`
  UPDATE bases SET group_id = ?, position = ?, updated_at = datetime('now')
  WHERE id = ? AND user_id = ?
`);

// ============================================
// BASE VIEWS TABLE (Saved views with filters, column visibility, etc.)
// ============================================
const viewsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='base_views'").get();
if (!viewsTable) {
  console.log('Creating base_views table...');
  db.exec(`
    CREATE TABLE base_views (
      id TEXT PRIMARY KEY,
      base_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      config TEXT DEFAULT '{}',
      position INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (base_id) REFERENCES bases(id) ON DELETE CASCADE
    )
  `);
  db.exec(`CREATE INDEX idx_views_base_id ON base_views(base_id)`);
  db.exec(`CREATE INDEX idx_views_user_id ON base_views(user_id)`);
  console.log('Base views table created');
}

// Views
const getViewsByBase = db.prepare('SELECT * FROM base_views WHERE base_id = ? AND user_id = ? ORDER BY position ASC');
const getViewById = db.prepare('SELECT * FROM base_views WHERE id = ?');
const insertView = db.prepare(`
  INSERT INTO base_views (id, base_id, user_id, name, config, position)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const updateView = db.prepare(`
  UPDATE base_views SET name = ?, config = ?, position = ?, updated_at = datetime('now')
  WHERE id = ?
`);
const deleteView = db.prepare('DELETE FROM base_views WHERE id = ?');

// ============================================
// MIGRATION: Update base_properties CHECK constraint for 'relation' type
// ============================================
// SQLite can't modify CHECK constraints, so we rebuild the table if it has the old constraint
try {
  const propsTableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='base_properties'").get();
  if (propsTableInfo && propsTableInfo.sql && !propsTableInfo.sql.includes('relation')) {
    console.log('Migrating base_properties table to support relation type...');
    db.exec(`
      CREATE TABLE base_properties_new (
        id TEXT PRIMARY KEY,
        base_id TEXT REFERENCES bases(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('text', 'number', 'select', 'multi_select', 'date', 'checkbox', 'url', 'relation')),
        options TEXT DEFAULT '[]',
        position INTEGER DEFAULT 0,
        width INTEGER DEFAULT 200,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      INSERT INTO base_properties_new SELECT * FROM base_properties;
      DROP TABLE base_properties;
      ALTER TABLE base_properties_new RENAME TO base_properties;
      CREATE INDEX idx_properties_base_id ON base_properties(base_id);
    `);
    console.log('Migration complete: base_properties now supports relation type');
  }
} catch (e) {
  // Migration may have already run or table doesn't exist yet
  console.log('base_properties migration check:', e.message);
}

// ============================================
// RELATION HELPER FUNCTIONS
// ============================================

/**
 * Get records by their IDs (for resolving relations)
 * Returns a map of recordId -> record for efficient lookup
 */
function getRecordsByIds(recordIds) {
  if (!recordIds || recordIds.length === 0) return {};
  
  const placeholders = recordIds.map(() => '?').join(',');
  const stmt = db.prepare(`SELECT * FROM base_records WHERE id IN (${placeholders})`);
  const records = stmt.all(...recordIds);
  
  const recordMap = {};
  for (const record of records) {
    recordMap[record.id] = {
      id: record.id,
      base_id: record.base_id,
      global_id: record.global_id,
      values: JSON.parse(record.data || '{}'),
      position: record.position,
      created_at: record.created_at,
      updated_at: record.updated_at
    };
  }
  return recordMap;
}

/**
 * Get the display value for a record (first text field, Name field, or global_id)
 */
function getRecordDisplayValue(record, baseId) {
  const values = record.values || {};
  
  // Try to find the "Name" property value first
  const properties = getPropertiesByBase.all(baseId);
  const nameProperty = properties.find(p => p.name.toLowerCase() === 'name' && p.type === 'text');
  if (nameProperty && values[nameProperty.id]) {
    return values[nameProperty.id];
  }
  
  // Otherwise use first text property that has a value
  const firstTextProp = properties.find(p => p.type === 'text' && values[p.id]);
  if (firstTextProp) {
    return values[firstTextProp.id];
  }
  
  // Fallback to global_id
  return `Record #${record.global_id || record.id.slice(0, 8)}`;
}

/**
 * Validate relation values - check that related records exist
 * Returns { valid: boolean, invalidIds: string[], error?: string }
 */
function validateRelationValues(propertyConfig, values) {
  const relatedBaseId = propertyConfig.relatedBaseId;
  if (!relatedBaseId) {
    return { valid: false, invalidIds: [], error: 'Relation property missing relatedBaseId' };
  }
  
  // Normalize values to array
  const recordIds = Array.isArray(values) ? values : (values ? [values] : []);
  if (recordIds.length === 0) {
    return { valid: true, invalidIds: [] };
  }
  
  // Check if single vs multiple is respected
  if (!propertyConfig.allowMultiple && recordIds.length > 1) {
    return { valid: false, invalidIds: [], error: 'Property only allows single relation' };
  }
  
  // Check if all record IDs exist in the related base
  const placeholders = recordIds.map(() => '?').join(',');
  const stmt = db.prepare(`SELECT id FROM base_records WHERE id IN (${placeholders}) AND base_id = ?`);
  const existingRecords = stmt.all(...recordIds, relatedBaseId);
  const existingIds = new Set(existingRecords.map(r => r.id));
  
  const invalidIds = recordIds.filter(id => !existingIds.has(id));
  
  return {
    valid: invalidIds.length === 0,
    invalidIds
  };
}

/**
 * Expand relation values with actual record data
 * Takes a record's values and properties, returns expanded relation data
 */
function expandRelations(record, properties) {
  const expandedRelations = {};
  
  for (const prop of properties) {
    if (prop.type !== 'relation') continue;
    
    // Handle both parsed and unparsed options
    const propOptions = typeof prop.options === 'string' 
      ? JSON.parse(prop.options || '{}')
      : (prop.options || {});
    const relatedBaseId = propOptions.relatedBaseId;
    if (!relatedBaseId) continue;
    
    const values = record.values || {};
    const relationValue = values[prop.id];
    if (!relationValue) continue;
    
    // Normalize to array
    const recordIds = Array.isArray(relationValue) ? relationValue : [relationValue];
    if (recordIds.length === 0) continue;
    
    // Fetch related records
    const relatedRecords = getRecordsByIds(recordIds);
    
    // Build expanded data with display values
    const expandedData = recordIds
      .filter(id => relatedRecords[id])
      .map(id => {
        const relatedRecord = relatedRecords[id];
        return {
          id: relatedRecord.id,
          displayValue: getRecordDisplayValue(relatedRecord, relatedBaseId),
          global_id: relatedRecord.global_id
        };
      });
    
    expandedRelations[prop.id] = expandedData;
  }
  
  return expandedRelations;
}

/**
 * Clean up relation references when a record is deleted
 * Removes the deleted record ID from all relation fields that reference it
 */
function cleanupRelationReferences(deletedRecordId, deletedRecordBaseId) {
  // Find all properties that relate TO the deleted record's base
  const allBases = db.prepare('SELECT id FROM bases').all();
  
  for (const base of allBases) {
    const properties = getPropertiesByBase.all(base.id);
    const relationProps = properties.filter(p => {
      if (p.type !== 'relation') return false;
      const opts = JSON.parse(p.options || '{}');
      return opts.relatedBaseId === deletedRecordBaseId;
    });
    
    if (relationProps.length === 0) continue;
    
    // Get all records from this base and clean up references
    const records = getRecordsByBase.all(base.id);
    for (const record of records) {
      const data = JSON.parse(record.data || '{}');
      let modified = false;
      
      for (const prop of relationProps) {
        const value = data[prop.id];
        if (!value) continue;
        
        const ids = Array.isArray(value) ? value : [value];
        const filteredIds = ids.filter(id => id !== deletedRecordId);
        
        if (filteredIds.length !== ids.length) {
          data[prop.id] = filteredIds.length > 0 ? filteredIds : null;
          modified = true;
        }
      }
      
      if (modified) {
        updateRecordData.run(JSON.stringify(data), record.id);
      }
    }
  }
}

/**
 * Get all records from a base that can be linked (for relation picker)
 * Returns simplified records with id and display value
 */
function getRelationPickerOptions(baseId) {
  const records = getRecordsByBase.all(baseId);
  return records.map(r => {
    const parsed = {
      id: r.id,
      base_id: r.base_id,
      global_id: r.global_id,
      values: JSON.parse(r.data || '{}')
    };
    return {
      id: r.id,
      displayValue: getRecordDisplayValue(parsed, baseId),
      global_id: r.global_id
    };
  });
}

// ============================================
// TWO-WAY RELATION SYNC
// ============================================

/**
 * Sync reverse relations when a record's relation values change.
 * This adds/removes the source record ID from target records' reverse relation field.
 * 
 * @param {string} sourceRecordId - The record being updated
 * @param {string} propertyId - The relation property being updated
 * @param {string[]} oldValues - Previous linked record IDs
 * @param {string[]} newValues - New linked record IDs
 */
function syncReverseRelation(sourceRecordId, propertyId, oldValues, newValues) {
  // Get the property to check if it has a reverse property
  const property = getPropertyById.get(propertyId);
  if (!property) return;
  
  const options = JSON.parse(property.options || '{}');
  const reversePropertyId = options.reversePropertyId;
  
  if (!reversePropertyId) return; // No reverse relation configured
  
  // Normalize to arrays
  const oldIds = Array.isArray(oldValues) ? oldValues : (oldValues ? [oldValues] : []);
  const newIds = Array.isArray(newValues) ? newValues : (newValues ? [newValues] : []);
  
  // Calculate diffs
  const addedIds = newIds.filter(id => !oldIds.includes(id));
  const removedIds = oldIds.filter(id => !newIds.includes(id));
  
  // Process additions: Add sourceRecordId to each added target's reverse relation
  for (const targetRecordId of addedIds) {
    const targetRecord = getRecordById.get(targetRecordId);
    if (!targetRecord) continue;
    
    const targetData = JSON.parse(targetRecord.data || '{}');
    const reverseValue = targetData[reversePropertyId];
    const reverseIds = Array.isArray(reverseValue) ? [...reverseValue] : (reverseValue ? [reverseValue] : []);
    
    // Add source record ID if not already present
    if (!reverseIds.includes(sourceRecordId)) {
      reverseIds.push(sourceRecordId);
      targetData[reversePropertyId] = reverseIds;
      updateRecordData.run(JSON.stringify(targetData), targetRecordId);
    }
  }
  
  // Process removals: Remove sourceRecordId from each removed target's reverse relation
  for (const targetRecordId of removedIds) {
    const targetRecord = getRecordById.get(targetRecordId);
    if (!targetRecord) continue;
    
    const targetData = JSON.parse(targetRecord.data || '{}');
    const reverseValue = targetData[reversePropertyId];
    const reverseIds = Array.isArray(reverseValue) ? [...reverseValue] : (reverseValue ? [reverseValue] : []);
    
    // Remove source record ID
    const filteredIds = reverseIds.filter(id => id !== sourceRecordId);
    targetData[reversePropertyId] = filteredIds.length > 0 ? filteredIds : null;
    updateRecordData.run(JSON.stringify(targetData), targetRecordId);
  }
}

/**
 * Update a record's data and sync any reverse relations
 * @param {string} recordId - Record to update
 * @param {object} newValues - New values to merge
 * @param {object} oldValues - Previous values (for diff calculation)
 * @param {array} properties - Array of property definitions for the base
 */
function updateRecordWithSync(recordId, newValues, oldValues, properties) {
  // First, update the record itself
  const existingRecord = getRecordById.get(recordId);
  if (!existingRecord) return null;
  
  const existingData = JSON.parse(existingRecord.data || '{}');
  const mergedData = { ...existingData, ...newValues };
  updateRecordData.run(JSON.stringify(mergedData), recordId);
  
  // Now sync any reverse relations
  for (const prop of properties) {
    if (prop.type !== 'relation') continue;
    
    const propId = prop.id;
    if (!(propId in newValues)) continue; // This property wasn't updated
    
    const propOptions = typeof prop.options === 'string' 
      ? JSON.parse(prop.options || '{}')
      : (prop.options || {});
    
    if (!propOptions.reversePropertyId) continue; // No reverse relation
    
    const oldVal = oldValues[propId] || [];
    const newVal = newValues[propId] || [];
    
    syncReverseRelation(recordId, propId, oldVal, newVal);
  }
  
  return getRecordById.get(recordId);
}

/**
 * Unlink reverse property pairing when a relation property is deleted.
 * Sets reversePropertyId to null on the paired property (doesn't delete it).
 * @param {string} propertyId - The property being deleted
 */
function unlinkReverseProperty(propertyId) {
  const property = getPropertyById.get(propertyId);
  if (!property) return;
  
  const options = JSON.parse(property.options || '{}');
  const reversePropertyId = options.reversePropertyId;
  
  if (!reversePropertyId) return;
  
  // Get the reverse property and remove the pairing
  const reverseProperty = getPropertyById.get(reversePropertyId);
  if (!reverseProperty) return;
  
  const reverseOptions = JSON.parse(reverseProperty.options || '{}');
  delete reverseOptions.reversePropertyId;
  
  updateProperty.run(
    reverseProperty.name,
    reverseProperty.type,
    JSON.stringify(reverseOptions),
    reverseProperty.position,
    reverseProperty.width,
    reversePropertyId
  );
}

/**
 * Clean up ALL relation references when a base is being deleted.
 * Removes record IDs from relation fields in other bases that point to the deleted base.
 * Must be called BEFORE the base is deleted (while record IDs still exist).
 * @param {string} deletedBaseId - The base being deleted
 */
function cleanupAllRecordReferences(deletedBaseId) {
  // Get all record IDs from the base being deleted
  const deletedRecords = getRecordsByBase.all(deletedBaseId);
  const deletedRecordIds = new Set(deletedRecords.map(r => r.id));

  if (deletedRecordIds.size === 0) return;

  // Find all relation properties in OTHER bases that point to the deleted base
  const allBases = db.prepare('SELECT id FROM bases WHERE id != ?').all(deletedBaseId);

  for (const base of allBases) {
    const properties = getPropertiesByBase.all(base.id);
    const relationProps = properties.filter(p => {
      if (p.type !== 'relation') return false;
      const opts = JSON.parse(p.options || '{}');
      return opts.relatedBaseId === deletedBaseId;
    });

    if (relationProps.length === 0) continue;

    // Get all records from this base and clean up references
    const records = getRecordsByBase.all(base.id);
    for (const record of records) {
      const data = JSON.parse(record.data || '{}');
      let modified = false;

      for (const prop of relationProps) {
        const value = data[prop.id];
        if (!value) continue;

        const ids = Array.isArray(value) ? value : [value];
        const filteredIds = ids.filter(id => !deletedRecordIds.has(id));

        if (filteredIds.length !== ids.length) {
          data[prop.id] = filteredIds.length > 0 ? filteredIds : null;
          modified = true;
        }
      }

      if (modified) {
        updateRecordData.run(JSON.stringify(data), record.id);
      }
    }
  }
}

/**
 * Delete orphaned relation properties when a base is deleted.
 * Finds and deletes relation properties in other bases that point to the deleted base.
 * Also unlinks any reverse property pairings before deletion.
 * @param {string} deletedBaseId - The base being deleted
 */
function cleanupOrphanedRelationProperties(deletedBaseId) {
  // Find all relation properties in OTHER bases that point to the deleted base
  const allBases = db.prepare('SELECT id FROM bases WHERE id != ?').all(deletedBaseId);

  for (const base of allBases) {
    const properties = getPropertiesByBase.all(base.id);

    for (const prop of properties) {
      if (prop.type !== 'relation') continue;

      const opts = JSON.parse(prop.options || '{}');
      if (opts.relatedBaseId !== deletedBaseId) continue;

      // Unlink any reverse property pairing (the reverse is in the deleted base, but good practice)
      unlinkReverseProperty(prop.id);

      // Delete the orphaned property
      deleteProperty.run(prop.id);
    }
  }
}

/**
 * Delete a base with full cleanup of orphaned relations.
 * Wraps all operations in a transaction to ensure atomicity.
 * Order: clean record refs → clean properties → delete base
 * @param {string} baseId - The base to delete
 * @param {string} userId - The user who owns the base
 */
function deleteBaseWithCleanup(baseId, userId) {
  const transaction = db.transaction(() => {
    // 1. Clean up record references FIRST (while records still exist)
    cleanupAllRecordReferences(baseId);

    // 2. Delete orphaned relation properties in other bases
    cleanupOrphanedRelationProperties(baseId);

    // 3. Delete the base (CASCADE handles its own records and properties)
    deleteBase.run(baseId, userId);
  });

  transaction();
}

/**
 * Create a paired reverse relation property
 * @param {string} sourcePropertyId - The source relation property
 * @param {string} sourceBaseId - The base containing the source property
 * @param {string} targetBaseId - The base to create the reverse property on
 * @param {string} reverseName - Name for the reverse property
 * @param {boolean} allowMultiple - Whether the reverse allows multiple
 * @returns {object} The created reverse property
 */
function createReverseRelationProperty(sourcePropertyId, sourceBaseId, targetBaseId, reverseName, allowMultiple = true) {
  const { v4: uuidv4 } = require('uuid');
  
  // Get max position on target base
  const targetProps = getPropertiesByBase.all(targetBaseId);
  const maxPosition = targetProps.reduce((max, p) => Math.max(max, p.position), -1);
  
  // Create the reverse property
  const reversePropId = uuidv4();
  const reverseOptions = {
    relatedBaseId: sourceBaseId,
    allowMultiple: allowMultiple,
    reversePropertyId: sourcePropertyId  // Link back to source
  };
  
  insertProperty.run(
    reversePropId,
    targetBaseId,
    reverseName,
    'relation',
    JSON.stringify(reverseOptions),
    maxPosition + 1
  );
  
  // Now update the source property to link to the reverse
  const sourceProperty = getPropertyById.get(sourcePropertyId);
  if (sourceProperty) {
    const sourceOptions = JSON.parse(sourceProperty.options || '{}');
    sourceOptions.reversePropertyId = reversePropId;
    
    updateProperty.run(
      sourceProperty.name,
      sourceProperty.type,
      JSON.stringify(sourceOptions),
      sourceProperty.position,
      sourceProperty.width,
      sourcePropertyId
    );
  }
  
  return getPropertyById.get(reversePropId);
}

module.exports = {
  // Bases
  getAllBases: (userId) => getAllBases.all(userId),
  getBaseById: (id, userId) => getBaseById.get(id, userId),
  insertBase: (id, name, description, icon, userId) => insertBase.run(id, name, description, icon, userId),
  updateBase: (id, name, description, icon, userId) => updateBase.run(name, description, icon, id, userId),
  deleteBase: (id, userId) => deleteBase.run(id, userId),
  
  // Properties
  getPropertiesByBase: (baseId) => getPropertiesByBase.all(baseId),
  getPropertyById: (id) => getPropertyById.get(id),
  insertProperty: (id, baseId, name, type, options, position) => insertProperty.run(id, baseId, name, type, JSON.stringify(options), position),
  updateProperty: (id, name, type, options, position, width) => updateProperty.run(name, type, JSON.stringify(options), position, width, id),
  deleteProperty: (id) => deleteProperty.run(id),
  reorderProperties: (updates) => {
    const transaction = db.transaction((items) => {
      for (const item of items) {
        reorderProperties.run(item.position, item.id);
      }
    });
    transaction(updates);
  },
  
  // Records
  getRecordsByBase: (baseId) => getRecordsByBase.all(baseId),
  getRecordById: (id) => getRecordById.get(id),
  getNextGlobalId,
  insertRecord: (id, baseId, data, position) => {
    const globalId = getNextGlobalId();
    return insertRecord.run(id, baseId, globalId, JSON.stringify(data), position);
  },
  updateRecordData: (id, data) => updateRecordData.run(JSON.stringify(data), id),
  updateRecordPosition: (id, position) => updateRecordPosition.run(position, id),
  deleteRecord: (id) => deleteRecord.run(id),
  reorderRecords: (updates) => {
    const transaction = db.transaction((items) => {
      for (const item of items) {
        updateRecordPosition.run(item.position, item.id);
      }
    });
    transaction(updates);
  },

  // Views
  getViewsByBase: (baseId, userId) => getViewsByBase.all(baseId, userId),
  getViewById: (id) => getViewById.get(id),
  insertView: (id, baseId, userId, name, config, position) => {
    // Core bases (e.g., 'core-notes') aren't in the bases table, so we need to
    // temporarily disable foreign key checks for them
    if (baseId.startsWith('core-')) {
      db.exec('PRAGMA foreign_keys = OFF');
      try {
        insertView.run(id, baseId, userId, name, JSON.stringify(config), position);
      } finally {
        db.exec('PRAGMA foreign_keys = ON');
      }
    } else {
      insertView.run(id, baseId, userId, name, JSON.stringify(config), position);
    }
  },
  updateView: (id, name, config, position) => updateView.run(name, JSON.stringify(config), position, id),
  deleteView: (id) => deleteView.run(id),

  // Groups
  getAllGroups: (userId) => getAllGroups.all(userId),
  getGroupById: (id, userId) => getGroupById.get(id, userId),
  insertGroup: (id, name, icon, userId, position, collapsed = 0) => insertGroup.run(id, name, icon, userId, position, collapsed),
  updateGroup: (id, name, icon, position, collapsed, userId) => updateGroup.run(name, icon, position, collapsed, id, userId),
  deleteGroup: (id, userId) => deleteGroup.run(id, userId),
  updateGroupCollapsed: (id, collapsed, userId) => updateGroupCollapsed.run(collapsed ? 1 : 0, id, userId),
  collapseAllGroups: (userId) => collapseAllGroups.run(userId),
  expandAllGroups: (userId) => expandAllGroups.run(userId),
  updateBaseGroup: (baseId, groupId, position, userId) => updateBaseGroup.run(groupId, position, baseId, userId),
  reorderGroups: (updates, userId) => {
    const updateGroupPosition = db.prepare(`
      UPDATE base_groups SET position = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `);
    const transaction = db.transaction((items) => {
      for (const item of items) {
        updateGroupPosition.run(item.position, item.id, userId);
      }
    });
    transaction(updates);
  },

  // Relation helpers
  getRecordsByIds,
  validateRelationValues,
  expandRelations,
  cleanupRelationReferences,
  getRelationPickerOptions,
  getRecordDisplayValue,
  
  // Two-way relation sync
  syncReverseRelation,
  updateRecordWithSync,
  unlinkReverseProperty,
  createReverseRelationProperty,

  // Base deletion cleanup
  cleanupAllRecordReferences,
  cleanupOrphanedRelationProperties,
  deleteBaseWithCleanup
};
