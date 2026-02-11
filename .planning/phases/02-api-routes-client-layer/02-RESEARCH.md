# Phase 2: API Routes & Client Layer - Research

**Researched:** 2026-02-11
**Domain:** Express REST API routes for drying data, frontend API client extension, multer + sharp photo upload pipeline
**Confidence:** HIGH

## Summary

Phase 2 bridges the Phase 1 database layer to the frontend by building REST API routes for all drying CRUD operations, extending the frontend `api.js` client with drying-specific methods, and adding a photo upload pipeline with server-side image processing. The work divides cleanly into two plans: (1) backend routes with bulk save, and (2) frontend client layer plus photo upload infrastructure.

The existing codebase provides well-established patterns for all three concerns. The Apex job routes in `apexJobs.js` (610 lines) demonstrate the exact route structure pattern: Express router with `authMiddleware`, nested under a parent resource. The existing `uploads.js` route uses multer for file handling. The frontend `api.js` follows a consistent pattern of thin wrapper methods calling `this.request()`. The main challenge is fixing `api.request()` to not force `Content-Type: application/json` when the body is a FormData instance -- this is a bug that would corrupt multipart uploads.

Sharp (v0.34.x) is the only new dependency. It provides EXIF auto-orientation, resize, and JPEG compression. It works on Alpine Linux (musl) out of the box via prebuilt binaries. The Dockerfile needs no changes beyond `npm ci` pulling the sharp binary.

**Primary recommendation:** Create `backend/src/routes/drying.js` as a sub-router mounted on the existing apex jobs router at `/:id/drying/*`. Add missing CRUD functions to `dryingLogs.js` (update/delete for chambers, rooms, ref points). Fix `api.request()` FormData detection (2-line fix). Add a separate drying photo upload route with sharp processing. Extend `api.js` with ~15 new drying endpoint methods.

## Standard Stack

### Core (Already Installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| express | ^4.21.2 | HTTP server, routing | Already in use. Router pattern established. |
| multer | ^2.0.2 | Multipart form parsing for file uploads | Already in use in `uploads.js`. Handles `multipart/form-data`. |
| better-sqlite3 | ^11.7.0 | SQLite driver | Already in use. All DB operations. |
| uuid | ^11.1.0 | UUID v4 for record IDs | Already in use everywhere. |

### New Dependency

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sharp | ^0.34.5 | Server-side image processing (resize, EXIF normalization, thumbnails) | Industry standard for Node.js image processing. 5x-10x faster than ImageMagick. Prebuilt binaries for Alpine Linux musl. Handles EXIF auto-orient, resize, JPEG quality control. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| sharp | jimp | Jimp is pure JS (no native deps) but 10x slower and doesn't handle EXIF orientation reliably. Sharp is the right choice for production photo processing. |
| sharp | imagemagick CLI | Requires shell-out, not available in Alpine by default, harder error handling. Sharp is native Node.js with promise API. |
| Separate drying route file | Inline routes in apexJobs.js | apexJobs.js is already 610 lines. Adding ~200 lines of drying routes would make it unwieldy. Separate file matches existing pattern where domain complexity warrants separation. |

**Installation:**
```bash
cd backend && npm install sharp
```

**Docker note:** Sharp provides prebuilt binaries for `linux-x64-musl` (Alpine). `npm ci --only=production` in the Dockerfile will pull the correct platform binary automatically. No Dockerfile changes needed. Verified: Node.js ^18.17.0 or >=20.3.0 required (project uses Node 20 Alpine).

## Architecture Patterns

### Recommended File Structure

```
backend/src/
  routes/
    apexJobs.js          # (existing) Main apex job routes - will mount drying sub-router
    drying.js             # (NEW) Drying log routes: /api/apex-jobs/:jobId/drying/*
    uploads.js            # (existing) General file uploads
  db/
    dryingLogs.js         # (existing, extended) Add missing update/delete CRUD
    dryingSchema.js       # (existing) Table definitions
frontend/
  js/
    api.js                # (existing, extended) Add drying endpoint methods, fix FormData handling
```

### Pattern 1: Nested Sub-Router Mounting

**What:** Create a dedicated Express router for drying routes and mount it on the existing apex jobs router, so routes appear at `/api/apex-jobs/:jobId/drying/*`.

**When to use:** When a sub-resource has enough routes to warrant its own file.

