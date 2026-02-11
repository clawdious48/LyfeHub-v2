const db = require('./schema');

// ============================================
// DRYING LOGS TABLE (one per job)
// ============================================
const dryingLogsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='drying_logs'").get();
if (!dryingLogsTable) {
  console.log('Creating drying_logs table...');
  db.exec(`
    CREATE TABLE drying_logs (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL UNIQUE REFERENCES apex_jobs(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'complete')),
      next_ref_number INTEGER DEFAULT 1,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE UNIQUE INDEX idx_drying_logs_job_id ON drying_logs(job_id)`);
  console.log('Drying logs table created');
}

// ============================================
// DRYING CHAMBERS TABLE (containment zones within a log)
// ============================================
const dryingChambersTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='drying_chambers'").get();
if (!dryingChambersTable) {
  console.log('Creating drying_chambers table...');
  db.exec(`
    CREATE TABLE drying_chambers (
      id TEXT PRIMARY KEY,
      log_id TEXT NOT NULL REFERENCES drying_logs(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT DEFAULT '',
      position INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_drying_chambers_log_id ON drying_chambers(log_id)`);
  console.log('Drying chambers table created');
}

// ============================================
// DRYING ROOMS TABLE (rooms within chambers)
// ============================================
const dryingRoomsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='drying_rooms'").get();
if (!dryingRoomsTable) {
  console.log('Creating drying_rooms table...');
  db.exec(`
    CREATE TABLE drying_rooms (
      id TEXT PRIMARY KEY,
      chamber_id TEXT NOT NULL REFERENCES drying_chambers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      position INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_drying_rooms_chamber_id ON drying_rooms(chamber_id)`);
  console.log('Drying rooms table created');
}

// ============================================
// DRYING REF POINTS TABLE (measurement locations within rooms)
// ============================================
const dryingRefPointsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='drying_ref_points'").get();
if (!dryingRefPointsTable) {
  console.log('Creating drying_ref_points table...');
  db.exec(`
    CREATE TABLE drying_ref_points (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES drying_rooms(id) ON DELETE CASCADE,
      log_id TEXT NOT NULL REFERENCES drying_logs(id) ON DELETE CASCADE,
      ref_number INTEGER NOT NULL,
      material_code TEXT NOT NULL DEFAULT '',
      label TEXT DEFAULT '',
      demolished_at TEXT,
      demolished_visit_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(log_id, ref_number)
    )
  `);
  db.exec(`CREATE INDEX idx_drying_ref_points_room_id ON drying_ref_points(room_id)`);
  db.exec(`CREATE INDEX idx_drying_ref_points_log_id ON drying_ref_points(log_id)`);
  console.log('Drying ref points table created');
}

// ============================================
// DRYING BASELINES TABLE (target moisture per material type per log)
// ============================================
const dryingBaselinesTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='drying_baselines'").get();
if (!dryingBaselinesTable) {
  console.log('Creating drying_baselines table...');
  db.exec(`
    CREATE TABLE drying_baselines (
      id TEXT PRIMARY KEY,
      log_id TEXT NOT NULL REFERENCES drying_logs(id) ON DELETE CASCADE,
      material_code TEXT NOT NULL,
      baseline_value REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(log_id, material_code)
    )
  `);
  db.exec(`CREATE INDEX idx_drying_baselines_log_id ON drying_baselines(log_id)`);
  console.log('Drying baselines table created');
}

// ============================================
// DRYING VISITS TABLE (timestamped site visit records)
// ============================================
const dryingVisitsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='drying_visits'").get();
if (!dryingVisitsTable) {
  console.log('Creating drying_visits table...');
  db.exec(`
    CREATE TABLE drying_visits (
      id TEXT PRIMARY KEY,
      log_id TEXT NOT NULL REFERENCES drying_logs(id) ON DELETE CASCADE,
      visit_number INTEGER NOT NULL,
      visited_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(log_id, visit_number)
    )
  `);
  db.exec(`CREATE INDEX idx_drying_visits_log_id ON drying_visits(log_id)`);
  console.log('Drying visits table created');
}

// ============================================
// DRYING ATMOSPHERIC READINGS TABLE (temp/RH/GPP per visit)
// ============================================
const dryingAtmosphericTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='drying_atmospheric_readings'").get();
if (!dryingAtmosphericTable) {
  console.log('Creating drying_atmospheric_readings table...');
  db.exec(`
    CREATE TABLE drying_atmospheric_readings (
      id TEXT PRIMARY KEY,
      visit_id TEXT NOT NULL REFERENCES drying_visits(id) ON DELETE CASCADE,
      reading_type TEXT NOT NULL CHECK(reading_type IN ('chamber_intake', 'dehu_exhaust', 'unaffected', 'outside')),
      chamber_id TEXT REFERENCES drying_chambers(id) ON DELETE SET NULL,
      dehu_number INTEGER,
      temp_f REAL,
      rh_percent REAL,
      gpp REAL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_drying_atmospheric_visit_id ON drying_atmospheric_readings(visit_id)`);
  console.log('Drying atmospheric readings table created');
}

// ============================================
// DRYING MOISTURE READINGS TABLE (MC per reference point per visit)
// ============================================
const dryingMoistureTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='drying_moisture_readings'").get();
if (!dryingMoistureTable) {
  console.log('Creating drying_moisture_readings table...');
  db.exec(`
    CREATE TABLE drying_moisture_readings (
      id TEXT PRIMARY KEY,
      visit_id TEXT NOT NULL REFERENCES drying_visits(id) ON DELETE CASCADE,
      ref_point_id TEXT NOT NULL REFERENCES drying_ref_points(id) ON DELETE CASCADE,
      reading_value REAL,
      meets_dry_standard INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(visit_id, ref_point_id)
    )
  `);
  db.exec(`CREATE INDEX idx_drying_moisture_visit_id ON drying_moisture_readings(visit_id)`);
  db.exec(`CREATE INDEX idx_drying_moisture_ref_point_id ON drying_moisture_readings(ref_point_id)`);
  console.log('Drying moisture readings table created');
}

// ============================================
// DRYING EQUIPMENT TABLE (equipment snapshot per room per visit)
// ============================================
const dryingEquipmentTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='drying_equipment'").get();
if (!dryingEquipmentTable) {
  console.log('Creating drying_equipment table...');
  db.exec(`
    CREATE TABLE drying_equipment (
      id TEXT PRIMARY KEY,
      visit_id TEXT NOT NULL REFERENCES drying_visits(id) ON DELETE CASCADE,
      room_id TEXT NOT NULL REFERENCES drying_rooms(id) ON DELETE CASCADE,
      equipment_type TEXT NOT NULL DEFAULT 'AM',
      quantity INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_drying_equipment_visit_id ON drying_equipment(visit_id)`);
  db.exec(`CREATE INDEX idx_drying_equipment_room_id ON drying_equipment(room_id)`);
  console.log('Drying equipment table created');
}

// ============================================
// DRYING VISIT NOTES TABLE (text notes with optional photos)
// ============================================
const dryingVisitNotesTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='drying_visit_notes'").get();
if (!dryingVisitNotesTable) {
  console.log('Creating drying_visit_notes table...');
  db.exec(`
    CREATE TABLE drying_visit_notes (
      id TEXT PRIMARY KEY,
      visit_id TEXT NOT NULL REFERENCES drying_visits(id) ON DELETE CASCADE,
      content TEXT DEFAULT '',
      photos TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_drying_visit_notes_visit_id ON drying_visit_notes(visit_id)`);
  console.log('Drying visit notes table created');
}

console.log('Drying logs schema initialized');

module.exports = db;
