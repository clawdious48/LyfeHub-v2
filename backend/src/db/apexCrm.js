const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

// ============================================
// CRM ORGANIZATIONS
// ============================================

function createCrmOrg(orgId, data, userId) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO apex_crm_organizations (id, org_id, name, phone, email, website,
      address_line1, address_line2, city, state, zip, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, orgId,
    data.name,
    data.phone || '',
    data.email || '',
    data.website || '',
    data.address_line1 || '',
    data.address_line2 || '',
    data.city || '',
    data.state || '',
    data.zip || '',
    data.notes || '',
    userId
  );
  return getCrmOrgById(id, orgId);
}

function getCrmOrgById(id, orgId) {
  const org = db.prepare(`
    SELECT * FROM apex_crm_organizations WHERE id = ? AND org_id = ?
  `).get(id, orgId);
  if (!org) return null;

  org.tags = db.prepare(`
    SELECT t.id, t.name, t.color FROM apex_crm_org_tags t
    JOIN apex_crm_organization_tag_map m ON m.tag_id = t.id
    WHERE m.crm_organization_id = ?
  `).all(id);

  return org;
}

function getCrmOrgsByOrg(orgId, { search, tag, limit = 50, offset = 0 } = {}) {
  let where = 'WHERE o.org_id = ?';
  const params = [orgId];

  if (search) {
    where += ' AND (o.name LIKE ? OR o.email LIKE ? OR o.phone LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  if (tag) {
    where += ` AND EXISTS (
      SELECT 1 FROM apex_crm_organization_tag_map m
      JOIN apex_crm_org_tags t ON t.id = m.tag_id
      WHERE m.crm_organization_id = o.id AND t.name = ?
    )`;
    params.push(tag);
  }

  params.push(limit, offset);

  const orgs = db.prepare(`
    SELECT o.* FROM apex_crm_organizations o ${where}
    ORDER BY o.name ASC LIMIT ? OFFSET ?
  `).all(...params);

  // Attach tags to each org
  const tagStmt = db.prepare(`
    SELECT t.id, t.name, t.color FROM apex_crm_org_tags t
    JOIN apex_crm_organization_tag_map m ON m.tag_id = t.id
    WHERE m.crm_organization_id = ?
  `);
  for (const org of orgs) {
    org.tags = tagStmt.all(org.id);
  }

  return orgs;
}

function updateCrmOrg(id, data, orgId) {
  const allowedFields = ['name', 'phone', 'email', 'website', 'address_line1', 'address_line2', 'city', 'state', 'zip', 'notes'];
  const sets = [];
  const params = [];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      sets.push(`${field} = ?`);
      params.push(data[field]);
    }
  }

  if (sets.length === 0) return getCrmOrgById(id, orgId);

  sets.push("updated_at = datetime('now')");
  params.push(id, orgId);

  const result = db.prepare(`
    UPDATE apex_crm_organizations SET ${sets.join(', ')} WHERE id = ? AND org_id = ?
  `).run(...params);

  if (result.changes === 0) return null;
  return getCrmOrgById(id, orgId);
}

function deleteCrmOrg(id, orgId) {
  const result = db.prepare(`
    DELETE FROM apex_crm_organizations WHERE id = ? AND org_id = ?
  `).run(id, orgId);
  return result.changes > 0;
}

// ============================================
// CRM ORG TAGS
// ============================================

