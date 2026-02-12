const express = require('express');
const router = express.Router({ mergeParams: true });
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const dryingLogs = require('../db/dryingLogs');
const db = require('../db/schema');

// ============================================
// HELPERS
// ============================================

const UPLOAD_BASE = '/data/uploads';
const DRYING_UPLOAD_DIR = path.join(UPLOAD_BASE, 'drying');
const TMP_DIR = path.join(UPLOAD_BASE, 'tmp');

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
];

/**
 * Get the drying log for a job. Many routes need this.
 * @param {string} jobId - The apex_jobs.id
 * @returns {object|null} The drying log row or null
 */
function requireLog(jobId) {
  return dryingLogs.getLogByJobId(jobId);
}

// ============================================
// MULTER SETUP (temp storage for photo processing)
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
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed. Only JPEG, PNG, WebP, HEIC, and HEIF are accepted.`), false);
  }
};

const upload = multer({ storage, fileFilter });

// ============================================
// DRYING LOG ROUTES
// ============================================

// GET /log - Get the drying log for this job
router.get('/log', (req, res) => {
  try {
    const log = requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });
    res.json(log);
  } catch (err) {
    console.error('Error getting drying log:', err);
    res.status(500).json({ error: 'Failed to get drying log' });
  }
});

// POST /log - Create a drying log for this job (with rooms pre-populated from areas_affected)
router.post('/log', (req, res) => {
  try {
    // Check if log already exists
    const existing = requireLog(req.params.id);
    if (existing) return res.status(409).json({ error: 'Drying log already exists for this job', log: existing });

    // Read the job's areas_affected field and parse into room names
    const job = db.prepare('SELECT areas_affected FROM apex_jobs WHERE id = ?').get(req.params.id);
    const areasText = (job && job.areas_affected) || '';
    const roomNames = areasText.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);

    const result = dryingLogs.createDryingLogWithRooms(req.params.id, roomNames);
    res.status(201).json(result);
  } catch (err) {
    console.error('Error creating drying log:', err);
    res.status(500).json({ error: 'Failed to create drying log' });
  }
});

// PATCH /log - Update drying log properties (e.g. setup_complete)
router.patch('/log', (req, res) => {
    try {
        const log = requireLog(req.params.id);
        if (!log) return res.status(404).json({ error: 'No drying log for this job' });

        if (req.body.setup_complete !== undefined) {
            const value = req.body.setup_complete ? 1 : 0;
            dryingLogs.updateSetupComplete(log.id, value);
        }

        const updated = dryingLogs.getLogByJobId(req.params.id);
        res.json(updated);
    } catch (err) {
        console.error('Error updating drying log:', err);
        res.status(500).json({ error: 'Failed to update drying log' });
    }
});

// ============================================
// CHAMBER ROUTES
// ============================================

// GET /chambers - List all chambers for this job's drying log
router.get('/chambers', (req, res) => {
  try {
    const log = requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });
    const chambers = dryingLogs.getChambersByLogId(log.id);
    res.json(chambers);
  } catch (err) {
    console.error('Error getting chambers:', err);
    res.status(500).json({ error: 'Failed to get chambers' });
  }
});

// POST /chambers - Create a chamber
router.post('/chambers', (req, res) => {
  try {
    const log = requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });

    const { name, color, position } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const chamber = dryingLogs.insertChamber(log.id, name, color, position);
    res.status(201).json(chamber);
  } catch (err) {
    console.error('Error creating chamber:', err);
    res.status(500).json({ error: 'Failed to create chamber' });
  }
});

// PATCH /chambers/:chamberId - Update a chamber
router.patch('/chambers/:chamberId', (req, res) => {
  try {
    const existing = dryingLogs.getChamberById(req.params.chamberId);
    if (!existing) return res.status(404).json({ error: 'Chamber not found' });

    const data = {
      name: req.body.name !== undefined ? req.body.name : existing.name,
      color: req.body.color !== undefined ? req.body.color : existing.color,
      position: req.body.position !== undefined ? req.body.position : existing.position
    };

    const chamber = dryingLogs.updateChamber(req.params.chamberId, data);
    res.json(chamber);
  } catch (err) {
    console.error('Error updating chamber:', err);
    res.status(500).json({ error: 'Failed to update chamber' });
  }
});

// DELETE /chambers/:chamberId - Delete a chamber
router.delete('/chambers/:chamberId', (req, res) => {
  try {
    const existing = dryingLogs.getChamberById(req.params.chamberId);
    if (!existing) return res.status(404).json({ error: 'Chamber not found' });

    dryingLogs.deleteChamber(req.params.chamberId);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting chamber:', err);
    res.status(500).json({ error: 'Failed to delete chamber' });
  }
});

// ============================================
// ROOM ROUTES
// ============================================

// GET /rooms - List rooms (all for log, or filtered by chamberId query param)
router.get('/rooms', (req, res) => {
  try {
    const log = requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });

    if (req.query.chamberId) {
      const rooms = dryingLogs.getRoomsByChamber(req.query.chamberId);
      return res.json(rooms);
    }

    const rooms = dryingLogs.getRoomsByLogId(log.id);
    res.json(rooms);
  } catch (err) {
    console.error('Error getting rooms:', err);
    res.status(500).json({ error: 'Failed to get rooms' });
  }
});

// POST /rooms - Create a room
router.post('/rooms', (req, res) => {
  try {
    const log = requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });

    const { chamber_id, name, position } = req.body;
    if (!chamber_id) return res.status(400).json({ error: 'chamber_id is required' });
    if (!name) return res.status(400).json({ error: 'name is required' });

    // Verify chamber exists and belongs to this log
    const chamber = dryingLogs.getChamberById(chamber_id);
    if (!chamber || chamber.log_id !== log.id) {
      return res.status(400).json({ error: 'Invalid chamber_id for this job' });
    }

    const room = dryingLogs.insertRoom(chamber_id, name, position);
    res.status(201).json(room);
  } catch (err) {
    console.error('Error creating room:', err);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// PATCH /rooms/:roomId - Update a room
router.patch('/rooms/:roomId', (req, res) => {
  try {
    const existing = dryingLogs.getRoomById(req.params.roomId);
    if (!existing) return res.status(404).json({ error: 'Room not found' });

    const data = {
      name: req.body.name !== undefined ? req.body.name : existing.name,
      position: req.body.position !== undefined ? req.body.position : existing.position,
      chamber_id: req.body.chamber_id !== undefined ? req.body.chamber_id : existing.chamber_id
    };

    const room = dryingLogs.updateRoom(req.params.roomId, data);
    res.json(room);
  } catch (err) {
    console.error('Error updating room:', err);
    res.status(500).json({ error: 'Failed to update room' });
  }
});

// DELETE /rooms/:roomId - Delete a room
router.delete('/rooms/:roomId', (req, res) => {
  try {
    const existing = dryingLogs.getRoomById(req.params.roomId);
    if (!existing) return res.status(404).json({ error: 'Room not found' });

    dryingLogs.deleteRoom(req.params.roomId);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting room:', err);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// ============================================
// REFERENCE POINT ROUTES
// ============================================

// GET /ref-points - List all reference points for this log
router.get('/ref-points', (req, res) => {
  try {
    const log = requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });

    const refPoints = dryingLogs.getRefPointsByLog(log.id);
    res.json(refPoints);
  } catch (err) {
    console.error('Error getting reference points:', err);
    res.status(500).json({ error: 'Failed to get reference points' });
  }
});

// POST /ref-points - Add a reference point (auto-assigns ref_number)
router.post('/ref-points', (req, res) => {
  try {
    const log = requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });

    const { room_id, material_code, label } = req.body;
    if (!room_id) return res.status(400).json({ error: 'room_id is required' });
    if (!material_code) return res.status(400).json({ error: 'material_code is required' });

    const refPoint = dryingLogs.addRefPoint(log.id, room_id, material_code, label);
    res.status(201).json(refPoint);
  } catch (err) {
    console.error('Error adding reference point:', err);
    res.status(500).json({ error: 'Failed to add reference point' });
  }
});

// PATCH /ref-points/:rpId - Update a reference point
router.patch('/ref-points/:rpId', (req, res) => {
  try {
    const existing = dryingLogs.getRefPointById(req.params.rpId);
    if (!existing) return res.status(404).json({ error: 'Reference point not found' });

    const data = {
      material_code: req.body.material_code !== undefined ? req.body.material_code : existing.material_code,
      label: req.body.label !== undefined ? req.body.label : existing.label
    };

    const refPoint = dryingLogs.updateRefPoint(req.params.rpId, data);
    res.json(refPoint);
  } catch (err) {
    console.error('Error updating reference point:', err);
    res.status(500).json({ error: 'Failed to update reference point' });
  }
});

// DELETE /ref-points/:rpId - Delete a reference point (only before any visits reference it)
router.delete('/ref-points/:rpId', (req, res) => {
  try {
    const existing = dryingLogs.getRefPointById(req.params.rpId);
    if (!existing) return res.status(404).json({ error: 'Reference point not found' });

    dryingLogs.deleteRefPoint(req.params.rpId);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting reference point:', err);
    res.status(500).json({ error: 'Failed to delete reference point' });
  }
});

// POST /ref-points/:rpId/demolish - Mark a reference point as demolished
router.post('/ref-points/:rpId/demolish', (req, res) => {
  try {
    const existing = dryingLogs.getRefPointById(req.params.rpId);
    if (!existing) return res.status(404).json({ error: 'Reference point not found' });

    const { visit_id } = req.body;
    if (!visit_id) return res.status(400).json({ error: 'visit_id is required' });

    dryingLogs.demolishRefPoint(req.params.rpId, visit_id);
    const updated = dryingLogs.getRefPointById(req.params.rpId);
    res.json(updated);
  } catch (err) {
    console.error('Error demolishing reference point:', err);
    res.status(500).json({ error: 'Failed to demolish reference point' });
  }
});

// ============================================
// BASELINE ROUTES
// ============================================

// GET /baselines - List all baselines for this log
router.get('/baselines', (req, res) => {
  try {
    const log = requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });

    const baselines = dryingLogs.getBaselinesByLog(log.id);
    res.json(baselines);
  } catch (err) {
    console.error('Error getting baselines:', err);
    res.status(500).json({ error: 'Failed to get baselines' });
  }
});

// PUT /baselines - Upsert a baseline for a material code
router.put('/baselines', (req, res) => {
  try {
    const log = requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });

    const { material_code, baseline_value } = req.body;
    if (!material_code) return res.status(400).json({ error: 'material_code is required' });
    if (baseline_value === undefined || baseline_value === null) {
      return res.status(400).json({ error: 'baseline_value is required' });
    }

    const baseline = dryingLogs.upsertBaseline(log.id, material_code, baseline_value);
    res.json(baseline);
  } catch (err) {
    console.error('Error upserting baseline:', err);
    res.status(500).json({ error: 'Failed to upsert baseline' });
  }
});

// ============================================
// VISIT ROUTES
// ============================================

// GET /visits - List all visits for this log
router.get('/visits', (req, res) => {
  try {
    const log = requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });

    const visits = dryingLogs.getVisitsByLog(log.id);
    res.json(visits);
  } catch (err) {
    console.error('Error getting visits:', err);
    res.status(500).json({ error: 'Failed to get visits' });
  }
});

// POST /visits - Create a visit (auto-assigns visit_number)
router.post('/visits', (req, res) => {
  try {
    const log = requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });

    const { visited_at } = req.body;
    const visit = dryingLogs.createVisit(log.id, visited_at);
    res.status(201).json(visit);
  } catch (err) {
    console.error('Error creating visit:', err);
    res.status(500).json({ error: 'Failed to create visit' });
  }
});

// GET /visits/:visitId - Get composite visit data (visit + atmospheric + moisture + equipment + notes)
router.get('/visits/:visitId', (req, res) => {
  try {
    const visit = dryingLogs.getVisitById(req.params.visitId);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });

    // Verify visit belongs to this job's log
    const log = requireLog(req.params.id);
    if (!log || visit.log_id !== log.id) {
      return res.status(404).json({ error: 'Visit not found for this job' });
    }

    const atmospheric = dryingLogs.getAtmosphericByVisit(req.params.visitId);
    const moisture = dryingLogs.getMoistureByVisit(req.params.visitId);
    const equipment = dryingLogs.getEquipmentByVisit(req.params.visitId);
    const notes = dryingLogs.getNotesByVisit(req.params.visitId);

    res.json({ visit, atmospheric, moisture, equipment, notes });
  } catch (err) {
    console.error('Error getting visit data:', err);
    res.status(500).json({ error: 'Failed to get visit data' });
  }
});

// POST /visits/:visitId/save - Bulk save visit data (atmospheric + moisture + equipment)
router.post('/visits/:visitId/save', (req, res) => {
  try {
    const visit = dryingLogs.getVisitById(req.params.visitId);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });

    // Verify visit belongs to this job's log
    const log = requireLog(req.params.id);
    if (!log || visit.log_id !== log.id) {
      return res.status(404).json({ error: 'Visit not found for this job' });
    }

    const { atmospheric, moisture, equipment } = req.body;

    // Wrap all saves in an outer transaction for atomicity
    const bulkSave = db.transaction(() => {
      if (atmospheric && Array.isArray(atmospheric)) {
        dryingLogs.saveAtmosphericReadings(req.params.visitId, atmospheric);
      }
      if (moisture && Array.isArray(moisture)) {
        dryingLogs.saveMoistureReadings(req.params.visitId, moisture, log.id);
      }
      if (equipment && Array.isArray(equipment)) {
        dryingLogs.saveEquipment(req.params.visitId, equipment);
      }
    });

    bulkSave();

    // Return the updated composite visit data
    const updatedVisit = dryingLogs.getVisitById(req.params.visitId);
    const updatedAtmospheric = dryingLogs.getAtmosphericByVisit(req.params.visitId);
    const updatedMoisture = dryingLogs.getMoistureByVisit(req.params.visitId);
    const updatedEquipment = dryingLogs.getEquipmentByVisit(req.params.visitId);

    res.json({
      success: true,
      visit: updatedVisit,
      atmospheric: updatedAtmospheric,
      moisture: updatedMoisture,
      equipment: updatedEquipment
    });
  } catch (err) {
    console.error('Error bulk saving visit data:', err);
    res.status(500).json({ error: 'Failed to save visit data' });
  }
});

// DELETE /visits/:visitId - Delete a visit
router.delete('/visits/:visitId', (req, res) => {
  try {
    const visit = dryingLogs.getVisitById(req.params.visitId);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });

    // Verify visit belongs to this job's log
    const log = requireLog(req.params.id);
    if (!log || visit.log_id !== log.id) {
      return res.status(404).json({ error: 'Visit not found for this job' });
    }

    dryingLogs.deleteVisit(req.params.visitId);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting visit:', err);
    res.status(500).json({ error: 'Failed to delete visit' });
  }
});

// ============================================
// VISIT NOTE ROUTES
// ============================================

// GET /visits/:visitId/notes - List notes for a visit
router.get('/visits/:visitId/notes', (req, res) => {
  try {
    const visit = dryingLogs.getVisitById(req.params.visitId);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });

    const notes = dryingLogs.getNotesByVisit(req.params.visitId);
    res.json(notes);
  } catch (err) {
    console.error('Error getting visit notes:', err);
    res.status(500).json({ error: 'Failed to get visit notes' });
  }
});

// POST /visits/:visitId/notes - Create a visit note
router.post('/visits/:visitId/notes', (req, res) => {
  try {
    const visit = dryingLogs.getVisitById(req.params.visitId);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });

    const { content, photos } = req.body;
    const photosJson = photos ? JSON.stringify(photos) : '[]';
    const note = dryingLogs.insertNote(req.params.visitId, content, photosJson);
    res.status(201).json(note);
  } catch (err) {
    console.error('Error creating visit note:', err);
    res.status(500).json({ error: 'Failed to create visit note' });
  }
});

// DELETE /visits/:visitId/notes/:noteId - Delete a visit note
router.delete('/visits/:visitId/notes/:noteId', (req, res) => {
  try {
    const note = dryingLogs.getNoteById(req.params.noteId);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    // Verify note belongs to this visit
    if (note.visit_id !== req.params.visitId) {
      return res.status(404).json({ error: 'Note not found for this visit' });
    }

    dryingLogs.deleteNote(req.params.noteId);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting visit note:', err);
    res.status(500).json({ error: 'Failed to delete visit note' });
  }
});

// ============================================
// PHOTO ROUTES
// ============================================

// POST /photos - Upload and process photos with sharp
router.post('/photos', upload.array('photos', 20), async (req, res) => {
  const jobId = req.params.id;
  const outputDir = path.join(DRYING_UPLOAD_DIR, jobId);
  const results = [];

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No photos uploaded' });
    }

    // Ensure output directory exists
    fs.mkdirSync(outputDir, { recursive: true });

    for (const file of req.files) {
      const photoId = uuidv4();
      const fullFilename = `${photoId}.jpg`;
      const thumbFilename = `${photoId}_thumb.jpg`;
      const fullPath = path.join(outputDir, fullFilename);
      const thumbPath = path.join(outputDir, thumbFilename);

      try {
        // Process full-size image
        await sharp(file.path)
          .rotate() // auto-orient based on EXIF
          .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toFile(fullPath);

        // Process thumbnail
        await sharp(file.path)
          .rotate() // auto-orient based on EXIF
          .resize({ width: 300, height: 300, fit: 'inside' })
          .jpeg({ quality: 70 })
          .toFile(thumbPath);

        results.push({
          id: photoId,
          path: fullFilename,
          thumbPath: thumbFilename
        });
      } finally {
        // Always clean up temp file
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkErr) {
          console.error('Failed to clean up temp file:', unlinkErr);
        }
      }
    }

    res.json(results);
  } catch (err) {
    // Clean up any remaining temp files on error
    if (req.files) {
      for (const file of req.files) {
        try {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        } catch (unlinkErr) {
          // ignore cleanup errors
        }
      }
    }
    console.error('Error processing photos:', err);
    res.status(500).json({ error: 'Failed to process photos' });
  }
});

// GET /photos/:filename - Serve a photo (auth-gated via parent router)
router.get('/photos/:filename', (req, res) => {
  try {
    const jobId = req.params.id;
    const filename = req.params.filename;

    // Validate filename - no path separators, no traversal
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(DRYING_UPLOAD_DIR, jobId, filename);

    // Verify resolved path is within the drying uploads directory
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(DRYING_UPLOAD_DIR))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    res.sendFile(resolvedPath);
  } catch (err) {
    console.error('Error serving photo:', err);
    res.status(500).json({ error: 'Failed to serve photo' });
  }
});

// ============================================
// MULTER ERROR HANDLING
// ============================================

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
