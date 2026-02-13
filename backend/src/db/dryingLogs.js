const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

// ============================================
// PURE CALCULATION FUNCTIONS
// ============================================

/**
 * Calculate Grains Per Pound (GPP) using the IAPWS saturation vapor pressure formula.
 *
 * @param {number} tempF - Temperature in degrees Fahrenheit
 * @param {number} rhPercent - Relative humidity as a percentage (0-100)
 * @param {number} pressurePsia - Atmospheric pressure in psia (default: sea level 14.696)
 * @returns {number|null} GPP rounded to 1 decimal, or null for invalid inputs
 */
function calculateGPP(tempF, rhPercent, pressurePsia = 14.696) {
  // Validate inputs
  if (tempF === null || tempF === undefined || typeof tempF !== 'number' || isNaN(tempF)) return null;
  if (rhPercent === null || rhPercent === undefined || typeof rhPercent !== 'number' || isNaN(rhPercent)) return null;
  if (rhPercent < 0 || rhPercent > 100) return null;

  // IAPWS constants (copy precisely -- digit errors cause GPP drift)
  const c8 = -10440.397;
  const c9 = -11.29465;
  const c10 = -0.027022355;
  const c11 = 0.00001289036;
  const c12 = -0.0000000024780681;
  const c13 = 6.5459673;

  // Convert to Rankine
  const tempR = tempF + 459.67;

  // Calculate ln(Pws)
  const lnPws = c8 / tempR + c9 + c10 * tempR + c11 * tempR * tempR + c12 * tempR * tempR * tempR + c13 * Math.log(tempR);

  // Saturation vapor pressure
  const Pws = Math.exp(lnPws);

  // Actual vapor pressure
  const Pw = (rhPercent / 100) * Pws;

  // Humidity ratio
  const W = 0.62198 * Pw / (pressurePsia - Pw);

  // Grains per pound (1 lb = 7000 grains)
  const gpp = W * 7000;

  // Round to 1 decimal place
  return Math.round(gpp * 10) / 10;
}

/**
 * Check if a moisture reading meets the IICRC S500 dry standard.
 * A reading meets dry standard when readingValue <= baselineValue + 4.
 *
 * @param {number} readingValue - Current moisture content reading
 * @param {number} baselineValue - Baseline (dry reference) moisture content
 * @returns {boolean} True if reading meets dry standard
 */
function meetsDryStandard(readingValue, baselineValue) {
  if (readingValue === null || readingValue === undefined) return false;
  if (baselineValue === null || baselineValue === undefined) return false;
  return readingValue <= baselineValue + 4;
}

// ============================================
// PREPARED STATEMENTS
// ============================================

// Logs
const getLogByJobId = db.prepare('SELECT * FROM drying_logs WHERE job_id = ?');
const insertLog = db.prepare('INSERT INTO drying_logs (id, job_id, status, next_ref_number) VALUES (?, ?, ?, ?)');
const updateLogStatus = db.prepare("UPDATE drying_logs SET status = ?, completed_at = ?, updated_at = datetime('now') WHERE id = ?");
const getNextRefNumber = db.prepare('SELECT next_ref_number FROM drying_logs WHERE id = ?');
const incrementRefNumber = db.prepare("UPDATE drying_logs SET next_ref_number = next_ref_number + 1, updated_at = datetime('now') WHERE id = ?");
const updateSetupCompleteStmt = db.prepare("UPDATE drying_logs SET setup_complete = ?, updated_at = datetime('now') WHERE id = ?");

// Chambers
const getChambersByLogId = db.prepare('SELECT * FROM drying_chambers WHERE log_id = ? ORDER BY position');
const insertChamber = db.prepare('INSERT INTO drying_chambers (id, log_id, name, color, position) VALUES (?, ?, ?, ?, ?)');

// Rooms
const getRoomsByChamber = db.prepare('SELECT * FROM drying_rooms WHERE chamber_id = ? ORDER BY position');
const insertRoom = db.prepare('INSERT INTO drying_rooms (id, chamber_id, name, position) VALUES (?, ?, ?, ?)');

// Reference points
const getRefPointsByRoom = db.prepare('SELECT * FROM drying_ref_points WHERE room_id = ? ORDER BY ref_number');
const getRefPointsByLog = db.prepare('SELECT * FROM drying_ref_points WHERE log_id = ? ORDER BY ref_number');
const getRefPointById = db.prepare('SELECT * FROM drying_ref_points WHERE id = ?');
const insertRefPoint = db.prepare('INSERT INTO drying_ref_points (id, room_id, log_id, ref_number, material_code, label) VALUES (?, ?, ?, ?, ?, ?)');
const demolishRefPoint = db.prepare("UPDATE drying_ref_points SET demolished_at = datetime('now'), demolished_visit_id = ? WHERE id = ?");
const undemolishRefPoint = db.prepare("UPDATE drying_ref_points SET demolished_at = NULL, demolished_visit_id = NULL WHERE id = ?");