**Example:**
```javascript
// In backend/src/routes/apexJobs.js (at the bottom, before module.exports):
const dryingRoutes = require('./drying');
router.use('/:id/drying', dryingRoutes);

// In backend/src/routes/drying.js:
const express = require('express');
const router = express.Router({ mergeParams: true });
// mergeParams: true gives access to :id from parent router
const { authMiddleware } = require('../middleware/auth');
const dryingLogs = require('../db/dryingLogs');

router.use(authMiddleware);

// req.params.id is the jobId from the parent router
router.get('/log', (req, res) => {
  const log = dryingLogs.getLogByJobId(req.params.id);
  if (!log) return res.status(404).json({ error: 'No drying log for this job' });
  res.json(log);
});
```

**Critical detail:** `express.Router({ mergeParams: true })` is required to access `:id` from the parent router. Without this, `req.params.id` is undefined in the sub-router.

### Pattern 2: Existing Route Handler Pattern (from apexJobs.js)

**What:** Every route follows the same structure: try/catch, auth check, DB call, return JSON.

**Example:**
```javascript
// Source: existing pattern from apexJobs.js
router.post('/chambers', (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    // DB call
    const chamber = dryingLogs.insertChamber(logId, req.body.name, req.body.color, req.body.position);
    res.status(201).json(chamber);
  } catch (err) {
    console.error('Error creating chamber:', err);
    res.status(500).json({ error: 'Failed to create chamber' });
  }
});
```

### Pattern 3: Bulk Save Endpoint

**What:** A single endpoint that accepts a visit's worth of data (atmospheric readings, moisture readings, equipment) and saves it all in one transaction.

**When to use:** When the client needs to send many related records atomically.

**Example:**
```javascript
// POST /api/apex-jobs/:jobId/drying/visits/:visitId/save
router.post('/visits/:visitId/save', (req, res) => {
  try {
    const { atmospheric, moisture, equipment } = req.body;
    const visit = dryingLogs.getVisitById(req.params.visitId);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });

    const log = dryingLogs.getLogByJobId(req.params.id);

    // Each of these is already a transaction in dryingLogs.js
    // Wrap all three in an outer transaction for full atomicity
    const saveAll = db.transaction(() => {
      if (atmospheric) dryingLogs.saveAtmosphericReadings(visit.id, atmospheric);
      if (moisture) dryingLogs.saveMoistureReadings(visit.id, moisture, log.id);
      if (equipment) dryingLogs.saveEquipment(visit.id, equipment);
    });
    saveAll();

    res.json({ success: true });
  } catch (err) {
    console.error('Error saving visit:', err);
    res.status(500).json({ error: 'Failed to save visit data' });
  }
});
```

### Pattern 4: FormData Detection in api.request()

**What:** The existing `api.request()` unconditionally sets `Content-Type: application/json` and stringifies the body. This breaks FormData uploads because the browser must set its own `Content-Type` with the multipart boundary.

**Fix:** Check if body is a FormData instance before processing.

**Example:**
```javascript
// In frontend/js/api.js - the request() method
async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    const config = {
        ...options,
        credentials: 'include',
    };

    // Only set JSON headers and stringify if body is NOT FormData
    if (options.body instanceof FormData) {
        config.body = options.body;
        // Do NOT set Content-Type -- browser sets it with boundary
        config.headers = { ...options.headers };
    } else {
        config.headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }
    }
    // ... rest of method unchanged
}
```

### Pattern 5: Photo Upload with Sharp Processing

**What:** Photos are uploaded via multer, then processed by sharp (auto-orient EXIF, resize to max dimension, generate thumbnail), and stored to the `/data/uploads/drying/` directory.

**Example:**
```javascript
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const DRYING_UPLOAD_DIR = '/data/uploads/drying';

async function processPhoto(inputPath, jobId) {
  const id = uuidv4();
  const dir = path.join(DRYING_UPLOAD_DIR, jobId);
  fs.mkdirSync(dir, { recursive: true });

  const fullPath = path.join(dir, `${id}.jpg`);
  const thumbPath = path.join(dir, `${id}_thumb.jpg`);

  // Full-size: auto-orient EXIF, resize max 1920px, compress
  await sharp(inputPath)
    .autoOrient()
    .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(fullPath);

  // Thumbnail: 300px wide
  await sharp(inputPath)
    .autoOrient()
    .resize({ width: 300, height: 300, fit: 'inside' })
    .jpeg({ quality: 70 })
    .toFile(thumbPath);

  // Remove temp upload
  fs.unlinkSync(inputPath);

  return {
    id,
    path: `/uploads/drying/${jobId}/${id}.jpg`,
    thumbPath: `/uploads/drying/${jobId}/${id}_thumb.jpg`,
  };
}
```