function createOrgTag(orgId, name, color) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO apex_crm_org_tags (id, org_id, name, color) VALUES (?, ?, ?, ?)
  `).run(id, orgId, name, color || '');
  return db.prepare('SELECT * FROM apex_crm_org_tags WHERE id = ?').get(id);
}

function getOrgTags(orgId) {
  return db.prepare('SELECT * FROM apex_crm_org_tags WHERE org_id = ? ORDER BY name').all(orgId);
}

function updateOrgTag(id, data, orgId) {
  const sets = [];
  const params = [];
  if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
  if (data.color !== undefined) { sets.push('color = ?'); params.push(data.color); }
  if (sets.length === 0) return db.prepare('SELECT * FROM apex_crm_org_tags WHERE id = ? AND org_id = ?').get(id, orgId);

  params.push(id, orgId);
  const result = db.prepare(`UPDATE apex_crm_org_tags SET ${sets.join(', ')} WHERE id = ? AND org_id = ?`).run(...params);
  if (result.changes === 0) return null;
  return db.prepare('SELECT * FROM apex_crm_org_tags WHERE id = ?').get(id);
}

function deleteOrgTag(id, orgId) {
  const result = db.prepare('DELETE FROM apex_crm_org_tags WHERE id = ? AND org_id = ?').run(id, orgId);
  return result.changes > 0;
}

function setOrgTags(crmOrgId, tagIds) {
  const run = db.transaction(() => {
    db.prepare('DELETE FROM apex_crm_organization_tag_map WHERE crm_organization_id = ?').run(crmOrgId);
    const insert = db.prepare('INSERT INTO apex_crm_organization_tag_map (crm_organization_id, tag_id) VALUES (?, ?)');
    for (const tagId of tagIds) {
      insert.run(crmOrgId, tagId);
    }
  });
  run();
}

// ============================================
// CRM CONTACTS
// ============================================

function createContact(orgId, data, userId) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO apex_crm_contacts (id, org_id, first_name, last_name, email, phone, phone_alt,
      address_line1, address_line2, city, state, zip, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, orgId,
    data.first_name,
    data.last_name || '',
    data.email || '',
    data.phone || '',
    data.phone_alt || '',
    data.address_line1 || '',
    data.address_line2 || '',
    data.city || '',
    data.state || '',
    data.zip || '',
    data.notes || '',
    userId
  );
  return getContactById(id, orgId);
}

function getContactById(id, orgId) {
  const contact = db.prepare('SELECT * FROM apex_crm_contacts WHERE id = ? AND org_id = ?').get(id, orgId);
  if (!contact) return null;

  contact.tags = db.prepare(`
    SELECT t.id, t.name, t.color FROM apex_crm_contact_tags t
    JOIN apex_crm_contact_tag_map m ON m.tag_id = t.id
    WHERE m.contact_id = ?
  `).all(id);

  contact.organizations = db.prepare(`
    SELECT o.id, o.name, o.phone, o.email, m.role_title, m.is_primary
    FROM apex_crm_organizations o
    JOIN apex_crm_contact_org_memberships m ON m.crm_organization_id = o.id
    WHERE m.contact_id = ?
  `).all(id);

  contact.jobs = db.prepare(`
    SELECT j.id, j.name, j.status, jc.job_role, jc.notes as link_notes
    FROM apex_jobs j
    JOIN apex_crm_job_contacts jc ON jc.job_id = j.id
    WHERE jc.contact_id = ?
  `).all(id);

  return contact;
}

function getContactsByOrg(orgId, { search, tag, crmOrgId, limit = 50, offset = 0 } = {}) {
  let where = 'WHERE c.org_id = ?';
  const params = [orgId];

  if (search) {
    where += ' AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  if (tag) {
    where += ` AND EXISTS (
      SELECT 1 FROM apex_crm_contact_tag_map m
      JOIN apex_crm_contact_tags t ON t.id = m.tag_id
      WHERE m.contact_id = c.id AND t.name = ?
    )`;
    params.push(tag);
  }

  if (crmOrgId) {
    where += ` AND EXISTS (
      SELECT 1 FROM apex_crm_contact_org_memberships m
      WHERE m.contact_id = c.id AND m.crm_organization_id = ?
    )`;
    params.push(crmOrgId);
  }

  params.push(limit, offset);

  const contacts = db.prepare(`
    SELECT c.* FROM apex_crm_contacts c ${where}
    ORDER BY c.last_name, c.first_name ASC LIMIT ? OFFSET ?
  `).all(...params);

  const tagStmt = db.prepare(`
    SELECT t.id, t.name, t.color FROM apex_crm_contact_tags t
    JOIN apex_crm_contact_tag_map m ON m.tag_id = t.id
    WHERE m.contact_id = ?
  `);
  for (const c of contacts) {
    c.tags = tagStmt.all(c.id);
  }

  return contacts;
}

function updateContact(id, data, orgId) {
  const allowedFields = ['first_name', 'last_name', 'email', 'phone', 'phone_alt', 'address_line1', 'address_line2', 'city', 'state', 'zip', 'notes'];
  const sets = [];
  const params = [];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      sets.push(`${field} = ?`);
      params.push(data[field]);
    }
  }

  if (sets.length === 0) return getContactById(id, orgId);

  sets.push("updated_at = datetime('now')");
  params.push(id, orgId);

  const result = db.prepare(`
    UPDATE apex_crm_contacts SET ${sets.join(', ')} WHERE id = ? AND org_id = ?
  `).run(...params);

  if (result.changes === 0) return null;
  return getContactById(id, orgId);
}

function deleteContact(id, orgId) {
  const result = db.prepare('DELETE FROM apex_crm_contacts WHERE id = ? AND org_id = ?').run(id, orgId);
  return result.changes > 0;
}

// ============================================
// CRM CONTACT TAGS
// ============================================

function createContactTag(orgId, name, color) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO apex_crm_contact_tags (id, org_id, name, color) VALUES (?, ?, ?, ?)
  `).run(id, orgId, name, color || '');
  return db.prepare('SELECT * FROM apex_crm_contact_tags WHERE id = ?').get(id);
}

function getContactTags(orgId) {
  return db.prepare('SELECT * FROM apex_crm_contact_tags WHERE org_id = ? ORDER BY name').all(orgId);
}