// Baselines
const getBaselinesByLog = db.prepare('SELECT * FROM drying_baselines WHERE log_id = ?');
const getBaselineByMaterial = db.prepare('SELECT * FROM drying_baselines WHERE log_id = ? AND material_code = ?');
const upsertBaseline = db.prepare("INSERT INTO drying_baselines (id, log_id, material_code, baseline_value) VALUES (?, ?, ?, ?) ON CONFLICT(log_id, material_code) DO UPDATE SET baseline_value = excluded.baseline_value, updated_at = datetime('now')");

// Visits
const getVisitsByLog = db.prepare('SELECT * FROM drying_visits WHERE log_id = ? ORDER BY visit_number');
const getVisitById = db.prepare('SELECT * FROM drying_visits WHERE id = ?');
const insertVisit = db.prepare('INSERT INTO drying_visits (id, log_id, visit_number, visited_at) VALUES (?, ?, ?, ?)');

// Atmospheric readings
const getAtmosphericByVisit = db.prepare('SELECT * FROM drying_atmospheric_readings WHERE visit_id = ?');
const insertAtmospheric = db.prepare('INSERT INTO drying_atmospheric_readings (id, visit_id, reading_type, chamber_id, dehu_number, temp_f, rh_percent, gpp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
const deleteAtmosphericByVisit = db.prepare('DELETE FROM drying_atmospheric_readings WHERE visit_id = ?');

// Moisture readings
const getMoistureByVisit = db.prepare('SELECT * FROM drying_moisture_readings WHERE visit_id = ?');
const insertMoisture = db.prepare('INSERT INTO drying_moisture_readings (id, visit_id, ref_point_id, reading_value, meets_dry_standard) VALUES (?, ?, ?, ?, ?)');
const deleteMoistureByVisit = db.prepare('DELETE FROM drying_moisture_readings WHERE visit_id = ?');

// Equipment
const getEquipmentByVisit = db.prepare('SELECT * FROM drying_equipment WHERE visit_id = ?');
const insertEquipment = db.prepare('INSERT INTO drying_equipment (id, visit_id, room_id, equipment_type, quantity) VALUES (?, ?, ?, ?, ?)');
const deleteEquipmentByVisit = db.prepare('DELETE FROM drying_equipment WHERE visit_id = ?');

// Visit notes
const getNotesByVisit = db.prepare('SELECT * FROM drying_visit_notes WHERE visit_id = ?');
const insertNote = db.prepare('INSERT INTO drying_visit_notes (id, visit_id, content, photos) VALUES (?, ?, ?, ?)');

// Logs - additional queries
const getLogById = db.prepare('SELECT * FROM drying_logs WHERE id = ?');

// Chambers - update/delete
const getChamberById = db.prepare('SELECT * FROM drying_chambers WHERE id = ?');
const updateChamberStmt = db.prepare("UPDATE drying_chambers SET name = ?, color = ?, position = ?, updated_at = datetime('now') WHERE id = ?");
const deleteChamberStmt = db.prepare('DELETE FROM drying_chambers WHERE id = ?');

// Rooms - update/delete + query by log
const getRoomById = db.prepare('SELECT * FROM drying_rooms WHERE id = ?');
const updateRoomStmt = db.prepare("UPDATE drying_rooms SET name = ?, position = ?, chamber_id = ?, updated_at = datetime('now') WHERE id = ?");
const deleteRoomStmt = db.prepare('DELETE FROM drying_rooms WHERE id = ?');
const getRoomsByLogId = db.prepare(`
  SELECT r.* FROM drying_rooms r
  JOIN drying_chambers c ON r.chamber_id = c.id
  WHERE c.log_id = ?
  ORDER BY c.position, r.position
`);

// Reference points - update + delete
const updateRefPointStmt = db.prepare('UPDATE drying_ref_points SET material_code = ?, label = ? WHERE id = ?');
const deleteRefPointStmt = db.prepare('DELETE FROM drying_ref_points WHERE id = ?');

// Visits - delete + auto-number helper
const deleteVisitStmt = db.prepare('DELETE FROM drying_visits WHERE id = ?');
const getMaxVisitNumber = db.prepare('SELECT MAX(visit_number) as max_num FROM drying_visits WHERE log_id = ?');

// Visit notes - delete + get by id
const getNoteById = db.prepare('SELECT * FROM drying_visit_notes WHERE id = ?');
const deleteNoteStmt = db.prepare('DELETE FROM drying_visit_notes WHERE id = ?');

// ============================================
// TRANSACTION FUNCTIONS
// ============================================

/**
 * Create a new drying log for a job.
 * @param {string} jobId - The apex_jobs.id to associate with
 * @returns {object} The created drying_logs row
 */
function createDryingLog(jobId) {
  const id = uuidv4();
  insertLog.run(id, jobId, 'active', 1);
  return getLogByJobId.get(jobId);
}

/**
 * Create a drying log with a default chamber and pre-populated rooms in a single transaction.
 * @param {string} jobId - The apex_jobs.id to associate with
 * @param {string[]} roomNames - Array of room names to pre-populate (from areas_affected)
 * @returns {object} Composite result: { log, chambers, rooms }
 */
const createDryingLogWithRooms = db.transaction((jobId, roomNames) => {
  const logId = uuidv4();
  insertLog.run(logId, jobId, 'active', 1);

  // Always create a default chamber (rooms require a parent chamber_id)
  const chamberId = uuidv4();
  insertChamber.run(chamberId, logId, 'Default', '', 0);

  const rooms = [];
  roomNames.forEach((name, i) => {
    const roomId = uuidv4();
    insertRoom.run(roomId, chamberId, name, i);
    rooms.push({ id: roomId, chamber_id: chamberId, name, position: i });
  });

  const log = getLogByJobId.get(jobId);
  return {
    log,
    chambers: [{ id: chamberId, log_id: logId, name: 'Default', color: '', position: 0 }],
    rooms
  };
});

/**
 * Add a reference point with atomic ref_number assignment.
 * Reads next_ref_number, inserts ref point, then increments -- all in a transaction.
 *
 * @param {string} logId - The drying_logs.id
 * @param {string} roomId - The drying_rooms.id
 * @param {string} materialCode - Material code (e.g., 'D', 'CW', 'WD')
 * @param {string} label - Human-readable label
 * @returns {object} The created drying_ref_points row
 */
const addRefPoint = db.transaction((logId, roomId, materialCode, label) => {
  const log = getNextRefNumber.get(logId);
  if (!log) throw new Error(`Drying log not found: ${logId}`);

  const refNumber = log.next_ref_number;
  const id = uuidv4();

  insertRefPoint.run(id, roomId, logId, refNumber, materialCode, label || '');
  incrementRefNumber.run(logId);

  return getRefPointById.get(id);
});

/**
 * Save atmospheric readings for a visit (bulk upsert pattern: delete + re-insert).
 * GPP is auto-calculated from temp/RH using calculateGPP.
 *
 * @param {string} visitId - The drying_visits.id
 * @param {Array<{readingType: string, chamberId: string|null, dehuNumber: number|null, tempF: number, rhPercent: number}>} readings
 */
const saveAtmosphericReadings = db.transaction((visitId, readings) => {
  deleteAtmosphericByVisit.run(visitId);
  for (const r of readings) {
    const gpp = calculateGPP(r.tempF, r.rhPercent);
    const id = uuidv4();
    insertAtmospheric.run(id, visitId, r.readingType, r.chamberId || null, r.dehuNumber || null, r.tempF, r.rhPercent, gpp);
  }
});

/**
 * Save moisture readings for a visit (bulk upsert pattern: delete + re-insert).
 * meets_dry_standard is auto-computed by looking up the baseline for the ref point's material code.
 *
 * @param {string} visitId - The drying_visits.id
 * @param {Array<{refPointId: string, readingValue: number}>} readings
 * @param {string} logId - The drying_logs.id (for baseline lookup)
 */
const saveMoistureReadings = db.transaction((visitId, readings, logId) => {
  deleteMoistureByVisit.run(visitId);
  for (const r of readings) {
    // Look up the ref point to get its material_code
    const refPoint = getRefPointById.get(r.refPointId);
    let isDry = 0;
    if (refPoint) {
      // Look up the baseline for this material code in this log
      const baseline = getBaselineByMaterial.get(logId, refPoint.material_code);
      if (baseline) {
        isDry = meetsDryStandard(r.readingValue, baseline.baseline_value) ? 1 : 0;
      }
    }
    const id = uuidv4();
    insertMoisture.run(id, visitId, r.refPointId, r.readingValue, isDry);
  }
});

/**
 * Save equipment snapshot for a visit (bulk upsert pattern: delete + re-insert).
 *
 * @param {string} visitId - The drying_visits.id
 * @param {Array<{roomId: string, equipmentType: string, quantity: number}>} equipmentList
 */
const saveEquipment = db.transaction((visitId, equipmentList) => {
  deleteEquipmentByVisit.run(visitId);
  for (const e of equipmentList) {
    const id = uuidv4();
    insertEquipment.run(id, visitId, e.roomId, e.equipmentType, e.quantity || 1);
  }
});

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Pure calculation functions
  calculateGPP,
  meetsDryStandard,

  // Drying log CRUD
  createDryingLog,
  createDryingLogWithRooms,
  getLogByJobId: (jobId) => getLogByJobId.get(jobId),
  updateLogStatus: (logId, status, completedAt) => updateLogStatus.run(status, completedAt || null, logId),
  updateSetupComplete: (logId, value) => updateSetupCompleteStmt.run(value, logId),

  // Chambers
  getChambersByLogId: (logId) => getChambersByLogId.all(logId),
  insertChamber: (logId, name, color, position) => {
    const id = uuidv4();
    insertChamber.run(id, logId, name, color || '', position || 0);
    return { id, log_id: logId, name, color: color || '', position: position || 0 };
  },

  // Rooms
  getRoomsByChamber: (chamberId) => getRoomsByChamber.all(chamberId),
  insertRoom: (chamberId, name, position) => {
    const id = uuidv4();
    insertRoom.run(id, chamberId, name, position || 0);
    return { id, chamber_id: chamberId, name, position: position || 0 };
  },

  // Reference points
  getRefPointsByRoom: (roomId) => getRefPointsByRoom.all(roomId),
  getRefPointsByLog: (logId) => getRefPointsByLog.all(logId),
  getRefPointById: (id) => getRefPointById.get(id),
  addRefPoint,
  demolishRefPoint: (refPointId, visitId) => demolishRefPoint.run(visitId, refPointId),
  undemolishRefPoint: (refPointId) => undemolishRefPoint.run(refPointId),

  // Baselines
  getBaselinesByLog: (logId) => getBaselinesByLog.all(logId),
  getBaselineByMaterial: (logId, materialCode) => getBaselineByMaterial.get(logId, materialCode),
  upsertBaseline: (logId, materialCode, baselineValue) => {
    const id = uuidv4();
    upsertBaseline.run(id, logId, materialCode, baselineValue);
    return getBaselineByMaterial.get(logId, materialCode);
  },

  // Visits
  getVisitsByLog: (logId) => getVisitsByLog.all(logId),
  getVisitById: (visitId) => getVisitById.get(visitId),
  insertVisit: (logId, visitNumber, visitedAt) => {
    const id = uuidv4();
    insertVisit.run(id, logId, visitNumber, visitedAt || new Date().toISOString());
    return getVisitById.get(id);
  },

  // Atmospheric readings
  getAtmosphericByVisit: (visitId) => getAtmosphericByVisit.all(visitId),
  saveAtmosphericReadings,

  // Moisture readings
  getMoistureByVisit: (visitId) => getMoistureByVisit.all(visitId),
  saveMoistureReadings,

  // Equipment
  getEquipmentByVisit: (visitId) => getEquipmentByVisit.all(visitId),
  saveEquipment,

  // Visit notes
  getNotesByVisit: (visitId) => getNotesByVisit.all(visitId),
  insertNote: (visitId, content, photos) => {
    const id = uuidv4();
    insertNote.run(id, visitId, content || '', photos || '[]');
    return { id, visit_id: visitId, content: content || '', photos: photos || '[]' };
  },

  // Log by ID (not job_id)
  getLogById: (id) => getLogById.get(id),

  // Chamber update/delete
  getChamberById: (id) => getChamberById.get(id),
  updateChamber: (id, data) => {
    updateChamberStmt.run(data.name, data.color, data.position, id);
    return getChamberById.get(id);
  },
  deleteChamber: (id) => deleteChamberStmt.run(id),

  // Room update/delete + query by log
  getRoomById: (id) => getRoomById.get(id),
  updateRoom: (id, data) => {
    updateRoomStmt.run(data.name, data.position, data.chamber_id, id);
    return getRoomById.get(id);
  },
  deleteRoom: (id) => deleteRoomStmt.run(id),
  getRoomsByLogId: (logId) => getRoomsByLogId.all(logId),

  // Reference point update + delete
  updateRefPoint: (id, data) => {
    updateRefPointStmt.run(data.material_code, data.label, id);
    return getRefPointById.get(id);
  },
  deleteRefPoint: (id) => deleteRefPointStmt.run(id),

  // Visit delete + auto-number creation
  deleteVisit: (id) => deleteVisitStmt.run(id),
  createVisit: (logId, visitedAt) => {
    const result = getMaxVisitNumber.get(logId);
    const nextNum = (result?.max_num || 0) + 1;
    const id = uuidv4();
    insertVisit.run(id, logId, nextNum, visitedAt || new Date().toISOString());
    return getVisitById.get(id);
  },

  // Visit note delete + get by id
  getNoteById: (id) => getNoteById.get(id),
  deleteNote: (id) => deleteNoteStmt.run(id),
};
