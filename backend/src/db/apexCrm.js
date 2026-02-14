const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

// ============================================
// CRM ORGANIZATIONS
// ============================================

async function createCrmOrg(orgId, data, userId) {
  const id = uuidv4();
  await db.run(`
    INSERT INTO apex_crm_organizations (id, org_id, name, phone, email, website,
      address_line1, address_line2, city, state, zip, notes, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
  `, [
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
  ]);
  return getCrmOrgById(id, orgId);
}

async function getCrmOrgById(id, orgId) {
  const org = await db.getOne(`
    SELECT * FROM apex_crm_organizations WHERE id = $1 AND org_id = $2
  `, [id, orgId]);
  if (!org) return null;

  org.tags = await db.getAll(`
    SELECT t.id, t.name, t.color FROM apex_crm_org_tags t
    JOIN apex_crm_organization_tag_map m ON m.tag_id = t.id
    WHERE m.crm_organization_id = $1
  `, [id]);

  return org;
}

async function getCrmOrgsByOrg(orgId, { search, tag, limit = 50, offset = 0 } = {}) {
  let where = 'WHERE o.org_id = $1';
  const params = [orgId];
  let paramIdx = 2;

  if (search) {
    where += ` AND (o.name ILIKE $${paramIdx} OR o.email ILIKE $${paramIdx + 1} OR o.phone ILIKE $${paramIdx + 2})`;
    const s = `%${search}%`;
    params.push(s, s, s);
    paramIdx += 3;
  }

  if (tag) {
    where += ` AND EXISTS (
      SELECT 1 FROM apex_crm_organization_tag_map m
      JOIN apex_crm_org_tags t ON t.id = m.tag_id
      WHERE m.crm_organization_id = o.id AND t.name = $${paramIdx}
    )`;
    params.push(tag);
    paramIdx++;
  }

  params.push(limit, offset);

  const orgs = await db.getAll(`
    SELECT o.* FROM apex_crm_organizations o ${where}
    ORDER BY o.name ASC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `, params);

  // Attach tags to each org
  for (const org of orgs) {
    org.tags = await db.getAll(`
      SELECT t.id, t.name, t.color FROM apex_crm_org_tags t
      JOIN apex_crm_organization_tag_map m ON m.tag_id = t.id
      WHERE m.crm_organization_id = $1
    `, [org.id]);
  }

  return orgs;
}

async function updateCrmOrg(id, data, orgId) {
  const allowedFields = ['name', 'phone', 'email', 'website', 'address_line1', 'address_line2', 'city', 'state', 'zip', 'notes'];
  const sets = [];
  const params = [];
  let paramIdx = 1;

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      sets.push(`${field} = $${paramIdx++}`);
      params.push(data[field]);
    }
  }

  if (sets.length === 0) return getCrmOrgById(id, orgId);

  sets.push(`updated_at = NOW()`);
  params.push(id, orgId);

  const result = await db.run(`
    UPDATE apex_crm_organizations SET ${sets.join(', ')} WHERE id = $${paramIdx++} AND org_id = $${paramIdx++}
  `, params);

  if (result.rowCount === 0) return null;
  return getCrmOrgById(id, orgId);
}

async function deleteCrmOrg(id, orgId) {
  const result = await db.run(`
    DELETE FROM apex_crm_organizations WHERE id = $1 AND org_id = $2
  `, [id, orgId]);
  return result.rowCount > 0;
}

// ============================================
// CRM ORG TAGS
// ============================================

async function createOrgTag(orgId, name, color) {
  const id = uuidv4();
  await db.run(`
    INSERT INTO apex_crm_org_tags (id, org_id, name, color) VALUES ($1, $2, $3, $4)
  `, [id, orgId, name, color || '']);
  return await db.getOne('SELECT * FROM apex_crm_org_tags WHERE id = $1', [id]);
}

async function getOrgTags(orgId) {
  return await db.getAll('SELECT * FROM apex_crm_org_tags WHERE org_id = $1 ORDER BY name', [orgId]);
}

async function updateOrgTag(id, data, orgId) {
  const sets = [];
  const params = [];
  let paramIdx = 1;
  if (data.name !== undefined) { sets.push(`name = $${paramIdx++}`); params.push(data.name); }
  if (data.color !== undefined) { sets.push(`color = $${paramIdx++}`); params.push(data.color); }
  if (sets.length === 0) return await db.getOne('SELECT * FROM apex_crm_org_tags WHERE id = $1 AND org_id = $2', [id, orgId]);

  params.push(id, orgId);
  const result = await db.run(`UPDATE apex_crm_org_tags SET ${sets.join(', ')} WHERE id = $${paramIdx++} AND org_id = $${paramIdx++}`, params);
  if (result.rowCount === 0) return null;
  return await db.getOne('SELECT * FROM apex_crm_org_tags WHERE id = $1', [id]);
}

async function deleteOrgTag(id, orgId) {
  const result = await db.run('DELETE FROM apex_crm_org_tags WHERE id = $1 AND org_id = $2', [id, orgId]);
  return result.rowCount > 0;
}

