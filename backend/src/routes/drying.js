const express = require('express');
const router = express.Router({ mergeParams: true });
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const dryingLogs = require('../db/dryingLogs');
const db = require('../db/schema');
const { requireScope } = require('../middleware/scopeAuth');

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
async function requireLog(jobId) {
  return await dryingLogs.getLogByJobId(jobId);
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
router.get('/log', requireScope('drying', 'read'), async (req, res) => {
  try {
    const log = await requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });
    res.json(log);
  } catch (err) {
    console.error('Error getting drying log:', err);
    res.status(500).json({ error: 'Failed to get drying log' });
  }
});

// POST /log - Create a drying log for this job (with rooms pre-populated from areas_affected)
router.post('/log', requireScope('drying', 'write'), async (req, res) => {
  try {
    // Check if log already exists
    const existing = await requireLog(req.params.id);
    if (existing) return res.status(409).json({ error: 'Drying log already exists for this job', log: existing });

    // Read the job's areas_affected field and parse into room names
    const job = await db.getOne('SELECT areas_affected FROM apex_jobs WHERE id = $1', [req.params.id]);
    const areasText = (job && job.areas_affected) || '';
    const roomNames = areasText.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);

    const result = await dryingLogs.createDryingLogWithRooms(req.params.id, roomNames);
    res.status(201).json(result);
  } catch (err) {
    console.error('Error creating drying log:', err);
    res.status(500).json({ error: 'Failed to create drying log' });
  }
});

// PATCH /log - Update drying log properties (e.g. setup_complete)
router.patch('/log', requireScope('drying', 'write'), async (req, res) => {
    try {
        const log = await requireLog(req.params.id);
        if (!log) return res.status(404).json({ error: 'No drying log for this job' });

        if (req.body.setup_complete !== undefined) {
            const value = req.body.setup_complete ? 1 : 0;
            await dryingLogs.updateSetupComplete(log.id, value);
        }

        const updated = await dryingLogs.getLogByJobId(req.params.id);
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
router.get('/chambers', requireScope('drying', 'read'), async (req, res) => {
  try {
    const log = await requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });
    const chambers = await dryingLogs.getChambersByLogId(log.id);
    res.json(chambers);
  } catch (err) {
    console.error('Error getting chambers:', err);
    res.status(500).json({ error: 'Failed to get chambers' });
  }
});

// POST /chambers - Create a chamber
router.post('/chambers', requireScope('drying', 'write'), async (req, res) => {
  try {
    const log = await requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });

    let { name, color, position, floor_level } = req.body;
    if (!name) name = 'Chamber';

    const chamber = await dryingLogs.insertChamber(log.id, name, color, position, floor_level);
    res.status(201).json(chamber);
  } catch (err) {
    console.error('Error creating chamber:', err);
    res.status(500).json({ error: 'Failed to create chamber' });
  }
});

// PATCH /chambers/:chamberId - Update a chamber
router.patch('/chambers/:chamberId', requireScope('drying', 'write'), async (req, res) => {
  try {
    const existing = await dryingLogs.getChamberById(req.params.chamberId);
    if (!existing) return res.status(404).json({ error: 'Chamber not found' });

    const data = {
      name: req.body.name !== undefined ? req.body.name : existing.name,
      color: req.body.color !== undefined ? req.body.color : existing.color,
      position: req.body.position !== undefined ? req.body.position : existing.position
    };
    if (req.body.floor_level !== undefined) data.floor_level = req.body.floor_level;

    const chamber = await dryingLogs.updateChamber(req.params.chamberId, data);
    res.json(chamber);
  } catch (err) {
    console.error('Error updating chamber:', err);
    res.status(500).json({ error: 'Failed to update chamber' });
  }
});

