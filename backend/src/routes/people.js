const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const peopleDb = require('../db/people');
const peopleGroupsDb = require('../db/peopleGroups');

// All routes require authentication
router.use(authMiddleware);

// Middleware to ensure user context
router.use((req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(403).json({ error: 'User authentication required' });
  }
  next();
});

// ============================================
// GROUPS ROUTES (must be before /:id routes!)
// ============================================

// GET /api/people/groups/list - List all groups for user
router.get('/groups/list', (req, res) => {
  try {
    const groups = peopleGroupsDb.getAllGroups(req.user.id);
    res.json(groups);
  } catch (error) {
    console.error('Error fetching people groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// POST /api/people/groups - Create new group
router.post('/groups', (req, res) => {
  try {
    const { name, icon = '👥' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Get max position
    const groups = peopleGroupsDb.getAllGroups(req.user.id);
    const maxPosition = groups.reduce((max, g) => Math.max(max, g.position), -1);

    const id = uuidv4();
    peopleGroupsDb.insertGroup(id, name.trim(), icon, req.user.id, maxPosition + 1);

    const group = peopleGroupsDb.getGroupById(id, req.user.id);
    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating people group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// PUT /api/people/groups/:groupId - Update group
router.put('/groups/:groupId', (req, res) => {
  try {
    const existing = peopleGroupsDb.getGroupById(req.params.groupId, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const { name, icon, position, collapsed } = req.body;

    peopleGroupsDb.updateGroup(
      req.params.groupId,
      name ?? existing.name,
      icon ?? existing.icon,
      position ?? existing.position,
      collapsed ?? existing.collapsed,
      req.user.id
    );

    const group = peopleGroupsDb.getGroupById(req.params.groupId, req.user.id);
    res.json(group);
  } catch (error) {
    console.error('Error updating people group:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
});

// PUT /api/people/groups/:groupId/toggle - Toggle group collapsed state
router.put('/groups/:groupId/toggle', (req, res) => {
  try {
    const existing = peopleGroupsDb.getGroupById(req.params.groupId, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const newCollapsed = !existing.collapsed;
    peopleGroupsDb.updateGroupCollapsed(req.params.groupId, newCollapsed, req.user.id);

    const group = peopleGroupsDb.getGroupById(req.params.groupId, req.user.id);
    res.json(group);
  } catch (error) {
    console.error('Error toggling people group:', error);
    res.status(500).json({ error: 'Failed to toggle group' });
  }
});

// POST /api/people/groups/collapse-all - Collapse all groups
router.post('/groups/collapse-all', (req, res) => {
  try {
    peopleGroupsDb.collapseAllGroups(req.user.id);
    const groups = peopleGroupsDb.getAllGroups(req.user.id);
    res.json(groups);
  } catch (error) {
    console.error('Error collapsing people groups:', error);
    res.status(500).json({ error: 'Failed to collapse groups' });
  }
});

// POST /api/people/groups/expand-all - Expand all groups
router.post('/groups/expand-all', (req, res) => {
  try {
    peopleGroupsDb.expandAllGroups(req.user.id);
    const groups = peopleGroupsDb.getAllGroups(req.user.id);
    res.json(groups);
  } catch (error) {
    console.error('Error expanding people groups:', error);
    res.status(500).json({ error: 'Failed to expand groups' });
  }
});

// POST /api/people/groups/reorder - Reorder groups
router.post('/groups/reorder', (req, res) => {
  try {
    const { order } = req.body; // Array of { id, position }
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'Order must be an array' });
    }

    // Validate all groups belong to user
    for (const item of order) {
      const group = peopleGroupsDb.getGroupById(item.id, req.user.id);
      if (!group) {
        return res.status(404).json({ error: `Group ${item.id} not found` });
      }
    }

    peopleGroupsDb.reorderGroups(order, req.user.id);
    const groups = peopleGroupsDb.getAllGroups(req.user.id);
    res.json(groups);
  } catch (error) {
    console.error('Error reordering people groups:', error);
    res.status(500).json({ error: 'Failed to reorder groups' });
  }
});

// DELETE /api/people/groups/:groupId - Delete group (people become ungrouped)
router.delete('/groups/:groupId', (req, res) => {
  try {
    const existing = peopleGroupsDb.getGroupById(req.params.groupId, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Ungroup all people in this group
    const people = peopleDb.getAllPeople(req.user.id);
    for (const person of people) {
      if (person.group_id === req.params.groupId) {
        peopleGroupsDb.updatePersonGroup(person.id, null, 0, req.user.id);
      }
    }

    peopleGroupsDb.deleteGroup(req.params.groupId, req.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting people group:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// ============================================
// PEOPLE CRUD ROUTES
// ============================================

// GET /api/people - List all people for user
router.get('/', (req, res) => {
  try {
    const people = peopleDb.getAllPeople(req.user.id);
    res.json(people);
  } catch (error) {
    console.error('Error fetching people:', error);
    res.status(500).json({ error: 'Failed to fetch people' });
  }
});

// POST /api/people - Create new person
router.post('/', (req, res) => {
  try {
    const person = peopleDb.createPerson(req.body, req.user.id);
    res.status(201).json(person);
  } catch (error) {
    console.error('Error creating person:', error);
    res.status(500).json({ error: 'Failed to create person' });
  }
});

// GET /api/people/:id - Get single person
router.get('/:id', (req, res) => {
  try {
    const person = peopleDb.getPersonById(req.params.id, req.user.id);
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }
    res.json(person);
  } catch (error) {
    console.error('Error fetching person:', error);
    res.status(500).json({ error: 'Failed to fetch person' });
  }
});

// PUT /api/people/:id - Update person
router.put('/:id', (req, res) => {
  try {
    const person = peopleDb.updatePerson(req.params.id, req.body, req.user.id);
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }
    res.json(person);
  } catch (error) {
    console.error('Error updating person:', error);
    res.status(500).json({ error: 'Failed to update person' });
  }
});

// DELETE /api/people/:id - Delete person
router.delete('/:id', (req, res) => {
  try {
    const success = peopleDb.deletePerson(req.params.id, req.user.id);
    if (!success) {
      return res.status(404).json({ error: 'Person not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting person:', error);
    res.status(500).json({ error: 'Failed to delete person' });
  }
});

// PUT /api/people/:id/group - Assign person to group
router.put('/:id/group', (req, res) => {
  try {
    const person = peopleDb.getPersonById(req.params.id, req.user.id);
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    const { group_id, position = 0 } = req.body;

    // Validate group exists if provided
    if (group_id) {
      const group = peopleGroupsDb.getGroupById(group_id, req.user.id);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }
    }

    peopleGroupsDb.updatePersonGroup(req.params.id, group_id || null, position, req.user.id);

    const updatedPerson = peopleDb.getPersonById(req.params.id, req.user.id);
    res.json(updatedPerson);
  } catch (error) {
    console.error('Error updating person group:', error);
    res.status(500).json({ error: 'Failed to update person group' });
  }
});

module.exports = router;
