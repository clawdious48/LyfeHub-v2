const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const apexOrgsDb = require('../db/apexOrgs');
const { requireScope } = require('../middleware/scopeAuth');

// All routes require authentication
router.use(authMiddleware);

// Helper: check if requesting user is a member of the org
async function requireOrgMember(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const membership = await apexOrgsDb.getMembership(req.params.id, req.user.id);
    if (!membership) return res.status(403).json({ error: 'Not a member of this organization' });
    req.orgRole = membership.role;
    req.orgId = req.params.id;
    next();
  } catch (err) {
    console.error('Error checking org membership:', err);
    res.status(500).json({ error: 'Failed to verify membership' });
  }
}

// Helper: check if requesting user has management role in the org
function requireManagement(req, res, next) {
  if (req.orgRole !== 'management') {
    return res.status(403).json({ error: 'Management role required' });
  }
  next();
}

// GET /mine - Get user's org(s) + role
router.get('/mine', requireScope('org', 'read'), async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const orgs = await apexOrgsDb.getUserOrgs(req.user.id);
    res.json(orgs);
  } catch (err) {
    console.error('Error getting user orgs:', err);
    res.status(500).json({ error: 'Failed to get organizations' });
  }
});

// GET /:id - Get org details
router.get('/:id', requireScope('org', 'read'), requireOrgMember, async (req, res) => {
  try {
    const org = await apexOrgsDb.getOrgById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    res.json(org);
  } catch (err) {
    console.error('Error getting org:', err);
    res.status(500).json({ error: 'Failed to get organization' });
  }
});

// GET /:id/members - List members with user info
router.get('/:id/members', requireScope('org', 'read'), requireOrgMember, async (req, res) => {
  try {
    const members = await apexOrgsDb.getOrgMembers(req.params.id);
    res.json(members);
  } catch (err) {
    console.error('Error getting org members:', err);
    res.status(500).json({ error: 'Failed to get members' });
  }
});

// POST /:id/members - Add member (management only)
router.post('/:id/members', requireScope('org', 'admin'), requireOrgMember, requireManagement, async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email || !role) {
      return res.status(400).json({ error: 'email and role are required' });
    }

    const validRoles = ['management', 'office_coordinator', 'project_manager', 'estimator', 'field_tech'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    // Look up user by email
    const user = await apexOrgsDb.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'No user found with that email' });
    }

    // Check if already a member
    const existing = await apexOrgsDb.getMembership(req.params.id, user.id);
    if (existing) {
      return res.status(409).json({ error: 'User is already a member of this organization' });
    }

    const member = await apexOrgsDb.addMember(req.params.id, user.id, role);
    res.status(201).json(member);
  } catch (err) {
    console.error('Error adding org member:', err);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// PATCH /:id/members/:userId - Change member role (management only)
router.patch('/:id/members/:userId', requireScope('org', 'write'), requireOrgMember, requireManagement, async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) {
      return res.status(400).json({ error: 'role is required' });
    }

    const validRoles = ['management', 'office_coordinator', 'project_manager', 'estimator', 'field_tech'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    const member = await apexOrgsDb.updateMemberRole(req.params.id, req.params.userId, role);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json(member);
  } catch (err) {
    console.error('Error updating member role:', err);
    res.status(500).json({ error: 'Failed to update member role' });
  }
});

// DELETE /:id/members/:userId - Remove member (management only)
router.delete('/:id/members/:userId', requireScope('org', 'admin'), requireOrgMember, requireManagement, async (req, res) => {
  try {
    const success = await apexOrgsDb.removeMember(req.params.id, req.params.userId);
    if (!success) return res.status(404).json({ error: 'Member not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error removing org member:', err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

module.exports = router;
