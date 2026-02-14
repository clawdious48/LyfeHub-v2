const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const { authMiddleware } = require('../middleware/auth');
const { requireOrgMember, requireOrgRole } = require('../middleware/orgAuth');
const docsDb = require('../db/apexDocuments');

// ============================================
// CONFIG
// ============================================

const UPLOAD_BASE = '/data/uploads/apex-docs';
const TMP_DIR = '/data/uploads/tmp';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

const ALLOWED_MIME_TYPES = [
  ...IMAGE_TYPES,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// ============================================
// MULTER
// ============================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(TMP_DIR, { recursive: true });
    cb(null, TMP_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed.`), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } });

// ============================================
// AUTH
// ============================================

router.use(authMiddleware, requireOrgMember);

// ============================================
// ROUTES
// ============================================

// POST /upload — upload file(s)
router.post('/upload', upload.array('files', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { job_id, phase_id, entity_type, entity_id, document_type, description } = req.body;
    if (!job_id) return res.status(400).json({ error: 'job_id is required' });

    const orgId = req.orgId;
    const outputDir = path.join(UPLOAD_BASE, orgId, job_id);
    fs.mkdirSync(outputDir, { recursive: true });

    const results = [];

    for (const file of req.files) {
      const fileId = uuidv4();
      const ext = path.extname(file.originalname).toLowerCase();
      let finalFilename, finalPath;

      try {
        if (IMAGE_TYPES.includes(file.mimetype)) {
          // Process image: resize + thumbnail
          finalFilename = `${fileId}.jpg`;
          finalPath = path.join(outputDir, finalFilename);
          const thumbPath = path.join(outputDir, `${fileId}_thumb.jpg`);

          await sharp(file.path)
            .rotate()
            .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toFile(finalPath);

          await sharp(file.path)
            .rotate()
            .resize({ width: 400, height: 400, fit: 'inside' })
            .jpeg({ quality: 70 })
            .toFile(thumbPath);
        } else {
          // Non-image: move from tmp
          finalFilename = `${fileId}${ext}`;
          finalPath = path.join(outputDir, finalFilename);
          fs.renameSync(file.path, finalPath);
        }

        const stat = fs.statSync(finalPath);
        const doc = await docsDb.createDocument({
          orgId,
          jobId: job_id,
          phaseId: phase_id,
          entityType: entity_type,
          entityId: entity_id,
          documentType: document_type || 'other',
          title: req.body.title || file.originalname,
          fileName: file.originalname,
          filePath: path.join(orgId, job_id, finalFilename),
          fileSize: stat.size,
          mimeType: IMAGE_TYPES.includes(file.mimetype) ? 'image/jpeg' : file.mimetype,
          description: description || '',
          uploadedBy: req.userId
        });

        results.push(doc);
      } finally {
        // Clean up temp file if still exists
        try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch {}
      }
    }

    res.status(201).json(results);
  } catch (err) {
    // Clean up temp files on error
    if (req.files) {
      for (const file of req.files) {
        try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch {}
      }
    }
    console.error('Error uploading documents:', err);
    res.status(500).json({ error: 'Failed to upload documents' });
  }
});

// GET /job/:jobId — list documents for a job
router.get('/job/:jobId', async (req, res) => {
  try {
    const docs = await docsDb.getDocumentsByJob(req.params.jobId, req.orgId, {
      documentType: req.query.document_type,
      entityType: req.query.entity_type
    });
    res.json(docs);
  } catch (err) {
    console.error('Error listing documents:', err);
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

// GET /search — search documents
router.get('/search', async (req, res) => {
  try {
    const { q, job_id, document_type } = req.query;
    if (!q) return res.status(400).json({ error: 'q query parameter is required' });
    const docs = await docsDb.searchDocuments(req.orgId, q, { jobId: job_id, documentType: document_type });
    res.json(docs);
  } catch (err) {
    console.error('Error searching documents:', err);
    res.status(500).json({ error: 'Failed to search documents' });
  }
});

// GET /:id — get single document metadata
router.get('/:id', async (req, res) => {
  try {
    const doc = await docsDb.getDocumentById(req.params.id, req.orgId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (err) {
    console.error('Error getting document:', err);
    res.status(500).json({ error: 'Failed to get document' });
  }
});

// GET /:id/file — serve the actual file
router.get('/:id/file', async (req, res) => {
  try {
    const doc = await docsDb.getDocumentById(req.params.id, req.orgId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const filePath = path.join(UPLOAD_BASE, doc.file_path);
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(UPLOAD_BASE))) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    // For thumbnails
    if (req.query.thumb === 'true' && doc.mime_type === 'image/jpeg') {
      const thumbPath = filePath.replace(/\.jpg$/, '_thumb.jpg');
      if (fs.existsSync(thumbPath)) return res.sendFile(path.resolve(thumbPath));
    }

    res.sendFile(resolvedPath);
  } catch (err) {
    console.error('Error serving file:', err);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

// PATCH /:id — update metadata
router.patch('/:id', async (req, res) => {
  try {
    const doc = await docsDb.getDocumentById(req.params.id, req.orgId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const updated = await docsDb.updateDocument(req.params.id, req.orgId, req.body);
    res.json(updated);
  } catch (err) {
    console.error('Error updating document:', err);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// DELETE /:id — delete document + file (management/office_coordinator only)
router.delete('/:id', requireOrgRole('management', 'office_coordinator'), async (req, res) => {
  try {
    const doc = await docsDb.deleteDocument(req.params.id, req.orgId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Delete file from disk
    const filePath = path.join(UPLOAD_BASE, doc.file_path);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      // Also delete thumbnail if exists
      const thumbPath = filePath.replace(/\.[^.]+$/, '_thumb.jpg');
      if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
    } catch (fileErr) {
      console.error('Error deleting file from disk:', fileErr);
    }

    res.json({ success: true, deleted: doc });
  } catch (err) {
    console.error('Error deleting document:', err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// ============================================
// MULTER ERROR HANDLING
// ============================================

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err.message && err.message.includes('not allowed')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;
