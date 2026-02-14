// ============================================
// Notes Database Operations
// ============================================

const db = require('./schema');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

/**
 * Delete attachment files from disk
 * @param {Array} attachments - Array of attachment objects with path property
 */
function deleteNoteFiles(attachments) {
  if (!Array.isArray(attachments)) return;

  for (const file of attachments) {
    if (!file || !file.path) continue;

    const fullPath = path.join('/data', file.path);
    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(`Deleted attachment file: ${fullPath}`);
      }
    } catch (err) {
      console.warn(`Failed to delete attachment file ${fullPath}:`, err.message);
    }
  }
}

/**
 * Get all notes for a user
 */
async function getAllNotes(userId) {
  return await db.getAll(`
    SELECT * FROM notes
    WHERE user_id = $1
    ORDER BY created_at DESC
  `, [userId]);
}

/**
 * Get a single note by ID
 */
async function getNoteById(id, userId) {
  return await db.getOne(`
    SELECT * FROM notes
    WHERE id = $1 AND user_id = $2
  `, [id, userId]);
}

/**
 * Create a new note
 */
async function createNote(data, userId) {
  const id = uuidv4();
  const now = new Date().toISOString();

  await db.run(`
    INSERT INTO notes (
      id, user_id, name, type, archived, favorite,
      note_date, review_date, url, content, tags, attachments, project_id,
      domain, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12, $13,
      $14, $15, $16
    )
  `, [
    id, userId,
    data.name || 'Untitled Note',
    data.type || '',
    data.archived ? 1 : 0,
    data.favorite ? 1 : 0,
    data.note_date || null,
    data.review_date || null,
    data.url || '',
    data.content || '',
    JSON.stringify(data.tags || []),
    JSON.stringify(data.attachments || []),
    data.project_id || null,
    JSON.stringify(data.domain || []),
    now, now
  ]);

  return await getNoteById(id, userId);
}

/**
 * Update a note
 */
async function updateNote(id, data, userId) {
  const existing = await getNoteById(id, userId);
  if (!existing) return null;

  const now = new Date().toISOString();

  const val = (key, isJson = false) => {
    if (data[key] === undefined) {
      return isJson ? existing[key] : existing[key];
    }
    return isJson ? JSON.stringify(data[key]) : data[key];
  };

  await db.run(`
    UPDATE notes SET
      name = $1,
      type = $2,
      archived = $3,
      favorite = $4,
      note_date = $5,
      review_date = $6,
      url = $7,
      content = $8,
      tags = $9,
      attachments = $10,
      project_id = $11,
      domain = $12,
      updated_at = $13
    WHERE id = $14 AND user_id = $15
  `, [
    data.name !== undefined ? data.name : existing.name,
    val('type'),
    data.archived !== undefined ? (data.archived ? 1 : 0) : existing.archived,
    data.favorite !== undefined ? (data.favorite ? 1 : 0) : existing.favorite,
    data.note_date !== undefined ? data.note_date : existing.note_date,
    data.review_date !== undefined ? data.review_date : existing.review_date,
    val('url'),
    val('content'),
    val('tags', true),
    val('attachments', true),
    data.project_id !== undefined ? data.project_id : existing.project_id,
    val('domain', true),
    now,
    id, userId
  ]);

  return await getNoteById(id, userId);
}

/**
 * Delete a note and its attachment files
 */
async function deleteNote(id, userId) {
  const note = await getNoteById(id, userId);
  if (!note) return false;

  let attachments = [];
  try {
    attachments = JSON.parse(note.attachments || '[]');
  } catch (e) {
    // Ignore parse errors
  }

  deleteNoteFiles(attachments);

  const result = await db.run(`
    DELETE FROM notes
    WHERE id = $1 AND user_id = $2
  `, [id, userId]);
  return result.rowCount > 0;
}

/**
 * Get note count for a user
 */
async function getNoteCount(userId) {
  const result = await db.getOne('SELECT COUNT(*) as count FROM notes WHERE user_id = $1', [userId]);
  return result ? parseInt(result.count) : 0;
}

/**
 * Search notes by name or content
 */
async function searchNotes(userId, query) {
  const searchTerm = `%${query}%`;
  return await db.getAll(`
    SELECT * FROM notes
    WHERE user_id = $1
      AND (name ILIKE $2 OR content ILIKE $3 OR url ILIKE $4)
    ORDER BY created_at DESC
  `, [userId, searchTerm, searchTerm, searchTerm]);
}

module.exports = {
  getAllNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  getNoteCount,
  searchNotes
};
