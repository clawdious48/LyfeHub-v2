const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

// ============================================
// PURE CALCULATION FUNCTIONS
// ============================================

/**
 * Calculate Grains Per Pound (GPP) using the IAPWS saturation vapor pressure formula.
 */
function calculateGPP(tempF, rhPercent, pressurePsia = 14.696) {
  if (tempF === null || tempF === undefined || typeof tempF !== 'number' || isNaN(tempF)) return null;
  if (rhPercent === null || rhPercent === undefined || typeof rhPercent !== 'number' || isNaN(rhPercent)) return null;
  if (rhPercent < 0 || rhPercent > 100) return null;

  const c8 = -10440.397;
  const c9 = -11.29465;
  const c10 = -0.027022355;
  const c11 = 0.00001289036;
  const c12 = -0.0000000024780681;
  const c13 = 6.5459673;

  const tempR = tempF + 459.67;
  const lnPws = c8 / tempR + c9 + c10 * tempR + c11 * tempR * tempR + c12 * tempR * tempR * tempR + c13 * Math.log(tempR);
  const Pws = Math.exp(lnPws);
  const Pw = (rhPercent / 100) * Pws;
  const W = 0.62198 * Pw / (pressurePsia - Pw);
  const gpp = W * 7000;
  return Math.round(gpp * 10) / 10;
}

/**
 * Check if a moisture reading meets the IICRC S500 dry standard.
 */
function meetsDryStandard(readingValue, baselineValue) {
  if (readingValue === null || readingValue === undefined) return false;
  if (baselineValue === null || baselineValue === undefined) return false;
  return readingValue <= baselineValue + 4;
}

// ============================================
// ASYNC DB FUNCTIONS
// ============================================

// Logs
async function createDryingLog(jobId) {
  const id = uuidv4();
  await db.run('INSERT INTO drying_logs (id, job_id, status, next_ref_number) VALUES ($1, $2, $3, $4)', [id, jobId, 'active', 1]);
  return await db.getOne('SELECT * FROM drying_logs WHERE job_id = $1', [jobId]);
}

async function createDryingLogWithRooms(jobId, roomNames) {
  return await db.transaction(async (client) => {
    const logId = uuidv4();
    await client.run('INSERT INTO drying_logs (id, job_id, status, next_ref_number) VALUES ($1, $2, $3, $4)', [logId, jobId, 'active', 1]);

    const chamberId = uuidv4();
    await client.run('INSERT INTO drying_chambers (id, log_id, name, color, position) VALUES ($1, $2, $3, $4, $5)', [chamberId, logId, 'Default', '', 0]);

    const rooms = [];
    for (let i = 0; i < roomNames.length; i++) {
      const roomId = uuidv4();
      await client.run('INSERT INTO drying_rooms (id, chamber_id, name, position) VALUES ($1, $2, $3, $4)', [roomId, chamberId, roomNames[i], i]);
      rooms.push({ id: roomId, chamber_id: chamberId, name: roomNames[i], position: i });
    }

    const log = await client.getOne('SELECT * FROM drying_logs WHERE job_id = $1', [jobId]);
    return {
      log,
      chambers: [{ id: chamberId, log_id: logId, name: 'Default', color: '', position: 0 }],
      rooms
    };
  });
}

async function addRefPoint(logId, roomId, materialCode, label) {
  return await db.transaction(async (client) => {
    const log = await client.getOne('SELECT next_ref_number FROM drying_logs WHERE id = $1', [logId]);
    if (!log) throw new Error(`Drying log not found: ${logId}`);

    const refNumber = log.next_ref_number;
    const id = uuidv4();

    await client.run('INSERT INTO drying_ref_points (id, room_id, log_id, ref_number, material_code, label) VALUES ($1, $2, $3, $4, $5, $6)', [id, roomId, logId, refNumber, materialCode, label || '']);
    await client.run('UPDATE drying_logs SET next_ref_number = next_ref_number + 1, updated_at = NOW() WHERE id = $1', [logId]);

    return await client.getOne('SELECT * FROM drying_ref_points WHERE id = $1', [id]);
  });
}

