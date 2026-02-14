const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a document record
 */
function createDocument({ orgId, jobId, phaseId, entityType, entityId, documentType, title, fileName, filePath, fileSize, mimeType, description, uploadedBy }) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO apex_documents (id, org_id, job_id, phase_id, entity_type, entity_id, document_type, title, file_name, file_path, file_size, mime_type, description, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, orgId, jobId, phaseId || null, entityType || 'job', entityId || '', documentType || 'other', title || '', fileName, filePath, fileSize || 0, mimeType || '', description || '', uploadedBy);
  return getDocumentById(id, orgId);
}

/**
 * Get a single document by ID (org-scoped)
 */
function getDocumentById(id, orgId) {
  return db.prepare('SELECT * FROM apex_documents WHERE id = ? AND org_id = ?').get(id, orgId);
}

/**
 * Get all documents for a job (org-scoped)
 */
function getDocumentsByJob(jobId, orgId, { documentType, entityType } = {}) {
  let sql = 'SELECT * FROM apex_documents WHERE job_id = ? AND org_id = ?';
  const params = [jobId, orgId];
  if (documentType) {
    sql += ' AND document_type = ?';
    params.push(documentType);
  }
  if (entityType) {
    sql += ' AND entity_type = ?';
    params.push(entityType);
  }
  sql += ' ORDER BY uploaded_at DESC';
  return db.prepare(sql).all(...params);
}

/**
 * Get documents by entity (e.g., entity_type='estimate', entity_id='est-uuid')
 */
function getDocumentsByEntity(entityType, entityId, orgId) {
  return db.prepare('SELECT * FROM apex_documents WHERE entity_type = ? AND entity_id = ? AND org_id = ? ORDER BY uploaded_at DESC')
    .all(entityType, entityId, orgId);
}

/**
 * Update document metadata
 */
function updateDocument(id, orgId, updates) {
  const allowed = ['title', 'description', 'document_type', 'entity_type', 'entity_id', 'phase_id'];
  const setClauses = [];
  const params = [];
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      setClauses.push(`${key} = ?`);
      params.push(updates[key]);
    }
  }
  if (setClauses.length === 0) return getDocumentById(id, orgId);
  params.push(id, orgId);
  db.prepare(`UPDATE apex_documents SET ${setClauses.join(', ')} WHERE id = ? AND org_id = ?`).run(...params);
  return getDocumentById(id, orgId);
}

/**
 * Delete a document record
 */
function deleteDocument(id, orgId) {
  const doc = getDocumentById(id, orgId);
  if (!doc) return null;
  db.prepare('DELETE FROM apex_documents WHERE id = ? AND org_id = ?').run(id, orgId);
  return doc;
}

/**
 * Search documents by title/description/filename
 */
function searchDocuments(orgId, query, { jobId, documentType } = {}) {
  let sql = 'SELECT * FROM apex_documents WHERE org_id = ? AND (title LIKE ? OR description LIKE ? OR file_name LIKE ?)';
  const like = `%${query}%`;
  const params = [orgId, like, like, like];
  if (jobId) {
    sql += ' AND job_id = ?';
    params.push(jobId);
  }
  if (documentType) {
    sql += ' AND document_type = ?';
    params.push(documentType);
  }
  sql += ' ORDER BY uploaded_at DESC';
  return db.prepare(sql).all(...params);
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