### Anti-Patterns to Avoid

- **Mounting drying routes as a separate top-level router:** Drying routes must be nested under apex jobs to maintain the `/api/apex-jobs/:jobId/drying/*` URL structure. Do NOT create a separate `/api/drying/*` top-level mount.
- **Skipping mergeParams:** Without `{ mergeParams: true }`, the sub-router cannot access `:id` from the parent. This causes `req.params.id` to be undefined.
- **Setting Content-Type for FormData uploads:** When the body is a FormData instance, the browser MUST set the Content-Type header (it includes the multipart boundary string). Manually setting it to `multipart/form-data` or `application/json` breaks the upload.
- **Processing photos synchronously in the request handler:** Sharp operations are async. Use `await` properly. Do NOT use `sharp().toBuffer()` + `fs.writeFileSync()` when `sharp().toFile()` exists.
- **Storing full-size unprocessed photos:** Mobile camera photos are 5-12 MB each. Without sharp processing, storage fills up fast and page loads are slow. Always resize and compress.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| EXIF auto-orientation | Manual EXIF parsing + rotation | `sharp().autoOrient()` | EXIF orientation has 8 possible states including mirrored variants. Sharp handles them all in one call. |
| Image resizing | Canvas/manual pixel manipulation | `sharp().resize()` | Lanczos3 resampling, proper color space handling, memory efficient streaming. |
| Thumbnail generation | Separate image processing library | `sharp().resize({ width: 300 })` | Same library, same pipeline, just different dimensions. |
| Multipart parsing | Manual multipart body parsing | multer (already installed) | Multipart is complex (boundaries, encoding, streaming). Multer handles it correctly. |
| Job ownership verification | Inline SQL in every route | Helper function: `verifyJobOwnership(jobId, userId)` | Every drying route needs this check. Extract it once to avoid 15+ duplicate SQL queries. |

**Key insight:** The drying routes are structurally identical to existing apex sub-resource routes (notes, estimates, labor, etc.). Follow the exact same patterns -- the only novelty is the bulk save endpoint and photo processing.

## Common Pitfalls

### Pitfall 1: Missing mergeParams on Sub-Router

**What goes wrong:** `req.params.id` (the jobId from the parent apex router) is `undefined` in all drying route handlers. Every request fails with "Job not found" or crashes.

**Why it happens:** Express sub-routers do not inherit parent route parameters by default.

**How to avoid:** Create the router with `express.Router({ mergeParams: true })`. This is the FIRST line of the drying routes file.

**Warning signs:** All drying endpoints return 404 even when the job exists.

### Pitfall 2: FormData Body Gets JSON-Stringified

**What goes wrong:** Photo uploads fail because `api.request()` calls `JSON.stringify(formData)`, producing `{}` instead of the multipart body. The server receives no files.

**Why it happens:** The existing `api.request()` unconditionally stringifies object bodies and sets `Content-Type: application/json`.

**How to avoid:** Add an `instanceof FormData` check before the body processing logic. When body is FormData, pass it directly without headers. The browser automatically sets the correct `Content-Type: multipart/form-data; boundary=...` header.

**Warning signs:** Upload requests arrive at the server with `Content-Type: application/json` and an empty body.

### Pitfall 3: Auth Middleware Applied Twice

**What goes wrong:** The apex jobs router already applies `authMiddleware` via `router.use(authMiddleware, ...)`. If the drying sub-router also applies `authMiddleware`, auth runs twice per request (unnecessary overhead, potential token issues).

**Why it happens:** The drying routes file follows the template of a standalone route file.

**How to avoid:** The apex jobs router's auth middleware already runs for all nested routes. The drying sub-router does NOT need to add its own `router.use(authMiddleware)`. However, if the drying router is mounted inside the `router.use(authMiddleware, ...)` block in apexJobs.js, auth is already applied. Verify by checking where the sub-router is mounted relative to the auth middleware.

**Warning signs:** Double "Authorization" headers in logs, or auth-related middleware executing twice.