function updateContactTag(id, data, orgId) {
  const sets = [];
  const params = [];
  if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
  if (data.color !== undefined) { sets.push('color = ?'); params.push(data.color); }
  if (sets.length === 0) return db.prepare('SELECT * FROM apex_crm_contact_tags WHERE id = ? AND org_id = ?').get(id, orgId);

  params.push(id, orgId);
  const result = db.prepare(`UPDATE apex_crm_contact_tags SET ${sets.join(', ')} WHERE id = ? AND org_id = ?`).run(...params);
  if (result.changes === 0) return null;
  return db.prepare('SELECT * FROM apex_crm_contact_tags WHERE id = ?').get(id);
}

function deleteContactTag(id, orgId) {
  const result = db.prepare('DELETE FROM apex_crm_contact_tags WHERE id = ? AND org_id = ?').run(id, orgId);
  return result.changes > 0;
}

function setContactTags(contactId, tagIds) {
  const run = db.transaction(() => {
    db.prepare('DELETE FROM apex_crm_contact_tag_map WHERE contact_id = ?').run(contactId);
    const insert = db.prepare('INSERT INTO apex_crm_contact_tag_map (contact_id, tag_id) VALUES (?, ?)');
    for (const tagId of tagIds) {
      insert.run(contactId, tagId);
    }
  });
  run();
}

// ============================================
// CONTACT-ORG MEMBERSHIPS
// ============================================

function addContactToOrg(contactId, crmOrgId, roleTitle, isPrimary) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO apex_crm_contact_org_memberships (id, contact_id, crm_organization_id, role_title, is_primary)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, contactId, crmOrgId, roleTitle || '', isPrimary ? 1 : 0);
  return db.prepare('SELECT * FROM apex_crm_contact_org_memberships WHERE id = ?').get(id);
}

function removeContactFromOrg(contactId, crmOrgId) {
  const result = db.prepare(
    'DELETE FROM apex_crm_contact_org_memberships WHERE contact_id = ? AND crm_organization_id = ?'
  ).run(contactId, crmOrgId);
  return result.changes > 0;
}

function getContactOrgs(contactId) {
  return db.prepare(`
    SELECT o.*, m.role_title, m.is_primary
    FROM apex_crm_organizations o
    JOIN apex_crm_contact_org_memberships m ON m.crm_organization_id = o.id
    WHERE m.contact_id = ?
    ORDER BY m.is_primary DESC, o.name
  `).all(contactId);
}

function getOrgContacts(crmOrgId) {
  return db.prepare(`
    SELECT c.*, m.role_title, m.is_primary
    FROM apex_crm_contacts c
    JOIN apex_crm_contact_org_memberships m ON m.contact_id = c.id
    WHERE m.crm_organization_id = ?
    ORDER BY c.last_name, c.first_name
  `).all(crmOrgId);
}

// ============================================
// JOB CONTACTS (CRM version)
// ============================================

function linkContactToJob(jobId, contactId, crmOrgId, jobRole, notes) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO apex_crm_job_contacts (id, job_id, contact_id, crm_organization_id, job_role, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, jobId, contactId, crmOrgId || null, jobRole || 'other', notes || '');
  return db.prepare('SELECT * FROM apex_crm_job_contacts WHERE id = ?').get(id);
}

function unlinkContactFromJob(id) {
  const result = db.prepare('DELETE FROM apex_crm_job_contacts WHERE id = ?').run(id);
  return result.changes > 0;
}

function getJobContacts(jobId) {
  return db.prepare(`
    SELECT jc.*, c.first_name, c.last_name, c.email, c.phone,
      o.name as org_name
    FROM apex_crm_job_contacts jc
    JOIN apex_crm_contacts c ON c.id = jc.contact_id
    LEFT JOIN apex_crm_organizations o ON o.id = jc.crm_organization_id
    WHERE jc.job_id = ?
    ORDER BY jc.job_role, c.last_name
  `).all(jobId);
}

function getContactJobs(contactId) {
  return db.prepare(`
    SELECT jc.*, j.name as job_name, j.status as job_status
    FROM apex_crm_job_contacts jc
    JOIN apex_jobs j ON j.id = jc.job_id
    WHERE jc.contact_id = ?
    ORDER BY j.created_at DESC
  `).all(contactId);
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // CRM Organizations
  createCrmOrg,
  getCrmOrgById,
  getCrmOrgsByOrg,
  updateCrmOrg,
  deleteCrmOrg,

  // Org Tags
  createOrgTag,
  getOrgTags,
  updateOrgTag,
  deleteOrgTag,
  setOrgTags,

  // Contacts
  createContact,
  getContactById,
  getContactsByOrg,
  updateContact,
  deleteContact,

  // Contact Tags
  createContactTag,
  getContactTags,
  updateContactTag,
  deleteContactTag,
  setContactTags,

  // Contact-Org Memberships
  addContactToOrg,
  removeContactFromOrg,
  getContactOrgs,
  getOrgContacts,

  // Job Contacts
  linkContactToJob,
  unlinkContactFromJob,
  getJobContacts,
  getContactJobs,
};
