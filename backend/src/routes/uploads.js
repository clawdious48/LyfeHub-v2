const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');

// Base upload directory
const UPLOAD_BASE = '/data/uploads';

// Broad file type allowlist: images, videos, audio, PDFs, Office docs, text, CSV
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  
  // Videos
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/mpeg',
  
  // Audio
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  'audio/aac',
  'audio/flac',
  'audio/x-m4a',
  
  // PDFs
  'application/pdf',
  
  // Microsoft Office
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  
  // Text/CSV
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json',
  
  // Archives (common)
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/gzip'
];

/**
 * Sanitize filename - keep only safe characters
 * @param {string} filename 
 * @returns {string}
 */
function sanitizeFilename(filename) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  // Replace unsafe characters with underscores, limit length
  const safeName = base
    .replace(/[^a-zA-Z0-9-_. ]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 100);
  return safeName + ext;
}

/**
 * Get upload directory for user based on current date
 * @param {string} userId 
 * @returns {{ dir: string, year: string, month: string }}
 */
function getUploadPath(userId) {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const dir = path.join(UPLOAD_BASE, userId, year, month);
  return { dir, year, month };
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { dir } = getUploadPath(req.user.id);
    
    // Create directory if it doesn't exist
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safeName = sanitizeFilename(file.originalname);
    const uuid = uuidv4();
    cb(null, `${uuid}-${safeName}`);
  }
});

// File filter - check against allowlist
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`), false);
  }
};

// Multer configuration - NO SIZE/COUNT LIMITS per Jake's request
const upload = multer({
  storage,
  fileFilter
  // No limits specified = unlimited
});

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * POST /api/uploads
 * Upload one or more files
 * Returns array of file metadata
 */
router.post('/', upload.array('files'), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    const { year, month } = getUploadPath(req.user.id);
    
    const files = req.files.map(f => ({
      id: uuidv4(),
      filename: f.filename,
      originalName: f.originalname,
      mimeType: f.mimetype,
      size: f.size,
      uploadedAt: new Date().toISOString(),
      // Store relative path for API access
      path: `/uploads/${req.user.id}/${year}/${month}/${f.filename}`
    }));
    
    console.log(`Uploaded ${files.length} file(s) for user ${req.user.id}`);
    res.json({ files });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

/**
 * GET /api/uploads/:userId/:year/:month/:filename
 * Serve a file with auth check
 */
router.get('/:userId/:year/:month/:filename', (req, res) => {
  const { userId, year, month, filename } = req.params;
  
  // Security: Only allow user to access their own files
  if (req.user.id !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Validate path components to prevent path traversal
  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  
  // Ensure filename doesn't contain path separators
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  
  const filePath = path.join(UPLOAD_BASE, userId, year, month, filename);
  
  // Verify the resolved path is still within the uploads directory
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(UPLOAD_BASE))) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.sendFile(filePath);
});

/**
 * DELETE /api/uploads
 * Delete a file
 * Body: { path: "/uploads/userId/year/month/filename" }
 */
router.delete('/', (req, res) => {
  const { path: filePath } = req.body;
  
  if (!filePath) {
    return res.status(400).json({ error: 'Path is required' });
  }
  
  // Security: Validate path belongs to user
  const expectedPrefix = `/uploads/${req.user.id}/`;
  if (!filePath.startsWith(expectedPrefix)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Extract and validate path components
  const pathParts = filePath.replace('/uploads/', '').split('/');
  if (pathParts.length !== 4) {
    return res.status(400).json({ error: 'Invalid path format' });
  }
  
  const [userId, year, month, filename] = pathParts;
  
  // Additional validation
  if (userId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  
  if (filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  
  const fullPath = path.join(UPLOAD_BASE, userId, year, month, filename);
  
  // Verify the resolved path is still within the uploads directory
  const resolvedPath = path.resolve(fullPath);
  if (!resolvedPath.startsWith(path.resolve(UPLOAD_BASE))) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
      console.log(`Deleted file for user ${req.user.id}: ${filename}`);
    } catch (error) {
      console.error('Delete error:', error);
      return res.status(500).json({ error: 'Failed to delete file' });
    }
  }
  
  res.json({ success: true });
});

// Error handling middleware for multer errors
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err);
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err.message && err.message.includes('not allowed')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;
