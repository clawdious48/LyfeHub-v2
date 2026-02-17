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
// COMPLETION VALIDATION & LOCK ROUTES
// ============================================

// GET /completion-status - Check if log can be completed
router.get('/completion-status', requireScope('drying', 'read'), async (req, res) => {
  try {
    const log = await requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });

    const status = await dryingLogs.getCompletionStatus(log.id);
    res.json(status);
  } catch (err) {
    console.error('Error getting completion status:', err);
    res.status(500).json({ error: 'Failed to get completion status' });
  }
});

// POST /complete - Complete and lock the drying log
router.post('/complete', requireScope('drying', 'write'), async (req, res) => {
  try {
    const log = await requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });

    // First validate completion status
    const status = await dryingLogs.getCompletionStatus(log.id);
    if (!status.canComplete) {
      return res.status(400).json({ 
        error: 'Cannot complete drying log', 
        validationErrors: status.errors 
      });
    }

    // Mark as completed and locked
    await db.run(
      'UPDATE drying_logs SET locked = 1, completed_at = NOW(), completed_by = $1, updated_at = NOW() WHERE id = $2',
      [req.user?.id || null, log.id]
    );

    const updated = await dryingLogs.getLogByJobId(req.params.id);
    res.json({ success: true, log: updated });
  } catch (err) {
    console.error('Error completing drying log:', err);
    res.status(500).json({ error: 'Failed to complete drying log' });
  }
});

// POST /reopen - Reopen a completed drying log (admin only)
router.post('/reopen', requireScope('drying', 'write'), async (req, res) => {
  try {
    const log = await requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });

    // Check user is admin
    const userRoles = req.user?.roles || req.user?.role || [];
    const rolesArr = Array.isArray(userRoles) ? userRoles : [userRoles];
    if (!rolesArr.includes('admin') && !rolesArr.includes('developer') && !rolesArr.includes('management')) {
      return res.status(403).json({ error: 'Only admins can reopen completed logs' });
    }

    // Reopen the log
    await db.run(
      'UPDATE drying_logs SET locked = 0, completed_at = NULL, completed_by = NULL, updated_at = NOW() WHERE id = $1',
      [log.id]
    );

    const updated = await dryingLogs.getLogByJobId(req.params.id);
    res.json({ success: true, log: updated });
  } catch (err) {
    console.error('Error reopening drying log:', err);
    res.status(500).json({ error: 'Failed to reopen drying log' });
  }
});

// ============================================
// EQUIPMENT PLACEMENT ROUTES
// ============================================

// GET /equipment - List all equipment placements for this log
router.get('/equipment', requireScope('drying', 'read'), async (req, res) => {
  try {
    const log = await requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });

    const equipment = await dryingLogs.getEquipmentPlacements(log.id);
    res.json(equipment);
  } catch (err) {
    console.error('Error getting equipment placements:', err);
    res.status(500).json({ error: 'Failed to get equipment placements' });
  }
});

// POST /equipment - Create equipment placement(s) (accepts single or array)
router.post('/equipment', requireScope('drying', 'write'), async (req, res) => {
  try {
    const log = await requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });

    const body = req.body;
    const placements = Array.isArray(body) ? body : [body];
    const results = [];

    for (const placement of placements) {
      const { room_id, equipment_type, label, placed_at, placed_visit_id, notes } = placement;
      if (!room_id) return res.status(400).json({ error: 'room_id is required' });
      if (!equipment_type) return res.status(400).json({ error: 'equipment_type is required' });
      if (!placed_at) return res.status(400).json({ error: 'placed_at is required' });

      const result = await dryingLogs.createEquipmentPlacement({
        logId: log.id,
        roomId: room_id,
        type: equipment_type,
        label,
        placedAt: placed_at,
        placedVisitId: placed_visit_id,
        notes
      });
      results.push(result);
    }

    res.status(201).json(Array.isArray(body) ? results : results[0]);
  } catch (err) {
    console.error('Error creating equipment placement:', err);
    res.status(500).json({ error: 'Failed to create equipment placement' });
  }
});

