const db = require('./schema');

// ============================================
// RELATION HELPER FUNCTIONS
// ============================================

/**
 * Get records by their IDs (for resolving relations)
 */
async function getRecordsByIds(recordIds) {
  if (!recordIds || recordIds.length === 0) return {};
  
  const placeholders = recordIds.map((_, i) => `$${i + 1}`).join(',');
  const records = await db.getAll(`SELECT * FROM base_records WHERE id IN (${placeholders})`, recordIds);
  
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
async function getRecordDisplayValue(record, baseId) {
  const values = record.values || {};
  
  const properties = await db.getAll('SELECT * FROM base_properties WHERE base_id = $1 ORDER BY position ASC', [baseId]);
  const nameProperty = properties.find(p => p.name.toLowerCase() === 'name' && p.type === 'text');
  if (nameProperty && values[nameProperty.id]) {
    return values[nameProperty.id];
  }
  
  const firstTextProp = properties.find(p => p.type === 'text' && values[p.id]);
  if (firstTextProp) {
    return values[firstTextProp.id];
  }
  
  return `Record #${record.global_id || record.id.slice(0, 8)}`;
}

/**
 * Validate relation values - check that related records exist
 */
async function validateRelationValues(propertyConfig, values) {
  const relatedBaseId = propertyConfig.relatedBaseId;
  if (!relatedBaseId) {
    return { valid: false, invalidIds: [], error: 'Relation property missing relatedBaseId' };
  }
  
  const recordIds = Array.isArray(values) ? values : (values ? [values] : []);
  if (recordIds.length === 0) {
    return { valid: true, invalidIds: [] };
  }
  
  if (!propertyConfig.allowMultiple && recordIds.length > 1) {
    return { valid: false, invalidIds: [], error: 'Property only allows single relation' };
  }
  
  const placeholders = recordIds.map((_, i) => `$${i + 1}`).join(',');
  const existingRecords = await db.getAll(
    `SELECT id FROM base_records WHERE id IN (${placeholders}) AND base_id = $${recordIds.length + 1}`,
    [...recordIds, relatedBaseId]
  );
  const existingIds = new Set(existingRecords.map(r => r.id));
  
  const invalidIds = recordIds.filter(id => !existingIds.has(id));
  
  return {
    valid: invalidIds.length === 0,
    invalidIds
  };
}

/**
 * Expand relation values with actual record data
 */
async function expandRelations(record, properties) {
  const expandedRelations = {};
  
  for (const prop of properties) {
    if (prop.type !== 'relation') continue;
    
    const propOptions = typeof prop.options === 'string' 
      ? JSON.parse(prop.options || '{}')
      : (prop.options || {});
    const relatedBaseId = propOptions.relatedBaseId;
    if (!relatedBaseId) continue;
    
    const values = record.values || {};
    const relationValue = values[prop.id];
    if (!relationValue) continue;
    
    const recordIds = Array.isArray(relationValue) ? relationValue : [relationValue];
    if (recordIds.length === 0) continue;
    
    const relatedRecords = await getRecordsByIds(recordIds);
    
    const expandedData = [];
    for (const id of recordIds) {
      if (!relatedRecords[id]) continue;
      const relatedRecord = relatedRecords[id];
      expandedData.push({
        id: relatedRecord.id,
        displayValue: await getRecordDisplayValue(relatedRecord, relatedBaseId),
        global_id: relatedRecord.global_id
      });
    }
    
    expandedRelations[prop.id] = expandedData;
  }
  
  return expandedRelations;
}

/**
 * Clean up relation references when a record is deleted
 */
async function cleanupRelationReferences(deletedRecordId, deletedRecordBaseId) {
  const allBases = await db.getAll('SELECT id FROM bases');
  
  for (const base of allBases) {
    const properties = await db.getAll('SELECT * FROM base_properties WHERE base_id = $1 ORDER BY position ASC', [base.id]);
    const relationProps = properties.filter(p => {
      if (p.type !== 'relation') return false;
      const opts = JSON.parse(p.options || '{}');
      return opts.relatedBaseId === deletedRecordBaseId;
    });
    
    if (relationProps.length === 0) continue;
    
    const records = await db.getAll('SELECT * FROM base_records WHERE base_id = $1 ORDER BY position ASC', [base.id]);
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
        await db.run("UPDATE base_records SET data = $1, updated_at = NOW() WHERE id = $2", [JSON.stringify(data), record.id]);
      }
    }
  }
}

