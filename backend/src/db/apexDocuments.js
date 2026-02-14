const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a document record
 */
async function createDocument({ orgId, jobId, phaseId, entityType, entityId, documentType, title, fileName, filePath, fileSize, mimeType, description, uploadedBy }) {
  const id = uuidv4();
  await db.run(`
    INSERT INTO apex_documents (id, org_id, job_id, phase_id, entity_type, entity_id, document_type, title, file_name, file_path, file_size, mime_type, description, uploaded_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  `, [id, orgId, jobId, phaseId || null, entityType || 'job', entityId || '', documentType || 'other', title || '', fileName, filePath, fileSize || 0, mimeType || '', description || '', uploadedBy]);
  return getDocumentById(id, orgId);
}

/**
 * Get a single document by ID (org-scoped)
 */
async function getDocumentById(id, orgId) {
  return await db.getOne('SELECT * FROM apex_documents WHERE id = $1 AND org_id = $2', [id, orgId]);
}

/**
 * Get all documents for a job (org-scoped)
 */
async function getDocumentsByJob(jobId, orgId, { documentType, entityType } = {}) {
  let sql = 'SELECT * FROM apex_documents WHERE job_id = $1 AND org_id = $2';
  const params = [jobId, orgId];
  let paramIdx = 3;
  if (documentType) {
    sql += ` AND document_type = $${paramIdx++}`;
    params.push(documentType);
  }
  if (entityType) {
    sql += ` AND entity_type = $${paramIdx++}`;
    params.push(entityType);
  }
  sql += ' ORDER BY uploaded_at DESC';
  return await db.getAll(sql, params);
}

/**
 * Get documents by entity (e.g., entity_type='estimate', entity_id='est-uuid')
 */
async function getDocumentsByEntity(entityType, entityId, orgId) {
  return await db.getAll('SELECT * FROM apex_documents WHERE entity_type = $1 AND entity_id = $2 AND org_id = $3 ORDER BY uploaded_at DESC',
    [entityType, entityId, orgId]);
}

/**
 * Update document metadata
 */
async function updateDocument(id, orgId, updates) {
  const allowed = ['title', 'description', 'document_type', 'entity_type', 'entity_id', 'phase_id'];
  const setClauses = [];
  const params = [];
  let paramIdx = 1;
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      setClauses.push(`${key} = $${paramIdx++}`);
      params.push(updates[key]);
    }
  }
  if (setClauses.length === 0) return getDocumentById(id, orgId);
  params.push(id, orgId);
  await db.run(`UPDATE apex_documents SET ${setClauses.join(', ')} WHERE id = $${paramIdx++} AND org_id = $${paramIdx++}`, params);
  return getDocumentById(id, orgId);
}

/**
 * Delete a document record
 */
async function deleteDocument(id, orgId) {
  const doc = await getDocumentById(id, orgId);
  if (!doc) return null;
  await db.run('DELETE FROM apex_documents WHERE id = $1 AND org_id = $2', [id, orgId]);
  return doc;
}

/**
 * Search documents by title/description/filename
 */
async function searchDocuments(orgId, query, { jobId, documentType } = {}) {
  let sql = 'SELECT * FROM apex_documents WHERE org_id = $1 AND (title ILIKE $2 OR description ILIKE $3 OR file_name ILIKE $4)';
  const like = `%${query}%`;
  const params = [orgId, like, like, like];
  let paramIdx = 5;
  if (jobId) {
    sql += ` AND job_id = $${paramIdx++}`;
    params.push(jobId);
  }
  if (documentType) {
    sql += ` AND document_type = $${paramIdx++}`;
    params.push(documentType);
  }
  sql += ' ORDER BY uploaded_at DESC';
  return await db.getAll(sql, params);
}

module.exports = {
  createDocument,
  getDocumentById,
  getDocumentsByJob,
  getDocumentsByEntity,
  updateDocument,
  deleteDocument,
  searchDocuments
};