### Pitfall 4: Missing DB CRUD Operations for Updates/Deletes

**What goes wrong:** The API routes need to update chamber names, room names, delete chambers, delete rooms, update ref point labels, delete visits, and delete notes. But `dryingLogs.js` (from Phase 1) only has insert and read functions -- no update or delete functions for most entities.

**Why it happens:** Phase 1 focused on the core data path (insert + bulk save). Full CRUD wasn't needed until API routes exist.

**How to avoid:** Before writing routes, audit `dryingLogs.js` exports against the required route operations. Add missing prepared statements and functions:
- `updateChamber(id, data)` -- update name, color, position
- `deleteChamber(id)` -- delete (cascade deletes rooms, ref points)
- `updateRoom(id, data)` -- update name, position, chamber_id
- `deleteRoom(id)` -- delete (cascade deletes ref points)
- `updateRefPoint(id, data)` -- update label, material_code
- `deleteVisit(id)` -- delete visit (cascade deletes readings, equipment, notes)
- `deleteNote(id)` -- delete a visit note
- `getLogById(id)` -- look up log by its own ID (not job_id)
- `getVisitByLogAndNumber(logId, visitNumber)` -- find specific visit

### Pitfall 5: Sharp Not Handling Temp File Cleanup

**What goes wrong:** Multer writes uploaded files to a temp directory. If sharp processing fails (corrupt file, unsupported format), the temp file is never cleaned up. Over time, temp files accumulate.

**Why it happens:** No try/finally or error handling around the temp file lifecycle.