/**
 * Get all records from a base that can be linked (for relation picker)
 */
async function getRelationPickerOptions(baseId) {
  const records = await db.getAll('SELECT * FROM base_records WHERE base_id = $1 ORDER BY position ASC', [baseId]);
  const results = [];
  for (const r of records) {
    const parsed = {
      id: r.id,
      base_id: r.base_id,
      global_id: r.global_id,
      values: JSON.parse(r.data || '{}')
    };
    results.push({
      id: r.id,
      displayValue: await getRecordDisplayValue(parsed, baseId),
      global_id: r.global_id
    });
  }
  return results;
}

// ============================================
// TWO-WAY RELATION SYNC
// ============================================

async function syncReverseRelation(sourceRecordId, propertyId, oldValues, newValues) {
  const property = await db.getOne('SELECT * FROM base_properties WHERE id = $1', [propertyId]);
  if (!property) return;
  
  const options = JSON.parse(property.options || '{}');
  const reversePropertyId = options.reversePropertyId;
  
  if (!reversePropertyId) return;
  
  const oldIds = Array.isArray(oldValues) ? oldValues : (oldValues ? [oldValues] : []);
  const newIds = Array.isArray(newValues) ? newValues : (newValues ? [newValues] : []);
  
  const addedIds = newIds.filter(id => !oldIds.includes(id));
  const removedIds = oldIds.filter(id => !newIds.includes(id));
  
  for (const targetRecordId of addedIds) {
    const targetRecord = await db.getOne('SELECT * FROM base_records WHERE id = $1', [targetRecordId]);
    if (!targetRecord) continue;
    
    const targetData = JSON.parse(targetRecord.data || '{}');
    const reverseValue = targetData[reversePropertyId];
    const reverseIds = Array.isArray(reverseValue) ? [...reverseValue] : (reverseValue ? [reverseValue] : []);
    
    if (!reverseIds.includes(sourceRecordId)) {
      reverseIds.push(sourceRecordId);
      targetData[reversePropertyId] = reverseIds;
      await db.run("UPDATE base_records SET data = $1, updated_at = NOW() WHERE id = $2", [JSON.stringify(targetData), targetRecordId]);
    }
  }
  
  for (const targetRecordId of removedIds) {
    const targetRecord = await db.getOne('SELECT * FROM base_records WHERE id = $1', [targetRecordId]);
    if (!targetRecord) continue;
    
    const targetData = JSON.parse(targetRecord.data || '{}');
    const reverseValue = targetData[reversePropertyId];
    const reverseIds = Array.isArray(reverseValue) ? [...reverseValue] : (reverseValue ? [reverseValue] : []);
    
    const filteredIds = reverseIds.filter(id => id !== sourceRecordId);
    targetData[reversePropertyId] = filteredIds.length > 0 ? filteredIds : null;
    await db.run("UPDATE base_records SET data = $1, updated_at = NOW() WHERE id = $2", [JSON.stringify(targetData), targetRecordId]);
  }
}

async function updateRecordWithSync(recordId, newValues, oldValues, properties) {
  const existingRecord = await db.getOne('SELECT * FROM base_records WHERE id = $1', [recordId]);
  if (!existingRecord) return null;
  
  const existingData = JSON.parse(existingRecord.data || '{}');
  const mergedData = { ...existingData, ...newValues };
  await db.run("UPDATE base_records SET data = $1, updated_at = NOW() WHERE id = $2", [JSON.stringify(mergedData), recordId]);
  
  for (const prop of properties) {
    if (prop.type !== 'relation') continue;
    
    const propId = prop.id;
    if (!(propId in newValues)) continue;
    
    const propOptions = typeof prop.options === 'string' 
      ? JSON.parse(prop.options || '{}')
      : (prop.options || {});
    
    if (!propOptions.reversePropertyId) continue;
    
    const oldVal = oldValues[propId] || [];
    const newVal = newValues[propId] || [];
    
    await syncReverseRelation(recordId, propId, oldVal, newVal);
  }
  
  return await db.getOne('SELECT * FROM base_records WHERE id = $1', [recordId]);
}