async function setOrgTags(crmOrgId, tagIds) {
  await db.transaction(async (client) => {
    await client.run('DELETE FROM apex_crm_organization_tag_map WHERE crm_organization_id = $1', [crmOrgId]);
    for (const tagId of tagIds) {
      await client.run('INSERT INTO apex_crm_organization_tag_map (crm_organization_id, tag_id) VALUES ($1, $2)', [crmOrgId, tagId]);
    }
  });
}

// ============================================
// CRM CONTACTS
// ============================================

async function createContact(orgId, data, userId) {
  const id = uuidv4();
  await db.run(`
    INSERT INTO apex_crm_contacts (id, org_id, first_name, last_name, email, phone, phone_alt,
      address_line1, address_line2, city, state, zip, notes, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  `, [
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
  ]);
  return getContactById(id, orgId);
}

async function getContactById(id, orgId) {
  const contact = await db.getOne('SELECT * FROM apex_crm_contacts WHERE id = $1 AND org_id = $2', [id, orgId]);
  if (!contact) return null;

  contact.tags = await db.getAll(`
    SELECT t.id, t.name, t.color FROM apex_crm_contact_tags t
    JOIN apex_crm_contact_tag_map m ON m.tag_id = t.id
    WHERE m.contact_id = $1
  `, [id]);

  contact.organizations = await db.getAll(`
    SELECT o.id, o.name, o.phone, o.email, m.role_title, m.is_primary
    FROM apex_crm_organizations o
    JOIN apex_crm_contact_org_memberships m ON m.crm_organization_id = o.id
    WHERE m.contact_id = $1
  `, [id]);

  contact.jobs = await db.getAll(`
    SELECT j.id, j.name, j.status, jc.job_role, jc.notes as link_notes
    FROM apex_jobs j
    JOIN apex_crm_job_contacts jc ON jc.job_id = j.id
    WHERE jc.contact_id = $1
  `, [id]);

  return contact;
}

async function getContactsByOrg(orgId, { search, tag, crmOrgId, limit = 50, offset = 0 } = {}) {
  let where = 'WHERE c.org_id = $1';
  const params = [orgId];
  let paramIdx = 2;

  if (search) {
    where += ` AND (c.first_name ILIKE $${paramIdx} OR c.last_name ILIKE $${paramIdx + 1} OR c.email ILIKE $${paramIdx + 2} OR c.phone ILIKE $${paramIdx + 3})`;
    const s = `%${search}%`;
    params.push(s, s, s, s);
    paramIdx += 4;
  }

  if (tag) {
    where += ` AND EXISTS (
      SELECT 1 FROM apex_crm_contact_tag_map m
      JOIN apex_crm_contact_tags t ON t.id = m.tag_id
      WHERE m.contact_id = c.id AND t.name = $${paramIdx}
    )`;
    params.push(tag);
    paramIdx++;
  }

  if (crmOrgId) {
    where += ` AND EXISTS (
      SELECT 1 FROM apex_crm_contact_org_memberships m
      WHERE m.contact_id = c.id AND m.crm_organization_id = $${paramIdx}
    )`;
    params.push(crmOrgId);
    paramIdx++;
  }

  params.push(limit, offset);

  const contacts = await db.getAll(`
    SELECT c.* FROM apex_crm_contacts c ${where}
    ORDER BY c.last_name, c.first_name ASC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `, params);

  for (const c of contacts) {
    c.tags = await db.getAll(`
      SELECT t.id, t.name, t.color FROM apex_crm_contact_tags t
      JOIN apex_crm_contact_tag_map m ON m.tag_id = t.id
      WHERE m.contact_id = $1
    `, [c.id]);
  }

  return contacts;
}

async function updateContact(id, data, orgId) {
  const allowedFields = ['first_name', 'last_name', 'email', 'phone', 'phone_alt', 'address_line1', 'address_line2', 'city', 'state', 'zip', 'notes'];
  const sets = [];
  const params = [];
  let paramIdx = 1;

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      sets.push(`${field} = $${paramIdx++}`);
      params.push(data[field]);
    }
  }

  if (sets.length === 0) return getContactById(id, orgId);

  sets.push(`updated_at = NOW()`);
  params.push(id, orgId);

  const result = await db.run(`
    UPDATE apex_crm_contacts SET ${sets.join(', ')} WHERE id = $${paramIdx++} AND org_id = $${paramIdx++}
  `, params);

  if (result.rowCount === 0) return null;
  return getContactById(id, orgId);
}

async function deleteContact(id, orgId) {
  const result = await db.run('DELETE FROM apex_crm_contacts WHERE id = $1 AND org_id = $2', [id, orgId]);
  return result.rowCount > 0;
}

// ============================================
// CRM CONTACT TAGS
// ============================================

async function createContactTag(orgId, name, color) {
  const id = uuidv4();
  await db.run(`
    INSERT INTO apex_crm_contact_tags (id, org_id, name, color) VALUES ($1, $2, $3, $4)
  `, [id, orgId, name, color || '']);
  return await db.getOne('SELECT * FROM apex_crm_contact_tags WHERE id = $1', [id]);
}