// DELETE /chambers/:chamberId - Delete a chamber
router.delete('/chambers/:chamberId', requireScope('drying', 'delete'), async (req, res) => {
  try {
    const existing = await dryingLogs.getChamberById(req.params.chamberId);
    if (!existing) return res.status(404).json({ error: 'Chamber not found' });

    await dryingLogs.deleteChamber(req.params.chamberId);
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
router.get('/rooms', requireScope('drying', 'read'), async (req, res) => {
  try {
    const log = await requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });

    if (req.query.chamberId) {
      const rooms = await dryingLogs.getRoomsByChamber(req.query.chamberId);
      return res.json(rooms);
    }

    const rooms = await dryingLogs.getRoomsByLogId(log.id);
    res.json(rooms);
  } catch (err) {
    console.error('Error getting rooms:', err);
    res.status(500).json({ error: 'Failed to get rooms' });
  }
});

// POST /rooms - Create a room
router.post('/rooms', requireScope('drying', 'write'), async (req, res) => {
  try {
    const log = await requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });

    const { chamber_id, name, position } = req.body;
    if (!chamber_id) return res.status(400).json({ error: 'chamber_id is required' });

    // Verify chamber exists and belongs to this log
    const chamber = await dryingLogs.getChamberById(chamber_id);
    if (!chamber || chamber.log_id !== log.id) {
      return res.status(400).json({ error: 'Invalid chamber_id for this job' });
    }

    const room = await dryingLogs.insertRoom(chamber_id, name || '', position);
    res.status(201).json(room);
  } catch (err) {
    console.error('Error creating room:', err);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// PATCH /rooms/:roomId - Update a room
router.patch('/rooms/:roomId', requireScope('drying', 'write'), async (req, res) => {
  try {
    const existing = await dryingLogs.getRoomById(req.params.roomId);
    if (!existing) return res.status(404).json({ error: 'Room not found' });

    const data = {
      name: req.body.name !== undefined ? req.body.name : existing.name,
      position: req.body.position !== undefined ? req.body.position : existing.position,
      chamber_id: req.body.chamber_id !== undefined ? req.body.chamber_id : existing.chamber_id
    };

    const room = await dryingLogs.updateRoom(req.params.roomId, data);
    res.json(room);
  } catch (err) {
    console.error('Error updating room:', err);
    res.status(500).json({ error: 'Failed to update room' });
  }
});

// DELETE /rooms/:roomId - Delete a room
router.delete('/rooms/:roomId', requireScope('drying', 'delete'), async (req, res) => {
  try {
    const existing = await dryingLogs.getRoomById(req.params.roomId);
    if (!existing) return res.status(404).json({ error: 'Room not found' });

    await dryingLogs.deleteRoom(req.params.roomId);
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
router.get('/ref-points', requireScope('drying', 'read'), async (req, res) => {
  try {
    const log = await requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });

    const refPoints = await dryingLogs.getRefPointsByLog(log.id);
    res.json(refPoints);
  } catch (err) {
    console.error('Error getting reference points:', err);
    res.status(500).json({ error: 'Failed to get reference points' });
  }
});

// POST /ref-points - Add a reference point (auto-assigns ref_number)
router.post('/ref-points', requireScope('drying', 'write'), async (req, res) => {
  try {
    const log = await requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });

    const { room_id, material_code, label } = req.body;
    if (!room_id) return res.status(400).json({ error: 'room_id is required' });
    if (!material_code) return res.status(400).json({ error: 'material_code is required' });

    const refPoint = await dryingLogs.addRefPoint(log.id, room_id, material_code, label);
    res.status(201).json(refPoint);
  } catch (err) {
    console.error('Error adding reference point:', err);
    res.status(500).json({ error: 'Failed to add reference point' });
  }
});

// PATCH /ref-points/:rpId - Update a reference point
router.patch('/ref-points/:rpId', requireScope('drying', 'write'), async (req, res) => {
  try {
    const existing = await dryingLogs.getRefPointById(req.params.rpId);
    if (!existing) return res.status(404).json({ error: 'Reference point not found' });

    const data = {
      material_code: req.body.material_code !== undefined ? req.body.material_code : existing.material_code,
      label: req.body.label !== undefined ? req.body.label : existing.label
    };

    const refPoint = await dryingLogs.updateRefPoint(req.params.rpId, data);
    res.json(refPoint);
  } catch (err) {
    console.error('Error updating reference point:', err);
    res.status(500).json({ error: 'Failed to update reference point' });
  }
});

// DELETE /ref-points/:rpId - Delete a reference point (only before any visits reference it)
router.delete('/ref-points/:rpId', requireScope('drying', 'delete'), async (req, res) => {
  try {
    const existing = await dryingLogs.getRefPointById(req.params.rpId);
    if (!existing) return res.status(404).json({ error: 'Reference point not found' });

    await dryingLogs.deleteRefPoint(req.params.rpId);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting reference point:', err);
    res.status(500).json({ error: 'Failed to delete reference point' });
  }
});

// POST /ref-points/:rpId/demolish - Mark a reference point as demolished
router.post('/ref-points/:rpId/demolish', requireScope('drying', 'write'), async (req, res) => {
  try {
    const existing = await dryingLogs.getRefPointById(req.params.rpId);
    if (!existing) return res.status(404).json({ error: 'Reference point not found' });

    const { visit_id } = req.body;
    if (!visit_id) return res.status(400).json({ error: 'visit_id is required' });

    await dryingLogs.demolishRefPoint(req.params.rpId, visit_id);
    const updated = await dryingLogs.getRefPointById(req.params.rpId);
    res.json(updated);
  } catch (err) {
    console.error('Error demolishing reference point:', err);
    res.status(500).json({ error: 'Failed to demolish reference point' });
  }
});

// POST /ref-points/:rpId/undemolish - Undo demolish on a reference point
router.post('/ref-points/:rpId/undemolish', requireScope('drying', 'write'), async (req, res) => {
  try {
    const existing = await dryingLogs.getRefPointById(req.params.rpId);
    if (!existing) return res.status(404).json({ error: 'Reference point not found' });
    if (!existing.demolished_at) return res.status(400).json({ error: 'Reference point is not demolished' });

    await dryingLogs.undemolishRefPoint(req.params.rpId);
    const updated = await dryingLogs.getRefPointById(req.params.rpId);
    res.json(updated);
  } catch (err) {
    console.error('Error undoing demolish:', err);
    res.status(500).json({ error: 'Failed to undo demolish' });
  }
});

// ============================================
// BASELINE ROUTES
// ============================================

// GET /baselines - List all baselines for this log
router.get('/baselines', requireScope('drying', 'read'), async (req, res) => {
  try {
    const log = await requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });

    const baselines = await dryingLogs.getBaselinesByLog(log.id);
    res.json(baselines);
  } catch (err) {
    console.error('Error getting baselines:', err);
    res.status(500).json({ error: 'Failed to get baselines' });
  }
});

