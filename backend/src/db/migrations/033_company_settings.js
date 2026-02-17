module.exports = {
  name: '033_company_settings',
  async up(db) {
    await db.run(`CREATE TABLE IF NOT EXISTS company_settings (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      setting_key TEXT NOT NULL,
      setting_value TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(org_id, setting_key)
    )`);
  }
};