async function unlinkReverseProperty(propertyId) {
  const property = await db.getOne('SELECT * FROM base_properties WHERE id = $1', [propertyId]);
  if (!property) return;
  
  const options = JSON.parse(property.options || '{}');
  const reversePropertyId = options.reversePropertyId;
  
  if (!reversePropertyId) return;
  
  const reverseProperty = await db.getOne('SELECT * FROM base_properties WHERE id = $1', [reversePropertyId]);
  if (!reverseProperty) return;
  
  const reverseOptions = JSON.parse(reverseProperty.options || '{}');
  delete reverseOptions.reversePropertyId;
  
  await db.run(
    "UPDATE base_properties SET name = $1, type = $2, options = $3, position = $4, width = $5, updated_at = NOW() WHERE id = $6",
    [reverseProperty.name, reverseProperty.type, JSON.stringify(reverseOptions), reverseProperty.position, reverseProperty.width, reversePropertyId]
  );
}

async function cleanupAllRecordReferences(deletedBaseId) {
  const deletedRecords = await db.getAll('SELECT * FROM base_records WHERE base_id = $1 ORDER BY position ASC', [deletedBaseId]);
  const deletedRecordIds = new Set(deletedRecords.map(r => r.id));

  if (deletedRecordIds.size === 0) return;

  const allBases = await db.getAll('SELECT id FROM bases WHERE id != $1', [deletedBaseId]);

  for (const base of allBases) {
    const properties = await db.getAll('SELECT * FROM base_properties WHERE base_id = $1 ORDER BY position ASC', [base.id]);
    const relationProps = properties.filter(p => {
      if (p.type !== 'relation') return false;
      const opts = JSON.parse(p.options || '{}');
      return opts.relatedBaseId === deletedBaseId;
    });

    if (relationProps.length === 0) continue;

    const records = await db.getAll('SELECT * FROM base_records WHERE base_id = $1 ORDER BY position ASC', [base.id]);
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
        await db.run("UPDATE base_records SET data = $1, updated_at = NOW() WHERE id = $2", [JSON.stringify(data), record.id]);
      }
    }
  }
}

async function cleanupOrphanedRelationProperties(deletedBaseId) {
  const allBases = await db.getAll('SELECT id FROM bases WHERE id != $1', [deletedBaseId]);

  for (const base of allBases) {
    const properties = await db.getAll('SELECT * FROM base_properties WHERE base_id = $1 ORDER BY position ASC', [base.id]);

    for (const prop of properties) {
      if (prop.type !== 'relation') continue;

      const opts = JSON.parse(prop.options || '{}');
      if (opts.relatedBaseId !== deletedBaseId) continue;

      await unlinkReverseProperty(prop.id);
      await db.run('DELETE FROM base_properties WHERE id = $1', [prop.id]);
    }
  }
}

async function deleteBaseWithCleanup(baseId, userId) {
  await db.transaction(async (client) => {
    // We need to use the main db for the helper functions since they use db.getAll etc.
    // But for atomicity we do the final delete in the transaction
    await cleanupAllRecordReferences(baseId);
    await cleanupOrphanedRelationProperties(baseId);
    await client.run('DELETE FROM bases WHERE id = $1 AND user_id = $2', [baseId, userId]);
  });
}

