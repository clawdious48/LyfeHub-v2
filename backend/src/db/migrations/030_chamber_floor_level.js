module.exports = {
  name: '030_chamber_floor_level',
  async up(db) {
    await db.run(`ALTER TABLE drying_chambers ADD COLUMN IF NOT EXISTS floor_level TEXT DEFAULT 'main_level'`);
  }
};
