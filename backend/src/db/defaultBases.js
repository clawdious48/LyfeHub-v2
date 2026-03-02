const { v4: uuidv4 } = require('uuid');
const db = require('./pool');
const basesDb = require('./bases');

// ============================================
// DEFAULT BASE DEFINITIONS
// ============================================

const DEFAULT_BASES = [
  {
    name: 'Tasks',
    description: 'Personal tasks synced with the Tasks dashboard',
    icon: '✅',
    properties: [
      { name: 'Name', type: 'text', width: 300 },
      { name: 'Description', type: 'rich_text', width: 300 },
      { name: 'Status', type: 'status', width: 140, options: [
        { label: 'To Do', color: 'red', group: 'todo' },
        { label: 'Doing', color: 'blue', group: 'in_progress' },
        { label: 'Done', color: 'green', group: 'complete' },
      ]},
      { name: 'Priority', type: 'status', width: 120, options: [
        { label: 'Low', color: 'blue', group: 'todo' },
        { label: 'Medium', color: 'yellow', group: 'in_progress' },
        { label: 'High', color: 'red', group: 'in_progress' },
      ]},
      { name: 'Due', type: 'date', width: 150 },
      { name: 'Snooze', type: 'date', width: 150 },
      { name: 'Completed', type: 'date', width: 150 },
      { name: 'Wait Date', type: 'date', width: 150 },
      { name: 'Energy', type: 'select', width: 120, options: [
        { label: 'High', color: 'green' },
        { label: 'Low', color: 'yellow' },
      ]},
      { name: 'Location', type: 'select', width: 120, options: [
        { label: 'Home', color: 'blue' },
        { label: 'Office', color: 'blue' },
        { label: 'Errand', color: 'blue' },
      ]},
      { name: 'Labels', type: 'multi_select', width: 200, options: [] },
      { name: 'Smart List', type: 'select', width: 140, options: [
        { label: 'Do Next', color: 'green' },
        { label: 'Delegated', color: 'yellow' },
        { label: 'Someday', color: 'red' },
      ]},
      { name: 'My Day', type: 'checkbox', width: 100 },
      { name: 'Recur Interval', type: 'number', width: 130 },
      { name: 'Recur Unit', type: 'select', width: 140, options: [
        { label: 'Day(s)', color: 'gray' },
        { label: 'Week(s)', color: 'gray' },
        { label: 'Month(s)', color: 'gray' },
        { label: 'Year(s)', color: 'gray' },
      ]},
      { name: 'Days', type: 'multi_select', width: 200, options: [
        { label: 'Mon', color: 'blue' },
        { label: 'Tue', color: 'green' },
        { label: 'Wed', color: 'purple' },
        { label: 'Thu', color: 'red' },
        { label: 'Fri', color: 'yellow' },
        { label: 'Sat', color: 'pink' },
        { label: 'Sun', color: 'orange' },
      ]},
      { name: 'Created', type: 'created_time', width: 180 },
      { name: 'Edited', type: 'last_edited_time', width: 180 },
    ],
    // Relations are wired in a second pass after all bases exist
    relations: [
      { propertyName: 'Project', targetBase: 'Projects', reverseName: 'Tasks', allowMultiple: false },
      { propertyName: 'People', targetBase: 'People', reverseName: 'Tasks', allowMultiple: true },
      { propertyName: 'Parent Task', targetBase: 'Tasks', reverseName: 'Sub-Tasks', allowMultiple: false },
    ],
  },
  {
    name: 'Projects',
    description: 'Track projects with status, deadlines, and goals',
    icon: '🚀',
    properties: [
      { name: 'Name', type: 'text', width: 300 },
      { name: 'Status', type: 'status', width: 140, options: [
        { label: 'Planned', color: 'blue', group: 'todo' },
        { label: 'On Hold', color: 'red', group: 'todo' },
        { label: 'Doing', color: 'green', group: 'in_progress' },
        { label: 'Ongoing', color: 'orange', group: 'in_progress' },
        { label: 'Done', color: 'purple', group: 'complete' },
      ]},
      { name: 'Target Deadline', type: 'date', width: 160 },
      { name: 'Completed', type: 'date', width: 150 },
      { name: 'Archived', type: 'checkbox', width: 100 },
      { name: 'Review Notes', type: 'rich_text', width: 300 },
      { name: 'Created', type: 'created_time', width: 180 },
      { name: 'Edited', type: 'last_edited_time', width: 180 },
    ],
    relations: [
      // Tasks reverse is created by Tasks base
      // Notes reverse is created by Notes base
      { propertyName: 'Tag', targetBase: 'Tags', reverseName: 'Projects', allowMultiple: false },
      { propertyName: 'People', targetBase: 'People', reverseName: 'Projects', allowMultiple: true },
    ],
  },
  {
    name: 'Notes',
    description: 'Capture ideas, meeting notes, web clips, and more',
    icon: '📝',
    properties: [
      { name: 'Name', type: 'text', width: 300 },
      { name: 'Type', type: 'select', width: 140, options: [
        { label: 'Journal', color: 'gray' },
        { label: 'Meeting', color: 'yellow' },
        { label: 'Web Clip', color: 'red' },
        { label: 'Reference', color: 'blue' },
        { label: 'Idea', color: 'orange' },
        { label: 'Plan', color: 'blue' },
        { label: 'Recipe', color: 'yellow' },
        { label: 'Voice Note', color: 'purple' },
        { label: 'Quote', color: 'gray' },
      ]},
      { name: 'Content', type: 'rich_text', width: 400 },
      { name: 'Archived', type: 'checkbox', width: 100 },
      { name: 'Favorite', type: 'checkbox', width: 100 },
      { name: 'Note Date', type: 'date', width: 150 },
      { name: 'Review Date', type: 'date', width: 150 },
      { name: 'URL', type: 'url', width: 250 },
      { name: 'Image', type: 'files', width: 150 },
      { name: 'Created', type: 'created_time', width: 180 },
      { name: 'Updated', type: 'last_edited_time', width: 180 },
    ],
    relations: [
      { propertyName: 'Tag', targetBase: 'Tags', reverseName: 'Notes', allowMultiple: false },
      { propertyName: 'Project', targetBase: 'Projects', reverseName: 'Notes', allowMultiple: false },
      { propertyName: 'People', targetBase: 'People', reverseName: 'Notes', allowMultiple: true },
    ],
  },
  {
    name: 'Tags',
    description: 'Organize with Areas, Resources, and Entities (PARA method)',
    icon: '🏷️',
    properties: [
      { name: 'Name', type: 'text', width: 250 },
      { name: 'Type', type: 'status', width: 140, options: [
        { label: 'Area', color: 'orange', group: 'in_progress' },
        { label: 'Resource', color: 'purple', group: 'in_progress' },
        { label: 'Entity', color: 'green', group: 'in_progress' },
      ]},
      { name: 'Archived', type: 'checkbox', width: 100 },
      { name: 'Favorite', type: 'checkbox', width: 100 },
      { name: 'Date', type: 'date', width: 150 },
      { name: 'URL', type: 'url', width: 250 },
      { name: 'Created', type: 'created_time', width: 180 },
      { name: 'Edited', type: 'last_edited_time', width: 180 },
    ],
    relations: [
      // Notes, Projects reverses are created by those bases
      { propertyName: 'People', targetBase: 'People', reverseName: 'Tags', allowMultiple: true },
      { propertyName: 'Parent Tag', targetBase: 'Tags', reverseName: 'Sub-Tags', allowMultiple: false },
    ],
  },
  {
    name: 'People',
    description: 'Contacts and relationships',
    icon: '👥',
    properties: [
      { name: 'Full Name', type: 'text', width: 250 },
      { name: 'Email', type: 'email', width: 220 },
      { name: 'Secondary Email', type: 'email', width: 220 },
      { name: 'Phone', type: 'phone', width: 180 },
      { name: 'Website', type: 'url', width: 250 },
      { name: 'LinkedIn', type: 'url', width: 220 },
      { name: 'Twitter/X', type: 'url', width: 220 },
      { name: 'Instagram', type: 'url', width: 220 },
      { name: 'Location', type: 'text', width: 200 },
      { name: 'Company', type: 'multi_select', width: 200, options: [] },
      { name: 'Title', type: 'text', width: 200 },
      { name: 'Industry', type: 'select', width: 160, options: [
        { label: 'Insurance', color: 'yellow' },
        { label: 'HVAC', color: 'blue' },
        { label: 'Plumbing', color: 'blue' },
        { label: 'Electrical', color: 'orange' },
        { label: 'Automotive', color: 'gray' },
        { label: 'Construction', color: 'red' },
        { label: 'Technology', color: 'purple' },
        { label: 'Healthcare', color: 'green' },
        { label: 'Education', color: 'cyan' },
        { label: 'Other', color: 'gray' },
      ]},
      { name: 'Relationship', type: 'multi_select', width: 200, options: [
        { label: 'Friend', color: 'pink' },
        { label: 'Family', color: 'yellow' },
        { label: 'Colleague', color: 'blue' },
        { label: 'Client', color: 'orange' },
        { label: 'Vendor', color: 'green' },
        { label: 'Customer', color: 'purple' },
      ]},
      { name: 'Interests', type: 'multi_select', width: 200, options: [] },
      { name: 'How Met', type: 'rich_text', width: 300 },
      { name: 'Birthday', type: 'date', width: 150 },
      { name: 'Last Check-In', type: 'date', width: 160 },
      { name: 'Next Check-In', type: 'date', width: 160 },
      { name: 'Pipeline Status', type: 'status', width: 160, options: [
        { label: 'Prospect', color: 'gray', group: 'todo' },
        { label: 'Contacted', color: 'blue', group: 'in_progress' },
        { label: 'Negotiating', color: 'yellow', group: 'in_progress' },
        { label: 'Closed', color: 'green', group: 'complete' },
        { label: 'Rejected', color: 'red', group: 'complete' },
      ]},
      { name: 'Created', type: 'created_time', width: 180 },
      { name: 'Edited', type: 'last_edited_time', width: 180 },
    ],
    relations: [
      // All People relations (Tags, Notes, Tasks, Projects) are created as reverses by other bases
    ],
  },
];