async function createReverseRelationProperty(sourcePropertyId, sourceBaseId, targetBaseId, reverseName, allowMultiple = true) {
  const { v4: uuidv4 } = require('uuid');
  
  const targetProps = await db.getAll('SELECT * FROM base_properties WHERE base_id = $1 ORDER BY position ASC', [targetBaseId]);
  const maxPosition = targetProps.reduce((max, p) => Math.max(max, p.position), -1);
  
  const reversePropId = uuidv4();
  const reverseOptions = {
    relatedBaseId: sourceBaseId,
    allowMultiple: allowMultiple,
    reversePropertyId: sourcePropertyId
  };
  
  await db.run(
    'INSERT INTO base_properties (id, base_id, name, type, options, position) VALUES ($1, $2, $3, $4, $5, $6)',
    [reversePropId, targetBaseId, reverseName, 'relation', JSON.stringify(reverseOptions), maxPosition + 1]
  );
  
  const sourceProperty = await db.getOne('SELECT * FROM base_properties WHERE id = $1', [sourcePropertyId]);
  if (sourceProperty) {
    const sourceOptions = JSON.parse(sourceProperty.options || '{}');
    sourceOptions.reversePropertyId = reversePropId;
    
    await db.run(
      "UPDATE base_properties SET name = $1, type = $2, options = $3, position = $4, width = $5, updated_at = NOW() WHERE id = $6",
      [sourceProperty.name, sourceProperty.type, JSON.stringify(sourceOptions), sourceProperty.position, sourceProperty.width, sourcePropertyId]
    );
  }
  
  return await db.getOne('SELECT * FROM base_properties WHERE id = $1', [reversePropId]);
}

// ============================================
// Helper to get next global_id
// ============================================
async function getNextGlobalId() {
  const result = await db.getOne('SELECT MAX(global_id) as max_id FROM base_records');
  return (result.max_id || 0) + 1;
}