// PUT /baselines - Upsert a baseline for a material code
router.put('/baselines', requireScope('drying', 'write'), async (req, res) => {
  try {
    const log = await requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });

    const { material_code, baseline_value } = req.body;
    if (!material_code) return res.status(400).json({ error: 'material_code is required' });
    if (baseline_value === undefined || baseline_value === null) {
      return res.status(400).json({ error: 'baseline_value is required' });
    }

    const baseline = await dryingLogs.upsertBaseline(log.id, material_code, baseline_value);
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
router.get('/visits', requireScope('drying', 'read'), async (req, res) => {
  try {
    const log = await requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });

    const visits = await dryingLogs.getVisitsByLog(log.id);
    res.json(visits);
  } catch (err) {
    console.error('Error getting visits:', err);
    res.status(500).json({ error: 'Failed to get visits' });
  }
});

// POST /visits - Create a visit (auto-assigns visit_number)
router.post('/visits', requireScope('drying', 'write'), async (req, res) => {
  try {
    const log = await requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });

    const { visited_at } = req.body;
    const visit = await dryingLogs.createVisit(log.id, visited_at);
    res.status(201).json(visit);
  } catch (err) {
    console.error('Error creating visit:', err);
    res.status(500).json({ error: 'Failed to create visit' });
  }
});

// GET /visits/:visitId - Get composite visit data (visit + atmospheric + moisture + equipment + notes)
router.get('/visits/:visitId', requireScope('drying', 'read'), async (req, res) => {
  try {
    const visit = await dryingLogs.getVisitById(req.params.visitId);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });

    // Verify visit belongs to this job's log
    const log = await requireLog(req.params.id);
    if (!log || visit.log_id !== log.id) {
      return res.status(404).json({ error: 'Visit not found for this job' });
    }

    const atmospheric = await dryingLogs.getAtmosphericByVisit(req.params.visitId);
    const moisture = await dryingLogs.getMoistureByVisit(req.params.visitId);
    const equipment = await dryingLogs.getEquipmentByVisit(req.params.visitId);
    const notes = await dryingLogs.getNotesByVisit(req.params.visitId);

    res.json({ visit, atmospheric, moisture, equipment, notes });
  } catch (err) {
    console.error('Error getting visit data:', err);
    res.status(500).json({ error: 'Failed to get visit data' });
  }
});