async function saveAtmosphericReadings(visitId, readings) {
  return await db.transaction(async (client) => {
    await client.run('DELETE FROM drying_atmospheric_readings WHERE visit_id = $1', [visitId]);
    for (const r of readings) {
      const gpp = calculateGPP(r.tempF, r.rhPercent);
      const id = uuidv4();
      await client.run(
        'INSERT INTO drying_atmospheric_readings (id, visit_id, reading_type, chamber_id, dehu_number, temp_f, rh_percent, gpp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [id, visitId, r.readingType, r.chamberId || null, r.dehuNumber || null, r.tempF, r.rhPercent, gpp]
      );
    }
  });
}

async function saveMoistureReadings(visitId, readings, logId) {
  return await db.transaction(async (client) => {
    await client.run('DELETE FROM drying_moisture_readings WHERE visit_id = $1', [visitId]);
    for (const r of readings) {
      const refPoint = await client.getOne('SELECT * FROM drying_ref_points WHERE id = $1', [r.refPointId]);
      let isDry = 0;
      if (refPoint) {
        const baseline = await client.getOne('SELECT * FROM drying_baselines WHERE log_id = $1 AND material_code = $2', [logId, refPoint.material_code]);
        if (baseline) {
          isDry = meetsDryStandard(r.readingValue, baseline.baseline_value) ? 1 : 0;
        }
      }
      const id = uuidv4();
      await client.run(
        'INSERT INTO drying_moisture_readings (id, visit_id, ref_point_id, reading_value, meets_dry_standard) VALUES ($1, $2, $3, $4, $5)',
        [id, visitId, r.refPointId, r.readingValue, isDry]
      );
    }
  });
}