module.exports = {
  // Bases
  getAllBases: async (userId) => await db.getAll('SELECT * FROM bases WHERE user_id = $1 ORDER BY created_at DESC', [userId]),
  getBaseById: async (id, userId) => await db.getOne('SELECT * FROM bases WHERE id = $1 AND user_id = $2', [id, userId]),
  insertBase: async (id, name, description, icon, userId) => await db.run('INSERT INTO bases (id, name, description, icon, user_id) VALUES ($1, $2, $3, $4, $5)', [id, name, description, icon, userId]),
  updateBase: async (id, name, description, icon, userId) => await db.run("UPDATE bases SET name = $1, description = $2, icon = $3, updated_at = NOW() WHERE id = $4 AND user_id = $5", [name, description, icon, id, userId]),
  deleteBase: async (id, userId) => await db.run('DELETE FROM bases WHERE id = $1 AND user_id = $2', [id, userId]),
  
  // Properties
  getPropertiesByBase: async (baseId) => await db.getAll('SELECT * FROM base_properties WHERE base_id = $1 ORDER BY position ASC', [baseId]),
  getPropertyById: async (id) => await db.getOne('SELECT * FROM base_properties WHERE id = $1', [id]),
  insertProperty: async (id, baseId, name, type, options, position) => await db.run(
    'INSERT INTO base_properties (id, base_id, name, type, options, position) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, baseId, name, type, JSON.stringify(options), position]
  ),
  updateProperty: async (id, name, type, options, position, width) => await db.run(
    "UPDATE base_properties SET name = $1, type = $2, options = $3, position = $4, width = $5, updated_at = NOW() WHERE id = $6",
    [name, type, JSON.stringify(options), position, width, id]
  ),
  deleteProperty: async (id) => await db.run('DELETE FROM base_properties WHERE id = $1', [id]),
  reorderProperties: async (updates) => {
    await db.transaction(async (client) => {
      for (const item of updates) {
        await client.run('UPDATE base_properties SET position = $1 WHERE id = $2', [item.position, item.id]);
      }
    });
  },
  
  // Records
  getRecordsByBase: async (baseId) => await db.getAll('SELECT * FROM base_records WHERE base_id = $1 ORDER BY position ASC', [baseId]),
  getRecordById: async (id) => await db.getOne('SELECT * FROM base_records WHERE id = $1', [id]),
  getNextGlobalId,
  insertRecord: async (id, baseId, data, position) => {
    const globalId = await getNextGlobalId();
    return await db.run(
      'INSERT INTO base_records (id, base_id, global_id, data, position) VALUES ($1, $2, $3, $4, $5)',
      [id, baseId, globalId, JSON.stringify(data), position]
    );
  },
  updateRecordData: async (id, data) => await db.run("UPDATE base_records SET data = $1, updated_at = NOW() WHERE id = $2", [JSON.stringify(data), id]),
  updateRecordPosition: async (id, position) => await db.run('UPDATE base_records SET position = $1 WHERE id = $2', [position, id]),
  deleteRecord: async (id) => await db.run('DELETE FROM base_records WHERE id = $1', [id]),
  reorderRecords: async (updates) => {
    await db.transaction(async (client) => {
      for (const item of updates) {
        await client.run('UPDATE base_records SET position = $1 WHERE id = $2', [item.position, item.id]);
      }
    });
  },

  // Views
  getViewsByBase: async (baseId, userId) => await db.getAll('SELECT * FROM base_views WHERE base_id = $1 AND user_id = $2 ORDER BY sort_order ASC, position ASC', [baseId, userId]),
  getViewById: async (id) => await db.getOne('SELECT * FROM base_views WHERE id = $1', [id]),
  insertView: async (id, baseId, userId, name, config, position, viewType = 'table') => {
    await db.run(
      'INSERT INTO base_views (id, base_id, user_id, name, view_type, config, position) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, baseId, userId, name, viewType, JSON.stringify(config), position]
    );
  },
  updateView: async (id, updates) => {
    const fields = [];
    const params = [];
    let paramIdx = 1;
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'config') {
        fields.push(`config = $${paramIdx++}`);
        params.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = $${paramIdx++}`);
        params.push(value);
      }
    }
    fields.push('updated_at = NOW()');
    params.push(id);
    await db.run(`UPDATE base_views SET ${fields.join(', ')} WHERE id = $${paramIdx}`, params);
  },
  deleteView: async (id) => await db.run('DELETE FROM base_views WHERE id = $1', [id]),

  // Groups
  getAllGroups: async (userId) => await db.getAll('SELECT * FROM base_groups WHERE user_id = $1 ORDER BY position ASC', [userId]),
  getGroupById: async (id, userId) => await db.getOne('SELECT * FROM base_groups WHERE id = $1 AND user_id = $2', [id, userId]),
  insertGroup: async (id, name, icon, userId, position, collapsed = 0) => await db.run(
    'INSERT INTO base_groups (id, name, icon, user_id, position, collapsed) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, name, icon, userId, position, collapsed]
  ),
  updateGroup: async (id, name, icon, position, collapsed, userId) => await db.run(
    "UPDATE base_groups SET name = $1, icon = $2, position = $3, collapsed = $4, updated_at = NOW() WHERE id = $5 AND user_id = $6",
    [name, icon, position, collapsed, id, userId]
  ),
  deleteGroup: async (id, userId) => await db.run('DELETE FROM base_groups WHERE id = $1 AND user_id = $2', [id, userId]),
  updateGroupCollapsed: async (id, collapsed, userId) => await db.run(
    "UPDATE base_groups SET collapsed = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3",
    [collapsed ? 1 : 0, id, userId]
  ),
  collapseAllGroups: async (userId) => await db.run("UPDATE base_groups SET collapsed = 1, updated_at = NOW() WHERE user_id = $1", [userId]),
  expandAllGroups: async (userId) => await db.run("UPDATE base_groups SET collapsed = 0, updated_at = NOW() WHERE user_id = $1", [userId]),
  updateBaseGroup: async (baseId, groupId, position, userId) => await db.run(
    "UPDATE bases SET group_id = $1, position = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4",
    [groupId, position, baseId, userId]
  ),
  reorderGroups: async (updates, userId) => {
    await db.transaction(async (client) => {
      for (const item of updates) {
        await client.run("UPDATE base_groups SET position = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3", [item.position, item.id, userId]);
      }
    });
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