async function getContactTags(orgId) {
  return await db.getAll('SELECT * FROM apex_crm_contact_tags WHERE org_id = $1 ORDER BY name', [orgId]);
}

async function updateContactTag(id, data, orgId) {
  const sets = [];
  const params = [];
  let paramIdx = 1;
  if (data.name !== undefined) { sets.push(`name = $${paramIdx++}`); params.push(data.name); }
  if (data.color !== undefined) { sets.push(`color = $${paramIdx++}`); params.push(data.color); }
  if (sets.length === 0) return await db.getOne('SELECT * FROM apex_crm_contact_tags WHERE id = $1 AND org_id = $2', [id, orgId]);

  params.push(id, orgId);
  const result = await db.run(`UPDATE apex_crm_contact_tags SET ${sets.join(', ')} WHERE id = $${paramIdx++} AND org_id = $${paramIdx++}`, params);
  if (result.rowCount === 0) return null;
  return await db.getOne('SELECT * FROM apex_crm_contact_tags WHERE id = $1', [id]);
}

async function deleteContactTag(id, orgId) {
  const result = await db.run('DELETE FROM apex_crm_contact_tags WHERE id = $1 AND org_id = $2', [id, orgId]);
  return result.rowCount > 0;
}

async function setContactTags(contactId, tagIds) {
  await db.transaction(async (client) => {
    await client.run('DELETE FROM apex_crm_contact_tag_map WHERE contact_id = $1', [contactId]);
    for (const tagId of tagIds) {
      await client.run('INSERT INTO apex_crm_contact_tag_map (contact_id, tag_id) VALUES ($1, $2)', [contactId, tagId]);
    }
  });
}

// ============================================
// CONTACT-ORG MEMBERSHIPS
// ============================================

async function addContactToOrg(contactId, crmOrgId, roleTitle, isPrimary) {
  const id = uuidv4();
  await db.run(`
    INSERT INTO apex_crm_contact_org_memberships (id, contact_id, crm_organization_id, role_title, is_primary)
    VALUES ($1, $2, $3, $4, $5)
  `, [id, contactId, crmOrgId, roleTitle || '', isPrimary ? 1 : 0]);
  return await db.getOne('SELECT * FROM apex_crm_contact_org_memberships WHERE id = $1', [id]);
}

async function removeContactFromOrg(contactId, crmOrgId) {
  const result = await db.run(
    'DELETE FROM apex_crm_contact_org_memberships WHERE contact_id = $1 AND crm_organization_id = $2',
    [contactId, crmOrgId]
  );
  return result.rowCount > 0;
}

async function getContactOrgs(contactId) {
  return await db.getAll(`
    SELECT o.*, m.role_title, m.is_primary
    FROM apex_crm_organizations o
    JOIN apex_crm_contact_org_memberships m ON m.crm_organization_id = o.id
    WHERE m.contact_id = $1
    ORDER BY m.is_primary DESC, o.name
  `, [contactId]);
}

async function getOrgContacts(crmOrgId) {
  return await db.getAll(`
    SELECT c.*, m.role_title, m.is_primary
    FROM apex_crm_contacts c
    JOIN apex_crm_contact_org_memberships m ON m.contact_id = c.id
    WHERE m.crm_organization_id = $1
    ORDER BY c.last_name, c.first_name
  `, [crmOrgId]);
}

// ============================================
// JOB CONTACTS (CRM version)
// ============================================

async function linkContactToJob(jobId, contactId, crmOrgId, jobRole, notes) {
  const id = uuidv4();
  await db.run(`
    INSERT INTO apex_crm_job_contacts (id, job_id, contact_id, crm_organization_id, job_role, notes)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [id, jobId, contactId, crmOrgId || null, jobRole || 'other', notes || '']);
  return await db.getOne('SELECT * FROM apex_crm_job_contacts WHERE id = $1', [id]);
}

async function unlinkContactFromJob(id) {
  const result = await db.run('DELETE FROM apex_crm_job_contacts WHERE id = $1', [id]);
  return result.rowCount > 0;
}

async function getJobContacts(jobId) {
  return await db.getAll(`
    SELECT jc.*, c.first_name, c.last_name, c.email, c.phone,
      o.name as org_name
    FROM apex_crm_job_contacts jc
    JOIN apex_crm_contacts c ON c.id = jc.contact_id
    LEFT JOIN apex_crm_organizations o ON o.id = jc.crm_organization_id
    WHERE jc.job_id = $1
    ORDER BY jc.job_role, c.last_name
  `, [jobId]);
}

async function getContactJobs(contactId) {
  return await db.getAll(`
    SELECT jc.*, j.name as job_name, j.status as job_status
    FROM apex_crm_job_contacts jc
    JOIN apex_jobs j ON j.id = jc.job_id
    WHERE jc.contact_id = $1
    ORDER BY j.created_at DESC
  `, [contactId]);
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