**How to avoid:** Always wrap sharp processing in try/finally. In the finally block, unlink the temp file if it still exists. Return a user-friendly error if processing fails (don't expose sharp error messages).

### Pitfall 6: Serving Photos Without Auth

**What goes wrong:** Processed drying photos are stored under `/data/uploads/drying/` and served via the existing static file handler or the existing uploads route. If served statically, anyone with the URL can access photos without authentication.

**Why it happens:** Express `express.static()` serves all files under the static path without auth checks.

**How to avoid:** Do NOT serve drying photos via express.static. Create an authenticated route: `GET /api/apex-jobs/:jobId/drying/photos/:filename` that verifies the user owns the job before calling `res.sendFile()`. Follow the existing pattern in `uploads.js` which has auth-gated file serving.

## Code Examples

### Complete Drying Route File Structure

```javascript
// Source: pattern derived from existing backend/src/routes/apexJobs.js
const express = require('express');
const router = express.Router({ mergeParams: true }); // CRITICAL: mergeParams
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const dryingLogs = require('../db/dryingLogs');
const db = require('../db/schema');

// Note: authMiddleware is already applied by the parent apexJobs router

// Helper: verify job exists and get drying log
function getJobLog(jobId) {
  return dryingLogs.getLogByJobId(jobId);
}

// ============================================
// DRYING LOGS (one per job)
// ============================================

// GET /api/apex-jobs/:id/drying/log
router.get('/log', (req, res) => { /* ... */ });

// POST /api/apex-jobs/:id/drying/log
router.post('/log', (req, res) => { /* ... */ });

// ============================================
// CHAMBERS
// ============================================

// GET /api/apex-jobs/:id/drying/chambers
router.get('/chambers', (req, res) => { /* ... */ });

// POST /api/apex-jobs/:id/drying/chambers
router.post('/chambers', (req, res) => { /* ... */ });

// PATCH /api/apex-jobs/:id/drying/chambers/:chamberId
router.patch('/chambers/:chamberId', (req, res) => { /* ... */ });

// DELETE /api/apex-jobs/:id/drying/chambers/:chamberId
router.delete('/chambers/:chamberId', (req, res) => { /* ... */ });

// ============================================
// ROOMS
// ============================================

// Similar CRUD pattern for rooms, ref points, baselines, visits

// ============================================
// VISITS (with bulk save)
// ============================================

// POST /api/apex-jobs/:id/drying/visits/:visitId/save
router.post('/visits/:visitId/save', (req, res) => { /* bulk save */ });

// ============================================
// PHOTOS
// ============================================

// POST /api/apex-jobs/:id/drying/photos (upload + process)
// GET /api/apex-jobs/:id/drying/photos/:filename (auth-gated serve)

module.exports = router;
```

### FormData Fix for api.request()

```javascript
// Source: fix for existing frontend/js/api.js
async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    const config = {
        ...options,
        credentials: 'include',
    };

    if (options.body instanceof FormData) {
        // FormData: let browser set Content-Type with boundary
        config.body = options.body;
        config.headers = { ...options.headers };
    } else {
        // JSON: set Content-Type and stringify
        config.headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }
    }

    const response = await fetch(url, config);
    // ... rest unchanged
}
```

### Frontend Drying API Methods Pattern

```javascript
// Source: pattern derived from existing api.js apex methods
// Added to the api object in frontend/js/api.js

// Drying Logs
async getDryingLog(jobId) {
    return this.request(`/apex-jobs/${jobId}/drying/log`);
},
async createDryingLog(jobId) {
    return this.request(`/apex-jobs/${jobId}/drying/log`, { method: 'POST' });
},

// Chambers
async getDryingChambers(jobId) {
    return this.request(`/apex-jobs/${jobId}/drying/chambers`);
},
async createDryingChamber(jobId, data) {
    return this.request(`/apex-jobs/${jobId}/drying/chambers`, { method: 'POST', body: data });
},

// Visits - bulk save
async saveDryingVisit(jobId, visitId, data) {
    return this.request(`/apex-jobs/${jobId}/drying/visits/${visitId}/save`, { method: 'POST', body: data });
},

// Photos
async uploadDryingPhotos(jobId, files) {
    const formData = new FormData();
    for (const file of files) {
        formData.append('photos', file);
    }
    return this.request(`/apex-jobs/${jobId}/drying/photos`, {
        method: 'POST',
        body: formData,  // FormData detected by instanceof check
    });
},
```

### Sharp Photo Processing Pipeline

```javascript
// Source: sharp official docs (https://sharp.pixelplumbing.com/)
const DRYING_UPLOAD_DIR = '/data/uploads/drying';
const MAX_DIMENSION = 1920;
const THUMB_SIZE = 300;
const FULL_QUALITY = 85;
const THUMB_QUALITY = 70;

async function processDryingPhoto(inputPath, jobId) {
  const photoId = uuidv4();
  const dir = path.join(DRYING_UPLOAD_DIR, jobId);
  fs.mkdirSync(dir, { recursive: true });

  const fullPath = path.join(dir, `${photoId}.jpg`);
  const thumbPath = path.join(dir, `${photoId}_thumb.jpg`);

  try {
    // Full-size: auto-orient EXIF, resize max 1920px, JPEG 85%
    await sharp(inputPath)
      .autoOrient()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: FULL_QUALITY })
      .toFile(fullPath);

    // Thumbnail: 300px, JPEG 70%
    await sharp(inputPath)
      .autoOrient()
      .resize({
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        fit: 'inside'
      })
      .jpeg({ quality: THUMB_QUALITY })
      .toFile(thumbPath);
  } finally {
    // Always clean up temp upload file
    try { fs.unlinkSync(inputPath); } catch (e) { /* ignore */ }
  }

  return {
    id: photoId,
    path: `/uploads/drying/${jobId}/${photoId}.jpg`,
    thumbPath: `/uploads/drying/${jobId}/${photoId}_thumb.jpg`,
  };
}
```

## API Endpoint Design

### Complete Endpoint Map

| Method | Path | Purpose | DB Function |
|--------|------|---------|-------------|
| GET | `/drying/log` | Get drying log for job | `getLogByJobId(jobId)` |
| POST | `/drying/log` | Create drying log for job | `createDryingLog(jobId)` |
| GET | `/drying/chambers` | List chambers for log | `getChambersByLogId(logId)` |
| POST | `/drying/chambers` | Create chamber | `insertChamber(...)` |
| PATCH | `/drying/chambers/:chamberId` | Update chamber | `updateChamber(...)` **(NEW)** |
| DELETE | `/drying/chambers/:chamberId` | Delete chamber | `deleteChamber(...)` **(NEW)** |
| GET | `/drying/rooms` | List rooms for chamber | `getRoomsByChamber(chamberId)` |
| POST | `/drying/rooms` | Create room | `insertRoom(...)` |
| PATCH | `/drying/rooms/:roomId` | Update room | `updateRoom(...)` **(NEW)** |
| DELETE | `/drying/rooms/:roomId` | Delete room | `deleteRoom(...)` **(NEW)** |
| GET | `/drying/ref-points` | List ref points for log | `getRefPointsByLog(logId)` |
| POST | `/drying/ref-points` | Add ref point (atomic numbering) | `addRefPoint(...)` |
| PATCH | `/drying/ref-points/:rpId` | Update ref point | `updateRefPoint(...)` **(NEW)** |
| POST | `/drying/ref-points/:rpId/demolish` | Demolish ref point | `demolishRefPoint(...)` |
| GET | `/drying/baselines` | List baselines for log | `getBaselinesByLog(logId)` |
| PUT | `/drying/baselines` | Upsert baseline | `upsertBaseline(...)` |
| GET | `/drying/visits` | List visits for log | `getVisitsByLog(logId)` |
| POST | `/drying/visits` | Create visit | `insertVisit(...)` |
| GET | `/drying/visits/:visitId` | Get visit with all data | Composite: visit + atmo + moisture + equipment + notes |
| POST | `/drying/visits/:visitId/save` | Bulk save visit data | `saveAtmosphericReadings` + `saveMoistureReadings` + `saveEquipment` |
| DELETE | `/drying/visits/:visitId` | Delete visit | `deleteVisit(...)` **(NEW)** |
| GET | `/drying/visits/:visitId/notes` | Get notes for visit | `getNotesByVisit(visitId)` |
| POST | `/drying/visits/:visitId/notes` | Add note to visit | `insertNote(...)` |
| DELETE | `/drying/visits/:visitId/notes/:noteId` | Delete note | `deleteNote(...)` **(NEW)** |
| POST | `/drying/photos` | Upload and process photos | multer + sharp pipeline |
| GET | `/drying/photos/:filename` | Serve photo (auth-gated) | `res.sendFile()` with ownership check |

All paths are relative to `/api/apex-jobs/:jobId`.

### Bulk Save Request Body Shape

```json
{
  "atmospheric": [
    { "readingType": "chamber_intake", "chamberId": "uuid", "dehuNumber": null, "tempF": 75, "rhPercent": 60 },
    { "readingType": "dehu_exhaust", "chamberId": "uuid", "dehuNumber": 1, "tempF": 95, "rhPercent": 30 },
    { "readingType": "unaffected", "chamberId": null, "dehuNumber": null, "tempF": 72, "rhPercent": 45 },
    { "readingType": "outside", "chamberId": null, "dehuNumber": null, "tempF": 80, "rhPercent": 50 }
  ],
  "moisture": [
    { "refPointId": "uuid", "readingValue": 15.2 },
    { "refPointId": "uuid", "readingValue": 10.8 }
  ],
  "equipment": [
    { "roomId": "uuid", "equipmentType": "AM", "quantity": 2 },
    { "roomId": "uuid", "equipmentType": "DEHU", "quantity": 1 }
  ]
}
```

### Missing dryingLogs.js Functions (Must Be Added)

These prepared statements and functions must be added to `dryingLogs.js` to support the API routes:

```javascript
// NEW prepared statements needed
const getLogById = db.prepare('SELECT * FROM drying_logs WHERE id = ?');
const updateChamber = db.prepare("UPDATE drying_chambers SET name = ?, color = ?, position = ?, updated_at = datetime('now') WHERE id = ?");
const deleteChamber = db.prepare('DELETE FROM drying_chambers WHERE id = ?');
const getChamberById = db.prepare('SELECT * FROM drying_chambers WHERE id = ?');
const updateRoom = db.prepare("UPDATE drying_rooms SET name = ?, position = ?, updated_at = datetime('now') WHERE id = ?");
const deleteRoom = db.prepare('DELETE FROM drying_rooms WHERE id = ?');
const getRoomById = db.prepare('SELECT * FROM drying_rooms WHERE id = ?');
const updateRefPoint = db.prepare('UPDATE drying_ref_points SET material_code = ?, label = ? WHERE id = ?');
const deleteVisit = db.prepare('DELETE FROM drying_visits WHERE id = ?');
const deleteNote = db.prepare('DELETE FROM drying_visit_notes WHERE id = ?');
const getNoteById = db.prepare('SELECT * FROM drying_visit_notes WHERE id = ?');
const getRoomsByLogId = db.prepare(`
  SELECT r.* FROM drying_rooms r
  JOIN drying_chambers c ON r.chamber_id = c.id
  WHERE c.log_id = ?
  ORDER BY c.position, r.position
`);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Upload raw photos, serve unprocessed | Process with sharp on upload (auto-orient, resize, thumbnail) | Industry standard since sharp matured (~2018+) | 5-10x smaller files, correct orientation on all devices, fast page loads |
| Force Content-Type: application/json for all requests | Detect FormData and skip Content-Type header | Browser standard behavior since Fetch API | Required for multipart uploads to work correctly |
| One request per data type per save | Bulk save endpoint: all visit data in one request | REST API pattern for transactional writes | Atomic saves, fewer network round trips, simpler error handling |

**Deprecated/outdated:**
- None for this phase. All patterns are current and well-established.

## Open Questions

1. **Photo storage path: user-scoped vs. job-scoped**
   - What we know: Existing uploads use `/data/uploads/{userId}/{year}/{month}/` path structure. Drying photos are per-job, not per-user.
   - What's unclear: Whether to use `/data/uploads/drying/{jobId}/` or match the existing user-scoped pattern.
   - Recommendation: Use `/data/uploads/drying/{jobId}/` since drying photos are a job resource, and all users with job access should see them. Simpler path structure for serving.

2. **Photo serving: dedicated drying route vs. extend existing uploads route**
   - What we know: Existing `uploads.js` serves files with auth check based on `userId` path matching. Drying photos need auth based on job ownership.
   - What's unclear: Whether to extend uploads.js or add photo serving to the drying route file.
   - Recommendation: Add photo serving to `drying.js` since the auth model differs (job ownership vs. user ownership). Keep concerns separated.

3. **Visit number auto-assignment**
   - What we know: Visits have a `visit_number` (unique per log). Phase 1 `insertVisit` takes the visit number as a parameter.
   - What's unclear: Whether the API route should auto-assign the next visit number or require the client to provide it.
   - Recommendation: Auto-assign on the server. Query `MAX(visit_number)` for the log and add 1. This prevents race conditions and simplifies the client.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `backend/src/routes/apexJobs.js` -- Route pattern, auth middleware usage, error handling pattern (610 lines, reviewed in full)
- Existing codebase: `backend/src/routes/uploads.js` -- Multer configuration, file upload pattern, auth-gated file serving (270 lines, reviewed in full)
- Existing codebase: `frontend/js/api.js` -- API client pattern, `request()` method with Content-Type bug (706 lines, reviewed in full)
- Existing codebase: `backend/src/db/dryingLogs.js` -- Phase 1 CRUD functions, prepared statements, transaction patterns (289 lines, reviewed in full)
- Existing codebase: `backend/src/index.js` -- Route mounting pattern, middleware order (101 lines, reviewed in full)
- Existing codebase: `backend/package.json` -- Current dependencies (multer ^2.0.2 already installed)
- [Sharp official docs - Installation](https://sharp.pixelplumbing.com/install/) -- Alpine/musl support confirmed, Node.js >=20.3.0 required
- [Sharp official docs - Resize API](https://sharp.pixelplumbing.com/api-resize) -- resize({ fit: 'inside', withoutEnlargement: true }) for max-dimension scaling
- [Sharp official docs - Operations](https://sharp.pixelplumbing.com/api-operation) -- autoOrient() for EXIF normalization
- [Sharp official docs - Output](https://sharp.pixelplumbing.com/api-output) -- jpeg({ quality: 85 }), toFile() for disk output

### Secondary (MEDIUM confidence)
- [MDN - Using FormData Objects](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest_API/Using_FormData_Objects) -- FormData auto-sets Content-Type with boundary when passed to fetch()
- [Express.js - Router mergeParams](https://expressjs.com/en/api.html#express.router) -- mergeParams: true for sub-router param inheritance
- [Sharp npm page](https://www.npmjs.com/package/sharp) -- Latest version 0.34.5, last published ~3 months ago

### Tertiary (LOW confidence)
- None -- all findings verified against primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all existing except sharp, which is documented and verified
- Architecture: HIGH -- follows existing patterns exactly (sub-router, CRUD, multer)
- api.js fix: HIGH -- well-understood FormData/fetch behavior, documented on MDN
- Photo pipeline: HIGH -- sharp API verified against official docs
- Pitfalls: HIGH -- identified from codebase analysis and domain knowledge

**Research date:** 2026-02-11
**Valid until:** 60 days (sharp API stable, Express patterns stable, existing codebase patterns well-established)