// PATCH /equipment/:pid - Update equipment placement
router.patch('/equipment/:pid', requireScope('drying', 'write'), async (req, res) => {
  try {
    const log = await requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });

    const { equipment_type, label, placed_at, removed_at, placed_visit_id, removed_visit_id, notes, room_id } = req.body;
    
    const fields = {};
    if (equipment_type !== undefined) fields.equipment_type = equipment_type;
    if (label !== undefined) fields.label = label;
    if (placed_at !== undefined) fields.placed_at = placed_at;
    if (removed_at !== undefined) fields.removed_at = removed_at;
    if (placed_visit_id !== undefined) fields.placed_visit_id = placed_visit_id;
    if (removed_visit_id !== undefined) fields.removed_visit_id = removed_visit_id;
    if (notes !== undefined) fields.notes = notes;
    if (room_id !== undefined) fields.room_id = room_id;

    await dryingLogs.updateEquipmentPlacement(req.params.pid, fields);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating equipment placement:', err);
    res.status(500).json({ error: 'Failed to update equipment placement' });
  }
});

// DELETE /equipment/:pid - Delete equipment placement
router.delete('/equipment/:pid', requireScope('drying', 'delete'), async (req, res) => {
  try {
    await dryingLogs.deleteEquipmentPlacement(req.params.pid);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting equipment placement:', err);
    res.status(500).json({ error: 'Failed to delete equipment placement' });
  }
});

// POST /equipment/:pid/remove - Remove equipment (set removed_at)
router.post('/equipment/:pid/remove', requireScope('drying', 'write'), async (req, res) => {
  try {
    const { removed_at, removed_visit_id } = req.body;
    if (!removed_at) return res.status(400).json({ error: 'removed_at is required' });

    await dryingLogs.removeEquipmentPlacement(req.params.pid, { removedAt: removed_at, removedVisitId: removed_visit_id });
    res.json({ success: true });
  } catch (err) {
    console.error('Error removing equipment placement:', err);
    res.status(500).json({ error: 'Failed to remove equipment placement' });
  }
});

// POST /equipment/bulk-remove - Remove multiple equipment pieces
router.post('/equipment/bulk-remove', requireScope('drying', 'write'), async (req, res) => {
  try {
    const { ids, removed_at, removed_visit_id } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    if (!removed_at) return res.status(400).json({ error: 'removed_at is required' });

    for (const id of ids) {
      await dryingLogs.removeEquipmentPlacement(id, { removedAt: removed_at, removedVisitId: removed_visit_id });
    }

    res.json({ success: true, removedCount: ids.length });
  } catch (err) {
    console.error('Error bulk removing equipment:', err);
    res.status(500).json({ error: 'Failed to bulk remove equipment' });
  }
});

// ============================================
// PDF REPORT GENERATION ROUTES
// ============================================

const dryingReport = require('../services/dryingReport');

// POST /generate-report - Generate PDF report for completed drying log
router.post('/generate-report', requireScope('drying', 'write'), async (req, res) => {
  try {
    const log = await requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });

    // Check if log is completed and locked
    if (!log.locked || !log.completed_at) {
      return res.status(400).json({ error: 'Drying log must be completed before generating report' });
    }

    // Get organization ID from job
    const job = await db.getOne('SELECT org_id FROM apex_jobs WHERE id = $1', [req.params.id]);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const result = await dryingReport.generate(
      log.id,
      req.params.id,
      job.org_id,
      req.user?.id || null
    );

    res.json(result);
  } catch (err) {
    console.error('Error generating drying report:', err);
    res.status(500).json({ error: 'Failed to generate drying report', details: err.message });
  }
});

// GET /reports - List reports for this drying log
router.get('/reports', requireScope('drying', 'read'), async (req, res) => {
  try {
    const log = await requireLog(req.params.id);
    if (!log) return res.status(404).json({ error: 'No drying log for this job' });

    const reports = await dryingReport.listReports(log.id);
    res.json(reports);
  } catch (err) {
    console.error('Error getting drying reports:', err);
    res.status(500).json({ error: 'Failed to get drying reports' });
  }
});

// Duplicate routes removed - Agent F code review fix

// GET /reports/:reportId/download - Download a report file
router.get('/reports/:reportId/download', requireScope('drying', 'read'), async (req, res) => {
  try {
    const report = await db.getOne(
      'SELECT * FROM drying_reports WHERE id = $1',
      [req.params.reportId]
    );

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Verify report belongs to this job
    if (report.job_id !== req.params.id) {
      return res.status(404).json({ error: 'Report not found for this job' });
    }

    const filePath = path.join(UPLOAD_BASE, report.file_path);
    const resolvedPath = path.resolve(filePath);

    // Security check: ensure path is within upload directory
    if (!resolvedPath.startsWith(path.resolve(UPLOAD_BASE))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Report file not found on disk' });
    }

    // Set appropriate headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
    
    res.sendFile(resolvedPath);
  } catch (err) {
    console.error('Error downloading report:', err);
    res.status(500).json({ error: 'Failed to download report' });
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