async function saveEquipment(visitId, equipmentList) {
  return await db.transaction(async (client) => {
    await client.run('DELETE FROM drying_equipment WHERE visit_id = $1', [visitId]);
    for (const e of equipmentList) {
      const id = uuidv4();
      await client.run(
        'INSERT INTO drying_equipment (id, visit_id, room_id, equipment_type, quantity) VALUES ($1, $2, $3, $4, $5)',
        [id, visitId, e.roomId, e.equipmentType, e.quantity || 1]
      );
    }
  });
}

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
  getLogByJobId: async (jobId) => await db.getOne('SELECT * FROM drying_logs WHERE job_id = $1', [jobId]),
  updateLogStatus: async (logId, status, completedAt) => await db.run("UPDATE drying_logs SET status = $1, completed_at = $2, updated_at = NOW() WHERE id = $3", [status, completedAt || null, logId]),
  updateSetupComplete: async (logId, value) => await db.run("UPDATE drying_logs SET setup_complete = $1, updated_at = NOW() WHERE id = $2", [value, logId]),

  // Chambers
  getChambersByLogId: async (logId) => await db.getAll('SELECT * FROM drying_chambers WHERE log_id = $1 ORDER BY position', [logId]),
  insertChamber: async (logId, name, color, position, floorLevel) => {
    const id = uuidv4();
    await db.run('INSERT INTO drying_chambers (id, log_id, name, color, position, floor_level) VALUES ($1, $2, $3, $4, $5, $6)', [id, logId, name, color || '', position || 0, floorLevel || 'main_level']);
    return { id, log_id: logId, name, color: color || '', position: position || 0, floor_level: floorLevel || 'main_level' };
  },

  // Rooms
  getRoomsByChamber: async (chamberId) => await db.getAll('SELECT * FROM drying_rooms WHERE chamber_id = $1 ORDER BY position', [chamberId]),
  insertRoom: async (chamberId, name, position) => {
    const id = uuidv4();
    await db.run('INSERT INTO drying_rooms (id, chamber_id, name, position) VALUES ($1, $2, $3, $4)', [id, chamberId, name, position || 0]);
    return { id, chamber_id: chamberId, name, position: position || 0 };
  },

  // Reference points
  getRefPointsByRoom: async (roomId) => await db.getAll('SELECT * FROM drying_ref_points WHERE room_id = $1 ORDER BY ref_number', [roomId]),
  getRefPointsByLog: async (logId) => await db.getAll('SELECT * FROM drying_ref_points WHERE log_id = $1 ORDER BY ref_number', [logId]),
  getRefPointById: async (id) => await db.getOne('SELECT * FROM drying_ref_points WHERE id = $1', [id]),
  addRefPoint,
  demolishRefPoint: async (refPointId, visitId) => await db.run("UPDATE drying_ref_points SET demolished_at = NOW(), demolished_visit_id = $1 WHERE id = $2", [visitId, refPointId]),
  undemolishRefPoint: async (refPointId) => await db.run("UPDATE drying_ref_points SET demolished_at = NULL, demolished_visit_id = NULL WHERE id = $1", [refPointId]),

  // Baselines
  getBaselinesByLog: async (logId) => await db.getAll('SELECT * FROM drying_baselines WHERE log_id = $1', [logId]),
  getBaselineByMaterial: async (logId, materialCode) => await db.getOne('SELECT * FROM drying_baselines WHERE log_id = $1 AND material_code = $2', [logId, materialCode]),
  upsertBaseline: async (logId, materialCode, baselineValue) => {
    const id = uuidv4();
    await db.run("INSERT INTO drying_baselines (id, log_id, material_code, baseline_value) VALUES ($1, $2, $3, $4) ON CONFLICT(log_id, material_code) DO UPDATE SET baseline_value = EXCLUDED.baseline_value, updated_at = NOW()", [id, logId, materialCode, baselineValue]);
    return await db.getOne('SELECT * FROM drying_baselines WHERE log_id = $1 AND material_code = $2', [logId, materialCode]);
  },

  // Visits
  getVisitsByLog: async (logId) => await db.getAll('SELECT * FROM drying_visits WHERE log_id = $1 ORDER BY visit_number', [logId]),
  getVisitById: async (visitId) => await db.getOne('SELECT * FROM drying_visits WHERE id = $1', [visitId]),
  insertVisit: async (logId, visitNumber, visitedAt) => {
    const id = uuidv4();
    await db.run('INSERT INTO drying_visits (id, log_id, visit_number, visited_at) VALUES ($1, $2, $3, $4)', [id, logId, visitNumber, visitedAt || new Date().toISOString()]);
    return await db.getOne('SELECT * FROM drying_visits WHERE id = $1', [id]);
  },

  // Atmospheric readings
  getAtmosphericByVisit: async (visitId) => await db.getAll('SELECT * FROM drying_atmospheric_readings WHERE visit_id = $1', [visitId]),
  saveAtmosphericReadings,

  // Moisture readings
  getMoistureByVisit: async (visitId) => await db.getAll('SELECT * FROM drying_moisture_readings WHERE visit_id = $1', [visitId]),
  saveMoistureReadings,

  // Equipment
  getEquipmentByVisit: async (visitId) => await db.getAll('SELECT * FROM drying_equipment WHERE visit_id = $1', [visitId]),
  saveEquipment,

  // Visit notes
  getNotesByVisit: async (visitId) => await db.getAll('SELECT * FROM drying_visit_notes WHERE visit_id = $1', [visitId]),
  insertNote: async (visitId, content, photos) => {
    const id = uuidv4();
    await db.run('INSERT INTO drying_visit_notes (id, visit_id, content, photos) VALUES ($1, $2, $3, $4)', [id, visitId, content || '', photos || '[]']);
    return { id, visit_id: visitId, content: content || '', photos: photos || '[]' };
  },

  // Log by ID
  getLogById: async (id) => await db.getOne('SELECT * FROM drying_logs WHERE id = $1', [id]),

  // Chamber update/delete
  getChamberById: async (id) => await db.getOne('SELECT * FROM drying_chambers WHERE id = $1', [id]),
  updateChamber: async (id, data) => {
    const fields = ['name = $1', 'color = $2', 'position = $3'];
    const params = [data.name, data.color, data.position];
    if (data.floor_level !== undefined) {
      fields.push(`floor_level = $${fields.length + 1}`);
      params.push(data.floor_level);
    }
    fields.push('updated_at = NOW()');
    params.push(id);
    await db.run(`UPDATE drying_chambers SET ${fields.join(', ')} WHERE id = $${params.length}`, params);
    return await db.getOne('SELECT * FROM drying_chambers WHERE id = $1', [id]);
  },
  deleteChamber: async (id) => await db.run('DELETE FROM drying_chambers WHERE id = $1', [id]),

  // Room update/delete + query by log
  getRoomById: async (id) => await db.getOne('SELECT * FROM drying_rooms WHERE id = $1', [id]),
  updateRoom: async (id, data) => {
    await db.run("UPDATE drying_rooms SET name = $1, position = $2, chamber_id = $3, updated_at = NOW() WHERE id = $4", [data.name, data.position, data.chamber_id, id]);
    return await db.getOne('SELECT * FROM drying_rooms WHERE id = $1', [id]);
  },
  deleteRoom: async (id) => await db.run('DELETE FROM drying_rooms WHERE id = $1', [id]),
  getRoomsByLogId: async (logId) => await db.getAll(`
    SELECT r.* FROM drying_rooms r
    JOIN drying_chambers c ON r.chamber_id = c.id
    WHERE c.log_id = $1
    ORDER BY c.position, r.position
  `, [logId]),

  // Reference point update + delete
  updateRefPoint: async (id, data) => {
    await db.run('UPDATE drying_ref_points SET material_code = $1, label = $2 WHERE id = $3', [data.material_code, data.label, id]);
    return await db.getOne('SELECT * FROM drying_ref_points WHERE id = $1', [id]);
  },
  deleteRefPoint: async (id) => await db.run('DELETE FROM drying_ref_points WHERE id = $1', [id]),

  // Visit delete + auto-number creation
  deleteVisit: async (id) => await db.run('DELETE FROM drying_visits WHERE id = $1', [id]),
  createVisit: async (logId, visitedAt) => {
    const result = await db.getOne('SELECT MAX(visit_number) as max_num FROM drying_visits WHERE log_id = $1', [logId]);
    const nextNum = (result?.max_num || 0) + 1;
    const id = uuidv4();
    await db.run('INSERT INTO drying_visits (id, log_id, visit_number, visited_at) VALUES ($1, $2, $3, $4)', [id, logId, nextNum, visitedAt || new Date().toISOString()]);
    return await db.getOne('SELECT * FROM drying_visits WHERE id = $1', [id]);
  },

  // Visit note delete + get by id
  getNoteById: async (id) => await db.getOne('SELECT * FROM drying_visit_notes WHERE id = $1', [id]),
  deleteNote: async (id) => await db.run('DELETE FROM drying_visit_notes WHERE id = $1', [id]),

  // Equipment Placements
  getEquipmentPlacements: async (logId) => {
    return db.getAll('SELECT * FROM drying_equipment_placements WHERE drying_log_id = $1 ORDER BY placed_at', [logId]);
  },
  getEquipmentPlacementsByRoom: async (roomId) => {
    return db.getAll('SELECT * FROM drying_equipment_placements WHERE room_id = $1 ORDER BY placed_at', [roomId]);
  },
  getActiveEquipment: async (logId) => {
    return db.getAll('SELECT * FROM drying_equipment_placements WHERE drying_log_id = $1 AND removed_at IS NULL ORDER BY placed_at', [logId]);
  },
  createEquipmentPlacement: async ({logId, roomId, type, label, placedAt, placedVisitId, notes}) => {
    const id = uuidv4();
    await db.run(
      'INSERT INTO drying_equipment_placements (id, drying_log_id, room_id, equipment_type, label, placed_at, placed_visit_id, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [id, logId, roomId, type, label || null, placedAt, placedVisitId || null, notes || null]
    );
    return { id };
  },
  removeEquipmentPlacement: async (placementId, {removedAt, removedVisitId}) => {
    return db.run(
      'UPDATE drying_equipment_placements SET removed_at = $1, removed_visit_id = $2 WHERE id = $3',
      [removedAt, removedVisitId || null, placementId]
    );
  },
  updateEquipmentPlacement: async (placementId, fields) => {
    // Build dynamic SET clause from fields
    const allowed = ['equipment_type', 'label', 'placed_at', 'removed_at', 'placed_visit_id', 'removed_visit_id', 'notes', 'room_id'];
    const sets = [];
    const vals = [];
    let idx = 1;
    for (const [k, v] of Object.entries(fields)) {
      if (allowed.includes(k)) {
        sets.push(`${k} = $${idx}`);
        vals.push(v);
        idx++;
      }
    }
    if (sets.length === 0) return;
    vals.push(placementId);
    return db.run(`UPDATE drying_equipment_placements SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
  },
  deleteEquipmentPlacement: async (id) => {
    return db.run('DELETE FROM drying_equipment_placements WHERE id = $1', [id]);
  },

  // Completion Validation
  getCompletionStatus: async (logId) => {
    const errors = [];

    // 1. Check ref points: all must meet dry standard OR be demolished
    const refPoints = await db.getAll(`
      SELECT rp.id, rp.label, rp.demolished_at, rp.room_id, r.name as room_name,
        (SELECT mr.reading_value FROM drying_moisture_readings mr 
         JOIN drying_visits v ON mr.visit_id = v.id 
         WHERE mr.ref_point_id = rp.id ORDER BY v.visit_number DESC LIMIT 1) as last_reading,
        (SELECT mr.meets_dry_standard FROM drying_moisture_readings mr 
         JOIN drying_visits v ON mr.visit_id = v.id 
         WHERE mr.ref_point_id = rp.id ORDER BY v.visit_number DESC LIMIT 1) as meets_dry_standard
      FROM drying_ref_points rp
      JOIN drying_rooms r ON rp.room_id = r.id
      WHERE r.chamber_id IN (SELECT id FROM drying_chambers WHERE log_id = $1)
    `, [logId]);

    const badRefPoints = refPoints.filter(rp => {
      if (rp.demolished_at) return false; // demolished = OK
      if (rp.last_reading === null || rp.last_reading === undefined) return true; // no reading = bad
      return !rp.meets_dry_standard;
    });

    if (badRefPoints.length > 0) {
      errors.push({
        type: 'reference_points',
        message: `${badRefPoints.length} reference point(s) not within dry standard`,
        details: badRefPoints.map(rp => ({room: rp.room_name, point: rp.label, reading: rp.last_reading, meets_standard: rp.meets_dry_standard}))
      });
    }

    // 2. Check atmospheric readings: ensure each visit has complete atmospheric readings for each chamber
    const incompleteReadings = await db.getAll(`
      SELECT v.visit_number, v.visited_at, c.name as chamber_name
      FROM drying_visits v
      CROSS JOIN drying_chambers c
      WHERE v.log_id = $1 
        AND c.log_id = $1
        AND NOT EXISTS (
          SELECT 1 FROM drying_atmospheric_readings ar 
          WHERE ar.visit_id = v.id 
            AND (ar.chamber_id = c.id OR ar.reading_type = 'ambient')
            AND ar.temp_f IS NOT NULL 
            AND ar.rh_percent IS NOT NULL 
            AND ar.gpp IS NOT NULL
        )
      ORDER BY v.visit_number, c.name
    `, [logId]);

    if (incompleteReadings.length > 0) {
      errors.push({
        type: 'atmospheric_readings',
        message: `${incompleteReadings.length} visit/chamber combination(s) missing complete atmospheric readings`,
        details: incompleteReadings.map(r => ({visit: r.visit_number, chamber: r.chamber_name, visited_at: r.visited_at}))
      });
    }

    // 3. Check equipment: no active placements
    const activeEquip = await db.getAll(
      'SELECT ep.*, r.name as room_name FROM drying_equipment_placements ep JOIN drying_rooms r ON ep.room_id = r.id WHERE ep.drying_log_id = $1 AND ep.removed_at IS NULL',
      [logId]
    );

    if (activeEquip.length > 0) {
      errors.push({
        type: 'equipment',
        message: `${activeEquip.length} piece(s) of equipment not removed`,
        details: activeEquip.map(e => ({id: e.id, type: e.equipment_type, label: e.label, room: e.room_name}))
      });
    }

    return { canComplete: errors.length === 0, errors };
  },
};