// POST /visits/:visitId/save - Bulk save visit data (atmospheric + moisture + equipment)
router.post('/visits/:visitId/save', requireScope('drying', 'write'), async (req, res) => {
  try {
    const visit = await dryingLogs.getVisitById(req.params.visitId);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });

    // Verify visit belongs to this job's log
    const log = await requireLog(req.params.id);
    if (!log || visit.log_id !== log.id) {
      return res.status(404).json({ error: 'Visit not found for this job' });
    }

    const { atmospheric, moisture, equipment, visited_at } = req.body;

    // Update visit date if provided
    if (visited_at) {
      await db.run('UPDATE drying_visits SET visited_at = $1 WHERE id = $2', [visited_at, req.params.visitId]);
    }

    // Wrap all saves in an outer transaction for atomicity
    await db.transaction(async (client) => {
      if (atmospheric && Array.isArray(atmospheric)) {
        await dryingLogs.saveAtmosphericReadings(req.params.visitId, atmospheric);
      }
      if (moisture && Array.isArray(moisture)) {
        await dryingLogs.saveMoistureReadings(req.params.visitId, moisture, log.id);
      }
      if (equipment && Array.isArray(equipment)) {
        await dryingLogs.saveEquipment(req.params.visitId, equipment);
      }
    });


    // Return the updated composite visit data
    const updatedVisit = await dryingLogs.getVisitById(req.params.visitId);
    const updatedAtmospheric = await dryingLogs.getAtmosphericByVisit(req.params.visitId);
    const updatedMoisture = await dryingLogs.getMoistureByVisit(req.params.visitId);
    const updatedEquipment = await dryingLogs.getEquipmentByVisit(req.params.visitId);

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
router.delete('/visits/:visitId', requireScope('drying', 'delete'), async (req, res) => {
  try {
    const visit = await dryingLogs.getVisitById(req.params.visitId);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });

    // Verify visit belongs to this job's log
    const log = await requireLog(req.params.id);
    if (!log || visit.log_id !== log.id) {
      return res.status(404).json({ error: 'Visit not found for this job' });
    }

    await dryingLogs.deleteVisit(req.params.visitId);
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
router.get('/visits/:visitId/notes', requireScope('drying', 'read'), async (req, res) => {
  try {
    const visit = await dryingLogs.getVisitById(req.params.visitId);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });

    const notes = await dryingLogs.getNotesByVisit(req.params.visitId);
    res.json(notes);
  } catch (err) {
    console.error('Error getting visit notes:', err);
    res.status(500).json({ error: 'Failed to get visit notes' });
  }
});

// POST /visits/:visitId/notes - Create a visit note
router.post('/visits/:visitId/notes', requireScope('drying', 'write'), async (req, res) => {
  try {
    const visit = await dryingLogs.getVisitById(req.params.visitId);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });

    const { content, photos } = req.body;
    const photosJson = photos ? JSON.stringify(photos) : '[]';
    const note = await dryingLogs.insertNote(req.params.visitId, content, photosJson);

    // Feature 5: Duplicate note to job dashboard (apex_job_notes)
    if (content && content.trim()) {
      try {
        const log = await requireLog(req.params.id);
        if (log) {
          const visitDate = visit.visited_at ? new Date(visit.visited_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
          const jobNoteId = uuidv4();
          await db.run(`
            INSERT INTO apex_job_notes (id, job_id, subject, note_type, content, author_id)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            jobNoteId,
            req.params.id,
            `Drying Visit #${visit.visit_number}`,
            'site_visit',
            `[Visit #${visit.visit_number} — ${visitDate}] ${content.trim()}`,
            req.user?.id || null
          ]);
        }
      } catch (jobNoteErr) {
        console.error('Failed to duplicate drying note to job dashboard:', jobNoteErr);
        // Non-blocking: don't fail the drying note creation
      }
    }

    res.status(201).json(note);
  } catch (err) {
    console.error('Error creating visit note:', err);
    res.status(500).json({ error: 'Failed to create visit note' });
  }
});

