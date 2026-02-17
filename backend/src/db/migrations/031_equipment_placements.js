module.exports = {
  name: '031_equipment_placements',
  async up(db) {
    await db.run(`CREATE TABLE IF NOT EXISTS drying_equipment_placements (
      id TEXT PRIMARY KEY,
      drying_log_id TEXT NOT NULL REFERENCES drying_logs(id) ON DELETE CASCADE,
      room_id TEXT NOT NULL REFERENCES drying_rooms(id) ON DELETE CASCADE,
      equipment_type TEXT NOT NULL DEFAULT 'AM',
      label TEXT,
      placed_at TIMESTAMPTZ NOT NULL,
      removed_at TIMESTAMPTZ,
      placed_visit_id TEXT REFERENCES drying_visits(id),
      removed_visit_id TEXT REFERENCES drying_visits(id),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    
    await db.run(`CREATE INDEX IF NOT EXISTS idx_equip_place_log ON drying_equipment_placements(drying_log_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_equip_place_room ON drying_equipment_placements(room_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_equip_place_dates ON drying_equipment_placements(placed_at, removed_at)`);
  }
};