const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { requireOrgMember, requireOrgRole } = require('../middleware/orgAuth');
const crmDb = require('../db/apexCrm');
const { requireScope } = require('../middleware/scopeAuth');

// All routes require auth + org membership
router.use(authMiddleware, requireOrgMember);

// ============================================
// CRM ORGANIZATIONS
// ============================================

// GET /orgs - List CRM orgs
router.get('/orgs', requireScope('crm', 'read'), async (req, res) => {
  try {
    const orgs = await crmDb.getCrmOrgsByOrg(req.org.id, {
      search: req.query.search,
      tag: req.query.tag,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0,
    });
    res.json(orgs);
  } catch (err) {
    console.error('Error listing CRM orgs:', err);
    res.status(500).json({ error: 'Failed to list CRM organizations' });
  }
});

// POST /orgs - Create CRM org
router.post('/orgs', requireScope('crm', 'write'), requireOrgRole('management', 'office_coordinator', 'project_manager', 'estimator'), async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ error: 'name is required' });
    const org = await crmDb.createCrmOrg(req.org.id, req.body, req.user.id);
    res.status(201).json(org);
  } catch (err) {
    console.error('Error creating CRM org:', err);
    res.status(500).json({ error: 'Failed to create CRM organization' });
  }
});

// GET /orgs/:id - Get CRM org
router.get('/orgs/:id', requireScope('crm', 'read'), async (req, res) => {
  try {
    const org = await crmDb.getCrmOrgById(req.params.id, req.org.id);
    if (!org) return res.status(404).json({ error: 'CRM organization not found' });
    res.json(org);
  } catch (err) {
    console.error('Error getting CRM org:', err);
    res.status(500).json({ error: 'Failed to get CRM organization' });
  }
});

// PATCH /orgs/:id - Update CRM org
router.patch('/orgs/:id', requireScope('crm', 'write'), requireOrgRole('management', 'office_coordinator'), async (req, res) => {
  try {
    const org = await crmDb.updateCrmOrg(req.params.id, req.body, req.org.id);
    if (!org) return res.status(404).json({ error: 'CRM organization not found' });
    res.json(org);
  } catch (err) {
    console.error('Error updating CRM org:', err);
    res.status(500).json({ error: 'Failed to update CRM organization' });
  }
});

// DELETE /orgs/:id - Delete CRM org
router.delete('/orgs/:id', requireScope('crm', 'delete'), requireOrgRole('management'), async (req, res) => {
  try {
    const success = await crmDb.deleteCrmOrg(req.params.id, req.org.id);
    if (!success) return res.status(404).json({ error: 'CRM organization not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting CRM org:', err);
    res.status(500).json({ error: 'Failed to delete CRM organization' });
  }
});

// PUT /orgs/:id/tags - Set tags for CRM org
router.put('/orgs/:id/tags', requireScope('crm', 'write'), requireOrgRole('management', 'office_coordinator'), async (req, res) => {
  try {
    const { tag_ids } = req.body;
    if (!Array.isArray(tag_ids)) return res.status(400).json({ error: 'tag_ids array is required' });
    await crmDb.setOrgTags(req.params.id, tag_ids);
    const org = await crmDb.getCrmOrgById(req.params.id, req.org.id);
    res.json(org);
  } catch (err) {
    console.error('Error setting CRM org tags:', err);
    res.status(500).json({ error: 'Failed to set tags' });
  }
});

// GET /orgs/:id/contacts - Get contacts in a CRM org
router.get('/orgs/:id/contacts', requireScope('crm', 'read'), async (req, res) => {
  try {
    const contacts = await crmDb.getOrgContacts(req.params.id);
    res.json(contacts);
  } catch (err) {
    console.error('Error getting CRM org contacts:', err);
    res.status(500).json({ error: 'Failed to get org contacts' });
  }
});

// ============================================
// CRM ORG TAGS
// ============================================

// GET /org-tags
router.get('/org-tags', requireScope('crm', 'read'), async (req, res) => {
  try {
    res.json(await crmDb.getOrgTags(req.org.id));
  } catch (err) {
    console.error('Error listing org tags:', err);
    res.status(500).json({ error: 'Failed to list org tags' });
  }
});

// POST /org-tags
router.post('/org-tags', requireScope('crm', 'write'), requireOrgRole('management', 'office_coordinator'), async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ error: 'name is required' });
    const tag = await crmDb.createOrgTag(req.org.id, req.body.name, req.body.color);
    res.status(201).json(tag);
  } catch (err) {
    console.error('Error creating org tag:', err);
    res.status(500).json({ error: 'Failed to create org tag' });
  }
});