// DELETE /visits/:visitId/notes/:noteId - Delete a visit note
router.delete('/visits/:visitId/notes/:noteId', requireScope('drying', 'delete'), async (req, res) => {
  try {
    const note = await dryingLogs.getNoteById(req.params.noteId);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    // Verify note belongs to this visit
    if (note.visit_id !== req.params.visitId) {
      return res.status(404).json({ error: 'Note not found for this visit' });
    }

    await dryingLogs.deleteNote(req.params.noteId);
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
router.post('/photos', requireScope('drying', 'write'), upload.array('photos', 20), async (req, res) => {
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
router.get('/photos/:filename', requireScope('drying', 'read'), async (req, res) => {
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
// EVENT LOG ROUTES
// ============================================

// POST /event-log — upsert events for a session
router.post('/event-log', requireScope('drying', 'write'), async (req, res) => {
  try {
    const { session_id, events } = req.body;
    if (!session_id || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'session_id and events[] are required' });
    }
    const jobId = req.params.id;
    const userId = req.user?.id || null;

    // Try to append to existing session row
    const existing = await db.getOne(
      'SELECT id FROM drying_event_logs WHERE session_id = $1 AND job_id = $2',
      [session_id, jobId]
    );

    if (existing) {
      await db.run(
        `UPDATE drying_event_logs SET events = events || $1::jsonb WHERE id = $2`,
        [JSON.stringify(events), existing.id]
      );
    } else {
      const id = uuidv4();
      await db.run(
        `INSERT INTO drying_event_logs (id, job_id, session_id, user_id, events) VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [id, jobId, session_id, userId, JSON.stringify(events)]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error saving event log:', err);
    res.status(500).json({ error: 'Failed to save event log' });
  }
});

// GET /event-log — list sessions for this job
router.get('/event-log', requireScope('drying', 'read'), async (req, res) => {
  try {
    const rows = await db.getAll(
      `SELECT id, session_id, user_id, created_at, jsonb_array_length(events) as event_count
       FROM drying_event_logs WHERE job_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error getting event logs:', err);
    res.status(500).json({ error: 'Failed to get event logs' });
  }
});

// GET /event-log/:sessionId — full events for a session
router.get('/event-log/:sessionId', requireScope('drying', 'read'), async (req, res) => {
  try {
    const row = await db.getOne(
      `SELECT * FROM drying_event_logs WHERE session_id = $1 AND job_id = $2`,
      [req.params.sessionId, req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Session not found' });
    res.json(row);
  } catch (err) {
    console.error('Error getting event log session:', err);
    res.status(500).json({ error: 'Failed to get event log session' });
  }
});

// ============================================
// DRYING REPORT (HTML for print-to-PDF)
// ============================================

router.get('/report', requireScope('drying', 'read'), async (req, res) => {
  try {
    const jobId = req.params.id;

    // Fetch all data
    const job = await db.getOne('SELECT * FROM apex_jobs WHERE id = $1', [jobId]);
    if (!job) return res.status(404).send('Job not found');

    const log = await db.getOne('SELECT * FROM drying_logs WHERE job_id = $1', [jobId]);
    if (!log) return res.status(404).send('No drying log found for this job');

    const chambers = await db.getAll('SELECT * FROM drying_chambers WHERE log_id = $1 ORDER BY position', [log.id]);
    const visits = await db.getAll('SELECT * FROM drying_visits WHERE log_id = $1 ORDER BY visit_number', [log.id]);
    const refPoints = await db.getAll('SELECT * FROM drying_ref_points WHERE log_id = $1 ORDER BY ref_number', [log.id]);
    const baselines = await db.getAll('SELECT * FROM drying_baselines WHERE log_id = $1', [log.id]);

    // Per-chamber rooms
    const roomsByChamber = {};
    for (const ch of chambers) {
      roomsByChamber[ch.id] = await db.getAll('SELECT * FROM drying_rooms WHERE chamber_id = $1 ORDER BY position', [ch.id]);
    }

    // Per-visit data
    const atmosphericByVisit = {};
    const readingsByVisit = {};
    const equipmentByVisit = {};
    for (const v of visits) {
      atmosphericByVisit[v.id] = await db.getAll('SELECT * FROM drying_atmospheric_readings WHERE visit_id = $1', [v.id]);
      readingsByVisit[v.id] = await db.getAll(
        `SELECT mr.*, rp.ref_number, rp.material_code, rp.label, rp.room_id, rp.surface_type, rp.demolished_at
         FROM drying_moisture_readings mr
         JOIN drying_ref_points rp ON mr.ref_point_id = rp.id
         WHERE mr.visit_id = $1`, [v.id]);
      equipmentByVisit[v.id] = await db.getAll('SELECT * FROM drying_equipment WHERE visit_id = $1', [v.id]);
    }

    // Material code map
    const MATERIAL_MAP = {
      'D': 'Drywall', 'I': 'Insulation', 'PNL': 'Paneling', 'C': 'Carpet', 'TL': 'Tile',
      'SF': 'Subfloor', 'WF': 'Wood Floor', 'FRM': 'Framing', 'CJST': 'Ceiling Joist',
      'FJST': 'Floor Joist', 'OSB': 'OSB', 'PB': 'Particle Board', 'PBU': 'PB Underlayment',
      'PLY': 'Plywood', 'MDFB': 'MDF Baseboard', 'MDFC': 'MDF Casing', 'WDB': 'Wood Baseboard',
      'WDC': 'Wood Casing', 'CAB': 'Cabinetry', 'CW': 'Concrete Wall', 'CF': 'Concrete Floor',
      'TK': 'Tack Strip'
    };

    const SURFACE_MAP = { wall: 'Wall', ceiling: 'Ceiling', floor: 'Floor', cabinetry: 'Cabinetry' };
    const FLOOR_MAP = { basement: 'Basement/Crawlspace', main_level: 'Main Level' };
    for (let i = 2; i <= 25; i++) FLOOR_MAP[`floor_${i}`] = `Floor ${i}`;

    const EQUIP_LABELS = {
      dehumidifier: 'Dehumidifiers', air_mover: 'Air Movers', negative_air: 'Air Scrubbers',
      injectidry: 'Injectidry', multi_port: 'Multi-port', heated_air_mover: 'Heated Air Movers'
    };

    // GPP calculation
    function calcGPP(tempF, rh) {
      if (tempF == null || rh == null) return null;
      const c8=-10440.397,c9=-11.29465,c10=-0.027022355,c11=0.00001289036,c12=-0.0000000024780681,c13=6.5459673;
      const tempR = tempF + 459.67;
      const lnPws = c8/tempR + c9 + c10*tempR + c11*tempR*tempR + c12*tempR*tempR*tempR + c13*Math.log(tempR);
      const Pws = Math.exp(lnPws);
      const Pw = (rh / 100) * Pws;
      const W = 0.62198 * Pw / (14.696 - Pw);
      return Math.round(W * 7000 * 10) / 10;
    }

    function fmtDate(d) {
      if (!d) return '';
      const dt = new Date(d);
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    function shortDate(d) {
      if (!d) return '';
      const dt = new Date(d);
      return `${dt.getMonth()+1}/${dt.getDate()}`;
    }

    // Compute dates
    const firstVisitDate = visits.length ? new Date(visits[0].visit_date) : null;
    const lastVisitDate = visits.length ? new Date(visits[visits.length - 1].visit_date) : null;
    const dryingDays = firstVisitDate && lastVisitDate
      ? Math.round((lastVisitDate - firstVisitDate) / 86400000) + 1 : 0;

    const totalRooms = Object.values(roomsByChamber).reduce((s, r) => s + r.length, 0);

    // Build address
    const addrParts = [job.prop_street, job.prop_city, job.prop_state, job.prop_zip].filter(Boolean);
    const address = addrParts.join(', ');

    // Header fields (only show non-empty)
    const headerFields = [];
    if (job.client_name) headerFields.push(['Client', job.client_name]);
    if (address) headerFields.push(['Property Address', address]);
    if (job.ins_carrier) headerFields.push(['Insurance Carrier', job.ins_carrier]);
    if (job.ins_claim) headerFields.push(['Claim Number', job.ins_claim]);
    if (job.adj_name) headerFields.push(['Adjuster', job.adj_name]);
    if (job.adj_phone) headerFields.push(['Adjuster Phone', job.adj_phone]);
    if (job.adj_email) headerFields.push(['Adjuster Email', job.adj_email]);
    if (job.loss_date) headerFields.push(['Date of Loss', fmtDate(job.loss_date)]);
    if (firstVisitDate) headerFields.push(['Mitigation Start', fmtDate(firstVisitDate)]);
    if (lastVisitDate) headerFields.push(['Completion Date', fmtDate(lastVisitDate)]);
    headerFields.push(['Report Generated', fmtDate(new Date())]);

    // Build baseline map: ref_point_id -> value
    const baselineMap = {};
    for (const b of baselines) baselineMap[b.ref_point_id] = b.baseline_value;

    // ---- Build HTML ----
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Drying Report - ${job.client_name || 'Job'}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #222; padding: 20px; max-width: 1100px; margin: 0 auto; }
  h1 { font-size: 20px; color: #FF8C00; margin: 0; }
  h2 { font-size: 15px; border-bottom: 2px solid #FF8C00; padding-bottom: 4px; margin: 20px 0 10px; }
  h3 { font-size: 13px; margin: 14px 0 6px; color: #444; }
  .header { border-bottom: 3px solid #FF8C00; padding-bottom: 12px; margin-bottom: 16px; }
  .header-company { font-size: 22px; font-weight: bold; color: #FF8C00; }
  .header-title { font-size: 16px; color: #333; margin-top: 2px; }
  .header-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 20px; margin-top: 10px; font-size: 11px; }
  .header-grid .label { font-weight: 600; color: #555; }
  .summary { background: #f8f8f8; padding: 12px; border-left: 3px solid #FF8C00; margin-bottom: 16px; font-size: 12px; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10.5px; }
  th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: center; }
  th { background: #f0f0f0; font-weight: 600; font-size: 10px; }
  tr:nth-child(even) { background: #fafafa; }
  .dry { color: #228B22; font-weight: bold; }
  .demo { color: #999; text-decoration: line-through; }
  .chamber-section { page-break-before: auto; margin-top: 20px; }
  .chamber-header { background: #333; color: #fff; padding: 6px 10px; font-size: 13px; }
  .room-header { background: #e8e8e8; padding: 4px 8px; font-size: 11px; font-weight: 600; margin: 10px 0 4px; }
  .equip-summary { background: #fff8f0; border: 1px solid #FF8C00; padding: 10px; margin-top: 16px; }
  .equip-summary h2 { border-color: #FF8C00; }
  .ref-label { text-align: left; }
  td.ref-label { text-align: left; }
  .print-btn { position: fixed; top: 10px; right: 10px; background: #FF8C00; color: #fff; border: none; padding: 10px 20px; font-size: 14px; cursor: pointer; border-radius: 4px; z-index: 999; }
  .print-btn:hover { background: #e07800; }
  @media print {
    .print-btn { display: none; }
    body { padding: 0; font-size: 10px; }
    .chamber-section { page-break-before: always; }
    .chamber-section:first-of-type { page-break-before: avoid; }
  }
</style></head><body>
<button class="print-btn" onclick="window.print()">🖨️ Print / Save PDF</button>

<div class="header">
  <div class="header-company">Apex Restoration LLC</div>
  <div class="header-title">Moisture Mitigation &amp; Drying Report</div>
  <div class="header-grid">`;

    for (const [label, value] of headerFields) {
      html += `<div><span class="label">${label}:</span> ${value}</div>`;
    }
    html += `</div></div>`;

    // Executive Summary
    html += `<div class="summary">`;
    if (firstVisitDate && lastVisitDate) {
      html += `Water mitigation began on <strong>${fmtDate(firstVisitDate)}</strong>. `;
      html += `The structure reached dry standard on <strong>${fmtDate(lastVisitDate)}</strong>, `;
      html += `totaling <strong>${dryingDays} drying day${dryingDays !== 1 ? 's' : ''}</strong> `;
      html += `across <strong>${chambers.length} chamber${chambers.length !== 1 ? 's' : ''}</strong> `;
      html += `and <strong>${totalRooms} affected room${totalRooms !== 1 ? 's' : ''}</strong>.`;
    } else {
      html += `Drying log created but no visits recorded yet.`;
    }
    html += `</div>`;

    // Global equipment tracking for summary
    const globalEquipDays = {};

    // Per-chamber breakdown
    for (const chamber of chambers) {
      const rooms = roomsByChamber[chamber.id] || [];
      const floorLabel = FLOOR_MAP[chamber.floor_level] || chamber.floor_level || '';

      html += `<div class="chamber-section">`;
      html += `<div class="chamber-header">${chamber.name || 'Chamber'}${floorLabel ? ' — ' + floorLabel : ''}</div>`;

      // Atmospheric readings table
      if (visits.length > 0) {
        html += `<h3>Atmospheric Readings</h3><table><tr><th>Visit</th><th>Date</th>`;
        // Find reading types present
        const readingTypes = ['intake', 'exhaust', 'unaffected', 'outside'];
        const typeLabels = { intake: 'Intake', exhaust: 'Exhaust', unaffected: 'Unaffected', outside: 'Outside' };
        for (const rt of readingTypes) {
          html += `<th>${typeLabels[rt]} Temp</th><th>${typeLabels[rt]} RH</th><th>${typeLabels[rt]} GPP</th>`;
        }
        html += `</tr>`;

        for (const v of visits) {
          const atmos = atmosphericByVisit[v.id] || [];
          const atmosMap = {};
          for (const a of atmos) {
            if (a.chamber_id === chamber.id || a.reading_type === 'unaffected' || a.reading_type === 'outside') {
              atmosMap[a.reading_type] = a;
            }
          }
          html += `<tr><td>${v.visit_number}</td><td>${shortDate(v.visit_date)}</td>`;
          for (const rt of readingTypes) {
            const a = atmosMap[rt];
            if (a) {
              const gpp = calcGPP(a.temperature, a.humidity);
              html += `<td>${a.temperature != null ? a.temperature + '°F' : '--'}</td>`;
              html += `<td>${a.humidity != null ? a.humidity + '%' : '--'}</td>`;
              html += `<td>${gpp != null ? gpp : '--'}</td>`;
            } else {
              html += `<td>--</td><td>--</td><td>--</td>`;
            }
          }
          html += `</tr>`;
        }
        html += `</table>`;
      }

      // Per room
      for (const room of rooms) {
        html += `<div class="room-header">${room.name || 'Room'}</div>`;

        // Ref points for this room
        const roomRefs = refPoints.filter(rp => rp.room_id === room.id);
        if (roomRefs.length > 0 && visits.length > 0) {
          html += `<table><tr><th>Ref #</th><th>Material</th><th>Surface</th>`;
          for (const v of visits) {
            html += `<th>V${v.visit_number} (${shortDate(v.visit_date)})</th>`;
          }
          html += `<th>Baseline</th><th>Status</th></tr>`;

          for (const rp of roomRefs) {
            const demolished = !!rp.demolished_at;
            const demoDate = rp.demolished_at ? new Date(rp.demolished_at) : null;
            const baseline = baselineMap[rp.id];
            html += `<tr><td>${rp.ref_number}</td>`;
            html += `<td class="ref-label">${MATERIAL_MAP[rp.material_code] || rp.material_code || ''}</td>`;
            html += `<td>${SURFACE_MAP[rp.surface_type] || rp.surface_type || ''}</td>`;

            let lastValue = null;
            for (const v of visits) {
              const vReadings = readingsByVisit[v.id] || [];
              const reading = vReadings.find(r => r.ref_point_id === rp.id);
              const visitDate = new Date(v.visit_date);

              if (demolished && demoDate && visitDate > demoDate) {
                html += `<td class="demo">DEMO</td>`;
              } else if (reading && reading.value != null) {
                lastValue = reading.value;
                html += `<td>${reading.value}</td>`;
              } else {
                html += `<td>--</td>`;
              }
            }

            html += `<td>${baseline != null ? baseline : '--'}</td>`;
            if (demolished) {
              html += `<td class="demo">DEMOLISHED</td>`;
            } else if (lastValue != null && baseline != null && lastValue <= baseline + 4) {
              html += `<td class="dry">DRY ✓</td>`;
            } else {
              html += `<td>${lastValue != null ? lastValue : '--'}</td>`;
            }
            html += `</tr>`;
          }
          html += `</table>`;
        }

        // Equipment log (daily from first to last visit)
        const roomEquipByVisit = {};
        for (const v of visits) {
          const equip = (equipmentByVisit[v.id] || []).filter(e => e.room_id === room.id);
          roomEquipByVisit[v.id] = equip;
        }

        if (firstVisitDate && lastVisitDate) {
          // Get all equipment types used in this room
          const typesUsed = new Set();
          for (const v of visits) {
            for (const e of (roomEquipByVisit[v.id] || [])) {
              typesUsed.add(e.equipment_type);
            }
          }
          const typeArr = Array.from(typesUsed);

          if (typeArr.length > 0) {
            html += `<h3>Equipment Log — ${room.name || 'Room'}</h3>`;
            html += `<table><tr><th>Date</th>`;
            for (const t of typeArr) html += `<th>${EQUIP_LABELS[t] || t}</th>`;
            html += `</tr>`;

            // Build visit date -> equipment map
            const visitEquipMap = {};
            for (const v of visits) {
              const dateKey = new Date(v.visit_date).toISOString().slice(0, 10);
              const counts = {};
              for (const e of (roomEquipByVisit[v.id] || [])) {
                counts[e.equipment_type] = (counts[e.equipment_type] || 0) + e.quantity;
              }
              visitEquipMap[dateKey] = counts;
            }

            // Walk each day
            let currentCounts = {};
            const typeTotals = {};
            for (const t of typeArr) typeTotals[t] = 0;

            const dayMs = 86400000;
            for (let d = new Date(firstVisitDate); d <= lastVisitDate; d = new Date(d.getTime() + dayMs)) {
              const dk = d.toISOString().slice(0, 10);
              if (visitEquipMap[dk]) currentCounts = { ...visitEquipMap[dk] };
              html += `<tr><td>${shortDate(d)}</td>`;
              for (const t of typeArr) {
                const qty = currentCounts[t] || 0;
                html += `<td>${qty}</td>`;
                typeTotals[t] += qty;
                if (!globalEquipDays[t]) globalEquipDays[t] = 0;
                globalEquipDays[t] += qty;
              }
              html += `</tr>`;
            }

            // Totals row
            html += `<tr style="font-weight:bold;background:#e8e8e8"><td>Total Equip-Days</td>`;
            for (const t of typeArr) html += `<td>${typeTotals[t]}</td>`;
            html += `</tr></table>`;
          }
        }
      }

      html += `</div>`; // chamber-section
    }

    // Equipment Summary
    const equipTypes = Object.keys(globalEquipDays);
    if (equipTypes.length > 0) {
      html += `<div class="equip-summary"><h2>Equipment Summary</h2>`;
      const totalAll = Object.values(globalEquipDays).reduce((s, v) => s + v, 0);
      html += `<p><strong>Total equipment-days: ${totalAll}</strong></p><ul>`;
      for (const t of equipTypes) {
        html += `<li>${globalEquipDays[t]} ${(EQUIP_LABELS[t] || t).toLowerCase()}-days</li>`;
      }
      html += `</ul></div>`;
    }

    html += `</body></html>`;
    res.send(html);
  } catch (err) {
    console.error('Error generating drying report:', err);
    res.status(500).send('Failed to generate report');
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
