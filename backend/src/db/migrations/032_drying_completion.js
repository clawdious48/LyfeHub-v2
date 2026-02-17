module.exports = {
  name: '032_drying_completion',
  async up(db) {
    // completed_at already exists, only add the missing columns
    await db.run(`ALTER TABLE drying_logs ADD COLUMN IF NOT EXISTS completed_by TEXT`);
    await db.run(`ALTER TABLE drying_logs ADD COLUMN IF NOT EXISTS locked INTEGER DEFAULT 0`);
  }
};