// PATCH /org-tags/:id
router.patch('/org-tags/:id', requireScope('crm', 'write'), requireOrgRole('management', 'office_coordinator'), async (req, res) => {
  try {
    const tag = await crmDb.updateOrgTag(req.params.id, req.body, req.org.id);
    if (!tag) return res.status(404).json({ error: 'Tag not found' });
    res.json(tag);
  } catch (err) {
    console.error('Error updating org tag:', err);
    res.status(500).json({ error: 'Failed to update org tag' });
  }
});

// DELETE /org-tags/:id
router.delete('/org-tags/:id', requireScope('crm', 'delete'), requireOrgRole('management'), async (req, res) => {
  try {
    const success = await crmDb.deleteOrgTag(req.params.id, req.org.id);
    if (!success) return res.status(404).json({ error: 'Tag not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting org tag:', err);
    res.status(500).json({ error: 'Failed to delete org tag' });
  }
});

// ============================================
// CRM CONTACTS
// ============================================

// GET /contacts
router.get('/contacts', requireScope('crm', 'read'), async (req, res) => {
  try {
    const contacts = await crmDb.getContactsByOrg(req.org.id, {
      search: req.query.search,
      tag: req.query.tag,
      crmOrgId: req.query.crm_org_id,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0,
    });
    res.json(contacts);
  } catch (err) {
    console.error('Error listing contacts:', err);
    res.status(500).json({ error: 'Failed to list contacts' });
  }
});

// POST /contacts
router.post('/contacts', requireScope('crm', 'write'), requireOrgRole('management', 'office_coordinator', 'project_manager', 'estimator'), async (req, res) => {
  try {
    if (!req.body.first_name) return res.status(400).json({ error: 'first_name is required' });
    const contact = await crmDb.createContact(req.org.id, req.body, req.user.id);
    res.status(201).json(contact);
  } catch (err) {
    console.error('Error creating contact:', err);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// GET /contacts/:id
router.get('/contacts/:id', requireScope('crm', 'read'), async (req, res) => {
  try {
    const contact = await crmDb.getContactById(req.params.id, req.org.id);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    res.json(contact);
  } catch (err) {
    console.error('Error getting contact:', err);
    res.status(500).json({ error: 'Failed to get contact' });
  }
});

// PATCH /contacts/:id
router.patch('/contacts/:id', requireScope('crm', 'write'), requireOrgRole('management', 'office_coordinator'), async (req, res) => {
  try {
    const contact = await crmDb.updateContact(req.params.id, req.body, req.org.id);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    res.json(contact);
  } catch (err) {
    console.error('Error updating contact:', err);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// DELETE /contacts/:id
router.delete('/contacts/:id', requireScope('crm', 'delete'), requireOrgRole('management'), async (req, res) => {
  try {
    const success = await crmDb.deleteContact(req.params.id, req.org.id);
    if (!success) return res.status(404).json({ error: 'Contact not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting contact:', err);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// PUT /contacts/:id/tags
router.put('/contacts/:id/tags', requireScope('crm', 'write'), requireOrgRole('management', 'office_coordinator'), async (req, res) => {
  try {
    const { tag_ids } = req.body;
    if (!Array.isArray(tag_ids)) return res.status(400).json({ error: 'tag_ids array is required' });
    await crmDb.setContactTags(req.params.id, tag_ids);
    const contact = await crmDb.getContactById(req.params.id, req.org.id);
    res.json(contact);
  } catch (err) {
    console.error('Error setting contact tags:', err);
    res.status(500).json({ error: 'Failed to set tags' });
  }
});

// POST /contacts/:id/orgs - Add contact to CRM org
router.post('/contacts/:id/orgs', requireScope('crm', 'write'), requireOrgRole('management', 'office_coordinator'), async (req, res) => {
  try {
    const { crm_org_id, role_title, is_primary } = req.body;
    if (!crm_org_id) return res.status(400).json({ error: 'crm_org_id is required' });
    const membership = await crmDb.addContactToOrg(req.params.id, crm_org_id, role_title, is_primary);
    res.status(201).json(membership);
  } catch (err) {
    console.error('Error adding contact to org:', err);
    res.status(500).json({ error: 'Failed to add contact to organization' });
  }
});

// DELETE /contacts/:id/orgs/:crmOrgId
router.delete('/contacts/:id/orgs/:crmOrgId', requireScope('crm', 'write'), requireOrgRole('management', 'office_coordinator'), async (req, res) => {
  try {
    const success = await crmDb.removeContactFromOrg(req.params.id, req.params.crmOrgId);
    if (!success) return res.status(404).json({ error: 'Membership not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error removing contact from org:', err);
    res.status(500).json({ error: 'Failed to remove contact from organization' });
  }
});

// ============================================
// CRM CONTACT TAGS
// ============================================

// GET /contact-tags
router.get('/contact-tags', requireScope('crm', 'read'), async (req, res) => {
  try {
    res.json(await crmDb.getContactTags(req.org.id));
  } catch (err) {
    console.error('Error listing contact tags:', err);
    res.status(500).json({ error: 'Failed to list contact tags' });
  }
});

// POST /contact-tags
router.post('/contact-tags', requireScope('crm', 'write'), requireOrgRole('management', 'office_coordinator'), async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ error: 'name is required' });
    const tag = await crmDb.createContactTag(req.org.id, req.body.name, req.body.color);
    res.status(201).json(tag);
  } catch (err) {
    console.error('Error creating contact tag:', err);
    res.status(500).json({ error: 'Failed to create contact tag' });
  }
});

// PATCH /contact-tags/:id
router.patch('/contact-tags/:id', requireScope('crm', 'write'), requireOrgRole('management', 'office_coordinator'), async (req, res) => {
  try {
    const tag = await crmDb.updateContactTag(req.params.id, req.body, req.org.id);
    if (!tag) return res.status(404).json({ error: 'Tag not found' });
    res.json(tag);
  } catch (err) {
    console.error('Error updating contact tag:', err);
    res.status(500).json({ error: 'Failed to update contact tag' });
  }
});

// DELETE /contact-tags/:id
router.delete('/contact-tags/:id', requireScope('crm', 'delete'), requireOrgRole('management'), async (req, res) => {
  try {
    const success = await crmDb.deleteContactTag(req.params.id, req.org.id);
    if (!success) return res.status(404).json({ error: 'Tag not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting contact tag:', err);
    res.status(500).json({ error: 'Failed to delete contact tag' });
  }
});

// ============================================
// JOB CONTACT LINKING
// ============================================

// GET /jobs/:jobId/contacts
router.get('/jobs/:jobId/contacts', requireScope('crm', 'read'), async (req, res) => {
  try {
    const contacts = await crmDb.getJobContacts(req.params.jobId);
    res.json(contacts);
  } catch (err) {
    console.error('Error getting job contacts:', err);
    res.status(500).json({ error: 'Failed to get job contacts' });
  }
});

// POST /jobs/:jobId/contacts
router.post('/jobs/:jobId/contacts', requireScope('crm', 'write'), async (req, res) => {
  try {
    const { contact_id, crm_organization_id, job_role, notes } = req.body;
    if (!contact_id) return res.status(400).json({ error: 'contact_id is required' });
    const link = await crmDb.linkContactToJob(req.params.jobId, contact_id, crm_organization_id, job_role, notes);
    res.status(201).json(link);
  } catch (err) {
    console.error('Error linking contact to job:', err);
    res.status(500).json({ error: 'Failed to link contact to job' });
  }
});

// DELETE /jobs/:jobId/contacts/:id
router.delete('/jobs/:jobId/contacts/:id', requireScope('crm', 'delete'), requireOrgRole('management', 'office_coordinator'), async (req, res) => {
  try {
    const success = await crmDb.unlinkContactFromJob(req.params.id);
    if (!success) return res.status(404).json({ error: 'Job contact link not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error unlinking contact from job:', err);
    res.status(500).json({ error: 'Failed to unlink contact from job' });
  }
});

module.exports = router;