// ============================================
// SEED FUNCTION
// ============================================

async function seedDefaultBases(userId) {
  // Check if already seeded
  const existing = await db.getAll(
    'SELECT id, name FROM bases WHERE user_id = $1 AND is_default = TRUE',
    [userId]
  );
  const existingNames = new Set(existing.map(b => b.name));

  const basesToSeed = DEFAULT_BASES.filter(b => !existingNames.has(b.name));
  if (basesToSeed.length === 0) return existing;

  const result = await db.transaction(async (client) => {
    const createdBases = {};

    // Pass 1: Create bases and non-relation properties
    for (const baseDef of DEFAULT_BASES) {
      if (existingNames.has(baseDef.name)) {
        // Already exists — look up its ID for relation wiring
        const ex = existing.find(e => e.name === baseDef.name);
        createdBases[baseDef.name] = ex.id;
        continue;
      }

      const baseId = uuidv4();
      const maxPos = await client.getOne(
        'SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM bases WHERE user_id = $1',
        [userId]
      );

      await client.run(
        `INSERT INTO bases (id, name, description, icon, user_id, position, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
        [baseId, baseDef.name, baseDef.description, baseDef.icon, userId, maxPos.next_pos]
      );

      // Create non-relation properties
      for (let i = 0; i < baseDef.properties.length; i++) {
        const prop = baseDef.properties[i];
        const propId = uuidv4();
        const options = prop.options ? JSON.stringify(prop.options) : '[]';
        await client.run(
          `INSERT INTO base_properties (id, base_id, name, type, options, position, width, is_default)
           VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)`,
          [propId, baseId, prop.name, prop.type, options, i, prop.width || 200]
        );
      }

      createdBases[baseDef.name] = baseId;
    }

    // Pass 2: Create relation properties (need all bases to exist first)
    for (const baseDef of DEFAULT_BASES) {
      if (!baseDef.relations || baseDef.relations.length === 0) continue;

      const sourceBaseId = createdBases[baseDef.name];
      if (!sourceBaseId) continue;
      // Skip if this base already existed (relations already wired)
      if (existingNames.has(baseDef.name)) continue;

      for (const rel of baseDef.relations) {
        const targetBaseId = createdBases[rel.targetBase];
        if (!targetBaseId) continue;

        // Get next position for source base
        const sourceMaxPos = await client.getOne(
          'SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM base_properties WHERE base_id = $1',
          [sourceBaseId]
        );

        // Create the source relation property
        const sourcePropId = uuidv4();
        const reversePropId = uuidv4();

        const sourceOptions = JSON.stringify({
          relatedBaseId: targetBaseId,
          reversePropertyId: reversePropId,
          allowMultiple: rel.allowMultiple !== false,
        });

        await client.run(
          `INSERT INTO base_properties (id, base_id, name, type, options, position, width, is_default)
           VALUES ($1, $2, $3, 'relation', $4, $5, 200, TRUE)`,
          [sourcePropId, sourceBaseId, rel.propertyName, sourceOptions, sourceMaxPos.next_pos]
        );

        // Create the reverse relation property on target base
        const targetMaxPos = await client.getOne(
          'SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM base_properties WHERE base_id = $1',
          [targetBaseId]
        );

        const reverseOptions = JSON.stringify({
          relatedBaseId: sourceBaseId,
          reversePropertyId: sourcePropId,
          allowMultiple: true,
        });

        await client.run(
          `INSERT INTO base_properties (id, base_id, name, type, options, position, width, is_default)
           VALUES ($1, $2, $3, 'relation', $4, $5, 200, TRUE)`,
          [reversePropId, targetBaseId, rel.reverseName, reverseOptions, targetMaxPos.next_pos]
        );
      }
    }

    return createdBases;
  });

  return result;
}

async function getDefaultBase(userId, name) {
  return await db.getOne(
    'SELECT * FROM bases WHERE user_id = $1 AND name = $2 AND is_default = TRUE',
    [userId, name]
  );
}

async function hasDefaultBases(userId) {
  const result = await db.getOne(
    'SELECT COUNT(*)::int as count FROM bases WHERE user_id = $1 AND is_default = TRUE',
    [userId]
  );
  return result.count > 0;
}

module.exports = {
  DEFAULT_BASES,
  seedDefaultBases,
  getDefaultBase,
  hasDefaultBases,
};
